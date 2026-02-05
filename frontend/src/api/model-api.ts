/**
 * ====================================================
 * MODEL API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the inverter model API endpoints.
 * 
 * ENDPOINTS:
 * - GET /api/inverter-models - List all inverter models
 * - GET /api/inverter-models/:id - Get model details
 * - POST /api/inverter-models - Create inverter model (FACTORY_ADMIN)
 * - PUT /api/inverter-models/:id - Update inverter model (FACTORY_ADMIN)
 * 
 * USAGE:
 * import { getInverterModels, createInverterModel } from '@/api/model-api';
 */
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
  datasheet?: string; // Technical datasheet PDF path (e.g. "/products/datasheets/sl-sky-4kw.pdf")
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
  image?: string;
  datasheet?: string;
  active?: boolean;
}

export interface UpdateInverterModelRequest {
  brand?: string;
  productLine?: string;
  variant?: string;
  modelCode?: string;
  warranty?: Warranty;
  image?: string;
  datasheet?: string;
  active?: boolean;
}

export interface CreateInverterModelResponse {
  message: string;
  inverterModel: InverterModel;
}

export interface UpdateInverterModelResponse {
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

export const updateModel = async (id: string, data: UpdateInverterModelRequest): Promise<UpdateInverterModelResponse> => {
  const response = await api.put<UpdateInverterModelResponse>(`/api/inverter-models/${id}`, data);
  return response.data;
};

export interface DeleteInverterModelResponse {
  message: string;
}

export const deleteModel = async (id: string): Promise<DeleteInverterModelResponse> => {
  const response = await api.delete<DeleteInverterModelResponse>(`/api/inverter-models/${id}`);
  return response.data;
};

export interface UploadImageResponse {
  message: string;
  imagePath: string;
  inverterModel: InverterModel;
}

export const uploadModelImage = async (id: string, file: File, modelCode: string): Promise<UploadImageResponse> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('modelCode', modelCode);

  const response = await api.post<UploadImageResponse>(
    `/api/inverter-models/${id}/upload-image`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export interface UploadDatasheetResponse {
  message: string;
  datasheetPath: string;
  inverterModel: InverterModel;
}

export const uploadModelDatasheet = async (id: string, file: File, modelCode: string): Promise<UploadDatasheetResponse> => {
  const formData = new FormData();
  formData.append('datasheet', file);
  formData.append('modelCode', modelCode);

  const response = await api.post<UploadDatasheetResponse>(
    `/api/inverter-models/${id}/upload-datasheet`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
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
