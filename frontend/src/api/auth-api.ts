/**
 * ====================================================
 * AUTH API CLIENT
 * ====================================================
 * 
 * This module provides TypeScript interfaces and functions
 * for interacting with the authentication API endpoints.
 * 
 * ENDPOINTS:
 * - POST /api/auth/login - User login
 * - POST /api/auth/check-role - Check user role
 * 
 * USAGE:
 * import { login, checkRole } from '@/api/auth-api';
 */
import api from './axios';
import { UserRole } from '@/store/auth-store';

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email?: string;
    role: UserRole;
    isSuperAdmin?: boolean;
  };
}

export interface CheckRoleRequest {
  email: string;
}

export interface CheckRoleResponse {
  role: UserRole;
  active: boolean;
}

export const checkRole = async (data: CheckRoleRequest): Promise<CheckRoleResponse> => {
  const response = await api.post<CheckRoleResponse>('/api/auth/check-role', data);
  return response.data;
};

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/api/auth/login', data);
  return response.data;
};

/** Reset password for any account (FACTORY_ADMIN only) */
export const resetPassword = async (userId: string, newPassword: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/api/auth/reset-password', { userId, newPassword });
  return response.data;
};

export interface CreateAdminRequest {
  name: string;
  username: string;
  password: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface ListAdminsResponse {
  message: string;
  admins: AdminUser[];
}

/** List all Factory Admins (FACTORY_ADMIN only) */
export const listAdmins = async (): Promise<AdminUser[]> => {
  const response = await api.get<ListAdminsResponse>('/api/auth/admins');
  return response.data.admins;
};

/** Create another Factory Admin from panel (same as other roles: username + password). */
export const createAdmin = async (data: CreateAdminRequest): Promise<{ message: string; admin: AdminUser }> => {
  const response = await api.post<{ message: string; admin: AdminUser }>('/api/auth/create-admin', data);
  return response.data;
};

/** Delete a Factory Admin (super admin only). */
export const deleteAdmin = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/api/auth/admins/${id}`);
  return response.data;
};
