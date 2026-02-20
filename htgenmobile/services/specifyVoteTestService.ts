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
  getAll: async () => {
    return apiClient.get<SpecifyVoteTestResponse[]>(API_ENDPOINTS.SPECIFY_VOTE_TESTS);
  },

  getById: async (id: string) => {
    return apiClient.get<SpecifyVoteTestResponse>(API_ENDPOINTS.SPECIFY_VOTE_TEST_BY_ID(id));
  },

  getByPatientId: async (patientId: string) => {
    return apiClient.get<SpecifyVoteTestResponse[]>(API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_PATIENT(patientId));
  },

  getByStatus: async (status: string) => {
    return apiClient.get<SpecifyVoteTestResponse[]>(API_ENDPOINTS.SPECIFY_VOTE_TESTS_BY_STATUS(status));
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
