import { apiClient } from "./api";
import { API_ENDPOINTS } from "@/config/api";

export interface SampleAddResponse {
  id?: string;
  sampleAddId?: string;
  sampleName: string;
  sampleCode?: string;
  orderId?: string;
  orderCode?: string;
  patientId?: string;
  patientName?: string;
  status: string;
  requestDate?: string;
  paymentStatus?: string;
  note?: string;
  invoiceLink?: string;
}

export const sampleAddService = {
  getAll: async () => {
    return apiClient.get<SampleAddResponse[]>(API_ENDPOINTS.SAMPLE_ADDS);
  },

  getById: async (id: string) => {
    return apiClient.get<SampleAddResponse>(API_ENDPOINTS.SAMPLE_ADD_BY_ID(id));
  },

  getByOrderId: async (orderId: string) => {
    return apiClient.get<SampleAddResponse[]>(
      API_ENDPOINTS.SAMPLE_ADD_BY_ORDER(orderId)
    );
  },

  create: async (data: any) => {
    return apiClient.post<SampleAddResponse>(API_ENDPOINTS.SAMPLE_ADDS, data);
  },

  update: async (id: string, data: any) => {
    return apiClient.put<SampleAddResponse>(
      API_ENDPOINTS.SAMPLE_ADD_BY_ID(id),
      data
    );
  },

  updateStatus: async (id: string, status: string) => {
    return apiClient.patch(
      `${API_ENDPOINTS.SAMPLE_ADD_BY_ID(id)}/status?status=${status}`
    );
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.SAMPLE_ADD_BY_ID(id));
  },
};
