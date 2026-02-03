import api from './axios';

export interface Warranty {
  partsMonths: number;
  serviceMonths: number;
}

export interface InverterModel {
  _id: string;
  brand: string;
  productLine: string;
  variant: string;
  modelCode: string;
  modelName?: string; // Full model name (e.g. "Sunlife SL-Sky 4kW")
  image?: string; // Product image path (e.g. "/products/sl-sky-4kw.jpg")
  warranty: Warranty;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInverterModelRequest {
  brand: string;
  productLine: string;
  variant: string;
  modelCode: string;
  warranty: Warranty;
}

export interface CreateInverterModelResponse {
  message: string;
  inverterModel: InverterModel;
}

export const listModels = async (activeOnly?: boolean): Promise<InverterModel[]> => {
  const params = activeOnly !== undefined ? { active: activeOnly.toString() } : {};
  const response = await api.get<{ count: number; data: InverterModel[] }>('/api/inverter-models', { params });
  return response.data.data;
};

export const createModel = async (data: CreateInverterModelRequest): Promise<CreateInverterModelResponse> => {
  const response = await api.post<CreateInverterModelResponse>('/api/inverter-models', data);
  return response.data;
};

export interface ModelStatistics {
  modelId: string;
  factoryStock: number;
  dealerStock: number;
  subDealerStock: number;
  totalSold: number;
  totalServiceJobs: number;
  complaintRatio: number;
  summary: {
    totalRegistered: number;
    totalInCirculation: number;
    totalInService: number;
  };
}

export const getModelStatistics = async (modelId: string): Promise<ModelStatistics> => {
  // We'll calculate this on the frontend by aggregating data from multiple sources
  // For now, return a structure that we'll populate
  return {
    modelId,
    factoryStock: 0,
    dealerStock: 0,
    subDealerStock: 0,
    totalSold: 0,
    totalServiceJobs: 0,
    complaintRatio: 0,
    summary: {
      totalRegistered: 0,
      totalInCirculation: 0,
      totalInService: 0,
    },
  };
};
