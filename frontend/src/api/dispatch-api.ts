/**
 * ====================================================
 * DISPATCH API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the dispatch API endpoints.
 * 
 * ENDPOINTS:
 * - POST /api/inverter-dispatches - Create factory dispatch (FACTORY_ADMIN)
 * 
 * USAGE:
 * import { createDispatch } from '@/api/dispatch-api';
 */
import api from './axios';

export interface CreateDispatchRequest {
  dispatchNumber: string;
  dealer: string;
  dispatchDate: string;
  serialNumbers: string[];
  remarks?: string;
}

export interface CreateDispatchResponse {
  message: string;
  dispatch: {
    _id: string;
    dispatchNumber: string;
    dealer: string;
    dispatchDate: string;
    remarks?: string;
    inverterUnits: string[];
  };
}

export const createDispatch = async (data: CreateDispatchRequest): Promise<CreateDispatchResponse> => {
  const response = await api.post<CreateDispatchResponse>('/api/inverter-dispatches', data);
  return response.data;
};
