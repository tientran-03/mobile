import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FormFieldGroup,
  FormInfoBox,
  FormInput,
  FormNumericInput,
  FormReadOnly,
  FormSelect,
  FormTextarea,
} from "@/components/form";
import {
  createOrderDefaultValues,
  createOrderSchema,
  PAYMENT_TYPE_OPTIONS,
  SERVICE_TYPE_MAPPER,
  type CreateOrderFormData,
} from "@/lib/schemas/order-schemas";
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_DEFAULT } from "@/lib/constants/order-status";
import { OrderStatus } from "@/types";

import { BarcodeStatus, OrderStatus as OrderStatusEnum, SpecifyStatus } from "@/lib/schemas/order-form-schema";
import { barcodeService, type BarcodeResponse } from "@/services/barcodeService";
import { customerService, type CustomerResponse } from "@/services/customerService";
import { doctorService, type DoctorResponse } from "@/services/doctorService";
import { genomeTestService, type GenomeTestResponse } from "@/services/genomeTestService";
import { hospitalStaffService, type HospitalStaffResponse } from "@/services/hospitalStaffService";
import { orderService, type OrderResponse } from "@/services/orderService";
import { patientService } from "@/services/patientService";
import { serviceService, type ServiceResponse } from "@/services/serviceService";
import { specifyVoteTestService } from "@/services/specifyVoteTestService";
const EDITABLE = {
  step1: {
    orderName: true,
    doctorId: true,
    customerId: false, 
    barcodeId: true,
    staffAnalystId: true,
    sampleCollectorId: true,
    orderStatus: true,
  },
  step2: {
    all: false,
  },
  step3: {
    genomeTestId: false,
  },
  step4: {
    all: false,
  },
  step5: {
    serviceType: false,
  },
  step6: {
    paymentAmount: true,
    paymentType: true,
    samplingSite: false,
    sampleCollectDate: false,
    embryoNumber: false,
    specifyVoteImagePath: false,
  },
  step7: {
    geneticTestResults: true,
    geneticTestResultsRelationship: true,
    orderNote: true,
  },
};

const TOTAL_STEPS = 7;
const STEP_TITLES = [
  "Thông tin cơ bản đơn hàng",
  "Thông tin người làm xét nghiệm",
  "Thông tin xét nghiệm",
  "Thông tin lâm sàng",
  "Thông tin nhóm xét nghiệm",
  "Thanh toán & mẫu xét nghiệm",
  "Kết quả xét nghiệm di truyền",
];

