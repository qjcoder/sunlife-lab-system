/**
 * ====================================================
 * SALE API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the sale API endpoints.
 * 
 * ENDPOINTS:
 * - POST /api/inverter-sales/sell - Sell single inverter (DEALER, FACTORY_ADMIN)
 * - POST /api/inverter-sales/bulk - Bulk sell inverters (DEALER, FACTORY_ADMIN)
 * 
 * USAGE:
 * import { sellInverter, bulkSellInverters } from '@/api/sale-api';
 */
import api from './axios';

export interface SellInverterRequest {
  serialNumber: string;
  saleInvoiceNo: string;
  saleDate: string;
  customerName: string;
  customerContact?: string;
}

export interface SellInverterResponse {
  message: string;
  sale: {
    _id: string;
    inverter: string;
    saleInvoiceNo: string;
    saleDate: string;
    customerName: string;
    customerContact?: string;
    warrantyStartDate: string;
    warrantyEndDate: string;
  };
}

export interface BulkSellRequest {
  sales: SellInverterRequest[];
}

export interface BulkSellResponse {
  message: string;
  sold: number;
  sales: SellInverterResponse['sale'][];
}

export const sellInverter = async (data: SellInverterRequest): Promise<SellInverterResponse> => {
  const response = await api.post<SellInverterResponse>('/api/inverter-sales/sell', data);
  return response.data;
};

export const bulkSellInverters = async (data: BulkSellRequest): Promise<BulkSellResponse> => {
  const response = await api.post<BulkSellResponse>('/api/inverter-sales/bulk', data);
  return response.data;
};
