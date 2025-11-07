import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { brandApi } from '../services/api';
import { alcoholTypesApi } from '../services/alcoholTypesApi';
import { Brand, AlcoholType } from '../types';
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
  const [editingPrice, setEditingPrice] = useState<{brandId: number, size: string} | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [formData, setFormData] = useState({
    name: '',
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
  });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const data = await brandApi.getAll();
      setBrands(data);
      setFilteredBrands(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch brands';
      toast.error(errorMessage);
      console.error('Brands error:', err);
    } finally {
      setLoading(false);
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

  // Filter brands based on search term and alcohol type
  const filterBrands = (searchValue: string = searchTerm, alcoholTypeFilter: number | null = selectedAlcoholType) => {
    let filtered = brands;

    // Filter by alcohol type
    if (alcoholTypeFilter) {
      filtered = filtered.filter(brand => brand.alcohol_type_id === alcoholTypeFilter);
    }

    // Filter by search term
    if (searchValue.trim()) {
      filtered = filtered.filter(brand =>
        brand.name.toLowerCase().includes(searchValue.toLowerCase())
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

  const handlePriceEdit = (brandId: number, size: string, currentPrice: number | null) => {
    setEditingPrice({ brandId, size });
    setTempPrice(currentPrice ? currentPrice.toString() : '');
  };

  const handlePriceSave = async (brandId: number, size: string) => {
    const loadingToast = toast.loading('Updating price...');
    
    try {
      const priceValue = tempPrice ? parseFloat(tempPrice) : null;
      const updateData = { [`price_${size}`]: priceValue };
      
      const response = await brandApi.update(brandId, updateData);
      console.log('Price update response:', response); // Debug log
      
      toast.dismiss(loadingToast);
      toast.success('Price updated successfully!', { duration: 2000 });
      
      // Use the updated brand from response if available, otherwise use local update
      const updatedBrand = (response as any)?.data?.data || (response as any)?.data || null;
      
      if (updatedBrand && updatedBrand.id) {
        console.log('Using server response data:', updatedBrand); // Debug log
        // Update with server response data
        setBrands(prevBrands => 
          prevBrands.map(brand => 
            brand.id === brandId ? updatedBrand : brand
          )
        );
        
        setFilteredBrands(prevFiltered => 
          prevFiltered.map(brand => 
            brand.id === brandId ? updatedBrand : brand
          )
        );
      } else {
        console.log('Using local update fallback with value:', priceValue); // Debug log
        // Fallback to local update
        setBrands(prevBrands => 
          prevBrands.map(brand => 
            brand.id === brandId 
              ? { ...brand, [`price_${size}`]: priceValue }
              : brand
          )
        );
        
        setFilteredBrands(prevFiltered => 
          prevFiltered.map(brand => 
            brand.id === brandId 
              ? { ...brand, [`price_${size}`]: priceValue }
              : brand
          )
        );
      }
      
      setEditingPrice(null);
      setTempPrice('');
      
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'Failed to update price';
      toast.error(errorMessage, { duration: 3000 });
      console.error('Price update error:', err); // Debug log
      
      // Reset editing state on error
      setEditingPrice(null);
      setTempPrice('');
    }
  };

  const handlePriceCancel = () => {
    setEditingPrice(null);
    setTempPrice('');
  };

  // Helper function to render editable price cell
  const renderPriceCell = (brand: Brand, size: string, price: number | null) => {
    const isEditing = editingPrice?.brandId === brand.id && editingPrice?.size === size;
    
    if (isEditing) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.2rem',
          justifyContent: 'center',
          flexWrap: 'nowrap',
          minWidth: '100px'
        }}>
          <input
            type="number"
            value={tempPrice}
            onChange={(e) => setTempPrice(e.target.value)}
            style={{
              width: '50px',
              padding: '0.15rem 0.2rem',
              fontSize: '0.65rem',
              border: '1px solid #3b82f6',
              borderRadius: '0.2rem',
              outline: 'none',
              textAlign: 'center'
            }}
            placeholder="0.00"
            step="0.01"
            min="0"
            autoFocus
          />
          <button
            onClick={() => handlePriceSave(brand.id, size)}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.1rem 0.25rem',
              borderRadius: '0.15rem',
              fontSize: '0.55rem',
              cursor: 'pointer',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✓
          </button>
          <button
            onClick={handlePriceCancel}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.1rem 0.25rem',
              borderRadius: '0.15rem',
              fontSize: '0.55rem',
              cursor: 'pointer',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
      );
    }
    
    return (
      <div onClick={() => handlePriceEdit(brand.id, size, price)} style={{ cursor: 'pointer', textAlign: 'center' }}>
        {price ? `₹${price}` : 
          <span style={{color: '#3b82f6', textDecoration: 'underline', fontSize: '0.7rem'}}>Set</span>
        }
      </div>
    );
  };

  useEffect(() => {
    fetchBrands();
    fetchAlcoholTypes();
  }, []);

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

      setShowForm(false);
      setEditingBrand(null);
      setFormData({
        name: '',
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
      });
      await fetchBrands();
      // Re-apply current filters
      filterBrands(searchTerm, selectedAlcoholType);
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
      await fetchBrands();
      // Re-apply current filters
      filterBrands(searchTerm, selectedAlcoholType);
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
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Brands</h1>
          <p className="page-subtitle">Manage Wine Brands</p>
        </div>
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
        <div className="brands-header-left">
          <h1 className="page-title">Brands</h1>
        </div>
        <div className="brands-header-right">
          <p className="brands-subtitle">
            Manage Wine Brands
          </p>
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
              onClick={() => {
                fetchBrands();
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
                placeholder="Search brands..."
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
                    <td className="brand-name">{brand.name}</td>
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
      <Footer />
    </div>
  );
};

export default Brands;