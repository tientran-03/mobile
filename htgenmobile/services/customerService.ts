import { API_ENDPOINTS } from "@/config/api";

import { apiClient } from "./api";

export interface CustomerResponse {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  hospitalId?: string;
  userId?: string;
}

export const customerService = {
  getAll: async () => {
    return apiClient.get<CustomerResponse[]>(API_ENDPOINTS.CUSTOMERS || "/api/v1/customers");
  },

  getById: async (id: string) => {
    return apiClient.get<CustomerResponse>(`/api/v1/customers/${id}`);
  },

  search: async (name: string) => {
    return apiClient.get<CustomerResponse[]>(
      `/api/v1/customers/search?name=${encodeURIComponent(name)}`
    );
  },

  create: async (data: any) => {
    return apiClient.post<CustomerResponse>(API_ENDPOINTS.CUSTOMERS || "/api/v1/customers", data);
  },

  update: async (id: string, data: any) => {
    return apiClient.put<CustomerResponse>(API_ENDPOINTS.CUSTOMER_BY_ID(id), data);
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.CUSTOMER_BY_ID(id));
  },
};
