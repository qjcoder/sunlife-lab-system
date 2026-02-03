import api from './axios';

export interface DispatchedItem {
  partCode: string;
  partName: string;
  quantity: number;
}

export interface CreatePartDispatchRequest {
  serviceCenter: string;
  dispatchedItems: DispatchedItem[];
  remarks?: string;
}

export interface CreatePartDispatchResponse {
  message: string;
  dispatch: {
    _id: string;
    dispatchNumber: string;
    serviceCenter: string;
    dispatchedItems: DispatchedItem[];
    dispatchDate: string;
    remarks?: string;
  };
}

export interface PartDispatch {
  _id: string;
  dispatchNumber: string;
  serviceCenter: string;
  dispatchedItems: DispatchedItem[];
  dispatchDate: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListPartDispatchesResponse {
  count: number;
  data: PartDispatch[];
}

export const createPartDispatch = async (data: CreatePartDispatchRequest): Promise<CreatePartDispatchResponse> => {
  const response = await api.post<CreatePartDispatchResponse>('/api/part-dispatches', data);
  return response.data;
};

export const listPartDispatches = async (): Promise<PartDispatch[]> => {
  const response = await api.get<ListPartDispatchesResponse>('/api/part-dispatches');
  return response.data.data;
};
