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
  username: string;
  password: string;
}

export interface CreateOperatorResponse {
  message: string;
  operator: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
}

export interface Operator {
  id: string;
  name: string;
  username?: string;
  email?: string;
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

export interface DeleteOperatorResponse {
  message: string;
}

/**
 * Delete a data entry operator
 * DELETE /api/operators/:id
 */
export const deleteOperator = async (id: string): Promise<DeleteOperatorResponse> => {
  const response = await api.delete<DeleteOperatorResponse>(`/api/operators/${id}`);
  return response.data;
};
