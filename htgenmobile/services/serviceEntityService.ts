import { API_ENDPOINTS } from "@/config/api";
import { apiClient } from "./api";

export interface ServiceEntityResponse {
  serviceId: string;
  name: string;
}

export interface ServiceEntityRequest {
  serviceId: string;
  name: string;
}

export const serviceEntityService = {
  /**
   * Get all services
   */
  getAll: async (): Promise<ServiceEntityResponse[]> => {
    const response = await apiClient.get<ServiceEntityResponse[]>(
      API_ENDPOINTS.SERVICES
    );
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.error || "Failed to fetch services");
  },

  /**
   * Get service by ID
   */
  getById: async (id: string): Promise<ServiceEntityResponse> => {
    const response = await apiClient.get<ServiceEntityResponse>(
      API_ENDPOINTS.SERVICE_BY_ID(id)
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch service");
  },

  /**
   * Create a new service
   */
  create: async (
    data: ServiceEntityRequest
  ): Promise<ServiceEntityResponse> => {
    const response = await apiClient.post<ServiceEntityResponse>(
      API_ENDPOINTS.SERVICES,
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to create service");
  },

  /**
   * Update a service
   */
  update: async (
    id: string,
    data: ServiceEntityRequest
  ): Promise<ServiceEntityResponse> => {
    console.log("Updating service:", { id, data });
    const response = await apiClient.put<ServiceEntityResponse>(
      API_ENDPOINTS.SERVICE_BY_ID(id),
      data
    );
    console.log("Update response:", response);
    if (response.success && response.data) {
      return response.data;
    }
    const errorMsg = response.error || response.message || "Failed to update service";
    console.error("Update error:", errorMsg);
    throw new Error(errorMsg);
  },

  /**
   * Delete a service
   */
  delete: async (id: string): Promise<boolean> => {
    console.log("Deleting service:", id);
    const response = await apiClient.delete<void>(
      API_ENDPOINTS.SERVICE_BY_ID(id)
    );
    console.log("Delete response:", response);
    if (response.success) {
      return true;
    }
    const errorMsg = response.error || response.message || "Failed to delete service";
    console.error("Delete error:", errorMsg);
    throw new Error(errorMsg);
  },
};
