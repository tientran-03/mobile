import { API_ENDPOINTS } from "@/config/api";

import { apiClient } from "./api";

export interface ServiceEntityResponse {
  serviceId: string;
  name: string;
}

export interface GenomeTestResponse {
  testId: string;
  testName: string;
  testDescription?: string;
  testSample?: string[];
  price?: number;
  service?: ServiceEntityResponse;
}

export interface CreateGenomeTestRequest {
  testId: string;
  testName: string;
  testDescription?: string;
  code?: string;
  serviceId?: string;
  price: number;
  taxRate?: number;
  testSample?: string[];
}

export const genomeTestService = {
  getAll: async () => {
    return apiClient.get<GenomeTestResponse[]>(API_ENDPOINTS.GENOME_TESTS);
  },

  getByServiceId: async (serviceId: string) => {
    return apiClient.get<GenomeTestResponse[]>(API_ENDPOINTS.GENOME_TESTS_BY_SERVICE(serviceId));
  },

  getById: async (id: string) => {
    return apiClient.get<GenomeTestResponse>(API_ENDPOINTS.GENOME_TEST_BY_ID(id));
  },

  create: async (data: CreateGenomeTestRequest) => {
    return apiClient.post<GenomeTestResponse>(API_ENDPOINTS.GENOME_TESTS, data);
  },

  update: async (id: string, data: CreateGenomeTestRequest) => {
    return apiClient.put<GenomeTestResponse>(API_ENDPOINTS.GENOME_TEST_BY_ID(id), data);
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.GENOME_TEST_BY_ID(id));
  },
};
