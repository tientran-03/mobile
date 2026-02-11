import { API_ENDPOINTS } from "@/config/api";

import { apiClient } from "./api";

export interface PatientMetadataResponse {
  labcode: string;
  specifyId?: string;
  patientId?: string;
  sampleName?: string;
  status?: string;
}

export interface SpecifyVoteTestResponse {
  specifyVoteID: string;
  serviceID?: string;
  serviceType?: string;
  patientId?: string;
  genomeTestId?: string;
  hospitalId?: string;
  doctorId?: string;
  samplingSite?: string;
  sampleCollectDate?: string;
  geneticTestResults?: string;
  geneticTestResultsRelationship?: string;
  specifyStatus?: string;
  specifyNote?: string;
  sendEmailPatient?: boolean;
  createdAt?: string;
  embryoNumber?: number;
}

export interface OrderResponse {
  orderId: string;
  orderName: string;
  customerId?: string;
  customerName?: string;
  sampleCollectorId?: string;
  sampleCollectorName?: string;
  staffAnalystId?: string;
  staffAnalystName?: string;
  barcodeId?: string;
  specifyId?: SpecifyVoteTestResponse;
  specifyVoteImagePath?: string;
  orderStatus: string;
  orderNote?: string;
  patientMetadata?: PatientMetadataResponse[];
  patientMetadataCount?: number;
  paymentStatus?: string;
  paymentType?: string;
  paymentAmount?: number;
  invoiceLink?: string;
  jobCount?: number;
  jobIds?: string[];
  createdAt?: string;
}

export const orderService = {
  getAll: async () => {
    return apiClient.get<OrderResponse[]>(API_ENDPOINTS.ORDERS);
  },

  getById: async (id: string) => {
    return apiClient.get<OrderResponse>(API_ENDPOINTS.ORDER_BY_ID(id));
  },

  getByStatus: async (status: string) => {
    return apiClient.get<OrderResponse[]>(API_ENDPOINTS.ORDER_BY_STATUS(status));
  },

  getByPatientId: async (patientId: string) => {
    return apiClient.get<OrderResponse[]>(API_ENDPOINTS.ORDER_BY_PATIENT_ID(patientId));
  },

  search: async (query: string) => {
    return apiClient.get<OrderResponse[]>(
      `${API_ENDPOINTS.ORDER_SEARCH}?orderName=${encodeURIComponent(query)}`
    );
  },

  create: async (data: any) => {
    return apiClient.post<OrderResponse>(API_ENDPOINTS.ORDERS, data);
  },

  update: async (id: string, data: any) => {
    return apiClient.put<OrderResponse>(API_ENDPOINTS.ORDER_BY_ID(id), data);
  },

  updateStatus: async (id: string, status: string) => {
    return apiClient.patch<OrderResponse>(
      `${API_ENDPOINTS.ORDER_BY_ID(id)}/status?status=${status}`
    );
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.ORDER_BY_ID(id));
  },
};
