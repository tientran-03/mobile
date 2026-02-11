import { API_ENDPOINTS } from "@/config/api";

import { apiClient } from "./api";

export interface ServiceResponse {
  serviceId: string;
  name: string;
}

export const serviceService = {
  getAll: async () => {
    return apiClient.get<ServiceResponse[]>(API_ENDPOINTS.SERVICES);
  },

  getById: async (id: string) => {
    return apiClient.get<ServiceResponse>(API_ENDPOINTS.SERVICE_BY_ID(id));
  },

  create: async (data: any) => {
    return apiClient.post<ServiceResponse>(API_ENDPOINTS.SERVICES, data);
  },

  update: async (id: string, data: any) => {
    return apiClient.put<ServiceResponse>(API_ENDPOINTS.SERVICE_BY_ID(id), data);
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.SERVICE_BY_ID(id));
  },
};
