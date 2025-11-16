export interface InvoiceItem {
  id: number;
  icdc_number?: string;
  sl_no: number;
  brand_code?: string;
  brand_name?: string;
  product_type?: string;
  pack_type?: string;
  pack_qty?: number;
  size_ml?: number;
  qty_cases_delivered?: number;
  qty_bottles_delivered?: number;
  rate_per_case?: number;
  rate_per_bottle?: number;
  total_amount?: number;
  created_at: Date;
}

export interface InvoiceParsingResponse {
  success: boolean;
  message: string;
  icdc_number?: string;
  items_parsed?: number;
  items?: InvoiceItem[];
  error?: string;
}

export interface CreateInvoiceItemDto {
  icdc_number?: string;
  sl_no: number;
  brand_code?: string;
  brand_name?: string;
  product_type?: string;
  pack_type?: string;
  pack_qty?: number;
  size_ml?: number;
  qty_cases_delivered?: number;
  qty_bottles_delivered?: number;
  rate_per_case?: number;
  rate_per_bottle?: number;
  total_amount?: number;
}