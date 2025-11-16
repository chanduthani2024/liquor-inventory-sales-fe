import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { invoiceService } from '../services/invoiceService';
import { InvoiceParsingResponse } from '../types/invoice';

interface InvoiceImportProps {
  onImportSuccess?: (response: InvoiceParsingResponse) => void;
  onClose?: () => void;
}

const InvoiceImport: React.FC<InvoiceImportProps> = ({ onImportSuccess, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<InvoiceParsingResponse | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Processing PDF and extracting invoice data...');

    try {
      const response = await invoiceService.uploadPdf(file);
      toast.dismiss(loadingToast);
      
      setResult(response);
      
      if (response.success) {
        toast.success(`Successfully parsed ${response.items_parsed} items from ICDC ${response.icdc_number}`);
        if (onImportSuccess) {
          onImportSuccess(response);
        }
      } else {
        toast.error(response.message || 'Failed to process PDF');
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      toast.error(errorMessage);
      console.error('Import error:', err);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    const fileInput = document.getElementById('invoice-pdf-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="invoice-import">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Import ICDC Invoice</h3>
        {onClose && (
          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        )}
      </div>
      
      <div style={{ 
        border: '2px dashed #007bff', 
        borderRadius: '8px', 
        padding: '2rem', 
        textAlign: 'center',
        marginBottom: '1rem',
        background: '#f8f9fa'
      }}>
        <input
          id="invoice-pdf-file"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <label 
          htmlFor="invoice-pdf-file" 
          style={{
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'block'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <p style={{ margin: '0.5rem 0', fontWeight: 'bold', color: '#007bff' }}>
            {file ? file.name : 'Click to select ICDC invoice PDF'}
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6c757d' }}>
            {file 
              ? `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`
              : 'Supports PDF files with ICDC invoice format'
            }
          </p>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', justifyContent: 'center' }}>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn btn-primary"
          style={{ minWidth: '120px' }}
        >
          {uploading ? 'Processing...' : 'Import Invoice'}
        </button>
        
        {(file || result) && (
          <button
            onClick={resetForm}
            disabled={uploading}
            className="btn btn-secondary"
          >
            Reset
          </button>
        )}
      </div>

      {uploading && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          padding: '1rem',
          background: '#e3f2fd',
          borderRadius: '6px',
          margin: '1rem 0'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Processing PDF...</p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6c757d' }}>
              Extracting brand information, quantities, and pricing
            </p>
          </div>
        </div>
      )}

      {result && (
        <div style={{
          padding: '1rem',
          borderRadius: '6px',
          margin: '1rem 0',
          background: result.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          color: result.success ? '#155724' : '#721c24'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>
            {result.success ? '✅ Import Successful' : '❌ Import Failed'}
          </h4>
          
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Status:</strong> {result.message}
          </div>
          
          {result.icdc_number && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>ICDC Number:</strong> {result.icdc_number}
            </div>
          )}
          
          {result.items_parsed !== undefined && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Items Processed:</strong> {result.items_parsed}
            </div>
          )}

          {result.error && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontStyle: 'italic' }}>
              <strong>Error Details:</strong> {result.error}
            </div>
          )}

          {result.success && result.items && result.items.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.5)', borderRadius: '4px' }}>
              <strong>Sample Items:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {result.items.slice(0, 3).map((item, index) => (
                  <li key={index} style={{ fontSize: '0.875rem', margin: '0.25rem 0' }}>
                    {item.brand_name} ({item.size_ml}ml) - {item.qty_cases_delivered} cases, {item.qty_bottles_delivered} bottles
                  </li>
                ))}
                {result.items.length > 3 && (
                  <li style={{ fontSize: '0.875rem', fontStyle: 'italic', color: '#6c757d' }}>
                    ... and {result.items.length - 3} more items
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffeaa7', 
        borderRadius: '6px', 
        padding: '0.75rem',
        fontSize: '0.875rem',
        color: '#856404'
      }}>
        <strong>💡 Note:</strong> This will import invoice data into the invoice_items table. 
        The imported data can be used to automatically update stock levels and track deliveries.
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InvoiceImport;