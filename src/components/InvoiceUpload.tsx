import React, { useState } from 'react';
import { invoiceService } from '../services/invoiceService';
import { InvoiceParsingResponse } from '../types/invoice';

interface InvoiceUploadProps {
  onUploadSuccess?: (response: InvoiceParsingResponse) => void;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<InvoiceParsingResponse | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await invoiceService.uploadPdf(file);
      setResult(response);
      
      if (response.success && onUploadSuccess) {
        onUploadSuccess(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError('');
    const fileInput = document.getElementById('pdf-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="invoice-upload">
      <div className="upload-section">
        <h3>Upload ICDC Invoice PDF</h3>
        
        <div className="file-input-container">
          <input
            id="pdf-file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="file-input"
          />
          <label htmlFor="pdf-file" className="file-input-label">
            {file ? file.name : 'Choose PDF file...'}
          </label>
        </div>

        {file && (
          <div className="file-info">
            <p><strong>Selected:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <div className="upload-actions">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn btn-primary"
          >
            {uploading ? 'Processing...' : 'Upload & Parse'}
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
      </div>

      {uploading && (
        <div className="upload-progress">
          <div className="spinner"></div>
          <p>Processing PDF and extracting invoice data...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className={`upload-result ${result.success ? 'success' : 'error'}`}>
          <h4>Upload Result</h4>
          <div className="result-details">
            <p><strong>Status:</strong> {result.success ? 'Success' : 'Failed'}</p>
            <p><strong>Message:</strong> {result.message}</p>
            
            {result.icdc_number && (
              <p><strong>ICDC Number:</strong> {result.icdc_number}</p>
            )}
            
            {result.items_parsed !== undefined && (
              <p><strong>Items Parsed:</strong> {result.items_parsed}</p>
            )}

            {result.error && (
              <p className="error-detail"><strong>Error Details:</strong> {result.error}</p>
            )}
          </div>

          {result.items && result.items.length > 0 && (
            <div className="parsed-items-summary">
              <h5>Parsed Items Summary:</h5>
              <ul>
                {result.items.slice(0, 3).map((item, index) => (
                  <li key={index}>
                    {item.brand_name} - {item.qty_cases_delivered} cases, {item.qty_bottles_delivered} bottles
                  </li>
                ))}
                {result.items.length > 3 && (
                  <li>... and {result.items.length - 3} more items</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceUpload;