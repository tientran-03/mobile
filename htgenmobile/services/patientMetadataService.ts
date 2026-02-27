import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from './api';

export interface PatientMetadataResponse {
  labcode: string;
  specifyId?: string;
  patientId?: string;
  patientName?: string;
  sampleName?: string;
  status?: string;
  testResultPath?: string;
  sampleAdd?: boolean;
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
      // Không log trực tiếp patientId để tránh lộ mã bệnh nhân
      console.log('[PatientMetadataService] Fetching metadata for patientId (hidden)');
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

  /**
   * Update status for a patient metadata by labcode
   * Backend: PATCH /api/v1/patient-metadata/status/{labcode}?status=...
   */
  updateStatus: async (
    labcode: string,
    status: string,
  ): Promise<ApiResponse<PatientMetadataResponse>> => {
    try {
      const url = `/api/v1/patient-metadata/status/${encodeURIComponent(
        labcode,
      )}?status=${encodeURIComponent(status)}`;
      const response = await apiClient.patch<PatientMetadataResponse>(url);
      return response;
    } catch (error: any) {
      console.error("[PatientMetadataService] Error updating status:", error);
      return {
        success: false,
        error: error?.message || "Không thể cập nhật trạng thái mẫu",
      };
    }
  },

  /**
   * Get FASTQ1 presigned URL by patient ID
   * Backend: GET /api/v1/patient-metadata/fastq1/{patientId}
   */
  getFastq1UrlByPatientId: async (
    patientId: string,
  ): Promise<ApiResponse<string>> => {
    try {
      const url = `/api/v1/patient-metadata/fastq1/${encodeURIComponent(
        patientId,
      )}`;
      const response = await apiClient.get<string>(url);
      return response;
    } catch (error: any) {
      console.error("[PatientMetadataService] Error getting FASTQ1 URL:", error);
      return {
        success: false,
        error: error?.message || "Không thể lấy URL FASTQ 1",
      };
    }
  },

  /**
   * Get FASTQ2 presigned URL by patient ID
   * Backend: GET /api/v1/patient-metadata/fastq2/{patientId}
   */
  getFastq2UrlByPatientId: async (
    patientId: string,
  ): Promise<ApiResponse<string>> => {
    try {
      const url = `/api/v1/patient-metadata/fastq2/${encodeURIComponent(
        patientId,
      )}`;
      const response = await apiClient.get<string>(url);
      return response;
    } catch (error: any) {
      console.error("[PatientMetadataService] Error getting FASTQ2 URL:", error);
      return {
        success: false,
        error: error?.message || "Không thể lấy URL FASTQ 2",
      };
    }
  },
};
