import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Step1Patient,
  Step2Clinical,
  Step3ServiceTest,
  Step4GeneticResults,
  Step5ServiceType,
  Step6Note,
} from "@/components/specify/create-specify-steps";
import { SuccessModal } from "@/components/modals";
import { useAuth } from "@/contexts/AuthContext";
import { getApiResponseData, getApiResponseSingle } from "@/lib/types/api-types";
import {
  specifyFormDefaultValues,
  specifyFormSchema,
  type SpecifyFormData,
} from "@/lib/schemas/specify-form-schema";
import { ServiceType } from "@/lib/schemas/order-form-schema";
import { patientClinicalService } from "@/services/patientClinicalService";
import { patientService } from "@/services/patientService";
import { doctorService, type DoctorResponse } from "@/services/doctorService";
import { genomeTestService, type GenomeTestResponse } from "@/services/genomeTestService";
import { serviceEntityService } from "@/services/serviceEntityService";
import {
  specifyVoteTestService,
  type SpecifyVoteTestRequest,
  type SpecifyVoteTestResponse,
} from "@/services/specifyVoteTestService";
import { reproductionService } from "@/services/reproductionService";
import { embryoService } from "@/services/embryoService";
import { diseaseService } from "@/services/diseaseService";
import type { PatientResponse } from "@/services/patientService";

const TOTAL_STEPS = 6;
const STEP_TITLES = [
  "Thông tin bệnh nhân",
  "Thông tin lâm sàng",
  "Loại dịch vụ & Xét nghiệm",
  "Kết quả xét nghiệm di truyền",
  "Thông tin nhóm xét nghiệm",
  "Ghi chú",
];

const formatDateToInput = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  } catch {}
  return "";
};

