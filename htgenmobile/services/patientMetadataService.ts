import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from './api';

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
  getAll: async (params?: {
    page?: number;
    size?: number;
  }): Promise<ApiResponse<PatientMetadataResponse[]>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size) queryParams.append('size', params.size.toString());
      const url = queryParams.toString()
        ? `${API_ENDPOINTS.PATIENT_METADATA}?${queryParams.toString()}`
        : API_ENDPOINTS.PATIENT_METADATA;
      const response = await apiClient.get<PatientMetadataResponse[]>(url);
      return response;
    } catch (error: any) {
      console.error('[PatientMetadataService] Error fetching patient metadata:', error);
      return {
        success: false,
        error: error?.message || 'Không thể lấy thông tin patient metadata',
      };
    }
  },

  getByPatientId: async (
    patientId: string,
    params?: { page?: number; size?: number }
  ): Promise<ApiResponse<PatientMetadataResponse[]>> => {
    try {
      console.log('[PatientMetadataService] Fetching metadata for patientId:', patientId);
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size) queryParams.append('size', params.size.toString());
      const url = queryParams.toString()
        ? `/api/v1/patient-metadata/patient/${patientId}?${queryParams.toString()}`
        : `/api/v1/patient-metadata/patient/${patientId}`;
      const response = await apiClient.get<PatientMetadataResponse[]>(url);
      console.log('[PatientMetadataService] Response:', response);
      return response;
    } catch (error: any) {
      console.error('[PatientMetadataService] Error fetching patient metadata:', error);
      return {
        success: false,
        error: error?.message || 'Không thể lấy thông tin patient metadata',
      };
    }
  },

  create: async (data: PatientMetadataRequest): Promise<ApiResponse<PatientMetadataResponse>> => {
    try {
      console.log('[PatientMetadataService] Creating metadata:', data);
      const response = await apiClient.post<PatientMetadataResponse>(
        API_ENDPOINTS.PATIENT_METADATA,
        data
      );
      console.log('[PatientMetadataService] Create response:', response);
      return response;
    } catch (error: any) {
      console.error('[PatientMetadataService] Error creating patient metadata:', error);
      return {
        success: false,
        error: error?.message || 'Không thể tạo patient metadata',
      };
    }
  },
};
