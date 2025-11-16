import React, { useState, useEffect } from 'react';
import { invoiceService } from '../services/invoiceService';
import { InvoiceItem } from '../types/invoice';

interface InvoiceItemsListProps {
  icdcNumber?: string;
  refreshTrigger?: number;
}

const InvoiceItemsList: React.FC<InvoiceItemsListProps> = ({ icdcNumber, refreshTrigger }) => {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIcdc, setSelectedIcdc] = useState(icdcNumber || '');

  // Get unique ICDC numbers for filter dropdown
  const uniqueIcdcNumbers = Array.from(new Set(items.map(item => item.icdc_number).filter(Boolean)));

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await invoiceService.getAllInvoiceItems(icdcNumber);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [icdcNumber]);

  const filterItems = React.useCallback(() => {
    let filtered = items;

    // Filter by selected ICDC number
    if (selectedIcdc) {
      filtered = filtered.filter(item => item.icdc_number === selectedIcdc);
    }

    // Filter by search term (brand name or brand code)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.brand_name?.toLowerCase().includes(term) ||
        item.brand_code?.toLowerCase().includes(term)
      );
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, selectedIcdc]);

  useEffect(() => {
    loadItems();
  }, [loadItems, refreshTrigger]);

  useEffect(() => {
    filterItems();
  }, [filterItems]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await invoiceService.deleteInvoiceItem(id);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const formatCurrency = (amount?: number) => {
    return amount ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading invoice items...</p>
      </div>
    );
  }

  return (
    <div className="invoice-items-list">
      <div className="list-header">
        <h3>Invoice Items {icdcNumber && `- ${icdcNumber}`}</h3>
        
        <div className="list-filters">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by brand name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {!icdcNumber && uniqueIcdcNumbers.length > 0 && (
            <div className="filter-container">
              <select
                value={selectedIcdc}
                onChange={(e) => setSelectedIcdc(e.target.value)}
                className="filter-select"
              >
                <option value="">All ICDC Numbers</option>
                {uniqueIcdcNumbers.map(icdc => (
                  <option key={icdc} value={icdc}>{icdc}</option>
                ))}
              </select>
            </div>
          )}

          <button onClick={loadItems} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {filteredItems.length === 0 && !loading ? (
        <div className="no-data">
          <p>No invoice items found</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ICDC #</th>
                <th>Sl. No.</th>
                <th>Brand Code</th>
                <th>Brand Name</th>
                <th>Product Type</th>
                <th>Pack</th>
                <th>Size (ml)</th>
                <th>Cases</th>
                <th>Bottles</th>
                <th>Rate/Case</th>
                <th>Rate/Bottle</th>
                <th>Total Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.icdc_number || '-'}</td>
                  <td>{item.sl_no}</td>
                  <td>{item.brand_code || '-'}</td>
                  <td className="brand-name">{item.brand_name || '-'}</td>
                  <td>{item.product_type || '-'}</td>
                  <td>
                    {item.pack_type && item.pack_qty ? 
                      `${item.pack_type}/${item.pack_qty}` : '-'}
                  </td>
                  <td>{item.size_ml || '-'}</td>
                  <td className="quantity">{item.qty_cases_delivered || 0}</td>
                  <td className="quantity">{item.qty_bottles_delivered || 0}</td>
                  <td className="currency">{formatCurrency(item.rate_per_case)}</td>
                  <td className="currency">{formatCurrency(item.rate_per_bottle)}</td>
                  <td className="currency total-amount">{formatCurrency(item.total_amount)}</td>
                  <td className="date">{formatDate(item.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn btn-danger btn-small"
                      title="Delete item"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <div className="summary-stats">
              <span><strong>Total Items:</strong> {filteredItems.length}</span>
              <span><strong>Total Cases:</strong> {filteredItems.reduce((sum, item) => sum + (item.qty_cases_delivered || 0), 0)}</span>
              <span><strong>Total Bottles:</strong> {filteredItems.reduce((sum, item) => sum + (item.qty_bottles_delivered || 0), 0)}</span>
              <span><strong>Total Amount:</strong> {formatCurrency(filteredItems.reduce((sum, item) => sum + (item.total_amount || 0), 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceItemsList;