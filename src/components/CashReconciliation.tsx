import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { cashReconciliationApi } from '../services/api';
import { CashReconciliation, UpdateCashReconciliation } from '../types';
import './CashReconciliationForm.css';

interface CashReconciliationFormProps {
  selectedDate: string;
}

const CashReconciliationForm: React.FC<CashReconciliationFormProps> = ({ 
  selectedDate
}) => {
  const [reconciliation, setReconciliation] = useState<CashReconciliation | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formData, setFormData] = useState({
    office_cash: 0,
    online_cash: 0,
    expenditure: 0,
    notes: ''
  });

  const fetchReconciliation = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cashReconciliationApi.getByDate(selectedDate);
      setReconciliation(data);
      
      // Update form data with existing values
      setFormData({
        office_cash: data.office_cash || 0,
        online_cash: data.online_cash || 0,
        expenditure: data.expenditure || 0,
        notes: data.notes || ''
      });
    } catch (error: any) {
      console.error('Failed to fetch cash reconciliation:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load cash reconciliation data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchReconciliation();
  }, [fetchReconciliation]);

  // 🔄 Listen for refresh events from Reports page after sales updates
  useEffect(() => {
    const handleRefresh = (event: CustomEvent) => {
      const { date } = event.detail;
      if (date === selectedDate) {
        console.log('🔄 Refreshing cash reconciliation due to sales update...');
        fetchReconciliation();
      }
    };

    window.addEventListener('refreshCashReconciliation', handleRefresh as EventListener);
    
    return () => {
      window.removeEventListener('refreshCashReconciliation', handleRefresh as EventListener);
    };
  }, [selectedDate, fetchReconciliation]);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    if (field === 'notes') {
      setFormData(prev => ({
        ...prev,
        [field]: value as string
      }));
    } else {
      // Handle numeric fields
      const stringValue = value.toString();
      
      // If the input is empty or just whitespace, set to 0
      if (stringValue.trim() === '') {
        setFormData(prev => ({
          ...prev,
          [field]: 0
        }));
        return;
      }
      
      // Parse the value as float, but handle invalid inputs gracefully
      const numericValue = parseFloat(stringValue);
      
      // Only update if it's a valid number
      if (!isNaN(numericValue) && numericValue >= 0) {
        // 🚨 VALIDATION: Check if Office Cash + Online Cash exceeds available cash
        if (field === 'office_cash' || field === 'online_cash') {
          const currentFormData = { ...formData, [field]: numericValue };
          const totalCashToGive = (currentFormData.office_cash || 0) + (currentFormData.online_cash || 0);
          
          // Calculate available cash (total sales + opening balance - expenditure)
          const totalSales = parseFloat(reconciliation?.total_sales?.toString() || '0') || 0;
          const openingBalance = parseFloat(reconciliation?.opening_balance?.toString() || '0') || 0;
          const expenditure = currentFormData.expenditure || 0;
          const availableCash = (totalSales + openingBalance) - expenditure;
          
          console.log('💰 Cash validation:', {
            field,
            newValue: numericValue,
            officeCash: currentFormData.office_cash,
            onlineCash: currentFormData.online_cash,
            totalCashToGive,
            availableCash,
            exceedsLimit: totalCashToGive > availableCash
          });
          
          if (totalCashToGive > availableCash) {
            toast.error(
              `Invalid entry! Office Cash (₹${currentFormData.office_cash?.toLocaleString()}) + Online Cash (₹${currentFormData.online_cash?.toLocaleString()}) = ₹${totalCashToGive.toLocaleString()}\n` +
              `Cannot exceed available cash: ₹${availableCash.toLocaleString()}\n` +
              `This would result in negative closing balance!`
            );
            return; // Don't update the state
          }
        }
        
        setFormData(prev => ({
          ...prev,
          [field]: numericValue
        }));
      }
    }
  };

  const calculateClosingBalance = () => {
    if (!reconciliation) return 0;
    
    // Ensure all values are numbers and handle NaN/undefined cases
    const totalSales = parseFloat(reconciliation.total_sales?.toString() || '0') || 0;
    const openingBalance = parseFloat(reconciliation.opening_balance?.toString() || '0') || 0;
    const officeCash = parseFloat(formData.office_cash?.toString() || '0') || 0;
    const onlineCash = parseFloat(formData.online_cash?.toString() || '0') || 0;
    const expenditure = parseFloat(formData.expenditure?.toString() || '0') || 0;
    
    const result = (totalSales + openingBalance) - officeCash - onlineCash - expenditure;
    
    // Debug logging to troubleshoot calculation issues
    console.log('💰 Closing Balance Calculation:', {
      totalSales,
      openingBalance,
      officeCash,
      onlineCash,
      expenditure,
      formula: `(${totalSales} + ${openingBalance}) - ${officeCash} - ${onlineCash} - ${expenditure}`,
      result,
      isNaN: isNaN(result)
    });
    
    // Ensure result is a valid number
    return isNaN(result) ? 0 : result;
  };

  const handleSave = async () => {
    if (!reconciliation) return;

    try {
      setSaving(true);
      
      const updateData: UpdateCashReconciliation = {
        office_cash: parseFloat(formData.office_cash.toString()) || 0,
        online_cash: parseFloat(formData.online_cash.toString()) || 0,
        expenditure: parseFloat(formData.expenditure.toString()) || 0,
        notes: formData.notes
      };

      const updatedReconciliation = await cashReconciliationApi.update(reconciliation.id, updateData);
      setReconciliation(updatedReconciliation);
      
      toast.success('Cash reconciliation saved successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save cash reconciliation';
      toast.error(errorMessage);
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = () => {
    if (!reconciliation) return;
    setShowConfirmModal(true);
  };

  const confirmFinalize = async () => {
    if (!reconciliation) return;

    try {
      setSaving(true);
      setShowConfirmModal(false);
      
      const updateData: UpdateCashReconciliation = {
        office_cash: parseFloat(formData.office_cash.toString()) || 0,
        online_cash: parseFloat(formData.online_cash.toString()) || 0,
        expenditure: parseFloat(formData.expenditure.toString()) || 0,
        notes: formData.notes,
        is_finalized: true
      };

      console.log('Finalize payload:', updateData); // Debug log

      const updatedReconciliation = await cashReconciliationApi.update(reconciliation.id, updateData);
      setReconciliation(updatedReconciliation);
      
      toast.success('Cash reconciliation finalized successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to finalize cash reconciliation';
      toast.error(errorMessage);
      console.error('Finalize error:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const value = parseFloat(amount?.toString() || '0') || 0;
    return `₹${value.toLocaleString()}`;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="cash-reconciliation-card">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading cash reconciliation...</p>
        </div>
      </div>
    );
  }

  if (!reconciliation) {
    return (
      <div className="cash-reconciliation-card">
        <div className="error-container">
          <p>Failed to load cash reconciliation data</p>
          <button onClick={fetchReconciliation} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const closingBalance = calculateClosingBalance();
  const isFinalized = reconciliation.is_finalized;

  return (
    <div className="cash-reconciliation-card">
      <div className="cash-reconciliation-header">
        <div className="header-left">
          <h3>💰 Daily Cash Reconciliation</h3>
          <p className="reconciliation-date">{formatDate(selectedDate)}</p>
        </div>
        <div className="header-right">
          {isFinalized && (
            <span className="finalized-badge">
              ✅ Finalized
            </span>
          )}
        </div>
      </div>

      <div className="reconciliation-content">
        {/* Formula Display */}
        <div className="formula-display">
          <h4>Formula: (Sales + Opening Balance) - Office Cash - Online Cash - Expenditure = Closing Balance</h4>
          <div className="formula-breakdown">
            <span>({formatCurrency(reconciliation.total_sales || 0)} + {formatCurrency(reconciliation.opening_balance || 0)}) - {formatCurrency(formData.office_cash || 0)} - {formatCurrency(formData.online_cash || 0)} - {formatCurrency(formData.expenditure || 0)} = <strong>{formatCurrency(closingBalance)}</strong></span>
          </div>
        </div>

        {/* Readonly Fields */}
        <div className="readonly-section">
          <h4>📊 Readonly Data (Calculated from System)</h4>
          <div className="readonly-grid">
            <div className="readonly-item">
              <label>Opening Balance</label>
              <div className="readonly-value">{formatCurrency(reconciliation.opening_balance || 0)}</div>
              <small>Previous day's closing balance</small>
            </div>
            <div className="readonly-item">
              <label>Total Sales</label>
              <div className="readonly-value">{formatCurrency(reconciliation.total_sales || 0)}</div>
              <small>Cash: {formatCurrency(reconciliation.cash_sales || 0)} | Online: {formatCurrency(reconciliation.online_sales || 0)}</small>
            </div>
            <div className="readonly-item closing-balance">
              <label>Calculated Closing Balance</label>
              <div className={`readonly-value ${closingBalance < 0 ? 'negative' : 'positive'}`}>
                {formatCurrency(closingBalance)}
              </div>
              <small>Will become tomorrow's opening balance</small>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="editable-section">
          <h4>✏️ Cashier Entry (Manual Input Required)</h4>
          <div className="editable-grid">
            <div className="form-group">
              <label htmlFor="office_cash">
                Office Cash Given
                <span className="required">*</span>
              </label>
              <input
                id="office_cash"
                type="number"
                value={formData.office_cash}
                onChange={(e) => handleInputChange('office_cash', e.target.value)}
                onFocus={(e) => {
                  // When focused, if value is 0, select all so user can type over it
                  if (e.target.value === '0') {
                    e.target.select();
                  }
                }}
                onBlur={(e) => {
                  // When losing focus, ensure we have a valid number
                  const value = parseFloat(e.target.value) || 0;
                  handleInputChange('office_cash', value.toString());
                }}
                disabled={isFinalized}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <small>Cash given to office/management</small>
            </div>

            <div className="form-group">
              <label htmlFor="online_cash">
                Online Cash Received
                <span className="required">*</span>
              </label>
              <input
                id="online_cash"
                type="number"
                value={formData.online_cash}
                onChange={(e) => handleInputChange('online_cash', e.target.value)}
                onFocus={(e) => {
                  // When focused, if value is 0, select all so user can type over it
                  if (e.target.value === '0') {
                    e.target.select();
                  }
                }}
                onBlur={(e) => {
                  // When losing focus, ensure we have a valid number
                  const value = parseFloat(e.target.value) || 0;
                  handleInputChange('online_cash', value.toString());
                }}
                disabled={isFinalized}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <small>Online payments received in cash</small>
            </div>

            <div className="form-group">
              <label htmlFor="expenditure">
                Daily Expenditure
                <span className="required">*</span>
              </label>
              <input
                id="expenditure"
                type="number"
                value={formData.expenditure}
                onChange={(e) => handleInputChange('expenditure', e.target.value)}
                onFocus={(e) => {
                  // When focused, if value is 0, select all so user can type over it
                  if (e.target.value === '0') {
                    e.target.select();
                  }
                }}
                onBlur={(e) => {
                  // When losing focus, ensure we have a valid number
                  const value = parseFloat(e.target.value) || 0;
                  handleInputChange('expenditure', value.toString());
                }}
                disabled={isFinalized}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <small>Operational expenses for the day</small>
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={isFinalized}
                placeholder="Add any notes or comments about today's cash reconciliation..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isFinalized && (
          <div className="actions-section">
            <button
              onClick={handleSave}
              disabled={saving}
              className="save-button"
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
            
            <button
              onClick={handleFinalize}
              disabled={saving}
              className="finalize-button"
            >
              {saving ? 'Finalizing...' : '🔒 Save & Finalize Day'}
            </button>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <h3>🔒 Finalize Cash Reconciliation</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to finalize this cash reconciliation?</p>
              <div className="modal-warning">
                <p><strong>⚠️ Important:</strong></p>
                <ul>
                  <li>This action <strong>cannot be undone</strong></li>
                  <li>The closing balance will become tomorrow's opening balance</li>
                  <li>No further changes can be made to this day's reconciliation</li>
                </ul>
              </div>
              <div className="current-values">
                <h4>Current Values:</h4>
                <p>• Office Cash: ₹{formData.office_cash.toLocaleString()}</p>
                <p>• Online Cash: ₹{formData.online_cash.toLocaleString()}</p>
                <p>• Expenditure: ₹{formData.expenditure.toLocaleString()}</p>
                <p>• Closing Balance: <strong>₹{calculateClosingBalance().toLocaleString()}</strong></p>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="cancel-button"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={confirmFinalize}
                className="confirm-finalize-button"
                disabled={saving}
              >
                {saving ? 'Finalizing...' : '🔒 Yes, Finalize Day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashReconciliationForm;