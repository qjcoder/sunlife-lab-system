import api from './axios';

export interface CreateInstallerProgramManagerRequest {
  name: string;
  username: string;
  password: string;
}

export interface InstallerProgramManager {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface ListInstallerProgramManagersResponse {
  message: string;
  installerProgramManagers: InstallerProgramManager[];
}

export const createInstallerProgramManager = async (
  data: CreateInstallerProgramManagerRequest
): Promise<{ message: string; installerProgramManager: InstallerProgramManager }> => {
  const response = await api.post('/api/installer-program-managers', data);
  return response.data;
};

export const listInstallerProgramManagers = async (): Promise<ListInstallerProgramManagersResponse> => {
  const response = await api.get<ListInstallerProgramManagersResponse>('/api/installer-program-managers');
  return response.data;
};

export const deleteInstallerProgramManager = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/installer-program-managers/${id}`);
  return response.data;
};
