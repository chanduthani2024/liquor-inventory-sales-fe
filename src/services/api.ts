import axios from 'axios';
import { Brand, BrandPriceHistory, Stock, Sale, CreateSale, DashboardData, StockMovement, CreateStockReceipt, AdjustStock, ReportDefect, StockReport, TpCharge, CreateTpCharge, UpdateTpCharge, RegisterData, LoginData, AuthResponse, ManualStockEntry, CashReconciliation, CreateCashReconciliation, UpdateCashReconciliation } from '../types';

// Dynamic API base URL detection
const getApiBaseUrl = () => {
  // If accessing from network (not localhost), use the same host for API
  // const currentHost = window.location.hostname;
  
  // if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
  //   return 'http://43.204.130.122:3001';
  // } else {
  //   // Use the same IP as the frontend but port 3001 for backend
  //   return `http://${currentHost}:3001`;
  // }
  return 'http://43.204.130.122:3001';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🌐 Current host:', window.location.hostname);
console.log('📱 User Agent:', navigator.userAgent);
console.log('📐 Screen size:', `${window.screen.width}x${window.screen.height}`);
console.log('🖥️ Viewport size:', `${window.innerWidth}x${window.innerHeight}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout for network requests
});

// Brand APIs
export const brandApi = {
  getAll: async (): Promise<Brand[]> => {
    const response = await api.get('/brands');
    return response.data;
  },
  
  getById: async (id: number): Promise<Brand> => {
    const response = await api.get(`/brands/${id}`);
    return response.data;
  },
  
  create: async (brand: Omit<Brand, 'id' | 'created_at' | 'updated_at'>): Promise<{success: boolean, message: string, data: Brand}> => {
    const response = await api.post('/brands', brand);
    return response.data;
  },
  
  update: async (id: number, brand: Partial<Brand>): Promise<{success: boolean, message: string, data: Brand}> => {
    const response = await api.patch(`/brands/${id}`, brand);
    return response.data;
  },
  
  delete: async (id: number): Promise<{success: boolean, message: string}> => {
    const response = await api.delete(`/brands/${id}`);
    return response.data;
  },
  
  getPriceForSize: async (id: number, size: string): Promise<number> => {
    const response = await api.get(`/brands/${id}/price/${size}`);
    return response.data;
  },
  
  getByAlcoholType: async (alcoholTypeId: number): Promise<Brand[]> => {
    const response = await api.get(`/brands/by-alcohol-type/${alcoholTypeId}`);
    return response.data;
  },

  // Price History APIs
  getPriceHistory: async (brandId?: number, size?: string, limit?: number): Promise<{success: boolean, data: BrandPriceHistory[]}> => {
    const params = new URLSearchParams();
    if (brandId) params.append('brandId', brandId.toString());
    if (size) params.append('size', size);
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get(`/brands/price-history/all?${params.toString()}`);
    return response.data;
  },

  getBrandPriceHistory: async (brandId: number, size?: string): Promise<{success: boolean, data: BrandPriceHistory[]}> => {
    const params = size ? `?size=${size}` : '';
    const response = await api.get(`/brands/${brandId}/price-history${params}`);
    return response.data;
  },

  // Profit Reports APIs
  getDailyProfitReport: async (date?: string, brandId?: number): Promise<{success: boolean, data: any}> => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (brandId) params.append('brandId', brandId.toString());
    
    const response = await api.get(`/brands/profit-report/daily?${params.toString()}`);
    return response.data;
  },

  getProfitSummary: async (startDate?: string, endDate?: string, brandId?: number): Promise<{success: boolean, data: any}> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (brandId) params.append('brandId', brandId.toString());
    
    const response = await api.get(`/brands/profit-report/summary?${params.toString()}`);
    return response.data;
  },
};

// Stock APIs
export const stockApi = {
  getAll: async (): Promise<Stock[]> => {
    const response = await api.get('/stock');
    return response.data;
  },
  
  getByBrand: async (brandId: number): Promise<Stock[]> => {
    const response = await api.get(`/stock?brandId=${brandId}`);
    return response.data;
  },
  
  getTotalValue: async (): Promise<number> => {
    const response = await api.get('/stock/total-value');
    return response.data;
  },
  
  getBrandValue: async (brandId: number): Promise<number> => {
    const response = await api.get(`/stock/brand/${brandId}/value`);
    return response.data;
  },
  
  create: async (stock: { brand_id: number; size: string; quantity: number }): Promise<{success: boolean, message: string, data: Stock}> => {
    const response = await api.post('/stock', stock);
    return response.data;
  },
  
  update: async (id: number, stock: { quantity: number }): Promise<{success: boolean, message: string, data: Stock}> => {
    const response = await api.patch(`/stock/${id}`, stock);
    return response.data;
  },
  
  delete: async (id: number): Promise<{success: boolean, message: string}> => {
    const response = await api.delete(`/stock/${id}`);
    return response.data;
  },
};

// Sales APIs
export const salesApi = {
  getAll: async (startDate?: string, endDate?: string): Promise<Sale[]> => {
    let url = '/sales';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
  
  getById: async (id: number): Promise<Sale> => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },
  
  create: async (sale: CreateSale): Promise<Sale> => {
    const response = await api.post('/sales', sale);
    return response.data;
  },
  
  getTotalRevenue: async (startDate?: string, endDate?: string): Promise<number> => {
    let url = '/sales/revenue';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
  
  getSalesByBrand: async (startDate?: string, endDate?: string): Promise<any[]> => {
    let url = '/sales/by-brand';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
  
  getTopBrands: async (limit?: number, startDate?: string, endDate?: string): Promise<any[]> => {
    let url = '/sales/top-brands';
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
  
  getPaymentSummary: async (startDate?: string, endDate?: string): Promise<{
    cash: { total: number; count: number };
    online: { total: number; count: number };
  }> => {
    let url = '/sales/payment-summary';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
};

// Dashboard APIs
export const dashboardApi = {
  getData: async (startDate?: string, endDate?: string): Promise<DashboardData> => {
    let url = '/dashboard';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
  
  getRevenueByDate: async (startDate: string, endDate: string): Promise<Sale[]> => {
    const response = await api.get(`/dashboard/revenue-by-date?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },
  
  getLowStock: async (threshold?: number): Promise<Stock[]> => {
    let url = '/dashboard/low-stock';
    if (threshold) url += `?threshold=${threshold}`;
    
    const response = await api.get(url);
    return response.data;
  },
  
  getBrandPerformance: async (brandId?: number, startDate?: string, endDate?: string): Promise<any> => {
    let url = '/dashboard/brand-performance';
    const params = new URLSearchParams();
    if (brandId) params.append('brandId', brandId.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
};

// Stock Movements APIs
export const stockMovementsApi = {
  receiveStock: async (data: CreateStockReceipt): Promise<{ message: string; movement: StockMovement; currentStock: number; defectiveStock: number; totalReceived: number; defectiveReceived: number }> => {
    const response = await api.post('/stock-movements/receive', data);
    return response.data;
  },
  
  adjustStock: async (data: AdjustStock): Promise<{ message: string; movement: StockMovement; previousQuantity: number; newQuantity: number; adjustmentQuantity: number }> => {
    const response = await api.post('/stock-movements/adjust', data);
    return response.data;
  },
  
  reportDefect: async (data: ReportDefect): Promise<{ message: string; movement: StockMovement; currentStock: number; defectiveStock: number }> => {
    const response = await api.post('/stock-movements/defect', data);
    return response.data;
  },

  manualStockEntry: async (data: ManualStockEntry): Promise<{ message: string; currentStock: number; receivedMovement?: StockMovement; salesMovement?: StockMovement }> => {
    const response = await api.post('/stock-movements/manual-entry', data);
    return response.data;
  },
  
  getReport: async (brandId?: number, startDate?: string, endDate?: string): Promise<StockReport[]> => {
    let url = '/stock-movements/report';
    const params = new URLSearchParams();
    if (brandId) params.append('brand_id', brandId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api.get(url);
    return response.data;
  },
    
  getAllMovements: async (): Promise<StockMovement[]> => {
    const response = await api.get('/stock-movements');
    return response.data;
  },
    
  getMovementsByBrand: async (brandId: number): Promise<StockMovement[]> => {
    const response = await api.get(`/stock-movements/brand/${brandId}`);
    return response.data;
  },
};

// TP Charges APIs
export const tpChargesApi = {
  getAll: async (): Promise<TpCharge[]> => {
    const response = await api.get('/tp-charges');
    return response.data;
  },
  
  getById: async (id: number): Promise<TpCharge> => {
    const response = await api.get(`/tp-charges/${id}`);
    return response.data;
  },
  
  getByDate: async (date: string): Promise<TpCharge | null> => {
    const response = await api.get(`/tp-charges/by-date?date=${date}`);
    return response.data;
  },
  
  getByDateRange: async (startDate: string, endDate: string): Promise<TpCharge[]> => {
    const response = await api.get(`/tp-charges/by-date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },
  
  create: async (data: CreateTpCharge): Promise<TpCharge> => {
    const response = await api.post('/tp-charges', data);
    return response.data;
  },
  
  update: async (id: number, data: UpdateTpCharge): Promise<TpCharge> => {
    const response = await api.patch(`/tp-charges/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tp-charges/${id}`);
  },
  
  getTotalForMonth: async (year: number, month: number): Promise<number> => {
    const response = await api.get(`/tp-charges/total/month?year=${year}&month=${month}`);
    return response.data;
  },
  
  getTotalForDateRange: async (startDate: string, endDate: string): Promise<number> => {
    const response = await api.get(`/tp-charges/total/date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },
};

// Authentication APIs
export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  
  getUsers: async (): Promise<any[]> => {
    const token = localStorage.getItem('token');
    const response = await api.get('/auth/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },
};

// Cash Reconciliation APIs
export const cashReconciliationApi = {
  getAll: async (): Promise<CashReconciliation[]> => {
    const response = await api.get('/cash-reconciliation');
    return response.data;
  },
  
  getById: async (id: number): Promise<CashReconciliation> => {
    const response = await api.get(`/cash-reconciliation/${id}`);
    return response.data;
  },
  
  getByDate: async (date?: string): Promise<CashReconciliation> => {
    let url = '/cash-reconciliation/by-date';
    if (date) {
      url += `?date=${date}`;
    }
    const response = await api.get(url);
    return response.data;
  },
  
  create: async (data: CreateCashReconciliation): Promise<CashReconciliation> => {
    const response = await api.post('/cash-reconciliation', data);
    return response.data;
  },
  
  update: async (id: number, data: UpdateCashReconciliation): Promise<CashReconciliation> => {
    const response = await api.put(`/cash-reconciliation/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/cash-reconciliation/${id}`);
  },
};

export default api;