const formatDateInput = (isoDate?: string): string => {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
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
        className="absolute left-0 top-[14px] h-[2px] bg-cyan-600"
        style={{
          width: totalSteps <= 1 ? "0%" : `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
        }}
      />
      <View className="flex-row items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          const circleBg = isDone ? "bg-cyan-600" : "bg-white";
          const circleBorder = isDone
            ? "border-cyan-600"
            : isActive
              ? "border-cyan-600"
              : "border-slate-300";

          const textColor = isDone ? "text-white" : isActive ? "text-cyan-700" : "text-slate-500";

          return (
            <TouchableOpacity
              key={stepNum}
              activeOpacity={onStepPress && isDone ? 0.7 : 1}
              onPress={() => {
                if (onStepPress && isDone) onStepPress(stepNum);
              }}
              disabled={!onStepPress || !isDone}
              className="items-center"
            >
              <View className={`w-8 h-8 rounded-full items-center justify-center border-2 ${circleBg} ${circleBorder}`}>
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
function LockedField({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <View pointerEvents="none" className="opacity-60">
      {children}
    </View>
  );
}

export default function UpdateOrderWizardRestrictedScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    mode: "onTouched",
    defaultValues: createOrderDefaultValues,
  });
  const { data: orderResponse, isLoading: isLoadingOrder } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: !!orderId,
  });

  const { data: doctorsResponse } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorService.getAll(),
    retry: false,
  });

  const { data: customersResponse } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll(),
    retry: false,
  });

  const { data: staffResponse } = useQuery({
    queryKey: ["hospital-staffs"],
    queryFn: () => hospitalStaffService.getAll(),
    retry: false,
  });

  const { data: barcodesResponse } = useQuery({
    queryKey: ["barcodes"],
    queryFn: () => barcodeService.getAll(),
    retry: false,
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ["orders"],
    queryFn: () => orderService.getAll(),
    retry: false,
  });

  const { data: genomeTestsResponse } = useQuery({
    queryKey: ["genome-tests"],
    queryFn: () => genomeTestService.getAll(),
    retry: false,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ["services"],
    queryFn: () => serviceService.getAll(),
    retry: false,
  });

  const doctors = (doctorsResponse as any)?.success ? (((doctorsResponse as any).data as DoctorResponse[]) || []) : [];
  const customers = (customersResponse as any)?.success ? (((customersResponse as any).data as CustomerResponse[]) || []) : [];
  const staffs = (staffResponse as any)?.success ? (((staffResponse as any).data as HospitalStaffResponse[]) || []) : [];
  const allBarcodes = (barcodesResponse as any)?.success ? (((barcodesResponse as any).data as BarcodeResponse[]) || []) : [];
  const genomeTests: GenomeTestResponse[] = genomeTestsResponse?.success ? ((genomeTestsResponse.data as GenomeTestResponse[]) || []) : [];
  const services = (servicesResponse as any)?.success ? (((servicesResponse as any).data as ServiceResponse[]) || []) : [];

  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    const uniqueServices: Array<{ value: string; label: string; serviceId: string; uniqueKey: string }> = [];

    services.forEach((service, index) => {
      if (!service.name || !service.serviceId) return;
      const normalizedName = service.name.toLowerCase();
      if (!seen.has(normalizedName)) {
        seen.add(normalizedName);
        uniqueServices.push({
          value: service.name,
          label: SERVICE_TYPE_MAPPER[service.name] || service.name,
          serviceId: service.serviceId,
          uniqueKey: `${service.serviceId}-${index}`,
        });
      }
    });

    return uniqueServices;
  }, [services]);

  const usedBarcodeIds = useMemo(() => {
    const used = new Set<string>();
    if ((ordersResponse as any)?.success && (ordersResponse as any).data) {
      ((ordersResponse as any).data as any[]).forEach((o) => {
        if (o.barcodeId && o.orderId !== orderId) used.add(String(o.barcodeId).trim());
      });
    }
    return used;
  }, [ordersResponse, orderId]);

  const availableBarcodes = useMemo(() => {
    const currentOrderBarcode = (orderResponse as any)?.data?.barcodeId;
    return allBarcodes.filter((b) => {
      const barcode = String(b.barcode).trim();
      return !usedBarcodeIds.has(barcode) || barcode === currentOrderBarcode;
    });
  }, [allBarcodes, usedBarcodeIds, orderResponse]);

  const findServiceIdByType = (type?: string) => {
    if (!type) return undefined;
    return services.find((s) => String(s.name).toLowerCase() === String(type).toLowerCase())?.serviceId;
  };
  useEffect(() => {
    if (!(orderResponse as any)?.success || !(orderResponse as any).data) return;
    const order: OrderResponse = (orderResponse as any).data;

    const matchedCustomer = customers.find((c: any) => c.customerId === order.customerId);
    const customerUserId = (matchedCustomer as any)?.userId || (matchedCustomer as any)?.user?.userId || "";
    methods.setValue("step1.orderName", order.orderName || "");
    methods.setValue("step1.doctorId", order.specifyId?.doctorId || "");
    methods.setValue("step1.customerId", customerUserId || "");
    methods.setValue("step1.staffAnalystId", order.staffAnalystId || "");
    methods.setValue("step1.sampleCollectorId", order.sampleCollectorId || "");
    methods.setValue("step1.barcodeId", order.barcodeId || "");
    methods.setValue("step1.orderStatus", (order.orderStatus as OrderStatus) || ORDER_STATUS_DEFAULT);
    methods.setValue("step6.paymentAmount", order.paymentAmount?.toString() || "");
    methods.setValue("step6.paymentType", (order.paymentType as any) || "CASH");
    methods.setValue("step6.samplingSite", order.specifyId?.samplingSite || "");
    methods.setValue("step6.sampleCollectDate", formatDateInput(order.specifyId?.sampleCollectDate));
    methods.setValue("step6.embryoNumber", order.specifyId?.embryoNumber?.toString() || "");
    methods.setValue("step6.specifyVoteImagePath", order.specifyVoteImagePath || "");

    methods.setValue("step7.geneticTestResults", order.specifyId?.geneticTestResults || "");
    methods.setValue("step7.geneticTestResultsRelationship", order.specifyId?.geneticTestResultsRelationship || "");
    methods.setValue("step7.orderNote", order.orderNote || "");

    if (order.specifyId?.genomeTestId) {
      const test = genomeTests.find((t: any) => t.testId === order.specifyId?.genomeTestId);
      if (test) {
        methods.setValue("step3.genomeTestId", test.testId || "");
        methods.setValue("step3.testName", test.testName || "");
        methods.setValue("step3.testSample", Array.isArray(test.testSample) ? test.testSample.join(", ") : test.testSample || "");
        methods.setValue("step3.testContent", test.testDescription || "");

        if (test?.service?.name) {
          const serviceName = String(test.service.name).toLowerCase();
          if (serviceName.includes("embryo") || serviceName === "embryo") methods.setValue("step5.serviceType", "embryo");
          else if (serviceName.includes("disease") || serviceName === "disease") methods.setValue("step5.serviceType", "disease");
          else methods.setValue("step5.serviceType", "reproduction");
        }
      }
    }

    if (order.specifyId?.patientId) {
      patientService.getById(order.specifyId.patientId).then((patientResponse) => {
        if (patientResponse.success && patientResponse.data) {
          const p = patientResponse.data as any;
          methods.setValue("step2.patientName", p.patientName || "");
          methods.setValue("step2.patientPhone", p.patientPhone || "");
          methods.setValue("step2.patientDob", formatDateInput(p.patientDob));
          methods.setValue("step2.patientGender", p.gender || "");
          methods.setValue("step2.patientEmail", p.patientEmail || "");
          methods.setValue("step2.patientJob", p.patientJob || "");
          methods.setValue("step2.patientContactName", p.patientContactName || "");
          methods.setValue("step2.patientContactPhone", p.patientContactPhone || "");
          methods.setValue("step2.patientAddress", p.patientAddress || "");
          methods.setValue("step2.patientId", p.patientId);
        }
      });
    }
  }, [orderResponse, customers, genomeTests, methods]);
  const validateStep1 = async () => {
    const ok = await methods.trigger("step1.orderName");
    if (!ok) Alert.alert("Lỗi", "Vui lòng nhập tên đơn hàng");
    return ok;
  };
  const validateStep6 = async () => {
    const ok = await methods.trigger("step6.paymentType");
    if (!ok) Alert.alert("Lỗi", "Vui lòng chọn hình thức thanh toán");
    return ok;
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((p) => p - 1);
    else router.back();
  };

  const handleNext = async () => {
    let ok = true;
    if (currentStep === 1) ok = await validateStep1();
    if (currentStep === 6 && EDITABLE.step6.paymentType) ok = await validateStep6();
    if (!ok) return;

    if (currentStep === TOTAL_STEPS) {
      await handleSubmit();
      return;
    }
    setCurrentStep((p) => p + 1);
  };
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = methods.getValues();
      const currentOrderData = (orderResponse as any)?.data as OrderResponse | undefined;
      if (!currentOrderData) throw new Error("Không tải được dữ liệu đơn hàng");
      const specifyVoteID = currentOrderData?.specifyId?.specifyVoteID;
      if (!specifyVoteID) throw new Error("Đơn hàng chưa có specifyVoteID");
      const lockedServiceType = methods.getValues("step5.serviceType");
      const serviceId =
        findServiceIdByType(lockedServiceType) || currentOrderData.specifyId?.serviceID;
      if (!serviceId) throw new Error("Không tìm thấy serviceId");

      const patientId = currentOrderData.specifyId?.patientId;
      const genomeTestId = currentOrderData.specifyId?.genomeTestId;
      if (!patientId) throw new Error("Không tìm thấy patientId");
      if (!genomeTestId) throw new Error("Không tìm thấy genomeTestId");

      const paymentAmount =
        formData.step6.paymentAmount?.trim() ? Number(formData.step6.paymentAmount) : undefined;
      const orderReq: any = {
        orderName: formData.step1.orderName.trim(),
      };

      if (EDITABLE.step1.doctorId) orderReq.doctorId = formData.step1.doctorId?.trim() || undefined; // nếu backend cần (thường doctor nằm trong specify)
      if (EDITABLE.step1.customerId) orderReq.customerId = formData.step1.customerId?.trim() || undefined;
      if (EDITABLE.step1.sampleCollectorId) orderReq.sampleCollectorId = formData.step1.sampleCollectorId?.trim() || undefined;
      if (EDITABLE.step1.staffAnalystId) orderReq.staffAnalystId = formData.step1.staffAnalystId?.trim() || undefined;
      if (EDITABLE.step1.barcodeId) orderReq.barcodeId = formData.step1.barcodeId?.trim() || undefined;
      if (EDITABLE.step1.orderStatus)
        orderReq.orderStatus = (formData.step1.orderStatus || currentOrderData.orderStatus || ORDER_STATUS_DEFAULT) as any;
      if (EDITABLE.step6.paymentType) orderReq.paymentType = (formData.step6.paymentType || currentOrderData.paymentType || "CASH") as any;
      if (EDITABLE.step6.paymentAmount)
        orderReq.paymentAmount =
          typeof paymentAmount === "number" && !Number.isNaN(paymentAmount) ? paymentAmount : undefined;
      if (EDITABLE.step7.orderNote) orderReq.orderNote = formData.step7.orderNote?.trim() || undefined;
      orderReq.specifyId = specifyVoteID;
      orderReq.paymentStatus = (currentOrderData.paymentStatus || "PENDING") as any;
      orderReq.invoiceLink = currentOrderData.invoiceLink || undefined;
      const specifyReq: any = {
        serviceId,
        patientId,
        genomeTestId,
        hospitalId: currentOrderData.specifyId?.hospitalId || undefined,
        sendEmailPatient: false,
      };
      if (EDITABLE.step1.doctorId) specifyReq.doctorId = formData.step1.doctorId?.trim() || undefined;

      if (EDITABLE.step6.samplingSite) specifyReq.samplingSite = formData.step6.samplingSite?.trim() || undefined;
      if (EDITABLE.step6.sampleCollectDate)
        specifyReq.sampleCollectDate = formData.step6.sampleCollectDate?.trim()
          ? new Date(formData.step6.sampleCollectDate.trim()).toISOString()
          : undefined;
      if (EDITABLE.step6.embryoNumber)
        specifyReq.embryoNumber = formData.step6.embryoNumber?.trim() ? Number(formData.step6.embryoNumber) : undefined;
      if (EDITABLE.step7.geneticTestResults) specifyReq.geneticTestResults = formData.step7.geneticTestResults?.trim() || undefined;
      if (EDITABLE.step7.geneticTestResultsRelationship)
        specifyReq.geneticTestResultsRelationship = formData.step7.geneticTestResultsRelationship?.trim() || undefined;

      const orderUpdateRes = await orderService.update(orderId!, orderReq);
      if (!orderUpdateRes?.success) throw new Error(orderUpdateRes?.error || orderUpdateRes?.message || "Cập nhật đơn hàng thất bại");

      const specifyUpdateRes = await specifyVoteTestService.update(specifyVoteID, specifyReq);
      if (!specifyUpdateRes?.success) throw new Error(specifyUpdateRes?.error || specifyUpdateRes?.message || "Cập nhật phiếu chỉ định thất bại");
      if (orderReq.barcodeId) {
        try {
          await barcodeService.update(orderReq.barcodeId, { status: BarcodeStatus.NOT_PRINTED });
        } catch {}
      }

      const orderStatusString = typeof orderReq.orderStatus === "string" ? orderReq.orderStatus : String(orderReq.orderStatus);
      if (orderStatusString === OrderStatusEnum.FORWARD_ANALYSIS && specifyVoteID) {
        try {
          await specifyVoteTestService.updateStatus(specifyVoteID, SpecifyStatus.FORWARD_ANALYSIS);
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["specify-vote-tests"] });

      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert("Lỗi cập nhật", error?.message || "Không thể cập nhật. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** ===== UI Steps ===== */

  const renderStep1 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <LockedField locked={!EDITABLE.step1.orderName}>
        <FormInput name="step1.orderName" label="Tên đơn hàng" required placeholder="Nhập tên đơn hàng" />
      </LockedField>

      <LockedField locked={!EDITABLE.step1.doctorId}>
        <FormSelect
          name="step1.doctorId"
          label="Bác sĩ chỉ định"
          options={doctors}
          getLabel={(d: any) => d.doctorName}
          getValue={(d: any) => d.doctorId}
          placeholder="Lựa chọn"
          modalTitle="Chọn bác sĩ chỉ định"
        />
      </LockedField>

      <LockedField locked={!EDITABLE.step1.customerId}>
        <FormSelect
          name="step1.customerId"
          label="Khách hàng"
          options={customers}
          getLabel={(c: any) => c.customerName}
          getValue={(c: any) => (c as any).userId || (c as any).user?.userId || c.customerId}
          placeholder="Lựa chọn"
          modalTitle="Chọn khách hàng"
        />
      </LockedField>

      <LockedField locked={!EDITABLE.step1.barcodeId}>
        <FormSelect
          name="step1.barcodeId"
          label="Mã Barcode PCĐ"
          options={availableBarcodes}
          getLabel={(b: any) => b.barcode}
          getValue={(b: any) => b.barcode}
          placeholder="Lựa chọn"
          modalTitle={`Chọn mã Barcode PCĐ (${availableBarcodes.length} mã có sẵn)`}
        />
      </LockedField>

      <LockedField locked={!EDITABLE.step1.staffAnalystId}>
        <FormSelect
          name="step1.staffAnalystId"
          label="Nhân viên phụ trách"
          options={staffs}
          getLabel={(s: any) => s.staffName}
          getValue={(s: any) => s.staffId}
          placeholder="Lựa chọn"
          modalTitle="Chọn nhân viên phụ trách"
        />
      </LockedField>

      <LockedField locked={!EDITABLE.step1.sampleCollectorId}>
        <FormSelect
          name="step1.sampleCollectorId"
          label="Nhân viên thu mẫu"
          options={staffs}
          getLabel={(s: any) => s.staffName}
          getValue={(s: any) => s.staffId}
          placeholder="Lựa chọn"
          modalTitle="Chọn nhân viên thu mẫu"
        />
      </LockedField>

      <LockedField locked={!EDITABLE.step1.orderStatus}>
        <FormSelect
          name="step1.orderStatus"
          label="Trạng thái đơn hàng"
          options={ORDER_STATUS_OPTIONS}
          getLabel={(opt: any) => opt.label}
          getValue={(opt: any) => opt.value}
          placeholder="Chọn trạng thái"
          modalTitle="Chọn trạng thái đơn hàng"
        />
      </LockedField>

      {!EDITABLE.step1.customerId && (
        <FormInfoBox>
          Một số thông tin quan trọng đã bị khóa khi cập nhật (vd: Khách hàng).
        </FormInfoBox>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormInfoBox>Thông tin người làm xét nghiệm (chỉ xem).</FormInfoBox>

      <FormReadOnly label="Tên người làm xét nghiệm" value={methods.watch("step2.patientName") || ""} />
      <FormFieldGroup>
        <FormReadOnly label="Số điện thoại" value={methods.watch("step2.patientPhone") || ""} />
        <FormReadOnly label="Giới tính" value={methods.watch("step2.patientGender") || ""} />
      </FormFieldGroup>

      <FormFieldGroup>
        <FormReadOnly label="Ngày sinh" value={methods.watch("step2.patientDob") || ""} />
        <FormReadOnly label="Email" value={methods.watch("step2.patientEmail") || ""} />
      </FormFieldGroup>

      <FormReadOnly label="Địa chỉ" value={methods.watch("step2.patientAddress") || ""} />
    </View>
  );

  const renderStep3 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormInfoBox>Thông tin xét nghiệm (chỉ xem).</FormInfoBox>

      <FormReadOnly label="Tên xét nghiệm" value={methods.watch("step3.testName") || ""} />
      <FormReadOnly label="Mẫu xét nghiệm" value={methods.watch("step3.testSample") || ""} />
      <FormReadOnly label="Nội dung xét nghiệm" value={methods.watch("step3.testContent") || ""} />
    </View>
  );

  const renderStep4 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormInfoBox>Thông tin lâm sàng (chỉ xem).</FormInfoBox>

      <FormReadOnly label="Chiều cao (cm)" value={methods.watch("step4.patientHeight")?.toString?.() || ""} />
      <FormReadOnly label="Cân nặng (kg)" value={methods.watch("step4.patientWeight")?.toString?.() || ""} />
      <FormReadOnly label="Tiền sử bệnh nhân" value={methods.watch("step4.patientHistory") || ""} />
      <FormReadOnly label="Tiền sử gia đình" value={methods.watch("step4.familyHistory") || ""} />
      <FormReadOnly label="Tiếp xúc độc tố" value={methods.watch("step4.toxicExposure") || ""} />
      <FormReadOnly label="Tiền sử y tế" value={methods.watch("step4.medicalHistory") || ""} />
      <FormReadOnly label="Bệnh mãn tính" value={methods.watch("step4.chronicDisease") || ""} />
      <FormReadOnly label="Bệnh cấp tính" value={methods.watch("step4.acuteDisease") || ""} />
      <FormReadOnly label="Thuốc đang sử dụng" value={methods.watch("step4.medicalUsing") || ""} />
    </View>
  );

  const renderStep5 = () => {
    const selectedServiceType = methods.watch("step5.serviceType");
    const label =
      serviceOptions.find((s) => String(s.value).toLowerCase() === String(selectedServiceType).toLowerCase())?.label ||
      selectedServiceType ||
      "";

    return (
      <View className="bg-white rounded-3xl border border-slate-200 p-4">
        <FormInfoBox>Nhóm xét nghiệm (chỉ xem).</FormInfoBox>
        <FormReadOnly label="Nhóm xét nghiệm" value={label} />
      </View>
    );
  };

  const renderStep6 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormFieldGroup>
        <LockedField locked={!EDITABLE.step6.paymentAmount}>
          <FormNumericInput
            name="step6.paymentAmount"
            label="Số tiền thanh toán (VNĐ)"
            type="integer"
            placeholder="Nhập số tiền"
          />
        </LockedField>

        <LockedField locked={!EDITABLE.step6.paymentType}>
          <FormSelect
            name="step6.paymentType"
            label="Hình thức thanh toán"
            required
            options={PAYMENT_TYPE_OPTIONS}
            getLabel={(o: any) => o.label}
            getValue={(o: any) => o.value}
            placeholder="Tiền mặt"
            modalTitle="Chọn hình thức thanh toán"
          />
        </LockedField>
      </FormFieldGroup>

      <LockedField locked={!EDITABLE.step6.samplingSite}>
        <FormInput name="step6.samplingSite" label="Địa điểm lấy mẫu" placeholder="Nhập địa điểm lấy mẫu" />
      </LockedField>

      <FormFieldGroup>
        <LockedField locked={!EDITABLE.step6.sampleCollectDate}>
          <FormInput name="step6.sampleCollectDate" label="Ngày lấy mẫu" placeholder="YYYY-MM-DD" />
        </LockedField>

        <LockedField locked={!EDITABLE.step6.embryoNumber}>
          <FormNumericInput name="step6.embryoNumber" label="Số phôi (nếu có)" type="integer" placeholder="VD: 2" />
        </LockedField>
      </FormFieldGroup>

      <LockedField locked={!EDITABLE.step6.specifyVoteImagePath}>
        <FormInput
          name="step6.specifyVoteImagePath"
          label="Đường dẫn ảnh phiếu chỉ định"
          placeholder="Nhập đường dẫn ảnh (nếu có)"
        />
      </LockedField>
    </View>
  );

  const renderStep7 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormInfoBox>Cập nhật kết quả xét nghiệm di truyền (nếu được phép).</FormInfoBox>

      <LockedField locked={!EDITABLE.step7.geneticTestResults}>
        <FormTextarea
          name="step7.geneticTestResults"
          label="Kết quả xét nghiệm di truyền"
          placeholder="Nhập kết quả"
          minHeight={120}
        />
      </LockedField>

      <LockedField locked={!EDITABLE.step7.geneticTestResultsRelationship}>
        <FormInput name="step7.geneticTestResultsRelationship" label="Mối quan hệ" placeholder="Nhập mối quan hệ" />
      </LockedField>

      <View className="h-px bg-slate-100 my-4" />

      <LockedField locked={!EDITABLE.step7.orderNote}>
        <FormTextarea
          name="step7.orderNote"
          label="Ghi chú đơn hàng"
          placeholder="Nhập ghi chú cho đơn hàng (nếu có)"
          minHeight={120}
          maxLength={500}
        />
      </LockedField>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      default:
        return renderStep1();
    }
  };

  if (isLoadingOrder) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#0891B2" />
        <Text className="mt-3 text-slate-600 text-xs font-bold">Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <FormProvider {...methods}>
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View className="pb-4 px-5 bg-white border-b border-slate-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleBack}
              className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-100 items-center justify-center"
              activeOpacity={0.75}
              disabled={isSubmitting}
            >
              <ArrowLeft size={22} color="#0891B2" strokeWidth={2.5} />
            </TouchableOpacity>

            <View className="flex-1 items-center px-3">
              <Text className="text-[15px] font-extrabold text-slate-900" numberOfLines={1}>
                Cập nhật đơn hàng
              </Text>
              <Text className="mt-0.5 text-[11px] font-bold text-slate-500" numberOfLines={1}>
                Hoàn thiện theo từng bước
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.back()}
              className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200"
              activeOpacity={0.75}
              disabled={isSubmitting}
            >
              <Text className="text-sm font-extrabold text-slate-700">Xong</Text>
            </TouchableOpacity>
          </View>
        </View
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

            <View className="px-3 py-1.5 rounded-2xl bg-cyan-50 border border-cyan-100">
              <Text className="text-sm font-extrabold text-cyan-700">{currentStep}</Text>
            </View>
          </View>

          <Stepper totalSteps={TOTAL_STEPS} currentStep={currentStep} onStepPress={(s) => setCurrentStep(s)} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 140 + insets.bottom,
          }}
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Bottom bar */}
        <View
          pointerEvents="box-none"
          style={{
            position: isWeb ? ("fixed" as any) : "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopWidth: 1,
              borderTopColor: "#E2E8F0",
              padding: 16,
              paddingBottom: Math.max(16, insets.bottom),
              flexDirection: "row",
              gap: 12,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                height: 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
              onPress={handleBack}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#334155" }}>
                {currentStep === 1 ? "Huỷ" : "Quay lại"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                height: 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSubmitting ? "#22D3EE" : "#0891B2",
              }}
              onPress={handleNext}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "800", color: "white" }}>
                  {currentStep === TOTAL_STEPS ? "Hoàn thành" : "Tiếp theo"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowSuccessModal(false);
            router.back();
          }}
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-5">
            <View className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden border border-slate-200">
              <View className="items-center p-6">
                <View className="w-16 h-16 rounded-2xl bg-emerald-500/12 border border-emerald-200 items-center justify-center">
                  <Check size={30} color="#22C55E" strokeWidth={3} />
                </View>

                <Text className="mt-4 text-[16px] font-extrabold text-slate-900">Cập nhật thành công</Text>
                <Text className="mt-2 text-[12px] font-bold text-slate-500 text-center leading-5">
                  Đơn hàng đã được cập nhật. Bạn có thể xem trong danh sách đơn hàng.
                </Text>
              </View>

              <View className="flex-row p-4 gap-3 border-t border-slate-200 bg-slate-50">
                <TouchableOpacity
                  className="flex-1 h-12 rounded-2xl items-center justify-center bg-white border border-slate-200"
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push("/orders");
                  }}
                  activeOpacity={0.85}
                >
                  <Text className="text-[14px] font-extrabold text-slate-700">Xem danh sách</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 h-12 rounded-2xl items-center justify-center bg-cyan-600"
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.back();
                  }}
                  activeOpacity={0.85}
                >
                  <Text className="text-[14px] font-extrabold text-white">Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </FormProvider>
  );
}
