import api from './axios';

export interface CreateServiceCenterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateServiceCenterResponse {
  message: string;
  serviceCenter: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const createServiceCenter = async (data: CreateServiceCenterRequest): Promise<CreateServiceCenterResponse> => {
  const response = await api.post<CreateServiceCenterResponse>('/api/service-centers', data);
  return response.data;
};
