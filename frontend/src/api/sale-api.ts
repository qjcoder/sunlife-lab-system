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
