import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { brandApi } from '../services/api';
import { alcoholTypesApi } from '../services/alcoholTypesApi';
import { Brand, AlcoholType, BrandPriceHistory } from '../types';
import { getSizeDisplayName } from '../utils/sizeMapping';
import Footer from '../components/Footer';
import './Brands.css';

const Brands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [alcoholTypes, setAlcoholTypes] = useState<AlcoholType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlcoholType, setSelectedAlcoholType] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [priceHistory, setPriceHistory] = useState<BrandPriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceModalData, setPriceModalData] = useState<{brandId: number, brandName: string, size: string, currentPrice: number | null} | null>(null);
  const [showCostPrices, setShowCostPrices] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brand_number: '',
    alcohol_type_id: '',
    price_90ml: '',
    price_180ml: '',
    price_330ml: '',
    price_375ml: '',
    price_500ml: '',
    price_650ml: '',
    price_750ml: '',
    price_1l: '',
    price_2l: '',
    // Actual/Cost prices
    actual_price_90ml: '',
    actual_price_180ml: '',
    actual_price_330ml: '',
    actual_price_375ml: '',
    actual_price_500ml: '',
    actual_price_650ml: '',
    actual_price_750ml: '',
    actual_price_1l: '',
    actual_price_2l: '',
  });

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const data = await brandApi.getAll();
      setBrands(data);
      
      // Apply current filters to the fresh data
      let filtered = data;

      // Filter by alcohol type
      if (selectedAlcoholType) {
        filtered = filtered.filter(brand => brand.alcohol_type_id === selectedAlcoholType);
      }

      // Filter by search term (search in both name and brand_number)
      if (searchTerm.trim()) {
        filtered = filtered.filter(brand =>
          brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (brand.brand_number && brand.brand_number.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setFilteredBrands(filtered);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch brands';
      toast.error(errorMessage);
      console.error('Brands error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAlcoholType, searchTerm]);

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

  // Filter brands based on search term and alcohol type
  const filterBrands = (searchValue: string = searchTerm, alcoholTypeFilter: number | null = selectedAlcoholType) => {
    let filtered = brands;

    // Filter by alcohol type
    if (alcoholTypeFilter) {
      filtered = filtered.filter(brand => brand.alcohol_type_id === alcoholTypeFilter);
    }

    // Filter by search term (search in both name and brand_number)
    if (searchValue.trim()) {
      filtered = filtered.filter(brand =>
        brand.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (brand.brand_number && brand.brand_number.toLowerCase().includes(searchValue.toLowerCase()))
      );
    }

    setFilteredBrands(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterBrands(value, selectedAlcoholType);
  };

  const handleAlcoholTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    setSelectedAlcoholType(value);
    filterBrands(searchTerm, value);
  };

  const handlePriceEdit = (brandId: number, brandName: string, size: string, currentPrice: number | null) => {
    setPriceModalData({ brandId, brandName, size, currentPrice });
    setTempPrice(currentPrice ? currentPrice.toString() : '');
    setShowPriceModal(true);
  };

  const handlePriceSave = async () => {
    if (!priceModalData) return;
    
    const loadingToast = toast.loading('Updating price...');
    
    try {
      const priceValue = tempPrice ? parseFloat(tempPrice) : null;
      const updateData = { [`price_${priceModalData.size}`]: priceValue };
      
      await brandApi.update(priceModalData.brandId, updateData);
      
      toast.dismiss(loadingToast);
      toast.success('Price updated successfully!', { duration: 2000 });
      
      // Refresh brands data from server (fetchBrands now handles filtering internally)
      await fetchBrands();
      
      // Refresh price history since a price was updated
      await fetchPriceHistory();
      
      // Close modal and reset
      setShowPriceModal(false);
      setPriceModalData(null);
      setTempPrice('');
      
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'Failed to update price';
      toast.error(errorMessage, { duration: 3000 });
      console.error('Price update error:', err);
    }
  };

  const handlePriceCancel = () => {
    setShowPriceModal(false);
    setPriceModalData(null);
    setTempPrice('');
  };

  // Helper function to render editable price cell
  const renderPriceCell = (brand: Brand, size: string, price: number | null) => {
    return (
      <div onClick={() => handlePriceEdit(brand.id, brand.name, size, price)} style={{ cursor: 'pointer', textAlign: 'center' }}>
        {price ? `₹${price}` : 
          <span style={{color: '#3b82f6', textDecoration: 'underline', fontSize: '0.7rem'}}>Set</span>
        }
      </div>
    );
  };

  useEffect(() => {
    const initialLoad = async () => {
      await fetchBrands();
      await fetchAlcoholTypes();
      await fetchPriceHistory();
    };
    
    initialLoad();
  }, [fetchBrands]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show loading toast
    const loadingToast = toast.loading(editingBrand ? 'Updating brand...' : 'Creating brand...');
    
    try {
      const brandData = {
        name: formData.name,
        brand_number: formData.brand_number || null,
        alcohol_type_id: formData.alcohol_type_id ? parseInt(formData.alcohol_type_id) : null,
        price_90ml: formData.price_90ml ? parseFloat(formData.price_90ml) : null,
        price_180ml: formData.price_180ml ? parseFloat(formData.price_180ml) : null,
        price_330ml: formData.price_330ml ? parseFloat(formData.price_330ml) : null,
        price_375ml: formData.price_375ml ? parseFloat(formData.price_375ml) : null,
        price_500ml: formData.price_500ml ? parseFloat(formData.price_500ml) : null,
        price_650ml: formData.price_650ml ? parseFloat(formData.price_650ml) : null,
        price_750ml: formData.price_750ml ? parseFloat(formData.price_750ml) : null,
        price_1l: formData.price_1l ? parseFloat(formData.price_1l) : null,
        price_2l: formData.price_2l ? parseFloat(formData.price_2l) : null,
        // Actual/Cost prices
        actual_price_90ml: formData.actual_price_90ml ? parseFloat(formData.actual_price_90ml) : null,
        actual_price_180ml: formData.actual_price_180ml ? parseFloat(formData.actual_price_180ml) : null,
        actual_price_330ml: formData.actual_price_330ml ? parseFloat(formData.actual_price_330ml) : null,
        actual_price_375ml: formData.actual_price_375ml ? parseFloat(formData.actual_price_375ml) : null,
        actual_price_500ml: formData.actual_price_500ml ? parseFloat(formData.actual_price_500ml) : null,
        actual_price_650ml: formData.actual_price_650ml ? parseFloat(formData.actual_price_650ml) : null,
        actual_price_750ml: formData.actual_price_750ml ? parseFloat(formData.actual_price_750ml) : null,
        actual_price_1l: formData.actual_price_1l ? parseFloat(formData.actual_price_1l) : null,
        actual_price_2l: formData.actual_price_2l ? parseFloat(formData.actual_price_2l) : null,
      };

      let response;
      if (editingBrand) {
        response = await brandApi.update(editingBrand.id, brandData);
      } else {
        response = await brandApi.create(brandData);
      }

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(response.message || (editingBrand ? 'Brand updated successfully!' : 'Brand created successfully!'));

      // Refresh the brands data from server (fetchBrands now handles filtering internally)
      await fetchBrands();
      
      // Reset the form and close it
      setShowForm(false);
      setEditingBrand(null);
      setFormData({
        name: '',
        brand_number: '',
        alcohol_type_id: '',
        price_90ml: '',
        price_180ml: '',
        price_330ml: '',
        price_375ml: '',
        price_500ml: '',
        price_650ml: '',
        price_750ml: '',
        price_1l: '',
        price_2l: '',
        // Actual/Cost prices
        actual_price_90ml: '',
        actual_price_180ml: '',
        actual_price_330ml: '',
        actual_price_375ml: '',
        actual_price_500ml: '',
        actual_price_650ml: '',
        actual_price_750ml: '',
        actual_price_1l: '',
        actual_price_2l: '',
      });
    } catch (err: any) {
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'Failed to save brand';
      toast.error(errorMessage);
      console.error('Save error:', err);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      brand_number: brand.brand_number || '',
      alcohol_type_id: brand.alcohol_type_id ? brand.alcohol_type_id.toString() : '',
      price_90ml: brand.price_90ml ? brand.price_90ml.toString() : '',
      price_180ml: brand.price_180ml ? brand.price_180ml.toString() : '',
      price_330ml: brand.price_330ml ? brand.price_330ml.toString() : '',
      price_375ml: brand.price_375ml ? brand.price_375ml.toString() : '',
      price_500ml: brand.price_500ml ? brand.price_500ml.toString() : '',
      price_650ml: brand.price_650ml ? brand.price_650ml.toString() : '',
      price_750ml: brand.price_750ml ? brand.price_750ml.toString() : '',
      price_1l: brand.price_1l ? brand.price_1l.toString() : '',
      price_2l: brand.price_2l ? brand.price_2l.toString() : '',
      // Actual/Cost prices
      actual_price_90ml: brand.actual_price_90ml ? brand.actual_price_90ml.toString() : '',
      actual_price_180ml: brand.actual_price_180ml ? brand.actual_price_180ml.toString() : '',
      actual_price_330ml: brand.actual_price_330ml ? brand.actual_price_330ml.toString() : '',
      actual_price_375ml: brand.actual_price_375ml ? brand.actual_price_375ml.toString() : '',
      actual_price_500ml: brand.actual_price_500ml ? brand.actual_price_500ml.toString() : '',
      actual_price_650ml: brand.actual_price_650ml ? brand.actual_price_650ml.toString() : '',
      actual_price_750ml: brand.actual_price_750ml ? brand.actual_price_750ml.toString() : '',
      actual_price_1l: brand.actual_price_1l ? brand.actual_price_1l.toString() : '',
      actual_price_2l: brand.actual_price_2l ? brand.actual_price_2l.toString() : '',
    });
    setShowForm(true);
    
    // Scroll to the form smoothly
    setTimeout(() => {
      const formElement = document.querySelector('.brand-form-card');
      if (formElement) {
        formElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const performDelete = async (id: number) => {
    const loadingToast = toast.loading('Deleting brand...');
    
    try {
      const response = await brandApi.delete(id);
      toast.dismiss(loadingToast);
      toast.success(response.message || 'Brand deleted successfully!');
      // Refresh brands (fetchBrands now handles filtering internally)
      await fetchBrands();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'Failed to delete brand';
      toast.error(errorMessage);
      console.error('Delete error:', err);
    }
  };

  const handleDelete = async (id: number, brandName: string) => {
    // Create custom confirmation toast with immediate dismiss
    const confirmToast = toast.custom(
      (t) => (
        <div className="confirmation-toast" style={{ 
          background: '#ffffff', 
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          maxWidth: '400px'
        }}>
          <div className="confirmation-content" style={{ 
            padding: '1.5rem',
            background: '#ffffff'
          }}>
            <h3 className="confirmation-title" style={{
              color: '#1f2937',
              fontSize: '1.1rem',
              fontWeight: '600',
              margin: '0 0 0.5rem 0'
            }}>
              Delete Brand
            </h3>
            <p className="confirmation-message" style={{
              color: '#6b7280',
              fontSize: '0.9rem',
              margin: '0 0 1.5rem 0',
              lineHeight: '1.4'
            }}>
              Are you sure you want to delete "{brandName}"? This action cannot be undone.
            </p>
            <div className="confirmation-actions" style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                className="confirmation-btn confirmation-btn-cancel"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: '#f3f4f6',
                  color: '#374151'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.remove(confirmToast);
                }}
              >
                Cancel
              </button>
              <button
                className="confirmation-btn confirmation-btn-delete"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: '#ef4444',
                  color: '#ffffff'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.remove(confirmToast);
                  performDelete(id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center',
        style: {
          background: 'transparent',
          boxShadow: 'none',
        }
      }
    );
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBrand(null);
    setFormData({
      name: '',
      brand_number: '',
      alcohol_type_id: '',
      price_90ml: '',
      price_180ml: '',
      price_330ml: '',
      price_375ml: '',
      price_500ml: '',
      price_650ml: '',
      price_750ml: '',
      price_1l: '',
      price_2l: '',
      // Actual/Cost prices
      actual_price_90ml: '',
      actual_price_180ml: '',
      actual_price_330ml: '',
      actual_price_375ml: '',
      actual_price_500ml: '',
      actual_price_650ml: '',
      actual_price_750ml: '',
      actual_price_1l: '',
      actual_price_2l: '',
    });
  };

  const fetchPriceHistory = async () => {
    try {
      setHistoryLoading(true);
      // Fetch only the most recent 20 price changes to show latest updates
      const response = await brandApi.getPriceHistory(undefined, undefined, 20);
      setPriceHistory(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch price history';
      toast.error(errorMessage);
      console.error('Price history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPriceChange = (oldPrice: number | null, newPrice: number | null) => {
    const oldStr = oldPrice ? `₹${oldPrice}` : 'Not Set';
    const newStr = newPrice ? `₹${newPrice}` : 'Removed';
    return `${oldStr} → ${newStr}`;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="card">
          <p>Loading brands...</p>
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
      
      <div className="brands-header">
        <div className="brands-header-right" style={{ marginLeft: 'auto' }}>
          <button 
            className="add-brand-btn"
            onClick={() => {
              setShowForm(true);
              // Scroll to the form smoothly
              setTimeout(() => {
                const formElement = document.querySelector('.brand-form-card');
                if (formElement) {
                  formElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                  });
                }
              }, 100);
            }}
            disabled={showForm}
          >
            Add New Brand
          </button>
        </div>
      </div>

      {showForm && (
        <div className="brand-form-card">
          <h3 className="brand-form-title">
            {editingBrand ? 'Edit Brand' : 'Add New Brand'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Brand Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Brand Number/SKU <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
              <input
                type="text"
                name="brand_number"
                className="form-input"
                value={formData.brand_number}
                onChange={handleInputChange}
                placeholder="Enter unique brand number or SKU"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alcohol Type <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
              <select
                name="alcohol_type_id"
                className="form-input"
                value={formData.alcohol_type_id}
                onChange={handleInputChange}
                style={{ height: '2.75rem' }}
              >
                <option value="">Select alcohol type...</option>
                {alcoholTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('90ml')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_90ml"
                  className="form-input"
                  value={formData.price_90ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('180ml')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_180ml"
                  className="form-input"
                  value={formData.price_180ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('330ml')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_330ml"
                  className="form-input"
                  value={formData.price_330ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('375ml')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_375ml"
                  className="form-input"
                  value={formData.price_375ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
            </div>
            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('500ml')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_500ml"
                  className="form-input"
                  value={formData.price_500ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('650ml')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_650ml"
                  className="form-input"
                  value={formData.price_650ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('750ml')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_750ml"
                  className="form-input"
                  value={formData.price_750ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('1L')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_1l"
                  className="form-input"
                  value={formData.price_1l}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('2L')} Price (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="price_2l"
                  className="form-input"
                  value={formData.price_2l}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter price or leave empty"
                />
              </div>
            </div>
            
            {/* Cost Price Section - Collapsible */}
            <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
              <h4 
                onClick={() => setShowCostPrices(!showCostPrices)}
                style={{ 
                  margin: '0 0 1rem 0', 
                  color: '#d97706', 
                  fontSize: '1.1rem', 
                  fontWeight: '600',
                  borderBottom: '2px solid #fbbf24',
                  paddingBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  transition: 'transform 0.2s',
                  transform: showCostPrices ? 'rotate(90deg)' : 'rotate(0deg)'
                }}>
                  ▶
                </span>
                💰 Cost Prices (What you pay to supplier)
                <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '400' }}>
                  - Optional, used for profit calculation
                </span>
              </h4>
            </div>
            
            {showCostPrices && (
              <div className="grid grid-3">
                <div className="form-group">
                  <label className="form-label">{getSizeDisplayName('90ml')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                  <input
                    type="number"
                    name="actual_price_90ml"
                    className="form-input"
                    value={formData.actual_price_90ml}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Enter cost price or leave empty"
                    style={{ borderColor: '#f59e0b' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{getSizeDisplayName('180ml')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                  <input
                    type="number"
                    name="actual_price_180ml"
                    className="form-input"
                    value={formData.actual_price_180ml}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Enter cost price or leave empty"
                    style={{ borderColor: '#f59e0b' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{getSizeDisplayName('330ml')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                  <input
                    type="number"
                    name="actual_price_330ml"
                    className="form-input"
                    value={formData.actual_price_330ml}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Enter cost price or leave empty"
                    style={{ borderColor: '#f59e0b' }}
                  />
                </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('375ml')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="actual_price_375ml"
                  className="form-input"
                  value={formData.actual_price_375ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter cost price or leave empty"
                  style={{ borderColor: '#f59e0b' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('500ml')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="actual_price_500ml"
                  className="form-input"
                  value={formData.actual_price_500ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter cost price or leave empty"
                  style={{ borderColor: '#f59e0b' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('650ml')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="actual_price_650ml"
                  className="form-input"
                  value={formData.actual_price_650ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter cost price or leave empty"
                  style={{ borderColor: '#f59e0b' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('750ml')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="actual_price_750ml"
                  className="form-input"
                  value={formData.actual_price_750ml}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter cost price or leave empty"
                  style={{ borderColor: '#f59e0b' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('1L')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="actual_price_1l"
                  className="form-input"
                  value={formData.actual_price_1l}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter cost price or leave empty"
                  style={{ borderColor: '#f59e0b' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{getSizeDisplayName('2L')} Cost (₹) <span style={{color: '#6b7280', fontSize: '0.875rem'}}>(optional)</span></label>
                <input
                  type="number"
                  name="actual_price_2l"
                  className="form-input"
                  value={formData.actual_price_2l}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter cost price or leave empty"
                  style={{ borderColor: '#f59e0b' }}
                />
              </div>
            </div>
            )}
            
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                {editingBrand ? 'Update Brand' : 'Add Brand'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="brands-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="brands-table-title" style={{ margin: 0 }}>Brands List</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={async () => {
                await fetchBrands();
                toast.success('Brands refreshed!', { duration: 1500 });
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              🔄 Refresh
            </button>
            <select
              value={selectedAlcoholType || ''}
              onChange={handleAlcoholTypeFilter}
              className="form-input"
              style={{
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                minWidth: '180px'
              }}
            >
              <option value="">All Alcohol Types</option>
              {alcoholTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <div className="search-container" style={{ position: 'relative', maxWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search brands by name or number..."
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
        </div>
        
        {brands.length > 0 ? (
          <>
            {filteredBrands.length > 0 ? (
              <>
                {searchTerm && (
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '0.875rem', 
                    marginBottom: '0.75rem',
                    fontStyle: 'italic'
                  }}>
                    Showing {filteredBrands.length} of {brands.length} brands
                  </p>
                )}
                <div className="brands-table-container">
                  <table className="brands-table">
                    <thead>
                      <tr>
                        <th>Brand Name</th>
                        <th>{getSizeDisplayName('90ml')}</th>
                        <th>{getSizeDisplayName('180ml')}</th>
                        <th>{getSizeDisplayName('330ml')}</th>
                        <th>{getSizeDisplayName('375ml')}</th>
                        <th>{getSizeDisplayName('500ml')}</th>
                        <th>{getSizeDisplayName('650ml')}</th>
                        <th>{getSizeDisplayName('750ml')}</th>
                        <th>{getSizeDisplayName('1L')}</th>
                        <th>{getSizeDisplayName('2L')}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBrands.map((brand) => (
                  <tr key={brand.id}>
                    <td className="brand-name">
                      {brand.brand_number ? (
                        <>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{brand.name}</span>
                          <br />
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
                            #{brand.brand_number}
                          </span>
                        </>
                      ) : (
                        brand.name
                      )}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '90ml', brand.price_90ml)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '180ml', brand.price_180ml)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '330ml', brand.price_330ml)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '375ml', brand.price_375ml)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '500ml', brand.price_500ml)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '650ml', brand.price_650ml)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '750ml', brand.price_750ml)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '1l', brand.price_1l)}
                    </td>
                    <td className="price-cell">
                      {renderPriceCell(brand, '2l', brand.price_2l)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-edit"
                          onClick={() => handleEdit(brand)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(brand.id, brand.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                      ))}
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
                No brands found matching "{searchTerm}". Try a different search term.
              </p>
            )}
          </>
        ) : (
          <p className="no-brands-message">No brands found. Add your first brand!</p>
        )}
      </div>

      {/* Price History Section */}
      <div className="brands-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📊 Price Change History</h3>
          <button
            onClick={fetchPriceHistory}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            � Refresh History
          </button>
        </div>
        
        {historyLoading ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            Loading price history...
          </p>
        ) : priceHistory.length > 0 ? (
          <div className="brands-table-container">
            <table className="brands-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Brand</th>
                  <th>Size</th>
                  <th>Price Type</th>
                  <th>Price Change</th>
                  <th>Changed By</th>
                </tr>
              </thead>
              <tbody>
                {priceHistory.map((history) => {
                  // Determine price type from notes
                  const isCostPrice = history.notes?.includes('Cost Price');
                  const isSellingPrice = history.notes?.includes('Selling Price');
                  
                  return (
                    <tr key={history.id}>
                      <td style={{ fontSize: '0.75rem', minWidth: '140px' }}>
                        {formatDate(history.changed_at)}
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {history.brand?.name || 'Unknown Brand'}
                      </td>
                      <td>
                        <span style={{ 
                          background: '#f1f5f9', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {getSizeDisplayName(history.size)}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          background: isCostPrice ? '#fef3c7' : '#dcfce7', 
                          color: isCostPrice ? '#d97706' : '#059669',
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {isCostPrice ? '💰 Cost' : isSellingPrice ? '💵 Selling' : '❓ Unknown'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', minWidth: '120px' }}>
                        {formatPriceChange(history.old_price, history.new_price)}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {history.user?.username || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ 
            textAlign: 'center', 
            color: '#6b7280', 
            fontStyle: 'italic',
            padding: '2rem'
          }}>
            No price changes recorded yet. Price history will appear here when prices are updated.
          </p>
        )}
      </div>

      {/* Price Edit Modal */}
      {showPriceModal && priceModalData && (
        <div 
          style={{
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
          }}
          onClick={handlePriceCancel}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.25rem', 
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Set Price
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                <strong style={{ color: '#1f2937' }}>Brand:</strong> {priceModalData.brandName}
              </p>
              <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                <strong style={{ color: '#1f2937' }}>Size:</strong> {getSizeDisplayName(priceModalData.size)}
              </p>
              {priceModalData.currentPrice && (
                <p style={{ margin: '0', color: '#6b7280', fontSize: '0.875rem' }}>
                  <strong style={{ color: '#1f2937' }}>Current Price:</strong> ₹{priceModalData.currentPrice}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                color: '#374151'
              }}>
                New Price (₹)
              </label>
              <input
                type="number"
                value={tempPrice}
                onChange={(e) => setTempPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter new price"
                step="0.01"
                min="0"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePriceSave();
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handlePriceCancel}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePriceSave}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save Price
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Brands;