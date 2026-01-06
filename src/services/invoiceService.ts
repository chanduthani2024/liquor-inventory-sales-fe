import { InvoiceItem, InvoiceParsingResponse } from '../types/invoice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://43.204.130.122:3001';

export const invoiceService = {
  async uploadPdf(file: File): Promise<InvoiceParsingResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/pdf-import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  },

  async getAllInvoiceItems(icdcNumber?: string): Promise<InvoiceItem[]> {
    const url = icdcNumber 
      ? `${API_BASE_URL}/invoice?icdc_number=${icdcNumber}`
      : `${API_BASE_URL}/invoice`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoice items');
    }

    return response.json();
  },

  async getInvoiceItem(id: number): Promise<InvoiceItem> {
    const response = await fetch(`${API_BASE_URL}/invoice/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoice item');
    }

    return response.json();
  },

  async getInvoiceItemsByIcdcNumber(icdcNumber: string): Promise<InvoiceItem[]> {
    const response = await fetch(`${API_BASE_URL}/invoice/icdc/${icdcNumber}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoice items by ICDC number');
    }

    return response.json();
  },

  async updateInvoiceItem(id: number, data: Partial<InvoiceItem>): Promise<InvoiceItem> {
    const response = await fetch(`${API_BASE_URL}/invoice/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update invoice item');
    }

    return response.json();
  },

  async deleteInvoiceItem(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/invoice/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete invoice item');
    }
  },
};