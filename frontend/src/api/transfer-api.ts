/**
 * ====================================================
 * TRANSFER API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the transfer API endpoints.
 * 
 * ENDPOINTS:
 * - POST /api/dealer-transfers - Transfer inverters to sub-dealer (DEALER)
 * 
 * USAGE:
 * import { createTransfer } from '@/api/transfer-api';
 */
import api from './axios';

export interface CreateTransferRequest {
  subDealerId: string;
  serialNumbers: string[];
  remarks?: string;
}

export interface CreateTransferResponse {
  message: string;
  transfer: {
    _id: string;
    fromDealer: string;
    toSubDealer: string;
    inverter: string;
    remarks?: string;
  };
}

export const createTransfer = async (data: CreateTransferRequest): Promise<CreateTransferResponse> => {
  const response = await api.post<CreateTransferResponse>('/api/dealer-transfers', data);
  return response.data;
};
