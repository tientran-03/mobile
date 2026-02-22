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
    if (response.success) {
      // Ensure we always return an array
      if (response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        // If data is not an array, log warning
        console.warn("⚠️ Services API returned non-array data:", response.data);
        return [];
      }
      // If no data but success, return empty array
      return [];
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
    console.log("🗑️ Deleting service:", id);
    console.log("🗑️ Delete endpoint:", API_ENDPOINTS.SERVICE_BY_ID(id));
    
    try {
      const response = await apiClient.delete<void>(
        API_ENDPOINTS.SERVICE_BY_ID(id)
      );
      console.log("🗑️ Delete response:", JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log("✅ Delete successful");
        return true;
      }
      
      const errorMsg = response.error || response.message || "Failed to delete service";
      console.error("❌ Delete failed:", errorMsg);
      throw new Error(errorMsg);
    } catch (error: any) {
      console.error("❌ Delete exception:", error);
      console.error("❌ Delete exception details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      throw error;
    }
  },
};
