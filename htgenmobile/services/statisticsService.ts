import { API_ENDPOINTS } from "@/config/api";
import { apiClient } from "./api";

export interface MonthlyRevenueResponse {
  month: number;
  revenue: number;
  orderCount: number;
}

export interface RevenueStatisticsResponse {
  monthlyRevenues: MonthlyRevenueResponse[];
  totalRevenue: number;
  totalOrders: number;
  orderStatusCounts: {
    status: string;
    count: number;
  }[];
  availableYears: number[];
}

export interface PaymentHistoryResponse {
  transactionId: string;
  orderId: string;
  orderName: string;
  hospitalName: string;
  amount: number;
  paymentDate: string;
  paymentStatus: string;
}

export interface ServiceOrderCountResponse {
  serviceName: string;
  orderCount: number;
}

export interface ServiceRevenueResponse {
  serviceName: string;
  totalRevenue: number;
}

export interface HospitalServiceUsageResponse {
  hospitalName: string;
  serviceName: string;
  usageCount: number;
}

export interface GenomeTestByHospitalResponse {
  hospitalName: string;
  testName: string;
  testCount: number;
}

export interface ServiceStatisticsResponse {
  serviceOrderCounts: ServiceOrderCountResponse[];
  serviceRevenues: ServiceRevenueResponse[];
  hospitalServiceUsages: HospitalServiceUsageResponse[];
  genomeTestByHospitals: GenomeTestByHospitalResponse[];
}

export interface TopHospitalRevenueResponse {
  hospitalId: string;
  hospitalName: string;
  totalRevenue: number;
  orderCount: number;
}

export interface HospitalPaymentSummaryResponse {
  hospitalId: string;
  hospitalName: string;
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  mostUsedServiceName?: string;
  mostUsedGenomeTestName?: string;
}

export interface HospitalStatisticsResponse {
  topHospitalsByRevenue: TopHospitalRevenueResponse[];
  hospitalPaymentSummaries: HospitalPaymentSummaryResponse[];
}

export const statisticsService = {
  getRevenueStatistics: async (year?: number) => {
    const url = year
      ? `${API_ENDPOINTS.STATISTICS_REVENUE}?year=${year}`
      : API_ENDPOINTS.STATISTICS_REVENUE;
    return apiClient.get<RevenueStatisticsResponse>(url);
  },

  getPaymentHistory: async (params?: {
    year?: number;
    month?: number;
    page?: number;
    size?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.month) queryParams.append("month", params.month.toString());
    if (params?.page !== undefined) queryParams.append("page", params.page.toString());
    if (params?.size) queryParams.append("size", params.size.toString());

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.STATISTICS_PAYMENT_HISTORY}?${queryParams.toString()}`
      : API_ENDPOINTS.STATISTICS_PAYMENT_HISTORY;
    return apiClient.get<PaymentHistoryResponse[]>(url);
  },

  getServiceStatistics: async () => {
    return apiClient.get<ServiceStatisticsResponse>(API_ENDPOINTS.STATISTICS_SERVICES);
  },

  getHospitalStatistics: async () => {
    return apiClient.get<HospitalStatisticsResponse>(API_ENDPOINTS.STATISTICS_HOSPITALS);
  },
};
