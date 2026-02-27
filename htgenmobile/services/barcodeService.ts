import { apiClient } from "./api";
import { API_ENDPOINTS } from "@/config/api";

export interface BarcodeResponse {
  barcode: string;
  createAt?: string;
  usedAt?: string;
  status?: string;
}

export interface BarcodeUpdateRequest {
  status?: string;
  createAt?: string;
  usedAt?: string;
}

export const barcodeService = {
  getAll: async () => {
    return apiClient.get<BarcodeResponse[]>(API_ENDPOINTS.BARCODES);
  },

  getById: async (id: string) => {
    return apiClient.get<BarcodeResponse>(API_ENDPOINTS.BARCODE_BY_ID(id));
  },

  getByStatus: async (status: string) => {
    return apiClient.get<BarcodeResponse[]>(API_ENDPOINTS.BARCODES_BY_STATUS(status));
  },

  update: async (id: string, data: BarcodeUpdateRequest) => {
    return apiClient.put<BarcodeResponse>(API_ENDPOINTS.BARCODE_BY_ID(id), data);
  },
};
