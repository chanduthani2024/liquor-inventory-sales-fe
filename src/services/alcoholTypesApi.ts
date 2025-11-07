import api from './api';
import { AlcoholType } from '../types';

export interface CreateAlcoholTypeDto {
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateAlcoholTypeDto {
  name?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export const alcoholTypesApi = {
  // Get all alcohol types
  getAll: async (): Promise<AlcoholType[]> => {
    const response = await api.get('/alcohol-types');
    return response.data;
  },

  // Get alcohol type by ID
  getById: async (id: number): Promise<AlcoholType> => {
    const response = await api.get(`/alcohol-types/${id}`);
    return response.data;
  },

  // Create new alcohol type
  create: async (data: CreateAlcoholTypeDto): Promise<AlcoholType> => {
    const response = await api.post('/alcohol-types', data);
    return response.data;
  },

  // Update alcohol type
  update: async (id: number, data: UpdateAlcoholTypeDto): Promise<AlcoholType> => {
    const response = await api.put(`/alcohol-types/${id}`, data);
    return response.data;
  },

  // Delete alcohol type (soft delete)
  delete: async (id: number): Promise<void> => {
    await api.delete(`/alcohol-types/${id}`);
  },

  // Initialize default alcohol types
  initializeDefaults: async (): Promise<void> => {
    await api.post('/alcohol-types/initialize');
  },
};