/**
 * ====================================================
 * SERVICE CENTER API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the service center API endpoints.
 * 
 * ENDPOINTS:
 * - POST /api/service-centers - Create service center (FACTORY_ADMIN)
 * 
 * USAGE:
 * import { createServiceCenter } from '@/api/service-center-api';
 */
import api from './axios';

export interface CreateServiceCenterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateServiceCenterResponse {
  message: string;
  serviceCenter: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const createServiceCenter = async (data: CreateServiceCenterRequest): Promise<CreateServiceCenterResponse> => {
  const response = await api.post<CreateServiceCenterResponse>('/api/service-centers', data);
  return response.data;
};

export interface ServiceCenter {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface ListServiceCentersResponse {
  message: string;
  serviceCenters: ServiceCenter[];
}

export const listServiceCenters = async (): Promise<ServiceCenter[]> => {
  const response = await api.get<ListServiceCentersResponse>('/api/service-centers');
  return response.data.serviceCenters;
};

export interface DeleteServiceCenterResponse {
  message: string;
}

export const deleteServiceCenter = async (id: string): Promise<DeleteServiceCenterResponse> => {
  const response = await api.delete<DeleteServiceCenterResponse>(`/api/service-centers/${id}`);
  return response.data;
};
