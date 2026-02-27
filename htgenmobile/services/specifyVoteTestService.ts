import { API_ENDPOINTS } from "@/config/api";

import { apiClient } from "./api";

export interface SpecifyVoteTestResponse {
  specifyVoteID: string;
  serviceID?: string;
  serviceType?: string;
  patientId?: string;
  genomeTestId?: string;
  hospitalId?: string;
  doctorId?: string;
  specifyStatus?: string;
  specifyNote?: string;
  sendEmailPatient?: boolean;
  embryoNumber?: number;
  samplingSite?: string;
  sampleCollectDate?: string;
  geneticTestResults?: string;
  geneticTestResultsRelationship?: string;
  createdAt?: string;
  reproductionService?: {
    id: string;
    serviceId: string;
    patientId: string;
    [key: string]: any;
  };
  embryoService?: {
    id: string;
    serviceId: string;
    patientId: string;
    [key: string]: any;
  };
  diseaseService?: {
    id: string;
    serviceId: string;
    patientId: string;
    [key: string]: any;
  };
  patient?: {
    patientId: string;
    patientName: string;
    patientPhone?: string;
    patientDob?: string;
    gender?: string;
    patientEmail?: string;
    patientJob?: string;
    patientContactName?: string;
    patientContactPhone?: string;
    patientAddress?: string;
  };
  genomeTest?: {
    testId: string;
    testName: string;
    testDescription?: string;
    testSample?: string[];
  };
  doctor?: {
    doctorId: string;
    doctorName: string;
  };
  hospital?: {
    hospitalId: string;
    hospitalName: string;
  };
  patientClinical?: {
    patientHeight?: number;
    patientWeight?: number;
    patientHistory?: string;
    familyHistory?: string;
    chronicDisease?: string;
    acuteDisease?: string;
  };
}

export interface SpecifyVoteTestRequest {
  serviceId: string;
  patientId: string;
  genomeTestId: string;
  embryoNumber?: number;
  hospitalId?: string;
  doctorId?: string;
  samplingSite?: string;
  sampleCollectDate?: string;
  geneticTestResults?: string;
  geneticTestResultsRelationship?: string;
  specifyNote?: string;
  sendEmailPatient?: boolean;
}

export const specifyVoteTestService = {
  getAll: async (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.SPECIFY_VOTE_TESTS}?${queryParams.toString()}`
      : API_ENDPOINTS.SPECIFY_VOTE_TESTS;
    return apiClient.get<SpecifyVoteTestResponse[]>(url);
  },

  getById: async (id: string) => {
    return apiClient.get<SpecifyVoteTestResponse>(API_ENDPOINTS.SPECIFY_VOTE_TEST_BY_ID(id));
  },

  getByHospitalId: async (hospitalId: string, params?: { page?: number; size?: number }) => {
    if (!hospitalId) {
      return { success: false, error: 'Hospital ID is required', data: [] };
    }
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_HOSPITAL(hospitalId)}?${queryParams.toString()}`
      : API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_HOSPITAL(hospitalId);
    return apiClient.get<SpecifyVoteTestResponse[]>(url);
  },

  getByHospitalIdPaged: async (
    hospitalId: string,
    params?: { page?: number; size?: number; sort?: string }
  ) => {
    if (!hospitalId) {
      return { success: false, error: 'Hospital ID is required', data: { content: [], totalElements: 0 } };
    }
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    const url = `${API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_HOSPITAL_PAGED(hospitalId)}?${queryParams.toString()}`;
    return apiClient.get<{ content: SpecifyVoteTestResponse[]; totalElements: number }>(url);
  },

  getByPatientId: async (patientId: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_PATIENT(patientId)}?${queryParams.toString()}`
      : API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_PATIENT(patientId);
    return apiClient.get<SpecifyVoteTestResponse[]>(url);
  },

  getByStatus: async (status: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_STATUS(status)}?${queryParams.toString()}`
      : API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_STATUS(status);
    return apiClient.get<SpecifyVoteTestResponse[]>(url);
  },

  create: async (data: SpecifyVoteTestRequest) => {
    return apiClient.post<SpecifyVoteTestResponse>(API_ENDPOINTS.SPECIFY_VOTE_TESTS, data);
  },

  update: async (id: string, data: SpecifyVoteTestRequest) => {
    return apiClient.put<SpecifyVoteTestResponse>(API_ENDPOINTS.SPECIFY_VOTE_TEST_BY_ID(id), data);
  },

  updateStatus: async (id: string, status: string) => {
    return apiClient.patch<SpecifyVoteTestResponse>(
      `${API_ENDPOINTS.SPECIFY_VOTE_TEST_BY_ID(id)}/status?status=${encodeURIComponent(status)}`
    );
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.SPECIFY_VOTE_TEST_BY_ID(id));
  },
};
