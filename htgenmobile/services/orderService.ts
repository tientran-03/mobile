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
  getAll: async (params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());
    const url = queryParams.toString() 
      ? `${API_ENDPOINTS.ORDERS}?${queryParams.toString()}`
      : API_ENDPOINTS.ORDERS;
    return apiClient.get<OrderResponse[]>(url);
  },

  getById: async (id: string) => {
    return apiClient.get<OrderResponse>(API_ENDPOINTS.ORDER_BY_ID(id));
  },

  getByStatus: async (status: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ORDER_BY_STATUS(status)}?${queryParams.toString()}`
      : API_ENDPOINTS.ORDER_BY_STATUS(status);
    return apiClient.get<OrderResponse[]>(url);
  },

  getByPatientId: async (patientId: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());
    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ORDER_BY_PATIENT_ID(patientId)}?${queryParams.toString()}`
      : API_ENDPOINTS.ORDER_BY_PATIENT_ID(patientId);
    return apiClient.get<OrderResponse[]>(url);
  },

  search: async (query: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("orderName", query);
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());
    return apiClient.get<OrderResponse[]>(
      `${API_ENDPOINTS.ORDER_SEARCH}?${queryParams.toString()}`
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

  reject: async (id: string, rejectReason: string) => {
    return apiClient.patch<OrderResponse>(
      `${API_ENDPOINTS.ORDER_BY_ID(id)}/reject`,
      { rejectReason }
    );
  },

  delete: async (id: string) => {
    return apiClient.delete(API_ENDPOINTS.ORDER_BY_ID(id));
  },
};
