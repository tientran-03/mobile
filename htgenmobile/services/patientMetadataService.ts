import { apiClient } from "./api";
import { API_ENDPOINTS } from "@/config/api";

export interface PatientMetadataResponse {
  labcode: string;
  specifyId?: string;
  patientId?: string;
  sampleName?: string;
  status?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PatientMetadataRequest {
  specifyId: string;
  patientId: string;
  sampleName?: string;
}

export const patientMetadataService = {
  getByPatientId: async (patientId: string): Promise<ApiResponse<PatientMetadataResponse[]>> => {
    try {
      console.log("[PatientMetadataService] Fetching metadata for patientId:", patientId);
      const response = await apiClient.get<PatientMetadataResponse[]>(
        `/api/v1/patient-metadata/patient/${patientId}`
      );
      console.log("[PatientMetadataService] Response:", response);
      return response;
    } catch (error: any) {
      console.error("[PatientMetadataService] Error fetching patient metadata:", error);
      return {
        success: false,
        error: error?.message || "Không thể lấy thông tin patient metadata",
      };
    }
  },
  
  create: async (data: PatientMetadataRequest): Promise<ApiResponse<PatientMetadataResponse>> => {
    try {
      console.log("[PatientMetadataService] Creating metadata:", data);
      const response = await apiClient.post<PatientMetadataResponse>(
        API_ENDPOINTS.PATIENT_METADATA,
        data
      );
      console.log("[PatientMetadataService] Create response:", response);
      return response;
    } catch (error: any) {
      console.error("[PatientMetadataService] Error creating patient metadata:", error);
      return {
        success: false,
        error: error?.message || "Không thể tạo patient metadata",
      };
    }
  },
};