const mapSpecifyToFormValues = (specify: SpecifyVoteTestResponse): Partial<SpecifyFormData> => {
  const p = specify.patient;
  const pc = specify.patientClinical;
  const rs = specify.reproductionService;
  const es = specify.embryoService;
  const ds = specify.diseaseService;

  const values: Partial<SpecifyFormData> = {
    ...specifyFormDefaultValues,
    isNewPatient: false,
    selectedPatientId: p?.patientId || "",
    patientName: p?.patientName || "",
    patientPhone: p?.patientPhone || "",
    patientDob: p?.patientDob ? formatDateToInput(p.patientDob) : "",
    patientGender: (p?.gender?.toLowerCase() as "male" | "female" | "other") || undefined,
    patientEmail: p?.patientEmail || "",
    patientJob: (p as any)?.patientJob || "",
    patientContactName: (p as any)?.patientContactName || "",
    patientContactPhone: (p as any)?.patientContactPhone || "",
    patientAddress: p?.patientAddress || "",
    patientClinicalId: (pc as any)?.id || (pc as any)?.patientClinicalId || "",
    serviceId: specify.serviceID || specify.serviceId || "",
    serviceType: (() => {
      const st = specify.serviceType?.toLowerCase();
      if (st === "reproduction" || st === "embryo" || st === "disease") return st;
      const sid = (specify.serviceID || specify.serviceId || "").toLowerCase();
      if (sid.includes("reproduction") || sid === "reproduction") return "reproduction";
      if (sid.includes("embryo") || sid === "embryo") return "embryo";
      if (sid.includes("disease") || sid === "disease") return "disease";
      return undefined;
    })(),
    genomeTestId: specify.genomeTestId || specify.genomeTest?.testId || "",
    hospitalId: specify.hospitalId || specify.hospital?.hospitalId?.toString() || "",
    doctorId: specify.doctorId || specify.doctor?.doctorId || "",
    samplingSite: specify.samplingSite || "",
    sampleCollectDate: specify.sampleCollectDate ? formatDateToInput(specify.sampleCollectDate) : "",
    embryoNumber: specify.embryoNumber != null ? specify.embryoNumber : undefined,
    geneticTestResults: specify.geneticTestResults || "",
    geneticTestResultsRelationship: specify.geneticTestResultsRelationship || "",
    specifyNote: specify.specifyNote || "",
    sendEmailPatient: specify.sendEmailPatient ?? false,
  };

  if (pc) {
    values.patientHeight = pc.patientHeight?.toString() || undefined;
    values.patientWeight = pc.patientWeight?.toString() || undefined;
    values.patientHistory = pc.patientHistory || "";
    values.familyHistory = pc.familyHistory || "";
    values.acuteDisease = pc.acuteDisease || "";
    values.chronicDisease = pc.chronicDisease || "";
    values.toxicExposure = (pc as any).toxicExposure || "";
    values.medicalUsing = Array.isArray(pc.medicalUsing)
      ? pc.medicalUsing.join(", ")
      : "";
  }

  if (specify.serviceType === "reproduction" && rs) {
    values.reproductionServiceId = rs.id || "";
    values.fetusesNumber = rs.fetusesNumber?.toString() || "";
    values.fetusesWeek = rs.fetusesWeek?.toString() || "";
    values.fetusesDay = rs.fetusesDay?.toString() || "";
    values.ultrasoundDay = rs.ultrasoundDay ? formatDateToInput(rs.ultrasoundDay) : "";
    values.headRumpLength = rs.headRumpLength?.toString() || "";
    values.neckLength = rs.neckLength?.toString() || "";
    values.combinedTestResult = rs.combinedTestResult || "";
    values.ultrasoundResult = rs.ultrasoundResult || "";
  } else if (specify.serviceType === "embryo" && es) {
    values.embryoServiceId = es.id || "";
    values.biospy = es.biospy || "";
    values.biospyDate = es.biospyDate ? formatDateToInput(es.biospyDate) : "";
    values.cellContainingSolution = es.cellContainingSolution || "";
    values.embryoCreate = es.embryoCreate?.toString() || "";
    values.embryoStatus = es.embryoStatus || "";
    values.morphologicalAssessment = es.morphologicalAssessment || "";
    values.negativeControl = es.negativeControl || "";
  } else if (specify.serviceType === "disease" && ds) {
    values.diseaseServiceId = ds.id || "";
    values.symptom = ds.symptom || "";
    values.diagnose = ds.diagnose || "";
    values.treatmentTimeDay = ds.treatmentTimeDay?.toString() || "";
    values.drugResistance = ds.drugResistance || "";
    values.relapse = ds.relapse || "";
  }

  return values;
};

