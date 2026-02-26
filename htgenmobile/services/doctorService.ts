import { apiClient, ApiResponse } from "./api";
import { API_ENDPOINTS } from "@/config/api";

export interface DoctorResponse {
  doctorId: string;
  doctorName: string;
  doctorEmail?: string;
  doctorPhone?: string;
  hospitalId?: string;
  hospitalName?: string;
}

export const doctorService = {
  getAll: async () => {
    return apiClient.get<DoctorResponse[]>(API_ENDPOINTS.DOCTORS);
  },

  getById: async (id: string) => {
    return apiClient.get<DoctorResponse>(API_ENDPOINTS.DOCTOR_BY_ID(id));
  },

  search: async (name: string) => {
    return apiClient.get<DoctorResponse[]>(
      `${API_ENDPOINTS.DOCTORS}/search?name=${encodeURIComponent(name)}`
    );
  },

  // Get doctors by hospital ID and normalize to plain array
  getByHospitalId: async (hospitalId: string): Promise<DoctorResponse[]> => {
    const resp: ApiResponse<DoctorResponse[]> = await apiClient.get<DoctorResponse[]>(
      `${API_ENDPOINTS.DOCTORS}/hospital/${hospitalId}`
    );
    if (resp.success && Array.isArray(resp.data)) {
      return resp.data;
    }
    return [];
  },
};
