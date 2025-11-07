import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { stockMovementsApi, stockApi } from '../services/api';
import { Brand, Stock } from '../types';
import { getSizeDisplayName } from '../utils/sizeMapping';

interface ManualStockEntryFormProps {
  brands: Brand[];
  onEntrySubmitted: () => void;
  selectedDate: string;
}

const ManualStockEntryForm: React.FC<ManualStockEntryFormProps> = ({
  brands,
  onEntrySubmitted,
  selectedDate
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [receivedToday, setReceivedToday] = useState<string>('');
  const [salesQuantity, setSalesQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  // Load available sizes for the selected brand
  useEffect(() => {
    const loadSizes = async () => {
      if (selectedBrandId) {
        try {
          const stockData = await stockApi.getAll();
          const brandStock = stockData.filter(stock => stock.brand_id.toString() === selectedBrandId);
          const sizeSet = new Set(brandStock.map(stock => stock.size));
          const sizes = Array.from(sizeSet);
          setAvailableSizes(sizes);
        } catch (err) {
          console.error('Failed to load sizes:', err);
          // Fallback to standard sizes
          setAvailableSizes(['90ml', '180ml', '330ml', '375ml', '750ml', '1L']);
        }
      } else {
        setAvailableSizes([]);
      }
    };
    
    loadSizes();
  }, [selectedBrandId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBrandId || !selectedSize) {
      toast.error('Please select both brand and size');
      return;
    }

    const receivedQty = parseInt(receivedToday) || 0;
    const salesQty = parseInt(salesQuantity) || 0;

    if (receivedQty === 0 && salesQty === 0) {
      toast.error('Please enter either received quantity, sales quantity, or both');
      return;
    }

    if (receivedQty < 0 || salesQty < 0) {
      toast.error('Quantities cannot be negative');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const result = await stockMovementsApi.manualStockEntry({
        brand_id: parseInt(selectedBrandId),
        size: selectedSize,
        received_today: receivedQty,
        sales_quantity: salesQty,
        date: selectedDate,
        notes: notes.trim() || undefined
      });

      toast.success(result.message);
      
      // Reset form
      setSelectedBrandId('');
      setSelectedSize('');
      setReceivedToday('');
      setSalesQuantity('');
      setNotes('');
      
      // Refresh the reports
      onEntrySubmitted();
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to submit manual entry';
      toast.error(errorMessage);
      console.error('Manual entry error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedBrandId('');
    setSelectedSize('');
    setReceivedToday('');
    setSalesQuantity('');
    setNotes('');
  };

  return (
    <div className="manual-entry-form">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Brand *</label>
            <select
              className="form-input"
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                setSelectedSize(''); // Reset size when brand changes
              }}
              required
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
            <label className="form-label">Size *</label>
            <select
              className="form-input"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              disabled={!selectedBrandId}
              required
            >
              <option value="">Select Size</option>
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  {getSizeDisplayName(size)}
                </option>
              ))}
            </select>
            {!selectedBrandId && (
              <small style={{ color: '#666', fontSize: '0.8rem' }}>
                Select a brand first
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Entry Date</label>
            <input
              type="text"
              className="form-input"
              value={new Date(selectedDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
              disabled
              style={{ backgroundColor: '#f5f5f5', color: '#666' }}
            />
          </div>
        </div>

        <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">
              📥 Received Today
              <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                (bottles)
              </span>
            </label>
            <input
              type="number"
              className="form-input"
              value={receivedToday}
              onChange={(e) => setReceivedToday(e.target.value)}
              min="0"
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              📤 Sales Quantity
              <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                (bottles sold)
              </span>
            </label>
            <input
              type="number"
              className="form-input"
              value={salesQuantity}
              onChange={(e) => setSalesQuantity(e.target.value)}
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            📝 Notes
            <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
              (optional)
            </span>
          </label>
          <textarea
            className="form-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this entry..."
            rows={2}
            style={{ resize: 'vertical', minHeight: '60px' }}
          />
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isSubmitting}
          >
            🔄 Reset Form
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !selectedBrandId || !selectedSize}
          >
            {isSubmitting ? '⏳ Submitting...' : '✅ Submit Entry'}
          </button>
        </div>
      </form>

      <div className="manual-entry-help" style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #e9ecef', 
        borderRadius: '6px',
        fontSize: '0.9rem'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>💡 How to use Manual Entry:</h4>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#6c757d' }}>
          <li><strong>Received Today:</strong> Enter the number of bottles you received from supplier today</li>
          <li><strong>Sales Quantity:</strong> Enter the total number of bottles sold to customers today</li>
          <li><strong>End-of-Day Process:</strong> Use this form when you count your physical stock at closing time</li>
          <li><strong>Stock Calculation:</strong> The system will automatically update your stock levels and create movement records</li>
        </ul>
      </div>
    </div>
  );
};

export default ManualStockEntryForm;