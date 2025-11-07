import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../services/api';
import { DashboardData } from '../types';
import { getSizeDisplayName } from '../utils/sizeMapping';
import RevenueChart from '../components/RevenueChart';
import Footer from '../components/Footer';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('today');

  // Quick filter options
  const getQuickFilterDates = (filter: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (filter) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'yesterday':
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0],
        };
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        return {
          startDate: last7Days.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'last30days':
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        return {
          startDate: last30Days.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'thisweek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'thismonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      default:
        return dateFilter;
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getData(dateFilter.startDate, dateFilter.endDate);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
    setSelectedQuickFilter('custom');
  };

  const handleQuickFilter = (filter: string) => {
    console.log('🔍 [Dashboard] handleQuickFilter called with:', filter);
    console.log('🔍 [Dashboard] Current selectedQuickFilter:', selectedQuickFilter);
    
    setSelectedQuickFilter(filter);
    const dates = getQuickFilterDates(filter);
    console.log('🔍 [Dashboard] New dates:', dates);
    setDateFilter(dates);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Wine Shop Overview</p>
        </div>
        <div className="card">
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Wine Shop Overview</p>
        </div>
        <div className="card">
          <p style={{ color: 'red' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Wine Shop Overview</p>
      </div>

      {/* Date Filter */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Date Filter</h3>
        
        {/* Quick Filter Buttons */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="quick-filter-buttons">
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'last7days', label: 'Last 7 Days' },
              { key: 'last30days', label: 'Last 30 Days' },
              { key: 'thisweek', label: 'This Week' },
              { key: 'thismonth', label: 'This Month' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`quick-filter-btn ${selectedQuickFilter === option.key ? 'active' : 'inactive'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔍 [Dashboard] Button clicked:', option.key);
                  handleQuickFilter(option.key);
                }}
                onTouchStart={(e) => {
                  console.log('🔍 [Dashboard] Touch start:', option.key);
                  // Add visual feedback
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔍 [Dashboard] Touch end:', option.key);
                  // Reset visual feedback
                  e.currentTarget.style.transform = '';
                  handleQuickFilter(option.key);
                }}
                onTouchCancel={(e) => {
                  console.log('🔍 [Dashboard] Touch cancelled:', option.key);
                  // Reset visual feedback
                  e.currentTarget.style.transform = '';
                }}
                onMouseDown={(e) => {
                  console.log('🔍 [Dashboard] Mouse down:', option.key);
                }}
                // Backup using onPointerUp for broader compatibility
                onPointerUp={(e) => {
                  console.log('🔍 [Dashboard] Pointer up:', option.key, 'pointerType:', e.pointerType);
                  if (e.pointerType === 'touch') {
                    handleQuickFilter(option.key);
                  }
                }}
                style={{
                  // Ensure button is properly positioned and clickable
                  position: 'relative',
                  zIndex: 1,
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  userSelect: 'none',
                  // Critical: Ensure the button is properly sized and has touch area
                  minHeight: '48px',
                  minWidth: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div>
          <h4 style={{ marginBottom: '0.75rem', color: '#374151', fontSize: '1rem' }}>
            Custom Date Range
          </h4>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className={`custom-date-input ${selectedQuickFilter === 'custom' ? 'active' : ''}`}
                value={dateFilter.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className={`custom-date-input ${selectedQuickFilter === 'custom' ? 'active' : ''}`}
                value={dateFilter.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
          </div>
          
          {/* Date Range Display */}
          <div className="date-range-display">
            <strong>Selected Range:</strong> {new Date(dateFilter.startDate).toLocaleDateString()} 
            {dateFilter.startDate !== dateFilter.endDate && 
              ` - ${new Date(dateFilter.endDate).toLocaleDateString()}`
            }
            {dateFilter.startDate === dateFilter.endDate && ' (Single Day)'}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboardData && (
        <>
          <div className="dashboard-summary-cards">
            <div className="summary-card revenue">
              <h3>💰 Total Revenue</h3>
              <p className="value">
                ₹{dashboardData.summary.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="summary-card stock-value">
              <h3>📦 Stock Value</h3>
              <p className="value">
                ₹{dashboardData.summary.totalStockValue.toLocaleString()}
              </p>
            </div>
            <div className="summary-card brands">
              <h3>🍷 Total Brands</h3>
              <p className="value">
                {dashboardData.summary.totalBrands}
              </p>
            </div>
            <div className="summary-card items">
              <h3>📋 Stock Items</h3>
              <p className="value">
                {dashboardData.summary.totalStockItems}
              </p>
            </div>
            <div className={`summary-card low-stock ${dashboardData.summary.lowStockCount > 0 ? 'warning' : 'normal'}`}>
              <h3>
                {dashboardData.summary.lowStockCount > 0 ? '🚨 Low Stock Alert' : '✅ Stock Status'}
              </h3>
              <p className="value">
                {dashboardData.summary.lowStockCount}
              </p>
              <p className="sub-value">
                {dashboardData.summary.lowStockCount > 0 
                  ? `items ≤ 5 bottles`
                  : 'items well stocked'
                }
              </p>
            </div>
          </div>

          {/* Revenue Chart */}
          <RevenueChart maxValue={1200000} />

          {/* Low Stock Alert Section */}
          {dashboardData.lowStockItems && dashboardData.lowStockItems.length > 0 && (
            <div className="card low-stock-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ color: '#dc2626', margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>
                    🚨 Critical Low Stock Alert
                  </h3>
                  <p style={{ color: '#7f1d1d', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                    {dashboardData.lowStockItems.length} {dashboardData.lowStockItems.length === 1 ? 'item' : 'items'} with ≤ 5 bottles remaining
                  </p>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/stock'}
                  style={{ 
                    background: '#ef4444', 
                    borderColor: '#dc2626',
                    fontSize: '0.875rem',
                    padding: '0.75rem 1.5rem',
                    fontWeight: '600',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  📦 Manage Stock
                </button>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Size</th>
                      <th>Current Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                <tbody>
                  {dashboardData.lowStockItems.map((stock) => (
                    <tr key={stock.id} className="low-stock-row">
                      <td style={{ fontWeight: '600' }}>{stock.brand.name}</td>
                      <td>{getSizeDisplayName(stock.size)}</td>
                      <td>
                        <span className={`stock-quantity ${stock.quantity === 0 ? 'out-of-stock' : 'low-stock'}`}>
                          {stock.quantity} bottles
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${stock.quantity === 0 ? 'out-of-stock' : 'low-stock'}`}>
                          {stock.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Selling Brands */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Top Selling Products</h3>
            {dashboardData.topSellingBrands.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Size</th>
                      <th>Quantity Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.topSellingBrands.map((brand, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: '600' }}>{brand.brand_name}</td>
                      <td>
                        <span style={{ 
                          background: '#f1f5f9', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#475569'
                        }}>
                          {getSizeDisplayName(brand.size)}
                        </span>
                      </td>
                      <td>{brand.total_quantity} bottles</td>
                      <td style={{ fontWeight: '600', color: '#059669' }}>
                        ₹{parseFloat(brand.total_revenue).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No sales data for the selected date range.</p>
            )}
          </div>

          {/* Current Stock Overview */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Current Stock Overview (Top 10)</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                  <th>Brand</th>
                  <th>Size</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.currentStock.slice(0, 10).map((stock) => {
                  const unitPrice = 
                    stock.size === '90ml' ? stock.brand.price_90ml :
                    stock.size === '180ml' ? stock.brand.price_180ml :
                    stock.size === '330ml' ? stock.brand.price_330ml :
                    stock.size === '375ml' ? stock.brand.price_375ml :
                    stock.size === '500ml' ? stock.brand.price_500ml :
                    stock.size === '650ml' ? stock.brand.price_650ml :
                    stock.size === '750ml' ? stock.brand.price_750ml :
                    stock.size === '1L' ? stock.brand.price_1l :
                    stock.size === '2L' ? stock.brand.price_2l :
                    null;
                  
                  const totalValue = unitPrice ? stock.quantity * unitPrice : 0;
                  
                  return (
                    <tr key={stock.id}>
                      <td>{stock.brand.name}</td>
                      <td>{getSizeDisplayName(stock.size)}</td>
                      <td>{stock.quantity}</td>
                      <td>
                        {unitPrice ? `₹${unitPrice.toLocaleString()}` : 
                         <span style={{color: '#9ca3af', fontStyle: 'italic'}}>Price not set</span>}
                      </td>
                      <td>
                        {unitPrice ? `₹${totalValue.toLocaleString()}` : 
                         <span style={{color: '#9ca3af', fontStyle: 'italic'}}>-</span>}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <Footer />
    </div>
  );
};

export default Dashboard;