function Stepper({
  totalSteps,
  currentStep,
  onStepPress,
}: {
  totalSteps: number;
  currentStep: number;
  onStepPress?: (step: number) => void;
}) {
  return (
    <View className="mt-4">
      <View className="absolute left-0 right-0 top-[14px] h-[2px] bg-slate-200" />
      <View
        className="absolute left-0 top-[14px] h-[2px] bg-sky-600"
        style={{
          width:
            totalSteps <= 1 ? "0%" : `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
        }}
      />
      <View className="flex-row items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const circleBg = isDone ? "bg-sky-600" : "bg-white";
          const circleBorder = isDone
            ? "border-sky-600"
            : isActive
              ? "border-sky-600"
              : "border-slate-300";
          const textColor = isDone ? "text-white" : isActive ? "text-sky-700" : "text-slate-500";

          return (
            <TouchableOpacity
              key={stepNum}
              activeOpacity={onStepPress && isDone ? 0.7 : 1}
              onPress={() => onStepPress && isDone && onStepPress(stepNum)}
              disabled={!onStepPress || !isDone}
              className="items-center"
            >
              <View
                className={`w-8 h-8 rounded-full items-center justify-center border-2 ${circleBg} ${circleBorder}`}
              >
                {isDone ? (
                  <Check size={16} color="#fff" strokeWidth={3} />
                ) : (
                  <Text className={`text-[12px] font-extrabold ${textColor}`}>{stepNum}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function SpecifyEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { specifyId } = useLocalSearchParams<{ specifyId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hospitalId = user?.hospitalId != null ? String(user.hospitalId) : "";

  const methods = useForm<SpecifyFormData>({
    resolver: zodResolver(specifyFormSchema),
    mode: "onTouched",
    defaultValues: specifyFormDefaultValues,
  });

  const { getValues, setValue, reset } = methods;

  const { data: specifyResponse, isLoading: loadingSpecify } = useQuery({
    queryKey: ["specify-edit", specifyId],
    queryFn: () => specifyVoteTestService.getById(specifyId!),
    enabled: !!specifyId,
    retry: false,
  });

  const specify = getApiResponseSingle<SpecifyVoteTestResponse>(specifyResponse);

  useEffect(() => {
    if (specify && !loadingSpecify) {
      const formValues = mapSpecifyToFormValues(specify);
      reset({ ...specifyFormDefaultValues, ...formValues });
    }
  }, [specify, loadingSpecify, reset]);

  useEffect(() => {
    if (hospitalId) setValue("hospitalId", hospitalId);
  }, [hospitalId, setValue]);

  const { data: patientsResponse } = useQuery({
    queryKey: ["patients", hospitalId],
    queryFn: () =>
      hospitalId && hospitalId.trim()
        ? patientService.getByHospitalId(hospitalId.trim())
        : patientService.getAll({ size: 500 }),
    enabled: true,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ["services"],
    queryFn: () => serviceEntityService.getAll(),
  });

  const { data: doctorsResponse } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorService.getAll(),
  });

  const serviceId = methods.watch("serviceId");
  const { data: genomeTestsResponse } = useQuery({
    queryKey: ["genome-tests", serviceId],
    queryFn: () => genomeTestService.getByServiceId(serviceId!),
    enabled: !!serviceId,
  });

  const patients = useMemo(() => {
    const list = getApiResponseData<PatientResponse>(patientsResponse) || [];
    if (specify?.patient && !list.some((p) => p.patientId === specify.patient?.patientId)) {
      return [
        {
          patientId: specify.patient.patientId,
          patientName: specify.patient.patientName || "",
          patientPhone: specify.patient.patientPhone,
          patientEmail: specify.patient.patientEmail,
          patientDob: specify.patient.patientDob,
          gender: specify.patient.gender as any,
        } as PatientResponse,
        ...list,
      ];
    }
    return list;
  }, [patientsResponse, specify?.patient]);
  const services = useMemo(
    () => getApiResponseData(servicesResponse) || [],
    [servicesResponse]
  );
  const doctors = useMemo(
    () => getApiResponseData<DoctorResponse>(doctorsResponse) || [],
    [doctorsResponse]
  );
  const genomeTests = useMemo(
    () => getApiResponseData<GenomeTestResponse>(genomeTestsResponse) || [],
    [genomeTestsResponse]
  );

  const getServiceId = (): string => {
    const serviceType = getValues("serviceType");
    const svc = services.find(
      (s: any) =>
        s.serviceId === (serviceType || "").toLowerCase() ||
        (s.name || "").toLowerCase().includes((serviceType || "").toLowerCase())
    );
    return svc?.serviceId || getValues("serviceId") || serviceType || "";
  };

  const updateSpecifyMutation = useMutation({
    mutationFn: async (formData: SpecifyFormData) => {
      const patientId = formData.selectedPatientId!;

      await patientService.update(patientId, {
        patientId,
        patientName: formData.patientName!,
        patientPhone: formData.patientPhone!,
        patientDob: formData.patientDob ? new Date(formData.patientDob).toISOString() : undefined,
        gender: formData.patientGender || undefined,
        patientEmail: formData.patientEmail?.trim() || undefined,
        patientJob: formData.patientJob?.trim() || undefined,
        patientContactName: formData.patientContactName?.trim() || undefined,
        patientContactPhone: formData.patientContactPhone?.trim() || undefined,
        patientAddress: formData.patientAddress?.trim() || undefined,
      });

      const clinicalRequest = {
        patientId,
        patientHeight:
          formData.patientHeight != null ? Number(formData.patientHeight) : undefined,
        patientWeight:
          formData.patientWeight != null ? Number(formData.patientWeight) : undefined,
        patientHistory: formData.patientHistory?.trim() || undefined,
        familyHistory: formData.familyHistory?.trim() || undefined,
        chronicDisease: formData.chronicDisease?.trim() || undefined,
        acuteDisease: formData.acuteDisease?.trim() || undefined,
        toxicExposure: formData.toxicExposure?.trim() || undefined,
        medicalUsing: formData.medicalUsing
          ? formData.medicalUsing.split(",").map((m) => m.trim()).filter(Boolean)
          : undefined,
      };

      if (formData.patientClinicalId) {
        await patientClinicalService.update(formData.patientClinicalId, clinicalRequest);
      } else {
        await patientClinicalService.create(clinicalRequest);
      }

      const svcId = getServiceId() || formData.serviceId;

      if (formData.serviceType === "reproduction") {
        const reproductionRequest = {
          serviceId: svcId,
          patientId,
          fetusesNumber: formData.fetusesNumber ? parseInt(formData.fetusesNumber) : undefined,
          fetusesWeek: formData.fetusesWeek ? parseInt(formData.fetusesWeek) : undefined,
          fetusesDay: formData.fetusesDay ? parseInt(formData.fetusesDay) : undefined,
          ultrasoundDay: formData.ultrasoundDay || undefined,
          headRumpLength: formData.headRumpLength ? parseFloat(formData.headRumpLength) : undefined,
          neckLength: formData.neckLength ? parseFloat(formData.neckLength) : undefined,
          combinedTestResult: formData.combinedTestResult?.trim() || undefined,
          ultrasoundResult: formData.ultrasoundResult?.trim() || undefined,
        };
        if (formData.reproductionServiceId) {
          await reproductionService.update(formData.reproductionServiceId, reproductionRequest);
        } else {
          await reproductionService.create(reproductionRequest);
        }
      } else if (formData.serviceType === "embryo") {
        const embryoRequest = {
          serviceId: svcId,
          patientId,
          biospy: formData.biospy?.trim() || undefined,
          biospyDate: formData.biospyDate || undefined,
          cellContainingSolution: formData.cellContainingSolution?.trim() || undefined,
          embryoCreate: formData.embryoCreate ? parseInt(formData.embryoCreate) : undefined,
          embryoStatus: formData.embryoStatus?.trim() || undefined,
          morphologicalAssessment: formData.morphologicalAssessment?.trim() || undefined,
          cellNucleus: false,
          negativeControl: formData.negativeControl?.trim() || undefined,
        };
        if (formData.embryoServiceId) {
          await embryoService.update(formData.embryoServiceId, embryoRequest);
        } else {
          await embryoService.create(embryoRequest);
        }
      } else if (formData.serviceType === "disease") {
        const diseaseRequest = {
          serviceId: svcId,
          patientId,
          symptom: formData.symptom?.trim() || undefined,
          diagnose: formData.diagnose?.trim() || undefined,
          treatmentTimeDay: formData.treatmentTimeDay ? parseInt(formData.treatmentTimeDay) : undefined,
          drugResistance: formData.drugResistance?.trim() || undefined,
          relapse: formData.relapse?.trim() || undefined,
        };
        if (formData.diseaseServiceId) {
          await diseaseService.update(formData.diseaseServiceId, diseaseRequest);
        } else {
          await diseaseService.create(diseaseRequest);
        }
      }

      const specifyReq: SpecifyVoteTestRequest = {
        serviceId: formData.serviceId || svcId,
        patientId,
        genomeTestId: formData.genomeTestId!,
        hospitalId: formData.hospitalId || hospitalId || undefined,
        doctorId: formData.doctorId?.trim() || undefined,
        samplingSite: formData.samplingSite?.trim() || undefined,
        sampleCollectDate: formData.sampleCollectDate
          ? new Date(formData.sampleCollectDate).toISOString()
          : undefined,
        embryoNumber:
          formData.embryoNumber != null && formData.embryoNumber !== ""
            ? Number(formData.embryoNumber)
            : undefined,
        geneticTestResults: formData.geneticTestResults?.trim() || undefined,
        geneticTestResultsRelationship:
          formData.geneticTestResultsRelationship?.trim() || undefined,
        specifyNote: formData.specifyNote?.trim() || undefined,
        sendEmailPatient: formData.sendEmailPatient ?? false,
      };

      const specifyRes = await specifyVoteTestService.update(specifyId!, specifyReq);
      if (!specifyRes.success) {
        throw new Error(specifyRes.error || "Không thể cập nhật phiếu xét nghiệm");
      }
      return specifyId!;
    },
    onError: (error: any) => {
      Alert.alert(
        "Lỗi cập nhật",
        error?.message || "Không thể cập nhật phiếu xét nghiệm. Vui lòng thử lại."
      );
    },
  });

  const validateStep = (step: number): boolean => {
    const data = getValues();

    switch (step) {
      case 1:
        if (!data.selectedPatientId) {
          Alert.alert("Lỗi", "Vui lòng chọn bệnh nhân");
          return false;
        }
        if (!data.patientName?.trim() || !data.patientPhone?.trim()) {
          Alert.alert("Lỗi", "Vui lòng nhập đầy đủ họ tên và số điện thoại");
          return false;
        }
        return true;
      case 3:
        if (!data.serviceId) {
          Alert.alert("Lỗi", "Vui lòng chọn loại dịch vụ");
          return false;
        }
        if (!data.genomeTestId) {
          Alert.alert("Lỗi", "Vui lòng chọn xét nghiệm");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === TOTAL_STEPS) {
      setIsSubmitting(true);
      try {
        const formData = getValues();
        await updateSpecifyMutation.mutateAsync(formData);
        queryClient.invalidateQueries({ queryKey: ["customer-specifies"] });
        queryClient.invalidateQueries({ queryKey: ["specify-vote-tests"] });
        queryClient.invalidateQueries({ queryKey: ["specify", specifyId] });
        setShowSuccessModal(true);
      } catch {
        // Error handled in mutation
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep((p) => Math.min(p + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep((p) => Math.max(p - 1, 1));
    }
  };

  const handlePatientSelect = async (patientId: string) => {
    try {
      const clinicalRes = await patientClinicalService.getByPatientId(patientId);
      const clinical = clinicalRes.data;
      if (clinical) {
        setValue("patientClinicalId", (clinical as any).id ?? (clinical as any).patientClinicalId ?? "");
        setValue("patientHeight", clinical.patientHeight?.toString() ?? "");
        setValue("patientWeight", clinical.patientWeight?.toString() ?? "");
        setValue("patientHistory", clinical.patientHistory ?? "");
        setValue("familyHistory", clinical.familyHistory ?? "");
        setValue("chronicDisease", clinical.chronicDisease ?? "");
        setValue("acuteDisease", clinical.acuteDisease ?? "");
        setValue("toxicExposure", (clinical as any).toxicExposure ?? "");
        setValue("medicalUsing", Array.isArray(clinical.medicalUsing) ? clinical.medicalUsing.join(", ") : "");
      } else {
        setValue("patientClinicalId", "");
        setValue("patientHeight", "");
        setValue("patientWeight", "");
        setValue("patientHistory", "");
        setValue("familyHistory", "");
        setValue("chronicDisease", "");
        setValue("acuteDisease", "");
        setValue("toxicExposure", "");
        setValue("medicalUsing", "");
      }
    } catch {
      setValue("patientClinicalId", "");
      setValue("patientHeight", "");
      setValue("patientWeight", "");
      setValue("patientHistory", "");
      setValue("familyHistory", "");
      setValue("chronicDisease", "");
      setValue("acuteDisease", "");
      setValue("toxicExposure", "");
      setValue("medicalUsing", "");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Patient patients={patients} onPatientSelect={handlePatientSelect} />;
      case 2:
        return <Step2Clinical />;
      case 3:
        return (
          <Step3ServiceTest
            services={services}
            genomeTests={genomeTests}
            doctors={doctors}
            hospitalName={(user as any)?.hospitalName}
          />
        );
      case 4:
        return <Step4GeneticResults />;
      case 5:
        return <Step5ServiceType />;
      case 6:
        return <Step6Note />;
      default:
        return null;
    }
  };

  if (loadingSpecify || !specify) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">
          {loadingSpecify ? "Đang tải..." : "Không tìm thấy phiếu xét nghiệm"}
        </Text>
        {!loadingSpecify && !specify && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 px-6 py-3 bg-sky-600 rounded-2xl"
          >
            <Text className="text-white font-bold">Quay lại</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <FormProvider {...methods}>
      <SafeAreaView className="flex-1 bg-sky-50" edges={["top", "left", "right"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <View className="pb-4 px-5 bg-white border-b border-slate-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleBack}
              className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 items-center justify-center"
              activeOpacity={0.75}
              disabled={isSubmitting}
            >
              <ArrowLeft size={22} color="#0284C7" strokeWidth={2.5} />
            </TouchableOpacity>

            <View className="flex-1 items-center px-3">
              <Text className="text-[15px] font-extrabold text-slate-900" numberOfLines={1}>
                Cập nhật phiếu xét nghiệm
              </Text>
              <Text className="mt-0.5 text-[11px] font-bold text-slate-500" numberOfLines={1}>
                {specify.specifyVoteID}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.back()}
              className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200"
              activeOpacity={0.75}
              disabled={isSubmitting}
            >
              <Text className="text-sm font-extrabold text-slate-700">Huỷ</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-white px-5 pt-4 pb-5 border-b border-slate-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[12px] font-bold text-slate-500">
                Bước {currentStep}/{TOTAL_STEPS}
              </Text>
              <Text className="mt-1 text-[14px] font-extrabold text-slate-900" numberOfLines={2}>
                {STEP_TITLES[currentStep - 1]}
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-2xl bg-sky-50 border border-sky-100">
              <Text className="text-sm font-extrabold text-sky-700">{currentStep}</Text>
            </View>
          </View>
          <Stepper
            totalSteps={TOTAL_STEPS}
            currentStep={currentStep}
            onStepPress={(s) => setCurrentStep(s)}
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        <View
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex-row gap-3"
          style={{ paddingBottom: Math.max(16, insets.bottom) }}
        >
          <TouchableOpacity
            className="flex-1 h-12 rounded-2xl items-center justify-center bg-white border border-slate-200"
            onPress={handleBack}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Text className="text-[15px] font-extrabold text-slate-700">
              {currentStep === 1 ? "Huỷ" : "Quay lại"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 h-12 rounded-2xl items-center justify-center ${
              isSubmitting ? "bg-sky-400" : "bg-sky-600"
            }`}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-[15px] font-extrabold text-white">
                {currentStep === TOTAL_STEPS ? "Cập nhật" : "Tiếp theo"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SuccessModal
        visible={showSuccessModal}
        title="Cập nhật thành công"
        message={`Phiếu xét nghiệm ${specifyId || ""} đã được cập nhật thành công.`}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace("/customer/specifies");
        }}
      />
    </FormProvider>
  );
}
