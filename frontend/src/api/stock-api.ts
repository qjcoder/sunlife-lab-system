/**
 * ====================================================
 * STOCK API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the stock API endpoints.
 * 
 * ENDPOINTS:
 * - GET /api/factory-inverter-stock - Get factory stock (FACTORY_ADMIN)
 * - GET /api/dealer-inverter-stock - Get dealer stock (DEALER, FACTORY_ADMIN)
 * 
 * USAGE:
 * import { getFactoryStock, getDealerStock } from '@/api/stock-api';
 */
import api from './axios';

export interface InverterStockItem {
  serialNumber: string;
  inverterModel: {
    _id: string;
    brand: string;
    productLine: string;
    variant: string;
    modelCode: string;
  };
  dispatchedAt?: string;
  dispatchNumber?: string;
  registrationDate?: string;
}

export interface FactoryStockResponse {
  count: number;
  availableInverters: InverterStockItem[];
}

export interface DealerStockResponse {
  dealer: string;
  count: number;
  availableInverters: InverterStockItem[];
}

export const getFactoryStock = async (): Promise<FactoryStockResponse> => {
  const response = await api.get<{ count: number; stock: InverterStockItem[] }>('/api/factory-inverter-stock');
  return {
    count: response.data.count,
    availableInverters: response.data.stock,
  };
};

export const getDealerStock = async (dealer?: string): Promise<DealerStockResponse> => {
  const params = dealer ? { dealer } : {};
  const response = await api.get<DealerStockResponse>('/api/dealer-inverter-stock', { params });
  return response.data;
};
