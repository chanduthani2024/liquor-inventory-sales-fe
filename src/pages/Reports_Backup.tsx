import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { stockMovementsApi, brandApi } from '../services/api';
import { StockReport, Brand } from '../types';
import * as XLSX from 'xlsx';
import './Reports.css';

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<StockReport[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchBrands = async () => {
    try {
      const brandData = await brandApi.getAll();
      setBrands(brandData);
    } catch (err: any) {
      console.error('Failed to fetch brands:', err);
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
      setReports(reportData);
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
    fetchReports();
  }, [fetchReports]);

  // Calculate totals
  const totals = reports.reduce(
    (acc, report) => ({
      opening_balance: acc.opening_balance + report.opening_balance,
      received_today: acc.received_today + report.received_today,
      total_stock: acc.total_stock + report.total_stock,
      sales_quantity: acc.sales_quantity + report.sales_quantity,
      sales_amount: acc.sales_amount + report.sales_amount,
      defective_quantity: acc.defective_quantity + report.defective_quantity,
    }),
    {
      opening_balance: 0,
      received_today: 0,
      total_stock: 0,
      sales_quantity: 0,
      sales_amount: 0,
      defective_quantity: 0,
    }
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const exportToExcel = () => {
    if (reports.length === 0) {
      toast.error('No data available to export');
      return;
    }

    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // 🎯 PRIMARY SHEET: Individual Brand Details (exactly what user requested)
    const brandDetailsData = [
      ['🍷 INDIVIDUAL BRAND STOCK DETAILS - ' + formatDate(selectedDate)],
      [`📊 Total Brands/Sizes: ${reports.length} individual entries`],
      ['📋 Each row below shows one brand-size combination with complete stock details'],
      [''],
      [
        'Brand Name',
        'Size', 
        'Opening Balance',
        'Received Today',
        'Total Stock',
        'Sales Qty',
        'Rate (₹)',
        'Sales Amount (₹)',
        'Defective',
        'Closing Balance'
      ]
    ];

    // Add each individual brand/size row
    reports.forEach((report, index) => {
      console.log(`Adding brand row ${index + 1}:`, {
        brand: report.brand_name,
        size: report.size,
        opening: report.opening_balance,
        received: report.received_today,
        sales: report.sales_quantity,
        closing: report.closed_balance
      });
      
      brandDetailsData.push([
        report.brand_name,
        report.size,
        report.opening_balance.toString(),
        report.received_today > 0 ? `+${report.received_today}` : '0',
        report.total_stock.toString(),
        report.sales_quantity > 0 ? `-${report.sales_quantity}` : '0',
        `₹${report.rate.toLocaleString()}`,
        report.sales_amount > 0 ? `₹${report.sales_amount.toLocaleString()}` : '₹0',
        report.defective_quantity > 0 ? report.defective_quantity.toString() : '0',
        report.closed_balance.toString()
      ]);
    });

    // Add totals row
    brandDetailsData.push(['']);
    brandDetailsData.push([
      '⭐ TOTALS',
      '',
      totals.opening_balance.toString(),
      totals.received_today > 0 ? `+${totals.received_today}` : '0',
      totals.total_stock.toString(),
      totals.sales_quantity > 0 ? `-${totals.sales_quantity}` : '0',
      '',
      `₹${totals.sales_amount.toLocaleString()}`,
      totals.defective_quantity > 0 ? totals.defective_quantity.toString() : '0',
      totals.total_stock.toString()
    ]);

    // Create the primary sheet
    const brandDetailsSheet = XLSX.utils.aoa_to_sheet(brandDetailsData);
    
    // Auto-size columns for better readability
    brandDetailsSheet['!cols'] = [
      { width: 20 }, // Brand Name
      { width: 10 }, // Size
      { width: 15 }, // Opening Balance
      { width: 15 }, // Received Today
      { width: 12 }, // Total Stock
      { width: 12 }, // Sales Qty
      { width: 12 }, // Rate
      { width: 15 }, // Sales Amount
      { width: 12 }, // Defective
      { width: 15 }  // Closing Balance
    ];

    // Add the main sheet first (most important)
    XLSX.utils.book_append_sheet(workbook, brandDetailsSheet, 'Brand Details');

    // Generate filename with date
    const filename = `Wine_Shop_Brand_Details_${selectedDate.replace(/-/g, '_')}.xlsx`;
    
    // Save the file
    XLSX.writeFile(workbook, filename);
    toast.success(`✅ Brand Details exported! ${reports.length} individual brand entries included.`);
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
          {reports.length > 0 && (
            <button 
              className="btn btn-success export-btn"
              onClick={exportToExcel}
              title="Download Excel Report"
            >
              📊 Download Excel
            </button>
          )}
          <button 
            className="btn btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {/* Filters Card */}
      {showFilters && (
        <div className="card filters-card">
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group">
                <label htmlFor="date-filter" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  Select Date
                </label>
                <input
                  id="date-filter"
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ marginTop: '0.25rem' }}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="brand-filter" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  Filter by Brand
                </label>
                <select
                  id="brand-filter"
                  className="form-control"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  style={{ marginTop: '0.25rem' }}
                >
                  <option value="">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button 
                className="btn btn-primary"
                onClick={fetchReports}
                disabled={loading}
                style={{ height: 'fit-content' }}
              >
                {loading ? '🔄 Loading...' : '🔍 Apply Filters'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid-4">
        <div className="card summary-card opening-balance">
          <div className="summary-icon">🏪</div>
          <div className="summary-content">
            <h3>Opening Balance</h3>
            <p className="summary-value">{totals.opening_balance}</p>
            <span className="summary-label">bottles</span>
          </div>
        </div>
        <div className="card summary-card received-today">
          <div className="summary-icon">📥</div>
          <div className="summary-content">
            <h3>Received Today</h3>
            <p className="summary-value">{totals.received_today}</p>
            <span className="summary-label">bottles</span>
          </div>
        </div>
        <div className="card summary-card sales-today">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Sales Today</h3>
            <p className="summary-value">{totals.sales_quantity}</p>
            <span className="summary-label">bottles</span>
            <p className="summary-amount">₹{totals.sales_amount.toLocaleString()}</p>
          </div>
        </div>
        <div className="card summary-card closing-balance">
          <div className="summary-icon">📋</div>
          <div className="summary-content">
            <h3>Closing Balance</h3>
            <p className="summary-value">{totals.total_stock}</p>
            <span className="summary-label">bottles</span>
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Detailed Stock Report</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner"></div>
            <p>Loading stock reports...</p>
          </div>
        ) : reports.length > 0 ? (
          <div className="table-container">
            <table className="table reports-table">
              <thead>
                <tr>
                  <th>Brand Name</th>
                  <th>Size</th>
                  <th>Opening Balance</th>
                  <th>Received Today</th>
                  <th>Total Stock</th>
                  <th>Sales Qty</th>
                  <th>Rate (₹)</th>
                  <th>Sales Amount (₹)</th>
                  <th>Defective</th>
                  <th>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr key={`${report.brand_id}-${report.size}`} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <td className="brand-name">{report.brand_name}</td>
                    <td className="size">{report.size}</td>
                    <td className="opening-balance">{report.opening_balance}</td>
                    <td className="received-today">
                      {report.received_today > 0 && (
                        <span className="positive-value">+{report.received_today}</span>
                      )}
                      {report.received_today === 0 && <span className="zero-value">0</span>}
                    </td>
                    <td className="total-stock">{report.total_stock}</td>
                    <td className="sales-quantity">
                      {report.sales_quantity > 0 && (
                        <span className="negative-value">-{report.sales_quantity}</span>
                      )}
                      {report.sales_quantity === 0 && <span className="zero-value">0</span>}
                    </td>
                    <td className="rate">₹{report.rate.toLocaleString()}</td>
                    <td className="sales-amount">
                      {report.sales_amount > 0 ? (
                        <span className="sales-amount-value">₹{report.sales_amount.toLocaleString()}</span>
                      ) : (
                        <span className="zero-value">₹0</span>
                      )}
                    </td>
                    <td className="defective-quantity">
                      {report.defective_quantity > 0 ? (
                        <span className="defective-value">{report.defective_quantity}</span>
                      ) : (
                        <span className="zero-value">0</span>
                      )}
                    </td>
                    <td className="closing-balance">{report.closed_balance}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={2}><strong>TOTALS</strong></td>
                  <td><strong>{totals.opening_balance}</strong></td>
                  <td>
                    <strong className="positive-value">
                      {totals.received_today > 0 ? `+${totals.received_today}` : '0'}
                    </strong>
                  </td>
                  <td><strong>{totals.total_stock}</strong></td>
                  <td>
                    <strong className="negative-value">
                      {totals.sales_quantity > 0 ? `-${totals.sales_quantity}` : '0'}
                    </strong>
                  </td>
                  <td>-</td>
                  <td><strong className="sales-amount-value">₹{totals.sales_amount.toLocaleString()}</strong></td>
                  <td><strong className="defective-value">{totals.defective_quantity}</strong></td>
                  <td><strong>{totals.total_stock}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Data Available</h3>
            <p>No stock reports found for the selected date.</p>
            <p>Try selecting a different date or check if you have stock movements recorded.</p>
          </div>
        )}
      </div>

      {/* Business Insights */}
      {reports.length > 0 && (
        <div className="card insights-card">
          <h3 style={{ marginBottom: '1rem' }}>💡 Business Insights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div className="insight-item">
              <h4>📈 Inventory Turnover</h4>
              <p>
                {totals.opening_balance > 0 ? (
                  <>
                    <strong className="positive-value">{((totals.sales_quantity / totals.opening_balance) * 100).toFixed(1)}%</strong> of opening stock sold today
                  </>
                ) : (
                  <span className="muted">No opening stock to calculate turnover</span>
                )}
              </p>
            </div>
            <div className="insight-item">
              <h4>💰 Average Sale Price</h4>
              <p>
                {totals.sales_quantity > 0 ? (
                  <>
                    <strong className="positive-value">₹{(totals.sales_amount / totals.sales_quantity).toFixed(2)}</strong> per bottle average
                  </>
                ) : (
                  <span className="muted">No sales recorded today</span>
                )}
              </p>
            </div>
            <div className="insight-item">
              <h4>🔍 Stock Health</h4>
              <p>
                {totals.defective_quantity > 0 ? (
                  <>
                    <strong className="negative-value">{totals.defective_quantity}</strong> defective bottles need attention
                  </>
                ) : (
                  <span className="positive-value">All stock in good condition</span>
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
    </div>
  );
};

export default ReportsPage;