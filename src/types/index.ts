export interface AlcoholType {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: number;
  name: string;
  price_90ml: number | null;
  price_180ml: number | null;
  price_330ml: number | null;
  price_375ml: number | null;
  price_500ml: number | null;
  price_650ml: number | null;
  price_750ml: number | null;
  price_1l: number | null;
  price_2l: number | null;
  description?: string;
  alcohol_type_id?: number | null;
  alcoholType?: AlcoholType;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: number;
  brand_id: number;
  size: string;
  quantity: number;
  defective_quantity: number;
  created_at: string;
  updated_at: string;
  brand: Brand;
  brand_name?: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  brand_id: number;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  brand: Brand;
}

export interface Sale {
  id: number;
  total_amount: number | string;
  payment_method: 'cash' | 'online';
  created_at: string;
  items: SaleItem[];
}

export interface CreateSaleItem {
  brand_id: number;
  size: string;
  quantity: number;
}

export interface CreateSale {
  items: CreateSaleItem[];
  payment_method?: 'cash' | 'online';
}

export interface DashboardData {
  summary: {
    totalRevenue: number;
    totalStockValue: number;
    totalBrands: number;
    totalStockItems: number;
    lowStockCount: number;
  };
  topSellingBrands: any[];
  salesByBrand: any[];
  currentStock: Stock[];
  lowStockItems: Stock[];
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

export const BOTTLE_SIZES = ['90ml', '180ml', '330ml', '375ml', '500ml', '650ml', '750ml', '1L', '2L'] as const;
export type BottleSize = typeof BOTTLE_SIZES[number];

export interface StockMovement {
  id: number;
  brand_id: number;
  size: string;
  movement_type: 'RECEIPT' | 'SALE' | 'ADJUSTMENT' | 'DEFECT';
  quantity: number;
  defective_quantity?: number;
  reference_id?: number;
  notes?: string;
  unit_cost?: number;
  created_at: string;
  brand: Brand;
}

export interface CreateStockReceipt {
  brand_id: number;
  size: string;
  quantity: number;
  defective_quantity?: number;
  unit_cost?: number;
  notes?: string;
}

export interface ReportDefect {
  brand_id: number;
  size: string;
  defective_quantity: number;
  defect_reason?: string;
  action_taken?: string;
  notes?: string;
}

export interface AdjustStock {
  brand_id: number;
  size: string;
  new_total_quantity: number;
  notes?: string;
}

export interface StockReport {
  date: string;
  brand_id: number;
  brand_name: string;
  size: string;
  opening_balance: number;
  received_today: number;
  total_stock: number;
  closed_balance: number;
  sales_quantity: number;
  defective_quantity: number;
  rate: number; // Cost per bottle
  sales_amount: number;
  movements: {
    date: string;
    type: 'RECEIPT' | 'SALE' | 'ADJUSTMENT' | 'DEFECT';
    quantity: number;
    defective_quantity?: number;
    notes?: string;
    unit_cost?: number;
  }[];
}

export interface TpCharge {
  id: number;
  date: string; // Format: YYYY-MM-DD
  amount: number;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTpCharge {
  date: string;
  amount: number;
  description?: string;
  notes?: string;
}

export interface UpdateTpCharge {
  date?: string;
  amount?: number;
  description?: string;
  notes?: string;
}

// Auth interfaces
export interface User {
  id: number;
  username: string;
  is_active?: boolean;
  created_at?: string;
}

export interface RegisterData {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
  };
  token?: string;
}

// Manual Stock Entry interface
export interface ManualStockEntry {
  brand_id: number;
  size: string;
  received_today: number;
  sales_quantity: number;
  date: string; // YYYY-MM-DD format
  notes?: string;
}

// Cash Reconciliation interfaces
export interface CashReconciliation {
  id: number;
  date: string; // YYYY-MM-DD format
  opening_balance: number;
  total_sales: number;
  cash_sales: number;
  online_sales: number;
  office_cash: number;
  online_cash: number;
  expenditure: number;
  closing_balance: number;
  notes?: string;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCashReconciliation {
  date: string; // YYYY-MM-DD format
  office_cash: number;
  online_cash: number;
  expenditure: number;
  notes?: string;
}

export interface UpdateCashReconciliation {
  office_cash?: number;
  online_cash?: number;
  expenditure?: number;
  notes?: string;
  is_finalized?: boolean;
}