/**
 * ====================================================
 * OPERATOR SERIAL ENTRY API
 * ====================================================
 * 
 * API functions for data entry operator serial number entry
 */

import api from './axios';

export interface SingleSerialEntryRequest {
  serialNumber: string;
  inverterModel: string;
  manufacturingDate?: string;
}

export interface SingleSerialEntryResponse {
  message: string;
  inverterUnit?: any;
}

export interface DuplicateInfo {
  serialNumber: string;
  enteredBy: string;
  enteredAt: string;
  enteredDate: string;
  enteredTime: string;
}

export interface BulkSerialEntryRequest {
  inverterModel: string;
  serialNumbers: string[];
  manufacturingDate?: string;
}

export interface RejectedSerial {
  serialNumber: string;
  reason: 'DUPLICATE_IN_REQUEST' | 'ALREADY_EXISTS';
  message: string;
  enteredBy?: string;
  enteredAt?: string;
  enteredDate?: string;
  enteredTime?: string;
}

export interface BulkSerialEntryResponse {
  message: string;
  summary: {
    total: number;
    accepted: number;
    rejected: number;
  };
  accepted: string[];
  rejected: RejectedSerial[];
  createdCount: number;
}

export interface SerialEntryHistoryEntry {
  serialNumber: string;
  enteredBy: string;
  enteredAt: string;
  enteredTime: string;
}

export interface SerialEntryHistoryDate {
  date: string;
  count: number;
  entries: SerialEntryHistoryEntry[];
}

export interface SerialEntryHistoryResponse {
  modelId: string;
  totalEntries: number;
  history: SerialEntryHistoryDate[];
}

export const createSingleSerialEntry = async (
  data: SingleSerialEntryRequest
): Promise<SingleSerialEntryResponse> => {
  const response = await api.post<SingleSerialEntryResponse>(
    '/api/operator/serial-entry/single',
    data
  );
  return response.data;
};

export const createBulkSerialEntry = async (
  data: BulkSerialEntryRequest
): Promise<BulkSerialEntryResponse> => {
  const response = await api.post<BulkSerialEntryResponse>(
    '/api/operator/serial-entry/bulk',
    data
  );
  return response.data;
};

export const getSerialEntryHistory = async (
  modelId: string
): Promise<SerialEntryHistoryResponse> => {
  const response = await api.get<SerialEntryHistoryResponse>(
    '/api/operator/serial-entry/history',
    { params: { modelId } }
  );
  return response.data;
};
