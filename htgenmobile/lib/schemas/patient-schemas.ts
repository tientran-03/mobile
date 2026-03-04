import { z } from "zod";

export const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
] as const;

export const patientSchema = z.object({
  patientId: z.string().min(1, "Mã bệnh nhân là bắt buộc"),
  patientName: z.string().min(1, "Tên bệnh nhân là bắt buộc"),
  patientPhone: z
    .string()
    .min(1, "Số điện thoại là bắt buộc")
    .regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số"),
  patientEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  patientDob: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  patientJob: z.string().optional(),
  patientContactName: z.string().optional(),
  patientContactPhone: z.string().optional(),
  patientAddress: z.string().optional(),
  hospitalId: z.string().optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;

export const patientDefaultValues: PatientFormData = {
  patientId: "",
  patientName: "",
  patientPhone: "",
  patientEmail: "",
  patientDob: "",
  gender: undefined,
  patientJob: "",
  patientContactName: "",
  patientContactPhone: "",
  patientAddress: "",
  hospitalId: "",
};

/** Schema cho form thêm bệnh nhân mới (không cần nhập mã, có thông tin lâm sàng) */
export const createPatientSchema = z.object({
  patientName: z.string().min(1, "Tên bệnh nhân là bắt buộc"),
  patientPhone: z
    .string()
    .min(1, "Số điện thoại là bắt buộc")
    .regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số"),
  patientEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  patientDob: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  patientJob: z.string().optional(),
  patientContactName: z.string().optional(),
  patientContactPhone: z.string().optional(),
  patientAddress: z.string().optional(),
  hospitalId: z.string().optional(),
  // Thông tin lâm sàng
  patientHeight: z.union([z.number(), z.string()]).optional().transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }),
  patientWeight: z.union([z.number(), z.string()]).optional().transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }),
  patientHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  medicalHistory: z.string().optional(),
  acuteDisease: z.string().optional(),
  chronicDisease: z.string().optional(),
  medicalUsingInput: z.string().optional(),
  toxicExposure: z.string().optional(),
});

export type CreatePatientFormData = z.infer<typeof createPatientSchema>;

export const createPatientDefaultValues: CreatePatientFormData = {
  patientName: "",
  patientPhone: "",
  patientEmail: "",
  patientDob: "",
  gender: undefined,
  patientJob: "",
  patientContactName: "",
  patientContactPhone: "",
  patientAddress: "",
  hospitalId: "",
  patientHeight: undefined,
  patientWeight: undefined,
  patientHistory: "",
  familyHistory: "",
  medicalHistory: "",
  acuteDisease: "",
  chronicDisease: "",
  medicalUsingInput: "",
  toxicExposure: "",
};
