import { API_ENDPOINTS } from "@/config/api";
import { apiClient } from "./api";

export interface HospitalResponse {
  hospitalId: number;
  hospitalName: string;
}

export const hospitalService = {
  /**
   * Get all hospitals
   */
  getAll: async (): Promise<HospitalResponse[]> => {
    const response = await apiClient.get<HospitalResponse[]>(API_ENDPOINTS.HOSPITALS);
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.error || "Failed to fetch hospitals");
  },

  /**
   * Get hospital by ID
   */
  getById: async (id: string | number): Promise<HospitalResponse> => {
    const response = await apiClient.get<HospitalResponse>(API_ENDPOINTS.HOSPITAL_BY_ID(id));
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch hospital");
  },

  /**
   * Search hospitals by name
   */
  search: async (name: string): Promise<HospitalResponse[]> => {
    const response = await apiClient.get<HospitalResponse[]>(
      `${API_ENDPOINTS.HOSPITALS_SEARCH}?name=${encodeURIComponent(name)}`
    );
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.error || "Failed to search hospitals");
  },
};
