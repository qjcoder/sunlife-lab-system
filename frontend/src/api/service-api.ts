import api from './axios';

export interface ServiceJob {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceJobRequest {
  serialNumber: string;
  customerName?: string;
  customerContact?: string;
  reportedFault: string;
  visitDate: string;
  remarks?: string;
}

export interface CreateServiceJobResponse {
  message: string;
  serviceJob: ServiceJob;
}

export interface AddReplacedPartRequest {
  partName: string;
  partCode: string;
  quantity: number;
  replacementDate: string;
  replacementType?: 'REPLACEMENT' | 'REPAIR';
  dispatchId: string;
}

export interface AddReplacedPartResponse {
  message: string;
  replacedPart: {
    _id: string;
    serviceJob: string;
    partName: string;
    partCode: string;
    quantity: number;
  };
}

export interface ServiceCenterStockItem {
  partName: string;
  partCode: string;
  quantity: number;
}

export interface ServiceCenterStockResponse {
  serviceCenter: string;
  count: number;
  parts: ServiceCenterStockItem[];
}

export const listServiceJobs = async (): Promise<ServiceJob[]> => {
  const response = await api.get<{ count: number; data: ServiceJob[] }>('/api/service-jobs');
  return response.data.data;
};

export interface ServiceJobDetailsResponse {
  serviceJob: ServiceJob;
  replacedParts: Array<{
    _id: string;
    partCode: string;
    partName: string;
    quantity: number;
    replacementDate: string;
    replacementType: string;
  }>;
}

export const getServiceJobDetails = async (serviceJobId: string): Promise<ServiceJobDetailsResponse> => {
  const response = await api.get<ServiceJobDetailsResponse>(`/api/service-jobs/${serviceJobId}`);
  return response.data;
};

export const createServiceJob = async (data: CreateServiceJobRequest): Promise<CreateServiceJobResponse> => {
  const response = await api.post<CreateServiceJobResponse>('/api/service-jobs', data);
  return response.data;
};

export const addReplacedPart = async (
  serviceJobId: string,
  data: AddReplacedPartRequest
): Promise<AddReplacedPartResponse> => {
  const response = await api.post<AddReplacedPartResponse>(
    `/api/service-jobs/${serviceJobId}/replaced-parts`,
    data
  );
  return response.data;
};

export const getServiceCenterStock = async (): Promise<ServiceCenterStockResponse> => {
  const response = await api.get<ServiceCenterStockResponse>('/api/service-center-stock');
  return response.data;
};
