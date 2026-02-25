import { z } from "zod";

export const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
] as const;

export const SERVICE_TYPE_MAPPER:Record<string,string> = {
  "embryo": "Phôi",
  "disease": "Bệnh lý",
  "reproduction": "Sản",
 } as const;

export const SERVICE_TYPE_OPTIONS = [
  { value: "embryo", label: "Phôi" },
  { value: "disease", label: "Bệnh lý" },
  { value: "reproduction", label: "Sản" },
] as const;

export const PAYMENT_TYPE_OPTIONS = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "ONLINE_PAYMENT", label: "Thanh toán online" },
] as const;

export const step1Schema = z.object({
  orderName: z.string().min(1, "Vui lòng nhập tên đơn hàng"),
  doctorId: z.string().min(1, "Vui lòng chọn bác sĩ chỉ định"),
  customerId: z.string().optional(),
  paymentAmount: z.string().optional(),
  staffId: z.string().optional(),
  staffAnalystId: z.string().min(1, "Vui lòng chọn nhân viên phụ trách"),
  sampleCollectorId: z.string().min(1, "Vui lòng chọn nhân viên thu mẫu"),
  barcodeId: z.string().min(1, "Vui lòng chọn mã Barcode PCĐ"),
  orderStatus: z.enum(["initiation", "forward_analysis", "accepted", "rejected", "in_progress", "sample_error", "rerun_testing", "completed", "sample_addition"]).optional(),
});

export type Step1FormData = z.infer<typeof step1Schema>;

export const step2Schema = z.object({
  patientName: z.string().min(1, "Vui lòng nhập tên người làm xét nghiệm"),
  patientPhone: z.string().min(1, "Vui lòng nhập số điện thoại"),
  patientDob: z.string().optional(),
  patientGender: z.enum(["male", "female", "other", ""]),
  patientEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  patientJob: z.string().optional(),
  patientContactName: z.string().optional(),
  patientContactPhone: z.string().optional(),
  patientAddress: z.string().optional(),
  specifyId: z.string().optional(),
  specifyImagePath: z.string().optional(),
  patientId: z.string().optional(),
});

export type Step2FormData = z.infer<typeof step2Schema>;

export const step5Schema = z.object({
  genomeTestId: z.string().min(1, "Vui lòng chọn xét nghiệm"),
  testName: z.string().optional(),
  testSample: z.string().optional(),
  testContent: z.string().optional(),
  serviceType: z.enum(["embryo", "disease", "reproduction", ""]).optional(),
});

export type Step5FormData = z.infer<typeof step5Schema>;

export const step4Schema = z.object({
  patientHeight: z.string().optional(),
  patientWeight: z.string().optional(),
  patientHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  toxicExposure: z.string().optional(),
  medicalHistory: z.string().optional(),
  chronicDisease: z.string().optional(),
  acuteDisease: z.string().optional(),
  medicalUsing: z.string().optional(),
});

export type Step4FormData = z.infer<typeof step4Schema>;

// Reproduction service fields
const reproductionServiceFields = z.object({
  fetusesNumber: z.string().optional(),
  fetusesWeek: z.string().optional(),
  fetusesDay: z.string().optional(),
  ultrasoundDay: z.string().optional(),
  headRumpLength: z.string().optional(),
  neckLength: z.string().optional(),
  combinedTestResult: z.string().optional(),
  ultrasoundResult: z.string().optional(),
});

// Embryo service fields
const embryoServiceFields = z.object({
  biospy: z.string().optional(),
  biospyDate: z.string().optional(),
  cellContainingSolution: z.string().optional(),
  embryoCreate: z.string().optional(),
  embryoStatus: z.string().optional(),
  morphologicalAssessment: z.string().optional(),
  cellNucleus: z.boolean().optional(),
  negativeControl: z.string().optional(),
});

// Disease service fields
const diseaseServiceFields = z.object({
  symptom: z.string().optional(),
  diagnose: z.string().optional(),
  diagnoseImage: z.string().optional(),
  testRelated: z.string().optional(),
  treatmentMethods: z.string().optional(),
  treatmentTimeDay: z.string().optional(),
  drugResistance: z.string().optional(),
  relapse: z.string().optional(),
});

export const step3Schema = z.object({
  serviceType: z.enum(["embryo", "disease", "reproduction", ""]),
  genomeTestId: z.string().optional(),
  testName: z.string().optional(),
  testSample: z.string().optional(),
  testContent: z.string().optional(),
  // Reproduction service fields
  fetusesNumber: z.string().optional(),
  fetusesWeek: z.string().optional(),
  fetusesDay: z.string().optional(),
  ultrasoundDay: z.string().optional(),
  headRumpLength: z.string().optional(),
  neckLength: z.string().optional(),
  combinedTestResult: z.string().optional(),
  ultrasoundResult: z.string().optional(),
  // Embryo service fields
  biospy: z.string().optional(),
  biospyDate: z.string().optional(),
  cellContainingSolution: z.string().optional(),
  embryoCreate: z.string().optional(),
  embryoStatus: z.string().optional(),
  morphologicalAssessment: z.string().optional(),
  cellNucleus: z.boolean().optional(),
  negativeControl: z.string().optional(),
  // Disease service fields
  symptom: z.string().optional(),
  diagnose: z.string().optional(),
  diagnoseImage: z.string().optional(),
  testRelated: z.string().optional(),
  treatmentMethods: z.string().optional(),
  treatmentTimeDay: z.string().optional(),
  drugResistance: z.string().optional(),
  relapse: z.string().optional(),
});

