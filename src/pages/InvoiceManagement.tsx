import React, { useState } from 'react';
import InvoiceUpload from '../components/InvoiceUpload';
import InvoiceItemsList from '../components/InvoiceItemsList';
import { InvoiceParsingResponse } from '../types/invoice';

const InvoiceManagement: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastUploadedIcdc, setLastUploadedIcdc] = useState<string>('');

  const handleUploadSuccess = (response: InvoiceParsingResponse) => {
    if (response.success && response.icdc_number) {
      setLastUploadedIcdc(response.icdc_number);
      // Trigger refresh of the items list
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="invoice-management">
      <div className="page-content">
        {/* Upload Section */}
        <div className="upload-section-container">
          <InvoiceUpload onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Divider */}
        <div className="section-divider"></div>

        {/* Items List Section */}
        <div className="items-section-container">
          <InvoiceItemsList 
            refreshTrigger={refreshTrigger}
            icdcNumber={lastUploadedIcdc || undefined}
            key={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagement;