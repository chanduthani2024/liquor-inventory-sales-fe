import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { stockMovementsApi, brandApi, cashReconciliationApi } from '../services/api';
import { alcoholTypesApi } from '../services/alcoholTypesApi';
import { StockReport, Brand, AlcoholType } from '../types';
import * as XLSX from 'xlsx';

import { getSizeDisplayName } from '../utils/sizeMapping';
import CashReconciliation from '../components/CashReconciliation';
import Footer from '../components/Footer';
import './Reports.css';

// Size sorting order: 2L -> 1L -> Q (750ml) -> P (375ml) -> N (180ml) -> D (90ml)
// This shows sizes from highest to lowest volume for better user experience
const getSizePriority = (size: string): number => {
  switch (size) {
    case '2L': return 0;    // 2L comes first (highest volume)
    case '1L': return 1;    // 1L comes second
    case '750ml': return 2;  // Q (750ml)
    case '650ml': return 2.5; // 650ml
    case '500ml': return 3.5; // 500ml
    case '375ml': return 3;  // P (375ml)
    case '330ml': return 4;  // 330ml
    case '180ml': return 5;  // N (180ml)
    case '90ml': return 6;   // D (90ml) - smallest size
    default: return 10;      // Unknown sizes go to the end
  }
};

// Helper function to get the highest price/rate for a brand from all its size variants
const getBrandHighestPrice = (brandName: string, reports: StockReport[]): number => {
  const brandReports = reports.filter(report => 
    report.brand_name === brandName && report.rate > 0
  );
  
  if (brandReports.length === 0) return 0;
  
  return Math.max(...brandReports.map(report => report.rate));
};

// Sort reports by brand's highest price (costliest brands first), then by size priority
// Example: If 100 Pipers has max price ₹2000 (1L) and American Pride has max ₹1500 (1L)
// Result: 100 Pipers shows first, then American Pride
// Within each brand: 2L -> 1L -> Q -> P -> N -> D
// Ignores brands/sizes without prices set (rate = 0 or null)
const sortReports = (reports: StockReport[]): StockReport[] => {
  // Filter out reports without prices set
  const reportsWithPrices = reports.filter(report => report.rate > 0);
  
  return [...reportsWithPrices].sort((a, b) => {
    // First sort by brand's highest price (descending - costliest first)
    const aBrandHighestPrice = getBrandHighestPrice(a.brand_name, reportsWithPrices);
    const bBrandHighestPrice = getBrandHighestPrice(b.brand_name, reportsWithPrices);
    
    if (aBrandHighestPrice !== bBrandHighestPrice) {
      return bBrandHighestPrice - aBrandHighestPrice; // Descending order
    }
    
    // If same brand or same highest price, sort by brand name for consistency
    const brandComparison = a.brand_name.localeCompare(b.brand_name);
    if (brandComparison !== 0) {
      return brandComparison;
    }
    
    // Then sort by size priority (smaller priority number = higher volume = comes first)
    return getSizePriority(a.size) - getSizePriority(b.size);
  });
};

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<StockReport[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [alcoholTypes, setAlcoholTypes] = useState<AlcoholType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedAlcoholType, setSelectedAlcoholType] = useState<number | null>(null);

  const [editingCells, setEditingCells] = useState<{[key: string]: boolean}>({});
  const [tempValues, setTempValues] = useState<{[key: string]: string}>({});
  const [savingCells, setSavingCells] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Helper functions for inline editing
  const getCellKey = (brandId: number, size: string, field: string) => `${brandId}-${size}-${field}`;
  
  const startEditing = (brandId: number, size: string, field: string, currentValue: number) => {
    const cellKey = getCellKey(brandId, size, field);
    setEditingCells(prev => ({ ...prev, [cellKey]: true }));
    setTempValues(prev => ({ ...prev, [cellKey]: currentValue.toString() }));
  };

  const cancelEditing = (brandId: number, size: string, field: string) => {
    const cellKey = getCellKey(brandId, size, field);
    setEditingCells(prev => ({ ...prev, [cellKey]: false }));
    setTempValues(prev => {
      const newValues = { ...prev };
      delete newValues[cellKey];
      return newValues;
    });
  };

  const saveValue = async (brandId: number, size: string, field: string) => {
    const cellKey = getCellKey(brandId, size, field);
    const newValue = parseInt(tempValues[cellKey] || '0');
    
    if (isNaN(newValue) || newValue < 0) {
      toast.error('Please enter a valid positive number', {
        duration: 2000 // 2 seconds for validation errors
      });
      return;
    }

    // Find the current report to get stock information
    const currentReport = reports.find(r => r.brand_id === brandId && r.size === size);
    if (!currentReport) {
      toast.error('Report data not found', {
        duration: 2000 // 2 seconds for validation errors
      });
      return;
    }

    // Validation: Check if sales quantity exceeds total available stock
    if (field === 'sales_quantity') {
      const totalAvailable = currentReport.opening_balance + currentReport.received_today;
      if (newValue > totalAvailable) {
        toast.error(
          `Sales cannot be more than total available stock!\n` +
          `Available: ${totalAvailable} bottles (Opening: ${currentReport.opening_balance} + Received: ${currentReport.received_today})\n` +
          `You entered: ${newValue} bottles`,
          {
            duration: 3000 // 3 seconds for important validation errors (slightly longer)
          }
        );
        return;
      }
    }

    setSavingCells(prev => ({ ...prev, [cellKey]: true }));

    try {
      // Prepare the data for manual stock entry API

      const requestData = {
        brand_id: brandId,
        size: size,
        date: selectedDate,
        received_today: field === 'received_today' ? newValue : currentReport.received_today,
        sales_quantity: field === 'sales_quantity' ? newValue : currentReport.sales_quantity,
        notes: `Updated ${field} via inline editing`
      };

      await stockMovementsApi.manualStockEntry(requestData);
      
      // 🎯 Shorter toast duration for Detailed Stock Report inline editing
      toast.success(`${field === 'received_today' ? 'Received quantity' : 'Sales quantity'} updated successfully`, {
        duration: 2000 // 2 seconds instead of default 5 seconds
      });
      
      // Refresh the reports to show updated calculations
      await fetchReports();
      
      // 🔄 Refresh Cash Reconciliation data after sales entry
      // This ensures the Daily Cash Reconciliation shows updated totals
      if (field === 'sales_quantity') {
        console.log('🔄 Refreshing cash reconciliation after sales update...');
        // Force CashReconciliation component to refresh by updating its key
        // The key prop will trigger a re-mount and fresh data fetch
        window.dispatchEvent(new CustomEvent('refreshCashReconciliation', { 
          detail: { date: selectedDate } 
        }));
      }
      
      // Clear editing state
      setEditingCells(prev => ({ ...prev, [cellKey]: false }));
      setTempValues(prev => {
        const newValues = { ...prev };
        delete newValues[cellKey];
        return newValues;
      });

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || `Failed to update ${field}`;
      toast.error(errorMessage, {
        duration: 3000 // 3 seconds for API errors
      });
      console.error('Inline edit error:', err);
    } finally {
      setSavingCells(prev => ({ ...prev, [cellKey]: false }));
    }
  };

  const handleInputChange = (brandId: number, size: string, field: string, value: string) => {
    const cellKey = getCellKey(brandId, size, field);
    setTempValues(prev => ({ ...prev, [cellKey]: value }));
  };

  const handleKeyPress = (e: React.KeyboardEvent, brandId: number, size: string, field: string) => {
    if (e.key === 'Enter') {
      saveValue(brandId, size, field);
    } else if (e.key === 'Escape') {
      cancelEditing(brandId, size, field);
    }
  };

  // Render inline editable cell
  const renderEditableCell = (report: StockReport, field: 'received_today' | 'sales_quantity') => {
    const cellKey = getCellKey(report.brand_id, report.size, field);
    const isEditing = editingCells[cellKey];
    const isSaving = savingCells[cellKey];
    const currentValue = report[field];
    const tempValue = tempValues[cellKey] || '';

    if (isEditing) {
      const maxAvailable = field === 'sales_quantity' ? report.opening_balance + report.received_today : undefined;
      
      return (
        <div className="editable-cell editing">
          <input
            type="number"
            min="0"
            max={maxAvailable}
            value={tempValue}
            onChange={(e) => handleInputChange(report.brand_id, report.size, field, e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, report.brand_id, report.size, field)}
            onBlur={() => saveValue(report.brand_id, report.size, field)}
            className="inline-edit-input"
            autoFocus
            disabled={isSaving}
            title={field === 'sales_quantity' ? `Max available: ${maxAvailable} bottles. Press Enter to save, Escape to cancel` : 'Press Enter to save, Escape to cancel'}
            placeholder={field === 'sales_quantity' ? `Max: ${maxAvailable}` : undefined}
          />
        </div>
      );
    }

    return (
      <div 
        className="editable-cell clickable"
        onClick={() => startEditing(report.brand_id, report.size, field, currentValue)}
        title="Click to edit"
      >
        {field === 'received_today' ? (
          currentValue > 0 ? (
            <span className="positive-value">+{currentValue}</span>
          ) : (
            <span className="zero-value">0</span>
          )
        ) : (
          currentValue > 0 ? (
            <span className="negative-value">-{currentValue}</span>
          ) : (
            <span className="zero-value">0</span>
          )
        )}
        <span className="edit-icon">✏️</span>
      </div>
    );
  };

  const fetchBrands = async () => {
    try {
      const brandData = await brandApi.getAll();
      setBrands(brandData);
    } catch (err: any) {
      console.error('Failed to fetch brands:', err);
    }
  };

  const fetchAlcoholTypes = async () => {
    try {
      const data = await alcoholTypesApi.getAll();
      setAlcoholTypes(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch alcohol types';
      toast.error(errorMessage);
      console.error('Alcohol types error:', err);
    }
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const reportData = await stockMovementsApi.getReport(
        selectedBrand ? parseInt(selectedBrand) : undefined,
        selectedDate,
        selectedDate
      );
      setReports(sortReports(reportData));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch reports';
      toast.error(errorMessage);
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBrand]);

  useEffect(() => {
    fetchBrands();
    fetchAlcoholTypes();
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBrand(e.target.value);
  };

  const handleAlcoholTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedAlcoholType(value ? parseInt(value) : null);
    // Reset brand selection when alcohol type changes
    setSelectedBrand('');
  };

  const calculateTotals = () => {
    const baseTotals = reports.reduce((totals, report) => ({
      opening_balance: totals.opening_balance + report.opening_balance,
      received_today: totals.received_today + report.received_today,
      total_stock: totals.total_stock + report.total_stock,
      sales_quantity: totals.sales_quantity + report.sales_quantity,
      sales_amount: totals.sales_amount + report.sales_amount,
      defective_quantity: totals.defective_quantity + report.defective_quantity,
      closed_balance: totals.closed_balance + report.closed_balance,
    }), {
      opening_balance: 0,
      received_today: 0,
      total_stock: 0,  
      sales_quantity: 0,
      sales_amount: 0,
      defective_quantity: 0,
      closed_balance: 0,
    });

    // UPDATED BUSINESS LOGIC:
    // - total_stock: Opening Balance + Received Today (theoretical maximum available)
    // - closed_balance: Actual current stock after sales (from database)
    // This makes Total Stock and Closing Balance different and meaningful
    
    return {
      ...baseTotals,
      // Total stock should be opening + received (before sales)
      total_stock: baseTotals.opening_balance + baseTotals.received_today,
      // Keep closed_balance as actual current stock from database
      closed_balance: baseTotals.closed_balance,
    };
  };

  const totals = calculateTotals();

  // First sort reports by costliest brands, then filter based on search query and alcohol type
  const sortedReports = sortReports(reports);
  
  const filteredReports = sortedReports.filter(report => {
    // Filter by alcohol type
    if (selectedAlcoholType) {
      const brand = brands.find(b => b.id === report.brand_id);
      if (!brand || brand.alcohol_type_id !== selectedAlcoholType) {
        return false;
      }
    }

    // Filter by search query
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const brandName = report.brand_name.toLowerCase();
    const sizeDisplay = getSizeDisplayName(report.size).toLowerCase();
    const originalSize = report.size.toLowerCase();
    
    return brandName.includes(query) || 
           sizeDisplay.includes(query) || 
           originalSize.includes(query);
  });

  // Calculate totals for filtered results
  const filteredTotals = filteredReports.reduce((totals, report) => ({
    opening_balance: totals.opening_balance + report.opening_balance,
    received_today: totals.received_today + report.received_today,
    total_stock: totals.total_stock + report.total_stock,
    sales_quantity: totals.sales_quantity + report.sales_quantity,
    sales_amount: totals.sales_amount + report.sales_amount,
    defective_quantity: totals.defective_quantity + report.defective_quantity,
    closed_balance: totals.closed_balance + report.closed_balance,
  }), {
    opening_balance: 0,
    received_today: 0,
    total_stock: 0,
    sales_quantity: 0,
    sales_amount: 0,
    defective_quantity: 0,
    closed_balance: 0,
  });

  // Apply same business logic to filtered totals
  filteredTotals.total_stock = filteredTotals.opening_balance + filteredTotals.received_today;

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Reset to first page when search changes or ensure current page is valid
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Ensure current page is within bounds when results change
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Pagination handlers
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const exportToExcel = async () => {
    if (reports.length === 0) {
      toast.error('No data available to export');
      return;
    }

    try {
      // Get cash reconciliation data for the selected date
      const cashReconciliationData = await cashReconciliationApi.getByDate(selectedDate);
      console.log('Cash reconciliation data for Excel:', cashReconciliationData);
      
      // Use the same sorted and filtered reports as the table display
      const reportsToExport = filteredReports;

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Create worksheet manually for better styling control
      const detailedSheet: any = {};
      let currentRow = 0;

      // Add headers with bold styling in first row
      const headers = [
        'Name of the Brand', 'Size', 'O.B.', 'Received', 'Total', 'C.B.', 'Sales', 'Rate (₹)', 'Sales Amount (₹)'
      ];
      
      headers.forEach((header, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
        detailedSheet[cellRef] = {
          v: header,
          t: 's',
          s: {
            font: { bold: true, sz: 12, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "E6E6FA" } }, // Light lavender background
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          }
        };
      });

      currentRow += 2; // Skip one row for spacing

      if (!detailedSheet['!merges']) detailedSheet['!merges'] = [];

      // Group reports by alcohol type and organize by cost hierarchy
      const groupedByAlcoholType = new Map<number, StockReport[]>();
      
      reportsToExport.forEach(report => {
        const brand = brands.find(b => b.id === report.brand_id);
        const alcoholTypeId = brand?.alcohol_type_id || 0;
        
        if (!groupedByAlcoholType.has(alcoholTypeId)) {
          groupedByAlcoholType.set(alcoholTypeId, []);
        }
        groupedByAlcoholType.get(alcoholTypeId)!.push(report);
      });

      // Define alcohol type priority order (High cost → Mid cost → Low cost whisky, then others)
      const alcoholTypePriority = (alcoholTypeId: number): number => {
        const alcoholType = alcoholTypes.find(t => t.id === alcoholTypeId);
        const typeName = alcoholType?.name.toLowerCase() || '';
        
        if (typeName.includes('whisky') || typeName.includes('whiskey')) {
          if (typeName.includes('high')) return 1;
          if (typeName.includes('mid')) return 2;
          if (typeName.includes('low')) return 3;
          return 4; // Generic whisky
        }
        
        // Other alcohol types come after whisky
        if (typeName.includes('beer')) return 5;
        if (typeName.includes('wine')) return 6;
        if (typeName.includes('rum')) return 7;
        if (typeName.includes('vodka')) return 8;
        if (typeName.includes('brandy')) return 9;
        
        return 10; // Unknown types at the end
      };

      // Sort alcohol types by priority
      const sortedAlcoholTypes = Array.from(groupedByAlcoholType.keys()).sort((a, b) => {
        return alcoholTypePriority(a) - alcoholTypePriority(b);
      });

      // Add data grouped by alcohol type
      let grandTotals = {
        opening_balance: 0,
        received_today: 0,
        total_stock: 0,
        sales_quantity: 0,
        sales_amount: 0,
        closed_balance: 0
      };

      sortedAlcoholTypes.forEach((alcoholTypeId, typeIndex) => {
        const typeReports = groupedByAlcoholType.get(alcoholTypeId) || [];
        const alcoholType = alcoholTypes.find(t => t.id === alcoholTypeId);
        const typeName = alcoholType?.name || 'Unknown Type';

        // Add alcohol type header with spacing
        const typeHeaderRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
        detailedSheet[typeHeaderRef] = {
          v: `🏷️ ${typeName.toUpperCase()}`,
          t: 's',
          s: {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4A90E2" } }, // Blue background
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "medium", color: { rgb: "000000" } },
              right: { style: "medium", color: { rgb: "000000" } }
            }
          }
        };

        // Merge cells for alcohol type header
        detailedSheet['!merges'].push({
          s: { r: currentRow, c: 0 },
          e: { r: currentRow, c: headers.length - 1 }
        });

        currentRow += 1;

        // Sort reports within this alcohol type by highest price first
        const sortedTypeReports = typeReports.sort((a, b) => {
          // First sort by brand's highest rate (costliest brand first)
          const aBrandReports = typeReports.filter(r => r.brand_id === a.brand_id);
          const bBrandReports = typeReports.filter(r => r.brand_id === b.brand_id);
          const aBrandHighestPrice = Math.max(...aBrandReports.map(r => r.rate));
          const bBrandHighestPrice = Math.max(...bBrandReports.map(r => r.rate));
          
          if (aBrandHighestPrice !== bBrandHighestPrice) {
            return bBrandHighestPrice - aBrandHighestPrice; // Descending order
          }
          
          // If same brand or same highest price, sort by brand name for consistency
          const brandComparison = a.brand_name.localeCompare(b.brand_name);
          if (brandComparison !== 0) {
            return brandComparison;
          }
          
          // Then sort by size priority (smaller priority number = higher volume = comes first)
          return getSizePriority(a.size) - getSizePriority(b.size);
        });

        // Add brand data rows for this alcohol type
        let typeTotals = {
          opening_balance: 0,
          received_today: 0,
          total_stock: 0,
          sales_quantity: 0,
          sales_amount: 0,
          closed_balance: 0
        };

        sortedTypeReports.forEach((report) => {
          const dataRow = [
            report.brand_name,
            getSizeDisplayName(report.size),
            report.opening_balance.toString(),
            report.received_today.toString(),
            (report.opening_balance + report.received_today).toString(),
            report.closed_balance.toString(),
            Math.abs(report.sales_quantity).toString(),
            `₹${report.rate.toLocaleString()}`,
            report.sales_amount > 0 ? `₹${report.sales_amount.toLocaleString()}` : '₹0'
          ];
          
          dataRow.forEach((value, colIndex) => {
            const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
            detailedSheet[cellRef] = { 
              v: value, 
              t: 's',
              s: {
                alignment: { horizontal: colIndex === 0 ? "left" : "center" },
                border: {
                  top: { style: "thin", color: { rgb: "CCCCCC" } },
                  bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                  left: { style: "thin", color: { rgb: "CCCCCC" } },
                  right: { style: "thin", color: { rgb: "CCCCCC" } }
                }
              }
            };
          });

          // Add to type totals
          typeTotals.opening_balance += report.opening_balance;
          typeTotals.received_today += report.received_today;
          typeTotals.total_stock += (report.opening_balance + report.received_today);
          typeTotals.sales_quantity += Math.abs(report.sales_quantity);
          typeTotals.sales_amount += report.sales_amount;
          typeTotals.closed_balance += report.closed_balance;

          currentRow += 1;
        });

        // Add type subtotal row
        const typeSubtotalRow = [
          `📊 ${typeName} Subtotal`,
          '',
          typeTotals.opening_balance.toString(),
          typeTotals.received_today.toString(),
          typeTotals.total_stock.toString(),
          typeTotals.closed_balance.toString(),
          typeTotals.sales_quantity.toString(),
          '',
          `₹${typeTotals.sales_amount.toLocaleString()}`
        ];

        typeSubtotalRow.forEach((value, colIndex) => {
          const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          detailedSheet[cellRef] = {
            v: value,
            t: 's',
            s: {
              font: { bold: true, sz: 10 },
              fill: { fgColor: { rgb: "F0F8FF" } }, // Light blue background for subtotals
              alignment: { horizontal: "center" },
              border: {
                top: { style: "medium", color: { rgb: "000000" } },
                bottom: { style: "medium", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            }
          };
        });

        // Add to grand totals
        grandTotals.opening_balance += typeTotals.opening_balance;
        grandTotals.received_today += typeTotals.received_today;
        grandTotals.total_stock += typeTotals.total_stock;
        grandTotals.sales_quantity += typeTotals.sales_quantity;
        grandTotals.sales_amount += typeTotals.sales_amount;
        grandTotals.closed_balance += typeTotals.closed_balance;

        currentRow += 2; // Add spacing between alcohol types
      });

      // Add grand totals row
      const grandTotalsRow = [
        '⭐ GRAND TOTALS',
        '',
        grandTotals.opening_balance.toString(),
        grandTotals.received_today.toString(),
        grandTotals.total_stock.toString(),
        grandTotals.closed_balance.toString(),
        grandTotals.sales_quantity.toString(),
        '',
        `₹${grandTotals.sales_amount.toLocaleString()}`
      ];

      grandTotalsRow.forEach((value, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
        detailedSheet[cellRef] = {
          v: value,
          t: 's',
          s: {
            font: { bold: true, sz: 12 },
            fill: { fgColor: { rgb: "FFD700" } }, // Gold background for grand totals
            alignment: { horizontal: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "medium", color: { rgb: "000000" } },
              right: { style: "medium", color: { rgb: "000000" } }
            }
          }
        };
      });

      currentRow += 3; // Add spacing before cash reconciliation

      // Add Cash Reconciliation section at the bottom
      const cashHeaderRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
      detailedSheet[cashHeaderRef] = {
        v: '💰 DAILY CASH RECONCILIATION',
        t: 's',
        s: {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "E74C3C" } }, // Red background
          alignment: { horizontal: "center" },
          border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "medium", color: { rgb: "000000" } },
            right: { style: "medium", color: { rgb: "000000" } }
          }
        }
      };
      
      // Merge cells for the cash reconciliation header
      detailedSheet['!merges'].push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: headers.length - 1 }
      });
      
      currentRow += 1;

      // Cash Reconciliation data rows
      const cashReconciliationRows = [
        ['Opening Balance (Previous Day Closing)', `₹${(cashReconciliationData?.opening_balance || 0).toLocaleString()}`],
        ['Total Sales', `₹${(cashReconciliationData?.total_sales || 0).toLocaleString()}`],
        ['Office Cash Given', `₹${(cashReconciliationData?.office_cash || 0).toLocaleString()}`],
        ['Online Cash Received', `₹${(cashReconciliationData?.online_cash || 0).toLocaleString()}`],
        ['Daily Expenditure', `₹${(cashReconciliationData?.expenditure || 0).toLocaleString()}`],
        ['Closing Balance (Today)', `₹${(cashReconciliationData?.closing_balance || 0).toLocaleString()}`],
      ];

      cashReconciliationRows.forEach((row, index) => {
        const rowIndex = currentRow + index;
        
        // Label column
        const labelRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        detailedSheet[labelRef] = {
          v: row[0],
          t: 's',
          s: {
            font: { bold: true, sz: 10 },
            alignment: { horizontal: "left" },
            border: {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            }
          }
        };
        
        // Value column
        const valueRef = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
        detailedSheet[valueRef] = {
          v: row[1],
          t: 's',
          s: {
            font: { sz: 10 },
            alignment: { horizontal: "right" },
            border: {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            }
          }
        };
      });

      currentRow += cashReconciliationRows.length + 1;

      // Add formula row for closing balance calculation
      const formulaRef = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
      detailedSheet[formulaRef] = {
        v: '📊 Formula: (Total Sales + Opening Balance) - Office Cash - Online Cash - Expenditure',
        t: 's',
        s: {
          font: { italic: true, sz: 9, color: { rgb: "666666" } },
          alignment: { horizontal: "left" }
        }
      };
      
      // Merge cells for the formula
      detailedSheet['!merges'].push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: headers.length - 1 }
      });

      // Update worksheet range to include all data
      detailedSheet['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: currentRow, c: headers.length - 1 }
      });
      
      // Set column widths
      detailedSheet['!cols'] = [
        { width: 25 }, // Name of the Brand
        { width: 10 }, // Size
        { width: 10 }, // O.B.
        { width: 12 }, // Received
        { width: 10 }, // Total
        { width: 10 }, // C.B.
        { width: 10 }, // Sales
        { width: 15 }, // Rate
        { width: 18 }  // Sales Amount
      ];



      // Add the main sheet to workbook
      XLSX.utils.book_append_sheet(workbook, detailedSheet, `📋 Wine Shop Report ${selectedDate}`);

      // Generate filename with date
      const filename = `Wine_Shop_Report_${selectedDate.replace(/-/g, '_')}.xlsx`;
      
      // Save the file
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Report exported successfully as ${filename}`);
    } catch (error: any) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel report. Please try again.');
    }
  };

  return (
    <div className="page-container">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      <div className="reports-header">
        <div className="reports-header-left">
          <h1 className="page-title">Daily Stock Reports</h1>
          <p className="reports-subtitle">
            Comprehensive daily inventory analysis for {formatDate(selectedDate)}
          </p>
        </div>
        <div className="reports-header-right">
          {/* Download Excel button moved to filters section for better UX */}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-4">
        <div className="card summary-card opening-balance">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <h3>Opening Balance</h3>
            <p className="summary-value">{filteredTotals.opening_balance}</p>
            <span className="summary-label">bottles</span>
          </div>
        </div>
        <div className="card summary-card received-today">
          <div className="summary-icon">📥</div>
          <div className="summary-content">
            <h3>Received Today</h3>
            <p className="summary-value">{filteredTotals.received_today}</p>
            <span className="summary-label">bottles</span>
          </div>
        </div>
        <div className="card summary-card sales-today">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Sales Today</h3>
            <p className="summary-value">{filteredTotals.sales_quantity}</p>
            <span className="summary-label">bottles</span>
            <p className="summary-amount">₹{filteredTotals.sales_amount.toLocaleString()}</p>
          </div>
        </div>
        <div className="card summary-card closing-balance">
          <div className="summary-icon">📋</div>
          <div className="summary-content">
            <h3>Closing Balance</h3>
            <p className="summary-value">{filteredTotals.closed_balance}</p>
            <span className="summary-label">bottles</span>
          </div>
        </div>
      </div>

      {/* Manual Stock Entry Section */}
      {/* <div className="card manual-entry-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>📝 Manual Stock Entry</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
              Enter end-of-day stock counts manually (Received Today & Sales Quantity)
            </p>
          </div>
          <button 
            className="btn btn-info btn-sm"
            onClick={() => setShowManualEntry(!showManualEntry)}
          >
            {showManualEntry ? '▼ Hide Entry Form' : '▶ Show Entry Form'}
          </button>
        </div>
        
        {showManualEntry && (
          <ManualStockEntryForm 
            brands={brands}
            onEntrySubmitted={fetchReports}
            selectedDate={selectedDate}
          />
        )}
      </div> */}

      {/* Detailed Report Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Detailed Stock Report</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
              💡 Click on "Received Today" or "Sales Qty" values to edit them directly. Changes will auto-calculate and update immediately.
            </p>
          </div>
          {/* Temporarily hidden as requested - not required for now */}
          {/* <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => window.print()}
            >
              🖨️ Print Report
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={fetchReports}
              disabled={loading}
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div> */}
        </div>

        {/* Search Bar - Above filters for better workflow */}
        <div style={{ 
          marginBottom: '1rem'
        }}>
          <div style={{ 
            position: 'relative',
            maxWidth: '400px'
          }}>
            <input
              type="text"
              placeholder="🔍 Search by brand name or size..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: searchQuery ? '40px' : '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Inline Filters - Right above the table for easy access */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'end',
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap'
        }}>
          <div style={{ minWidth: '140px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
              📅 Report Date
            </label>
            <input
              type="date"
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: '100%'
              }}
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div style={{ minWidth: '160px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
              🍷 Alcohol Type
            </label>
            <select
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: '100%',
                backgroundColor: 'white'
              }}
              value={selectedAlcoholType || ''}
              onChange={handleAlcoholTypeChange}
            >
              <option value="">All Alcohol Types</option>
              {alcoholTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Only show Brand dropdown when a specific alcohol type is selected */}
          {selectedAlcoholType && (
            <div style={{ minWidth: '160px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
                🏷️ Brand
              </label>
              <select
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  width: '100%',
                  backgroundColor: 'white'
                }}
                value={selectedBrand}
                onChange={handleBrandChange}
              >
                <option value="">All Brands</option>
                {brands.filter(brand => brand.alcohol_type_id === selectedAlcoholType).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
              &nbsp;
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {reports.length > 0 && (
                <button 
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={exportToExcel}
                  title="Download Excel Report"
                >
                  📊 Download Excel
                </button>
              )}
              <button 
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setSelectedAlcoholType(null);
                  setSelectedBrand('');
                }}
              >
                🔄 Reset Filters
              </button>
            </div>
          </div>
        </div>



        {/* Pagination Controls */}
        {!loading && filteredReports.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-left">
              <label className="items-per-page-label">
                Items per page:
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="items-per-page-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            
            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="pagination-right">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  Previous
                </button>
                
                <div className="pagination-pages">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    
                    if (totalPages <= maxVisiblePages) {
                      // Show all pages if total is small
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            className={`page-button ${i === currentPage ? 'active' : ''}`}
                          >
                            {i}
                          </button>
                        );
                      }
                    } else {
                      // Always show first page
                      pages.push(
                        <button
                          key={1}
                          onClick={() => handlePageChange(1)}
                          className={`page-button ${1 === currentPage ? 'active' : ''}`}
                        >
                          1
                        </button>
                      );
                      
                      // Show ellipsis if needed
                      if (currentPage > 3) {
                        pages.push(
                          <span key="ellipsis1" style={{ padding: '0.375rem', color: '#6b7280' }}>
                            ...
                          </span>
                        );
                      }
                      
                      // Show current page and surrounding pages
                      const start = Math.max(2, currentPage - 1);
                      const end = Math.min(totalPages - 1, currentPage + 1);
                      
                      for (let i = start; i <= end; i++) {
                        if (i !== 1 && i !== totalPages) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => handlePageChange(i)}
                              className={`page-button ${i === currentPage ? 'active' : ''}`}
                            >
                              {i}
                            </button>
                          );
                        }
                      }
                      
                      // Show ellipsis if needed
                      if (currentPage < totalPages - 2) {
                        pages.push(
                          <span key="ellipsis2" style={{ padding: '0.375rem', color: '#6b7280' }}>
                            ...
                          </span>
                        );
                      }
                      
                      // Always show last page
                      if (totalPages > 1) {
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => handlePageChange(totalPages)}
                            className={`page-button ${totalPages === currentPage ? 'active' : ''}`}
                          >
                            {totalPages}
                          </button>
                        );
                      }
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  Next
                </button>
                
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner"></div>
            <p>Loading stock reports...</p>
          </div>
        ) : reports.length > 0 ? (
          filteredReports.length > 0 ? (
            <div className="table-container">
              <table className="table reports-table">
                <thead>
                  <tr>
                    <th>Name of the<br />Brand</th>
                    <th>Size</th>
                    <th>O.B.</th>
                    <th>Received</th>
                    <th>Total</th>
                    <th>C.B.</th>
                    <th>Sales</th>
                    <th>Rate<br />(₹)</th>
                    <th>Sales<br />Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReports.map((report, index) => (
                    <tr key={`${report.brand_id}-${report.size}`} className={(startIndex + index) % 2 === 0 ? 'even-row' : 'odd-row'}>
                      <td className="brand-name">{report.brand_name}</td>
                      <td className="size">{getSizeDisplayName(report.size)}</td>
                      <td className="opening-balance">{report.opening_balance}</td>
                      <td className="received-today">
                        {renderEditableCell(report, 'received_today')}
                      </td>
                      <td className="total-stock">{report.opening_balance + report.received_today}</td>
                      <td className="closing-balance">{report.closed_balance}</td>
                      <td className="sales-quantity">
                        {renderEditableCell(report, 'sales_quantity')}
                      </td>
                      <td className="rate">₹{report.rate.toLocaleString()}</td>
                      <td className="sales-amount">
                        {report.sales_amount > 0 ? (
                          <span className="sales-amount-value">₹{report.sales_amount.toLocaleString()}</span>
                        ) : (
                          <span className="zero-value">₹0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td colSpan={2}><strong>{searchQuery ? 'FILTERED TOTALS' : 'TOTALS'}</strong></td>
                    <td><strong>{filteredTotals.opening_balance}</strong></td>
                    <td>
                      <strong className="positive-value">
                        {filteredTotals.received_today > 0 ? `+${filteredTotals.received_today}` : '0'}
                      </strong>
                    </td>
                    <td><strong>{filteredTotals.total_stock}</strong></td>
                    <td><strong>{filteredTotals.closed_balance}</strong></td>
                    <td>
                      <strong className="negative-value">
                        {filteredTotals.sales_quantity > 0 ? `-${filteredTotals.sales_quantity}` : '0'}
                      </strong>
                    </td>
                    <td>-</td>
                    <td><strong className="sales-amount-value">₹{filteredTotals.sales_amount.toLocaleString()}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No Results Found</h3>
              <p>No brands or sizes match your search query: <strong>"{searchQuery}"</strong></p>
              <p>Try searching with different keywords like brand names or sizes (D, N, P, Q, 90ml, 180ml, etc.)</p>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={clearSearch}
                style={{ marginTop: '1rem' }}
              >
                Clear Search
              </button>
            </div>
          )
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Data Available</h3>
            <p>No stock data found for {formatDate(selectedDate)}.</p>
            <p>Try selecting a different date or ensure stock movements exist for this period.</p>
          </div>
        )}
      </div>

      {/* Cash Reconciliation */}
      <CashReconciliation 
        selectedDate={selectedDate}
        key={`cash-reconciliation-${selectedDate}`}
      />

      {/* Business Insights */}
      {reports.length > 0 && (
        <div className="card insights-card">
          <h3 style={{ marginBottom: '1rem' }}>📈 Business Insights</h3>
          <div className="grid grid-2">
            <div className="insight-item">
              <h4>📊 Inventory Turnover</h4>
              <p>
                {totals.sales_quantity > 0 && totals.opening_balance > 0 ? (
                  <>
                    <strong>{((totals.sales_quantity / totals.opening_balance) * 100).toFixed(1)}%</strong> of opening stock sold today
                  </>
                ) : (
                  <span className="muted">No sales data available</span>
                )}
              </p>
            </div>
            <div className="insight-item">
              <h4>💡 Stock Health</h4>
              <p>
                {totals.defective_quantity > 0 ? (
                  <>
                    <strong className="defective-value">{totals.defective_quantity}</strong> defective bottles need attention
                  </>
                ) : (
                  <span className="positive-value">✅ No defective bottles reported</span>
                )}
              </p>
            </div>
            <div className="insight-item">
              <h4>🎯 Daily Performance</h4>
              <p>
                {totals.sales_amount > 0 ? (
                  <>
                    Average sale per bottle: <strong>₹{(totals.sales_amount / totals.sales_quantity).toFixed(2)}</strong>
                  </>
                ) : (
                  <span className="muted">No sales recorded today</span>
                )}
              </p>
            </div>
            <div className="insight-item">
              <h4>📦 Stock Movement</h4>
              <p>
                {totals.received_today > 0 ? (
                  <>
                    <strong className="positive-value">+{totals.received_today}</strong> bottles received today
                  </>
                ) : (
                  <span className="muted">No stock received today</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default ReportsPage;