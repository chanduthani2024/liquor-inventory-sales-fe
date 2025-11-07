import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { stockApi, brandApi, stockMovementsApi } from '../services/api';
import { Stock, Brand } from '../types';
import { getSizeDisplayName } from '../utils/sizeMapping';
import Footer from '../components/Footer';
import './Stock.css';

const StockPage: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'receipt' | 'add' | 'defect'>('receipt');
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [showMovements, setShowMovements] = useState(false);
  
  const [formData, setFormData] = useState({
    brandId: '',
    size: '',
    quantity: '',
    defectiveQuantity: '',
    unitCost: '',
    notes: '',
    defectReason: '',
    actionTaken: '',
  });

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const [stockData, brandData] = await Promise.all([
        stockApi.getAll(),
        brandApi.getAll()
      ]);
      setStocks(stockData);
      setFilteredStocks(stockData);
      setBrands(brandData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch data';
      toast.error(errorMessage);
      console.error('Stock error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter stocks based on search term
  const filterStocks = (searchValue: string) => {
    if (!searchValue.trim()) {
      setFilteredStocks(stocks);
    } else {
      const filtered = stocks.filter(stock =>
        stock.brand.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        stock.size.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredStocks(filtered);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterStocks(value);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If brand changes, reset size to ensure it's valid for the new brand
    if (name === 'brandId') {
      setFormData(prev => ({ ...prev, [name]: value, size: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formMode === 'defect') {
      await handleDefectSubmit();
      return;
    }
    
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    let loadingMessage = '';
    let successMessage = '';
    let movementData: any = {};

    switch (formMode) {
      case 'receipt':
        const defectiveQty = formData.defectiveQuantity ? parseInt(formData.defectiveQuantity) : 0;
        if (defectiveQty < 0 || defectiveQty > quantity) {
          toast.error(`Defective quantity must be between 0 and ${quantity}`);
          return;
        }
        loadingMessage = 'Recording stock receipt...';
        successMessage = 'Stock receipt recorded successfully!';
        movementData = {
          brand_id: parseInt(formData.brandId),
          size: formData.size,
          quantity: quantity,
          defective_quantity: defectiveQty,
          unit_cost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
          notes: formData.notes || 'Stock receipt',
        };
        break;

      case 'add':
        loadingMessage = 'Adding stock delivery...';
        successMessage = `Added ${quantity} units successfully!`;
        movementData = {
          brand_id: parseInt(formData.brandId),
          size: formData.size,
          quantity: quantity, // Additional quantity
          unit_cost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
          notes: formData.notes || `Stock delivery: +${quantity} units`,
        };
        break;
    }

    const loadingToast = toast.loading(loadingMessage);
    
    try {
      let response;
      
      // Use the receive API for all stock receipts and additions
      response = await stockMovementsApi.receiveStock(movementData);
      
      toast.dismiss(loadingToast);
      toast.success(response.message || successMessage);

      setShowForm(false);
      setEditingStock(null);
      setFormMode('receipt');
      setFormData({
        brandId: '',
        size: '',
        quantity: '',
        defectiveQuantity: '',
        unitCost: '',
        notes: '',
        defectReason: '',
        actionTaken: '',
      });
      await fetchStocks();
      // Re-apply current search filter
      if (searchTerm) {
        filterStocks(searchTerm);
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'Failed to record stock movement';
      toast.error(errorMessage);
      console.error('Stock movement error:', err);
    }
  };

  const handleDefectSubmit = async () => {
    if (!editingStock) return;
    
    const defectiveQuantity = parseInt(formData.defectiveQuantity);
    if (isNaN(defectiveQuantity) || defectiveQuantity <= 0) {
      toast.error('Please enter a valid defective quantity');
      return;
    }

    if (defectiveQuantity > editingStock.quantity) {
      toast.error(`Cannot report ${defectiveQuantity} defective bottles. Only ${editingStock.quantity} good bottles available.`);
      return;
    }

    const defectData = {
      brand_id: parseInt(formData.brandId),
      size: formData.size,
      defective_quantity: defectiveQuantity,
      defect_reason: formData.defectReason || 'Not specified',
      action_taken: formData.actionTaken || 'Pending action',
      notes: formData.notes || `${defectiveQuantity} defective bottles reported`,
    };

    const loadingToast = toast.loading('Reporting defective bottles...');
    
    try {
      const response = await stockMovementsApi.reportDefect(defectData);
      toast.dismiss(loadingToast);
      toast.success(response.message || 'Defective bottles reported successfully!');
      handleCancel();
      await fetchStocks();
      if (searchTerm) {
        filterStocks(searchTerm);
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'Failed to report defective bottles';
      toast.error(errorMessage);
      console.error('Defect error:', err);
    }
  };

  // Handle adding new stock (delivery)
  const handleAddStock = (stock: Stock) => {
    setFormMode('add');
    setEditingStock(stock);
    setFormData({
      brandId: stock.brand.id.toString(),
      size: stock.size,
      quantity: '', // User enters ADDITIONAL quantity
      defectiveQuantity: '',
      unitCost: '',
      notes: `New delivery for ${stock.brand.name} ${stock.size}`,
      defectReason: '',
      actionTaken: '',
    });
    setShowForm(true);
  };

  // Handle viewing stock movements
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const handleReportDefect = (stock: Stock) => {
    setFormMode('defect');
    setEditingStock(stock);
    setFormData({
      brandId: stock.brand.id.toString(),
      size: stock.size,
      quantity: '1',
      defectiveQuantity: '1',
      unitCost: '',
      notes: `Defective bottles found for ${stock.brand.name} ${stock.size}`,
      defectReason: '',
      actionTaken: '',
    });
    setShowForm(true);
  };

  const handleViewMovements = async (stock: Stock) => {
    setSelectedStock(stock);
    setLoadingMovements(true);
    setShowMovements(true);
    
    try {
      const movementData = await stockMovementsApi.getMovementsByBrand(stock.brand.id);
      // Filter movements for the specific size
      const filteredMovements = movementData.filter(m => m.size === stock.size);
      setMovements(filteredMovements);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch movement history';
      toast.error(errorMessage);
      console.error('Movement history error:', err);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };



  

  const handleCancel = () => {
    setShowForm(false);
    setEditingStock(null);
    setFormMode('receipt');
    setFormData({
      brandId: '',
      size: '',
      quantity: '',
      defectiveQuantity: '',
      unitCost: '',
      notes: '',
      defectReason: '',
      actionTaken: '',
    });
  };

  const getUnitPrice = (brand: Brand, size: string): number => {
    switch (size) {
      case '90ml':
        return brand.price_90ml || 0;
      case '180ml':
        return brand.price_180ml || 0;
      case '330ml':
        return brand.price_330ml || 0;
      case '375ml':
        return brand.price_375ml || 0;
      case '500ml':
        return brand.price_500ml || 0;
      case '650ml':
        return brand.price_650ml || 0;
      case '750ml':
        return brand.price_750ml || 0;
      case '1L':  // Fixed: Changed from '1l' to '1L' to match database
      case '1l':  // Support both cases for backward compatibility
        return brand.price_1l || 0;
      case '2L':
        return brand.price_2l || 0;
      default:
        return 0;
    }
  };

  // Get available sizes for a specific brand (only sizes with prices > 0)
  const getAvailableSizes = (brandId: string): string[] => {
    if (!brandId) return [];
    
    const brand = brands.find(b => b.id.toString() === brandId);
    if (!brand) return [];

    const availableSizes: string[] = [];
    
    if (brand.price_90ml && brand.price_90ml > 0) availableSizes.push('90ml');
    if (brand.price_180ml && brand.price_180ml > 0) availableSizes.push('180ml');
    if (brand.price_330ml && brand.price_330ml > 0) availableSizes.push('330ml');
    if (brand.price_375ml && brand.price_375ml > 0) availableSizes.push('375ml');
    if (brand.price_500ml && brand.price_500ml > 0) availableSizes.push('500ml');
    if (brand.price_650ml && brand.price_650ml > 0) availableSizes.push('650ml');
    if (brand.price_750ml && brand.price_750ml > 0) availableSizes.push('750ml');
    if (brand.price_1l && brand.price_1l > 0) availableSizes.push('1L');
    if (brand.price_2l && brand.price_2l > 0) availableSizes.push('2L');
    
    return availableSizes;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Stock Management</h1>
          <p className="page-subtitle">Manage Wine Inventory</p>
        </div>
        <div className="card">
          <p>Loading stock data...</p>
        </div>
      </div>
    );
  }

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
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <div className="stock-header">
        <div className="stock-header-left">
          <h1 className="page-title">Stock Management</h1>
        </div>
        <div className="stock-header-right">
          <p className="stock-subtitle">
            Manage Wine Inventory
          </p>
          <button 
            className="add-stock-btn"
            onClick={() => {
              setFormMode('receipt');
              setEditingStock(null);
              setShowForm(true);
            }}
            disabled={showForm}
          >
            Record Stock Receipt
          </button>
        </div>
      </div>



      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>
            {formMode === 'receipt' && 'Record Stock Receipt'}
            {formMode === 'add' && 'Add Stock Delivery'}
            {formMode === 'defect' && 'Report Defective Bottles'}
          </h3>
          
          {formMode === 'add' && editingStock && (
            <div style={{ 
              background: '#dbeafe', 
              border: '1px solid #3b82f6', 
              borderRadius: '0.5rem', 
              padding: '0.75rem', 
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              <strong>Adding to existing stock:</strong> Current quantity: <strong>{editingStock.quantity}</strong><br/>
              Enter the <strong>additional quantity</strong> you are adding (e.g., new delivery).
            </div>
          )}
          
          {formMode === 'defect' && editingStock && (
            <div style={{ 
              background: '#fee2e2', 
              border: '1px solid #dc2626', 
              borderRadius: '0.5rem', 
              padding: '0.75rem', 
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#991b1b'
            }}>
              <strong>Report Defective Bottles:</strong> Good stock: <strong>{editingStock.quantity}</strong>, Defective: <strong>{editingStock.defective_quantity || 0}</strong><br/>
              This will move bottles from good stock to defective stock.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Brand</label>
                <select
                  name="brandId"
                  className="form-input"
                  value={formData.brandId}
                  onChange={handleInputChange}
                  required
                  disabled={formMode !== 'receipt'}
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Size</label>
                <select
                  name="size"
                  className="form-input"
                  value={formData.size}
                  onChange={handleInputChange}
                  required
                  disabled={formMode !== 'receipt' || !formData.brandId}
                >
                  <option value="">
                    {!formData.brandId ? 'Select Brand First' : 'Select Size'}
                  </option>
                  {formData.brandId && getAvailableSizes(formData.brandId).map((size) => (
                    <option key={size} value={size}>{getSizeDisplayName(size)}</option>
                  ))}
                </select>
                {formData.brandId && getAvailableSizes(formData.brandId).length === 0 && (
                  <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.25rem' }}>
                    No sizes available for this brand. Please check brand pricing configuration.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  {formMode === 'receipt' && 'Quantity'}
                  {formMode === 'add' && 'Additional Quantity'}
                  {formMode === 'defect' && 'Defective Quantity'}
                  {editingStock && (
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 'normal' }}>
                      {' '}(Current: {editingStock.quantity})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name={formMode === 'defect' ? 'defectiveQuantity' : 'quantity'}
                  className="form-input"
                  value={formMode === 'defect' ? formData.defectiveQuantity : formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  max={formMode === 'defect' && editingStock ? editingStock.quantity : undefined}
                  required
                  placeholder={
                    formMode === 'defect' ? 'Enter defective quantity' :
                    formMode === 'add' ? 'Enter additional quantity' :
                    'Enter quantity'
                  }
                />
              </div>
            </div>

            {formMode === 'receipt' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Defective Quantity (Optional)</label>
                <input
                  type="number"
                  name="defectiveQuantity"
                  className="form-input"
                  value={formData.defectiveQuantity}
                  onChange={handleInputChange}
                  min="0"
                  max={formData.quantity ? parseInt(formData.quantity) : undefined}
                  placeholder="Number of defective bottles in this receipt"
                />
              </div>
            )}

            {formMode === 'defect' && (
              <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Defect Reason</label>
                  <select
                    name="defectReason"
                    className="form-input"
                    value={formData.defectReason}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select reason</option>
                    <option value="Cracked bottle">Cracked bottle</option>
                    <option value="Label damaged">Label damaged</option>
                    <option value="Expired">Expired</option>
                    <option value="Quality issue">Quality issue</option>
                    <option value="Leaking">Leaking</option>
                    <option value="Contaminated">Contaminated</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Action Taken</label>
                  <select
                    name="actionTaken"
                    className="form-input"
                    value={formData.actionTaken}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select action</option>
                    <option value="Returned to supplier">Returned to supplier</option>
                    <option value="Disposed">Disposed</option>
                    <option value="Exchanged">Exchanged</option>
                    <option value="Pending action">Pending action</option>
                    <option value="Refund processed">Refund processed</option>
                  </select>
                </div>
              </div>
            )}

            {formMode !== 'defect' && (
              <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Unit Cost (Optional)</label>
                  <input
                    type="number"
                    name="unitCost"
                    className="form-input"
                    value={formData.unitCost}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Cost price per unit"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input
                    type="text"
                    name="notes"
                    className="form-input"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="e.g., Weekly delivery, Batch #123"
                  />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                {formMode === 'receipt' && 'Record Receipt'}
                {formMode === 'add' && 'Add Stock'}
                {formMode === 'defect' && 'Report Defect'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Current Stock</h3>
          <div className="search-container" style={{ position: 'relative', maxWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search by brand or size..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="form-input"
              style={{
                paddingLeft: '2.5rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem 0.5rem 2.5rem'
              }}
            />
            <div style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280',
              fontSize: '1rem'
            }}>
              🔍
            </div>
          </div>
        </div>

        {stocks.length > 0 ? (
          <>
            {filteredStocks.length > 0 ? (
              <>
                {searchTerm && (
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '0.875rem', 
                    marginBottom: '0.75rem',
                    fontStyle: 'italic'
                  }}>
                    Showing {filteredStocks.length} of {stocks.length} stock items
                  </p>
                )}
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Brand</th>
                        <th>Size</th>
                      <th>Good Stock</th>
                      <th>Defective</th>
                      <th>Unit Price</th>
                      <th>Total Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map((stock) => {
                const unitPrice = getUnitPrice(stock.brand, stock.size);
                const totalValue = stock.quantity * unitPrice;
                return (
                  <tr key={stock.id}>
                    <td style={{ fontWeight: 'bold' }}>{stock.brand.name}</td>
                    <td>{getSizeDisplayName(stock.size)}</td>
                    <td>{stock.quantity}</td>
                    <td>
                      <span style={{ 
                        color: (stock.defective_quantity || 0) > 0 ? '#dc3545' : '#6c757d',
                        fontWeight: (stock.defective_quantity || 0) > 0 ? 'bold' : 'normal'
                      }}>
                        {stock.defective_quantity || 0}
                      </span>
                    </td>
                    <td>₹{unitPrice.toLocaleString()}</td>
                    <td>₹{totalValue.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAddStock(stock)}
                          title="Add new stock delivery"
                        >
                          + Add
                        </button>
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => handleReportDefect(stock)}
                          title="Report defective bottles"
                          disabled={stock.quantity === 0}
                        >
                          Defect
                        </button>
                        <button 
                          className="btn btn-sm btn-info"
                          onClick={() => handleViewMovements(stock)}
                          title="View history"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ 
                textAlign: 'center', 
                color: '#6b7280', 
                fontStyle: 'italic',
                padding: '2rem'
              }}>
                No stock items found matching "{searchTerm}". Try a different search term.
              </p>
            )}
          </>
        ) : (
          <p>No stock items found. Add your first stock item!</p>
        )}
      </div>

      {/* Stock Summary */}
      {stocks.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Stock Summary</h3>
          <div className="grid grid-4">
            <div className="card" style={{ backgroundColor: '#f0f9ff' }}>
              <h4 style={{ color: '#0369a1', marginBottom: '0.5rem' }}>Good Stock</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#075985' }}>
                {stocks.reduce((sum, stock) => sum + stock.quantity, 0)}
              </p>
            </div>
            <div className="card" style={{ backgroundColor: '#fef2f2' }}>
              <h4 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Defective Stock</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b91c1c' }}>
                {stocks.reduce((sum, stock) => sum + (stock.defective_quantity || 0), 0)}
              </p>
            </div>
            <div className="card" style={{ backgroundColor: '#f0fdf4' }}>
              <h4 style={{ color: '#059669', marginBottom: '0.5rem' }}>Total Value</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#047857' }}>
                ₹{stocks.reduce((sum, stock) => sum + (stock.quantity * getUnitPrice(stock.brand, stock.size)), 0).toLocaleString()}
              </p>
            </div>
            <div className="card" style={{ backgroundColor: '#fefce8' }}>
              <h4 style={{ color: '#ca8a04', marginBottom: '0.5rem' }}>Unique Products</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a16207' }}>
                {stocks.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement History Modal */}
      {showMovements && selectedStock && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#1f2937' }}>
                Stock Movement History: {selectedStock.brand.name} {getSizeDisplayName(selectedStock.size)}
              </h3>
              <button
                onClick={() => {
                  setShowMovements(false);
                  setSelectedStock(null);
                  setMovements([]);
                }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <strong style={{ color: '#059669' }}>Good Stock</strong>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                    {selectedStock.quantity}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#dc2626' }}>Defective</strong>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                    {selectedStock.defective_quantity || 0}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#3b82f6' }}>Movements</strong>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                    {movements.length}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#8b5cf6' }}>Value</strong>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                    ₹{(selectedStock.quantity * getUnitPrice(selectedStock.brand, selectedStock.size)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {loadingMovements ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Loading movement history...</p>
              </div>
            ) : movements.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Quantity</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Defective</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Notes</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement, index) => (
                      <tr key={movement.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                          {new Date(movement.created_at).toLocaleDateString()} {new Date(movement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            backgroundColor:
                              movement.movement_type === 'RECEIPT' ? '#dcfce7' :
                              movement.movement_type === 'SALE' ? '#fef2f2' :
                              movement.movement_type === 'DEFECT' ? '#fee2e2' :
                              movement.movement_type === 'ADJUSTMENT' ? '#e0f2fe' : '#fef3c7',
                            color:
                              movement.movement_type === 'RECEIPT' ? '#166534' :
                              movement.movement_type === 'SALE' ? '#991b1b' :
                              movement.movement_type === 'DEFECT' ? '#991b1b' :
                              movement.movement_type === 'ADJUSTMENT' ? '#0369a1' : '#92400e'
                          }}>
                            {movement.movement_type}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '0.75rem', 
                          borderBottom: '1px solid #e5e7eb', 
                          textAlign: 'right',
                          color: movement.quantity > 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </td>
                        <td style={{ 
                          padding: '0.75rem', 
                          borderBottom: '1px solid #e5e7eb', 
                          textAlign: 'right'
                        }}>
                          {movement.defective_quantity && movement.defective_quantity > 0 && (
                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                              +{movement.defective_quantity}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb', maxWidth: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={movement.notes}>
                            {movement.notes || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                          {movement.unit_cost ? `₹${parseFloat(movement.unit_cost).toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <p>No movement history found for this item.</p>
              </div>
            )}
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default StockPage;