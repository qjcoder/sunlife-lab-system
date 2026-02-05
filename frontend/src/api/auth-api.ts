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
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
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
