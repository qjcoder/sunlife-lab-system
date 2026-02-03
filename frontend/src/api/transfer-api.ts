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
