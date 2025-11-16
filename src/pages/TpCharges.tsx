import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { tpChargesApi } from '../services/api';
import { TpCharge, CreateTpCharge } from '../types';
import Footer from '../components/Footer';
import './TpCharges.css';

const TpChargesPage: React.FC = () => {
  const [charges, setCharges] = useState<TpCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<TpCharge | null>(null);

  const [formData, setFormData] = useState<CreateTpCharge>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    notes: '',
  });

  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tpChargesApi.getAll();
      setCharges(data);
    } catch (error: any) {
      console.error('Failed to fetch TP charges:', error);
      toast.error('Failed to fetch TP charges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      if (editingCharge) {
        await tpChargesApi.update(editingCharge.id, formData);
        toast.success('TP charge updated successfully');
      } else {
        await tpChargesApi.create(formData);
        toast.success('TP charge recorded successfully');
      }
      
      resetForm();
      fetchCharges();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save TP charge';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (charge: TpCharge) => {
    setEditingCharge(charge);
    setFormData({
      date: charge.date,
      amount: charge.amount,
      description: charge.description || '',
      notes: charge.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this TP charge entry?')) {
      return;
    }

    try {
      await tpChargesApi.delete(id);
      toast.success('TP charge deleted successfully');
      fetchCharges();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete TP charge';
      toast.error(errorMessage);
    }
  };

  const handleAddToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Check if there's already a charge for today
      const existingCharge = await tpChargesApi.getByDate(today);
      
      if (existingCharge) {
        // Edit existing charge
        handleEdit(existingCharge);
        toast('TP charge already exists for today. Opening for editing.', { icon: 'ℹ️' });
      } else {
        // Create new charge for today
        setEditingCharge(null);
        setFormData({
          date: today,
          amount: 0,
          description: '',
          notes: '',
        });
        setShowForm(true);
      }
    } catch (error: any) {
      console.error('Failed to check existing charge:', error);
      // If error, just open form for new charge
      setEditingCharge(null);
      setFormData({
        date: today,
        amount: 0,
        description: '',
        notes: '',
      });
      setShowForm(true);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCharge(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      notes: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    // Ensure amount is a proper number and format without leading zeros
    const numericAmount = Number(amount);
    return `₹${numericAmount.toLocaleString('en-IN', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    })}`;
  };

  const getTotalCharges = () => {
    return charges.reduce((total, charge) => total + charge.amount, 0);
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
      
      <div className="page-header" style={{ justifyContent: 'flex-end' }}>
        <div className="page-header-right">
          <button 
            className="btn btn-primary"
            onClick={handleAddToday}
          >
            + Add Today's TP Charges
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3">
        <div className="card summary-card">
          <div className="summary-icon">💳</div>
          <div className="summary-content">
            <h3>Total Charges</h3>
            <p className="summary-value">{formatCurrency(getTotalCharges())}</p>
            <span className="summary-label">all time</span>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon">📅</div>
          <div className="summary-content">
            <h3>Total Entries</h3>
            <p className="summary-value">{charges.length}</p>
            <span className="summary-label">records</span>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h3>Average per Day</h3>
            <p className="summary-value">
              {charges.length > 0 ? formatCurrency(getTotalCharges() / charges.length) : '₹0'}
            </p>
            <span className="summary-label">average</span>
          </div>
        </div>
      </div>

      {/* TP Charges Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingCharge ? 'Edit TP Charge' : 'Add TP Charge'}</h3>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="tp-charges-form">
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Delivery charges, Platform commission"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details about the charges"
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingCharge ? 'Update Charge' : 'Record Charge'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TP Charges List */}
      <div className="card">
        <div className="card-header">
          <h3>TP Charges History</h3>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading TP charges...</p>
          </div>
        ) : charges.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="date-cell">
                      <div className="date-display">
                        <strong>{formatDate(charge.date)}</strong>
                        <span className="date-raw">{charge.date}</span>
                      </div>
                    </td>
                    <td className="amount-cell">
                      <strong className="amount-value">{formatCurrency(charge.amount)}</strong>
                    </td>
                    <td className="description-cell">
                      {charge.description || <span className="text-muted">No description</span>}
                    </td>
                    <td className="notes-cell">
                      {charge.notes ? (
                        <div className="notes-preview" title={charge.notes}>
                          {charge.notes.length > 50 
                            ? `${charge.notes.substring(0, 50)}...` 
                            : charge.notes
                          }
                        </div>
                      ) : (
                        <span className="text-muted">No notes</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(charge)}
                          title="Edit charge"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(charge.id)}
                          title="Delete charge"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h3>No TP Charges Recorded</h3>
            <p>Start by adding today's third-party charges.</p>
            <button className="btn btn-primary" onClick={handleAddToday}>
              Add Today's TP Charges
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TpChargesPage;