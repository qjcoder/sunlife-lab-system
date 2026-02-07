/**
 * Parts catalog API (Create Parts page).
 * GET /api/parts, POST /api/parts, PUT /api/parts/:id, DELETE /api/parts/:id
 */
import api from './axios';

export interface PartInverterModel {
  _id: string;
  brand?: string;
  productLine?: string;
  variant?: string;
  modelCode?: string;
  modelName?: string;
}

export interface Part {
  _id: string;
  inverterModel?: string | PartInverterModel;
  partCode: string;
  partName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListPartsResponse {
  message: string;
  parts: Part[];
}

export interface CreatePartRequest {
  inverterModel: string;
  partCode: string;
  partName: string;
  description?: string;
}

export const listParts = async (inverterModelId?: string): Promise<Part[]> => {
  const params = inverterModelId ? { inverterModel: inverterModelId } : {};
  const response = await api.get<ListPartsResponse>('/api/parts', { params });
  return response.data.parts;
};

export const createPart = async (data: CreatePartRequest): Promise<{ message: string; part: Part }> => {
  const response = await api.post<{ message: string; part: Part }>('/api/parts', data);
  return response.data;
};

export interface UpdatePartRequest {
  partCode?: string;
  partName?: string;
  description?: string;
}

export const updatePart = async (id: string, data: UpdatePartRequest): Promise<{ message: string; part: Part }> => {
  const response = await api.put<{ message: string; part: Part }>(`/api/parts/${id}`, data);
  return response.data;
};

export const deletePart = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/api/parts/${id}`);
  return response.data;
};