export type Step3FormData = z.infer<typeof step3Schema>;
export const step6Schema = z.object({
  paymentAmount: z.string().optional(),
  paymentType: z.enum(["CASH", "ONLINE_PAYMENT"]),
  samplingSite: z.string().optional(),
  sampleCollectDate: z.string().optional(),
  embryoNumber: z.string().optional(),
  specifyVoteImagePath: z.string().optional(),
});

export type Step6FormData = z.infer<typeof step6Schema>;

export const step7Schema = z.object({
  geneticTestResults: z.string().optional(),
  geneticTestResultsRelationship: z.string().optional(),
});

export type Step7FormData = z.infer<typeof step7Schema>;

export const createOrderSchema = z.object({
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema,
  step5: step5Schema,
  step6: step6Schema,
  step7: step7Schema,
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;

export const createOrderDefaultValues: CreateOrderFormData = {
  step1: {
    orderName: "",
    doctorId: "",
    customerId: "",
    paymentAmount: "",
    staffId: "",
    staffAnalystId: "",
    sampleCollectorId: "",
    barcodeId: "",
    orderStatus: undefined,
  },
  step2: {
    patientName: "",
    patientPhone: "",
    patientDob: "",
    patientGender: "",
    patientEmail: "",
    patientJob: "",
    patientContactName: "",
    patientContactPhone: "",
    patientAddress: "",
    specifyId: "",
    specifyImagePath: "",
    patientId: "",
  },
  step5: {
    genomeTestId: "",
    testName: "",
    testSample: "",
    testContent: "",
    serviceType: "",
  },
  step4: {
    patientHeight: "",
    patientWeight: "",
    patientHistory: "",
    familyHistory: "",
    toxicExposure: "",
    medicalHistory: "",
    chronicDisease: "",
    acuteDisease: "",
    medicalUsing: "",
  },
  step3: {
    serviceType: "",
    genomeTestId: "",
    testName: "",
    testSample: "",
    testContent: "",
    // Reproduction service fields
    fetusesNumber: "",
    fetusesWeek: "",
    fetusesDay: "",
    ultrasoundDay: "",
    headRumpLength: "",
    neckLength: "",
    combinedTestResult: "",
    ultrasoundResult: "",
    // Embryo service fields
    biospy: "",
    biospyDate: "",
    cellContainingSolution: "",
    embryoCreate: "",
    embryoStatus: "",
    morphologicalAssessment: "",
    cellNucleus: undefined,
    negativeControl: "",
    // Disease service fields
    symptom: "",
    diagnose: "",
    diagnoseImage: "",
    testRelated: "",
    treatmentMethods: "",
    treatmentTimeDay: "",
    drugResistance: "",
    relapse: "",
  },
  step6: {
    paymentAmount: "",
    paymentType: "CASH",
    samplingSite: "",
    sampleCollectDate: "",
    embryoNumber: "",
    specifyVoteImagePath: "",
  },
  step7: {
    geneticTestResults: "",
    geneticTestResultsRelationship: "",
  },
};

export const quickOrderSchema = z.object({
  orderName: z.string().min(1, "Vui lòng nhập tên đơn hàng"),
  doctorId: z.string().min(1, "Vui lòng chọn bác sĩ chỉ định"),
  hospitalId: z.string().optional(), // Tự động set khi chọn doctor
  staffAnalystId: z.string().min(1, "Vui lòng chọn nhân viên phụ trách"),
  sampleCollectorId: z.string().min(1, "Vui lòng chọn nhân viên thu mẫu"),
  sendEmailPatient: z.boolean().default(false),
  paymentType: z.enum(["CASH", "ONLINE_PAYMENT"]).optional(),
  paymentAmount: z.string().optional(),
  staffId: z.string().optional(), // người thu tiền
  specifyVoteTestCode: z.string().optional(), // mã phiếu xét nghiệm (lấy từ specify_vote_test)
  serviceId: z.string().min(1, "Vui lòng chọn nhóm xét nghiệm"), // nhóm xét nghiệm (từ services)
  customerId: z.string().optional(),
});

export type QuickOrderFormData = z.infer<typeof quickOrderSchema>;

export const quickOrderDefaultValues: QuickOrderFormData = {
  orderName: "",
  doctorId: "",
  hospitalId: "",
  staffAnalystId: "",
  sampleCollectorId: "",
  sendEmailPatient: false,
  paymentType: "CASH",
  paymentAmount: "",
  staffId: "",
  specifyVoteTestCode: "",
  serviceId: "",
  customerId: "",
};
