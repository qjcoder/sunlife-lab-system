/**
 * ====================================================
 * INVERTER API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the inverter unit API endpoints.
 * 
 * ENDPOINTS:
 * - POST /api/inverters - Register single inverter unit (FACTORY_ADMIN)
 * - POST /api/inverters/bulk - Bulk register inverter units (FACTORY_ADMIN)
 * - GET /api/inverters/:serialNumber/lifecycle - Get inverter lifecycle (AUTHENTICATED)
 * 
 * USAGE:
 * import { createInverter, bulkCreateInverters, getInverterLifecycle } from '@/api/inverter-api';
 */
import api from './axios';

export interface CreateInverterRequest {
  serialNumber: string;
  inverterModel: string;
  manufacturingDate?: string;
}

export interface CreateInverterResponse {
  message: string;
  inverter: {
    _id: string;
    serialNumber: string;
    inverterModel: string;
    manufacturingDate?: string;
  };
}

export interface BulkCreateInverterRequest {
  modelCode: string;
  serialNumbers: string[];
}

export interface BulkCreateInverterResponse {
  message: string;
  modelCode: string;
  createdCount: number;
}

export interface InverterLifecycle {
  factory: {
    serialNumber: string;
    inverterModel: {
      brand: string;
      productLine: string;
      variant: string;
      modelCode: string;
      warranty: {
        partsMonths: number;
        serviceMonths: number;
      };
    };
    registeredAt: string;
  };
  factoryDispatch?: {
    dispatchNumber: string;
    dealer: string;
    dispatchDate: string;
    remarks?: string;
  };
  dealerTransfers?: Array<{
    transferredAt: string;
    fromDealer: string;
    toSubDealer: string;
    remarks?: string;
  }>;
  sale?: {
    invoiceNo: string;
    saleDate: string;
    customerName: string;
    customerContact?: string;
  };
  warranty: {
    startDate: string | null;
    status: string;
  };
  serviceJobs: Array<{
    serviceJob: {
      _id: string;
      serialNumber: string;
      serviceCenter: string;
      reportedFault: string;
      visitDate: string;
      warrantyStatus: {
        parts: boolean;
        service: boolean;
      };
      serviceType?: string;
      remarks?: string;
    };
    replacedParts: Array<{
      _id: string;
      partName: string;
      partCode: string;
      quantity: number;
    }>;
  }>;
}

export const createInverter = async (data: CreateInverterRequest): Promise<CreateInverterResponse> => {
  const response = await api.post<CreateInverterResponse>('/api/inverters', data);
  return response.data;
};

export const bulkCreateInverters = async (data: BulkCreateInverterRequest): Promise<BulkCreateInverterResponse> => {
  const response = await api.post<BulkCreateInverterResponse>('/api/inverters/bulk', data);
  return response.data;
};

export const getInverterLifecycle = async (serialNumber: string): Promise<InverterLifecycle> => {
  const response = await api.get<InverterLifecycle>(`/api/inverters/${serialNumber}/lifecycle`);
  return response.data;
};
