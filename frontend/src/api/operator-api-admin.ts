import api from './axios';

/**
 * ====================================================
 * OPERATOR ADMIN API
 * ====================================================
 * 
 * This module provides API functions for managing data entry operators.
 * Used by FACTORY_ADMIN to create and list operators.
 */

export interface CreateOperatorRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateOperatorResponse {
  message: string;
  operator: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface ListOperatorsResponse {
  message: string;
  operators: Operator[];
}

/**
 * Create a new data entry operator
 * POST /api/operators
 */
export const createOperator = async (data: CreateOperatorRequest): Promise<CreateOperatorResponse> => {
  const response = await api.post<CreateOperatorResponse>('/api/operators', data);
  return response.data;
};

/**
 * List all data entry operators
 * GET /api/operators
 */
export const listOperators = async (): Promise<ListOperatorsResponse> => {
  const response = await api.get<ListOperatorsResponse>('/api/operators');
  return response.data;
};
