import { Platform } from "react-native";

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8080";
    } else if (Platform.OS === "ios") {
      return "http://localhost:8080";
    } else {
      return "http://localhost:8080";
    }
  } else {
    return "https://your-production-api.com";
  }
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ENDPOINTS = {
  LOGIN: "/api/auth/login",
  LOGOUT: "/api/auth/logout",
  ME: "/api/auth/me",
  
  ORDERS: "/api/v1/orders",
  ORDER_BY_ID: (id: string) => `/api/v1/orders/${id}`,
  ORDER_BY_STATUS: (status: string) => `/api/v1/orders/status/${status}`,
  ORDER_BY_PATIENT_ID: (patientId: string) => `/api/v1/orders/patient/${patientId}`,
  ORDER_SEARCH: "/api/v1/orders/search",
  
  PATIENTS: "/api/v1/patients",
  PATIENT_BY_ID: (id: string) => `/api/v1/patients/${id}`,
  PATIENT_BY_PHONE: (phone: string) => `/api/v1/patients/phone/${phone}`,
  PATIENT_SEARCH: "/api/v1/patients/search/name",
  
  SERVICES: "/api/v1/services",
  SERVICE_BY_ID: (id: string) => `/api/v1/services/${id}`,
  
  SAMPLE_ADDS: "/api/v1/sample-adds",
  SAMPLE_ADD_BY_ID: (id: string) => `/api/v1/sample-adds/${id}`,
  SAMPLE_ADD_BY_ORDER: (orderId: string) => `/api/v1/sample-adds/order/${orderId}`,

  USERS: "/api/v1/user/list",
  USER_INFO: "/api/v1/user/info",
  USER_BLOCK: "/api/v1/user/block",
  USER_UNBLOCK: "/api/v1/user/unblock",
  USER_COUNT_BY_ROLE: (role: string) => `/api/v1/count/users/${role}`,

  CUSTOMERS: "/api/v1/customers",
  CUSTOMER_BY_ID: (id: string) => `/api/v1/customers/${id}`,

  DOCTORS: "/api/v1/doctors",
  DOCTOR_BY_ID: (id: string) => `/api/v1/doctors/${id}`,
  HOSPITAL_STAFFS: "/api/v1/hospital-staff",
  HOSPITAL_STAFF_BY_ID: (id: string) => `/api/v1/hospital-staff/${id}`,
  
  BARCODES: "/api/v1/barcodes",
  BARCODE_BY_ID: (id: string) => `/api/v1/barcodes/${id}`,
  BARCODES_BY_STATUS: (status: string) => `/api/v1/barcodes/status/${status}`,
  
  SPECIFY_VOTE_TESTS: "/api/v1/specify-vote-tests",
  SPECIFY_VOTE_TEST_BY_ID: (id: string) => `/api/v1/specify-vote-tests/${id}`,
  SPECIFY_VOTE_TESTS_BY_STATUS: (status: string) => `/api/v1/specify-vote-tests/status/${status}`,
  SPECIFY_VOTE_TESTS_BY_PATIENT: (patientId: string) => `/api/v1/specify-vote-tests/patient/${patientId}`,
  
  GENOME_TESTS: "/api/v1/genome-tests",
  GENOME_TEST_BY_ID: (id: string) => `/api/v1/genome-tests/${id}`,
  GENOME_TESTS_BY_SERVICE: (serviceId: string) => `/api/v1/genome-tests/service/${serviceId}`,

  PATIENT_CLINICALS: "/api/v1/patient-clinicals",
  PATIENT_CLINICAL_BY_ID: (id: string) => `/api/v1/patient-clinicals/${id}`,
  PATIENT_CLINICAL_BY_PATIENT_ID: (patientId: string) => `/api/v1/patient-clinicals/patient/${patientId}`,
  PATIENT_CLINICAL_EXISTS_BY_PATIENT_ID: (patientId: string) => `/api/v1/patient-clinicals/exists/patient/${patientId}`,
  
  REPRODUCTION_SERVICES: "/api/v1/reproduction-services",
  EMBRYO_SERVICES: "/api/v1/embryo-services",
  DISEASE_SERVICES: "/api/v1/disease-services",
  
  PATIENT_METADATA: "/api/v1/patient-metadata",
  PATIENT_METADATA_BY_PATIENT_ID: (patientId: string) => `/api/v1/patient-metadata/patient/${patientId}`,
  
  HOSPITALS: "/api/v1/hospitals",
  HOSPITAL_BY_ID: (id: string | number) => `/api/v1/hospitals/${id}`,
  HOSPITALS_SEARCH: "/api/v1/hospitals/search",
};
