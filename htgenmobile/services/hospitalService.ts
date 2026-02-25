import { API_ENDPOINTS } from "@/config/api";
import { apiClient } from "./api";

export interface HospitalResponse {
  hospitalId: number;
  hospitalName: string;
}

export interface HospitalRequest {
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

  /**
   * Create a new hospital
   */
  create: async (data: HospitalRequest): Promise<HospitalResponse> => {
    const response = await apiClient.post<HospitalResponse>(API_ENDPOINTS.HOSPITALS, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to create hospital");
  },

  /**
   * Update a hospital
   */
  update: async (id: string | number, data: HospitalRequest): Promise<HospitalResponse> => {
    const response = await apiClient.put<HospitalResponse>(API_ENDPOINTS.HOSPITAL_BY_ID(id), data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to update hospital");
  },

  /**
   * Delete a hospital
   */
  delete: async (id: string | number): Promise<boolean> => {
    const response = await apiClient.delete(API_ENDPOINTS.HOSPITAL_BY_ID(id));
    if (response.success) {
      return true;
    }
    throw new Error(response.error || "Failed to delete hospital");
  },
};
