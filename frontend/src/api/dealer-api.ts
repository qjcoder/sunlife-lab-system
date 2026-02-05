/**
 * ====================================================
 * DEALER API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the dealer API endpoints.
 * 
 * ENDPOINTS:
 * - POST /api/dealers - Create main dealer
 * - POST /api/dealers/sub-dealer - Create sub-dealer
 * - GET /api/dealers/hierarchy - Get dealer hierarchy
 * 
 * USAGE:
 * import { createDealer, createSubDealer, getDealerHierarchy } from '@/api/dealer-api';
 */
import api from './axios';

export interface CreateDealerRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateDealerResponse {
  message: string;
  dealer: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreateSubDealerRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateSubDealerResponse {
  message: string;
  subDealer: {
    id: string;
    name: string;
    email: string;
    role: string;
    parentDealer: string;
  };
}

export interface DealerHierarchyNode {
  dealer: {
    id: string;
    name: string;
    email: string;
  };
  subDealers: DealerHierarchyNode[];
}

export const createDealer = async (data: CreateDealerRequest): Promise<CreateDealerResponse> => {
  const response = await api.post<CreateDealerResponse>('/api/dealers', data);
  return response.data;
};

export const createSubDealer = async (data: CreateSubDealerRequest): Promise<CreateSubDealerResponse> => {
  const response = await api.post<CreateSubDealerResponse>('/api/dealers/sub-dealer', data);
  return response.data;
};

export const getDealerHierarchy = async (): Promise<DealerHierarchyNode[]> => {
  const response = await api.get<{ count: number; data: DealerHierarchyNode[] }>('/api/dealers/hierarchy');
  return response.data.data;
};

export interface Dealer {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface ListDealersResponse {
  message: string;
  dealers: Dealer[];
}

export const listDealers = async (): Promise<Dealer[]> => {
  const response = await api.get<ListDealersResponse>('/api/dealers');
  return response.data.dealers;
};
