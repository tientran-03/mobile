import { apiClient } from "./api";
import { API_ENDPOINTS } from "@/config/api";

export interface SampleAddServiceCatalogResponse {
  id: string;
  sampleName: string;
  price: number;
  taxRate: number;
  finalPrice: number;
  createdAt?: string;
}

export const sampleAddServiceCatalogService = {
  getAll: async () => {
    return apiClient.get<SampleAddServiceCatalogResponse[]>(
      API_ENDPOINTS.SAMPLE_ADD_SERVICES
    );
  },

  getById: async (id: string) => {
    return apiClient.get<SampleAddServiceCatalogResponse>(
      API_ENDPOINTS.SAMPLE_ADD_SERVICE_BY_ID(id)
    );
  },
};
