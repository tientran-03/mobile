import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FormFieldGroup,
  FormInfoBox,
  FormInput,
  FormNumericInput,
  FormReadOnly,
  FormSelect,
  FormTextarea,
} from '@/components/form';
import { useAuth } from '@/contexts/AuthContext';
import {
  createOrderDefaultValues,
  createOrderSchema,
  GENDER_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  SERVICE_TYPE_MAPPER,
  type CreateOrderFormData,
} from '@/lib/schemas/order-schemas';
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_DEFAULT } from '@/lib/constants/order-status';
import { OrderStatus } from '@/types';
import {
  BarcodeStatus,
  OrderStatus as OrderStatusEnum,
  SpecifyStatus,
} from '@/lib/schemas/order-form-schema';
import { BarcodeResponse, barcodeService } from '@/services/barcodeService';
import { CustomerResponse, customerService } from '@/services/customerService';
import { DoctorResponse, doctorService } from '@/services/doctorService';
import { GenomeTestResponse, genomeTestService } from '@/services/genomeTestService';
import { HospitalStaffResponse, hospitalStaffService } from '@/services/hospitalStaffService';
import { OrderResponse, orderService } from '@/services/orderService';
import { patientService } from '@/services/patientService';
import { ServiceResponse, serviceService } from '@/services/serviceService';
import { specifyVoteTestService } from '@/services/specifyVoteTestService';

const TOTAL_STEPS = 7;
const STEP_TITLES = [
  'Thông tin cơ bản đơn hàng',
  'Thông tin người làm xét nghiệm',
  'Thông tin xét nghiệm',
  'Thông tin lâm sàng',
  'Thông tin nhóm xét nghiệm',
  'Thanh toán & mẫu xét nghiệm',
  'Kết quả xét nghiệm di truyền',
];

const formatDateInput = (isoDate?: string): string => {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
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
          width: totalSteps <= 1 ? '0%' : `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
        }}
      />
      <View className="flex-row items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          const circleBg = isDone ? 'bg-cyan-600' : 'bg-white';
          const circleBorder = isDone
            ? 'border-cyan-600'
            : isActive
              ? 'border-cyan-600'
              : 'border-slate-300';

          const textColor = isDone ? 'text-white' : isActive ? 'text-cyan-700' : 'text-slate-500';

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

export default function UpdateOrderWizardScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const isWeb = Platform.OS === 'web';

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    mode: 'onTouched',
    defaultValues: createOrderDefaultValues,
  });

  const { data: orderResponse, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: !!orderId,
  });

  const { data: doctorsResponse } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorService.getAll(),
    retry: false,
  });

  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
    retry: false,
  });

  const { data: staffResponse } = useQuery({
    queryKey: ['hospital-staffs'],
    queryFn: () => hospitalStaffService.getAll(),
    retry: false,
  });

  const { data: barcodesResponse } = useQuery({
    queryKey: ['barcodes'],
    queryFn: () => barcodeService.getAll(),
    retry: false,
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    retry: false,
  });

  const { data: genomeTestsResponse } = useQuery({
    queryKey: ['genome-tests'],
    queryFn: () => genomeTestService.getAll(),
    retry: false,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceService.getAll(),
    retry: false,
  });

  const doctors = (doctorsResponse as any)?.success
    ? ((doctorsResponse as any).data as DoctorResponse[]) || []
    : [];
  const customers = (customersResponse as any)?.success
    ? ((customersResponse as any).data as CustomerResponse[]) || []
    : [];
  const staffs = (staffResponse as any)?.success
    ? ((staffResponse as any).data as HospitalStaffResponse[]) || []
    : [];
  const allBarcodes = (barcodesResponse as any)?.success
    ? ((barcodesResponse as any).data as BarcodeResponse[]) || []
    : [];
  const genomeTests: GenomeTestResponse[] = genomeTestsResponse?.success
    ? (genomeTestsResponse.data as GenomeTestResponse[]) || []
    : [];
  const services = (servicesResponse as any)?.success
    ? ((servicesResponse as any).data as ServiceResponse[]) || []
    : [];

  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    const uniqueServices: Array<{
      value: string;
      label: string;
      serviceId: string;
      uniqueKey: string;
    }> = [];

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
      ((ordersResponse as any).data as any[]).forEach(o => {
        if (o.barcodeId && o.orderId !== orderId) used.add(String(o.barcodeId).trim());
      });
    }
    return used;
  }, [ordersResponse, orderId]);

  const availableBarcodes = useMemo(() => {
    const currentOrderBarcode = (orderResponse as any)?.data?.barcodeId;
    return allBarcodes.filter(b => {
      const barcode = String(b.barcode).trim();
      return !usedBarcodeIds.has(barcode) || barcode === currentOrderBarcode;
    });
  }, [allBarcodes, usedBarcodeIds, orderResponse]);

  const serviceType = methods.watch('step5.serviceType');
  const filteredGenomeTests = useMemo(() => {
    if (!serviceType) return genomeTests;
    return genomeTests.filter(test => {
      const serviceName = test.service?.name?.toLowerCase();
      return serviceName === serviceType.toLowerCase();
    });
  }, [genomeTests, serviceType]);

  const findServiceIdByType = (type?: string) => {
    if (!type) return undefined;
    return services.find(s => String(s.name).toLowerCase() === String(type).toLowerCase())
      ?.serviceId;
  };

  useEffect(() => {
    if (!(orderResponse as any)?.success || !(orderResponse as any).data) return;

    const order: OrderResponse = (orderResponse as any).data;

    const matchedCustomer = customers.find((c: any) => c.customerId === order.customerId);
    const customerUserId =
      (matchedCustomer as any)?.userId || (matchedCustomer as any)?.user?.userId || '';

    methods.setValue('step1.orderName', order.orderName || '');
    methods.setValue('step1.doctorId', order.specifyId?.doctorId || '');
    methods.setValue('step1.customerId', customerUserId || '');
    methods.setValue('step1.staffAnalystId', order.staffAnalystId || '');
    methods.setValue('step1.sampleCollectorId', order.sampleCollectorId || '');
    methods.setValue('step1.barcodeId', order.barcodeId || '');
    methods.setValue(
      'step1.orderStatus',
      (order.orderStatus as OrderStatus) || ORDER_STATUS_DEFAULT
    );

    methods.setValue('step6.paymentAmount', order.paymentAmount?.toString() || '');
    methods.setValue('step6.paymentType', (order.paymentType as any) || 'CASH');
    methods.setValue('step6.samplingSite', order.specifyId?.samplingSite || '');
    methods.setValue('step6.sampleCollectDate', formatDateInput(order.specifyId?.sampleCollectDate));
    methods.setValue('step6.embryoNumber', order.specifyId?.embryoNumber?.toString() || '');
    methods.setValue('step6.specifyVoteImagePath', order.specifyVoteImagePath || '');

    methods.setValue('step7.geneticTestResults', order.specifyId?.geneticTestResults || '');
    methods.setValue(
      'step7.geneticTestResultsRelationship',
      order.specifyId?.geneticTestResultsRelationship || ''
    );
    methods.setValue('step7.orderNote', order.orderNote || '');

    if (order.specifyId) {
      const specify = order.specifyId;

      if (specify.genomeTestId) {
        const test = genomeTests.find((t: any) => t.testId === specify.genomeTestId);
        if (test) {
          methods.setValue('step3.genomeTestId', test.testId || '');
          methods.setValue('step3.testName', test.testName || '');
          methods.setValue(
            'step3.testSample',
            Array.isArray(test.testSample) ? test.testSample.join(', ') : test.testSample || ''
          );
          methods.setValue('step3.testContent', test.testDescription || '');

          if (test?.service?.name) {
            const serviceName = String(test.service.name).toLowerCase();
            if (serviceName.includes('embryo') || serviceName === 'embryo') {
              methods.setValue('step5.serviceType', 'embryo');
            } else if (serviceName.includes('disease') || serviceName === 'disease') {
              methods.setValue('step5.serviceType', 'disease');
            } else {
              methods.setValue('step5.serviceType', 'reproduction');
            }
          }
        }
      }

      if (specify.patientId) {
        patientService.getById(specify.patientId).then(patientResponse => {
          if (patientResponse.success && patientResponse.data) {
            const patient = patientResponse.data as any;
            methods.setValue('step2.patientName', patient.patientName || '');
            methods.setValue('step2.patientPhone', patient.patientPhone || '');
            methods.setValue('step2.patientDob', formatDateInput(patient.patientDob));
            methods.setValue('step2.patientGender', patient.gender || '');
            methods.setValue('step2.patientEmail', patient.patientEmail || '');
            methods.setValue('step2.patientJob', patient.patientJob || '');
            methods.setValue('step2.patientContactName', patient.patientContactName || '');
            methods.setValue('step2.patientContactPhone', patient.patientContactPhone || '');
            methods.setValue('step2.patientAddress', patient.patientAddress || '');
            methods.setValue('step2.specifyId', specify.specifyVoteID);
            methods.setValue('step2.specifyImagePath', specify.specifyNote || '');
            methods.setValue('step2.patientId', patient.patientId);
          }
        });
      }

      if (specify.embryoNumber) {
        methods.setValue('step6.embryoNumber', specify.embryoNumber?.toString() || '');
      }
    }
  }, [orderResponse, customers, genomeTests, methods]);

  const genomeTestId = methods.watch('step3.genomeTestId');
  useEffect(() => {
    if (!genomeTestId) return;
    const test = genomeTests.find((t: any) => t.testId === genomeTestId);
    if (!test) return;
    methods.setValue('step3.testName', test.testName || '');
    methods.setValue(
      'step3.testSample',
      Array.isArray(test.testSample) ? test.testSample.join(', ') : test.testSample || ''
    );
    methods.setValue('step3.testContent', test.testDescription || '');
  }, [genomeTestId, genomeTests, methods]);

  const validateStep1 = async () => {
    const isValid = await methods.trigger('step1.orderName');
    if (!isValid) Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
    return isValid;
  };

  const validateStep3 = async () => {
    const isValid = await methods.trigger('step3.genomeTestId');
    if (!isValid) Alert.alert('Lỗi', 'Vui lòng chọn xét nghiệm');
    return isValid;
  };

  const validateStep6 = async () => {
    const isValid = await methods.trigger('step6.paymentType');
    if (!isValid) Alert.alert('Lỗi', 'Vui lòng chọn hình thức thanh toán');
    return isValid;
  };

  const handleNext = async () => {
    let isValid = true;
    if (currentStep === 1) isValid = await validateStep1();
    else if (currentStep === 3) isValid = await validateStep3();
    else if (currentStep === 6) isValid = await validateStep6();

    if (!isValid) return;

    if (currentStep === TOTAL_STEPS) {
      const formData = methods.getValues();
      if (!formData.step1.orderName?.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
        return;
      }
      await handleSubmit();
      return;
    }
    if (currentStep < TOTAL_STEPS) setCurrentStep(p => p + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(p => p - 1);
    else router.back();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = methods.getValues();
      const currentOrderData = (orderResponse as any)?.data as OrderResponse | undefined;
      if (!currentOrderData) throw new Error('Không tải được dữ liệu đơn hàng');

      const specifyVoteID = currentOrderData?.specifyId?.specifyVoteID;
      if (!specifyVoteID) throw new Error('Đơn hàng chưa có specifyVoteID');

      const serviceId = findServiceIdByType(formData.step5.serviceType);
      if (!serviceId) throw new Error('Không tìm thấy serviceId theo nhóm xét nghiệm');

      if (!formData.step3.genomeTestId?.trim()) throw new Error('Vui lòng chọn xét nghiệm');
      if (!formData.step2.patientId?.trim()) throw new Error('Không tìm thấy patientId');

      const paymentAmount = formData.step6.paymentAmount?.trim()
        ? Number(formData.step6.paymentAmount)
        : undefined;

      const orderReq: any = {
        orderName: formData.step1.orderName.trim(),
        customerId: formData.step1.customerId?.trim() || undefined,
        sampleCollectorId: formData.step1.sampleCollectorId?.trim() || undefined,
        staffAnalystId: formData.step1.staffAnalystId?.trim() || undefined,
        barcodeId: formData.step1.barcodeId?.trim() || undefined,
        specifyId: specifyVoteID,
        specifyVoteImagePath: formData.step6.specifyVoteImagePath?.trim() || undefined,
        orderStatus: (formData.step1.orderStatus ||
          currentOrderData.orderStatus ||
          ORDER_STATUS_DEFAULT) as any,
        paymentStatus: (currentOrderData.paymentStatus || 'PENDING') as any,
        paymentType: (formData.step6.paymentType || currentOrderData.paymentType || 'CASH') as any,
        paymentAmount:
          typeof paymentAmount === 'number' && !Number.isNaN(paymentAmount)
            ? paymentAmount
            : undefined,
        invoiceLink: currentOrderData.invoiceLink || undefined,
        orderNote: formData.step7.orderNote?.trim() || undefined,
      };

      const specifyReq: any = {
        serviceId,
        patientId: formData.step2.patientId.trim(),
        genomeTestId: formData.step3.genomeTestId.trim(),
        embryoNumber: formData.step6.embryoNumber?.trim()
          ? Number(formData.step6.embryoNumber)
          : undefined,
        hospitalId: currentOrderData.specifyId?.hospitalId || undefined,
        doctorId: formData.step1.doctorId?.trim() || undefined,
        samplingSite: formData.step6.samplingSite?.trim() || undefined,
        sampleCollectDate: formData.step6.sampleCollectDate?.trim()
          ? new Date(formData.step6.sampleCollectDate.trim()).toISOString()
          : undefined,
        geneticTestResults: formData.step7.geneticTestResults?.trim() || undefined,
        geneticTestResultsRelationship:
          formData.step7.geneticTestResultsRelationship?.trim() || undefined,
        specifyNote: formData.step2.specifyImagePath?.trim() || undefined,
        sendEmailPatient: false,
      };

      const orderUpdateRes = await orderService.update(orderId!, orderReq);
      if (!orderUpdateRes?.success) {
        const msg =
          orderUpdateRes?.error || orderUpdateRes?.message || 'Cập nhật đơn hàng thất bại';
        throw new Error(msg);
      }

      const specifyUpdateRes = await specifyVoteTestService.update(specifyVoteID, specifyReq);
      if (!specifyUpdateRes?.success) {
        const msg =
          specifyUpdateRes?.error ||
          specifyUpdateRes?.message ||
          'Cập nhật phiếu chỉ định thất bại';
        throw new Error(msg);
      }

      if (orderReq.barcodeId) {
        try {
          await barcodeService.update(orderReq.barcodeId, { status: BarcodeStatus.NOT_PRINTED });
        } catch {}
      }

      const orderStatusString =
        typeof orderReq.orderStatus === 'string'
          ? orderReq.orderStatus
          : String(orderReq.orderStatus);

      if (orderStatusString === OrderStatusEnum.FORWARD_ANALYSIS && specifyVoteID) {
        try {
          await specifyVoteTestService.updateStatus(specifyVoteID, SpecifyStatus.FORWARD_ANALYSIS);
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['specify-vote-tests'] });

      setShowSuccessModal(true);
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.response?.data?.error || 'Không thể cập nhật. Vui lòng thử lại.';
      Alert.alert('Lỗi cập nhật', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormInput
        name="step1.orderName"
        label="Tên đơn hàng"
        required
        placeholder="Nhập tên đơn hàng"
      />

      <FormSelect
        name="step1.doctorId"
        label="Bác sĩ chỉ định"
        options={doctors}
        getLabel={d => d.doctorName}
        getValue={d => d.doctorId}
        placeholder="Lựa chọn"
        modalTitle="Chọn bác sĩ chỉ định"
      />

      <FormSelect
        name="step1.customerId"
        label="Khách hàng"
        options={customers}
        getLabel={c => c.customerName}
        getValue={c => (c as any).userId || (c as any).user?.userId || c.customerId}
        placeholder="Lựa chọn"
        modalTitle="Chọn khách hàng"
      />

      <FormSelect
        name="step1.barcodeId"
        label="Mã Barcode PCĐ"
        options={availableBarcodes}
        getLabel={b => b.barcode}
        getValue={b => b.barcode}
        placeholder="Lựa chọn"
        modalTitle={`Chọn mã Barcode PCĐ (${availableBarcodes.length} mã có sẵn)`}
      />

      <FormSelect
        name="step1.staffAnalystId"
        label="Nhân viên phụ trách"
        options={staffs}
        getLabel={s => s.staffName}
        getValue={s => s.staffId}
        placeholder="Lựa chọn"
        modalTitle="Chọn nhân viên phụ trách"
      />

      <FormSelect
        name="step1.sampleCollectorId"
        label="Nhân viên thu mẫu"
        options={staffs}
        getLabel={s => s.staffName}
        getValue={s => s.staffId}
        placeholder="Lựa chọn"
        modalTitle="Chọn nhân viên thu mẫu"
      />

      <FormSelect
        name="step1.orderStatus"
        label="Trạng thái đơn hàng"
        options={ORDER_STATUS_OPTIONS}
        getLabel={opt => opt.label}
        getValue={opt => opt.value}
        placeholder="Chọn trạng thái"
        modalTitle="Chọn trạng thái đơn hàng"
      />
    </View>
  );

  const renderStep2 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormInput name="step2.patientName" label="Tên người làm xét nghiệm" placeholder="Nhập tên" />

      <FormFieldGroup>
        <FormNumericInput
          name="step2.patientPhone"
          label="Số điện thoại"
          type="phone"
          placeholder="Nhập số điện thoại"
        />
        <FormSelect
          name="step2.patientGender"
          label="Giới tính"
          options={GENDER_OPTIONS}
          getLabel={o => o.label}
          getValue={o => o.value}
          placeholder="Lựa chọn"
          modalTitle="Chọn giới tính"
        />
      </FormFieldGroup>

      <FormFieldGroup>
        <FormInput name="step2.patientDob" label="Ngày sinh" placeholder="YYYY-MM-DD" />
        <FormInput
          name="step2.patientEmail"
          label="Email"
          placeholder="Nhập email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </FormFieldGroup>

      <FormTextarea
        name="step2.patientAddress"
        label="Địa chỉ"
        placeholder="Nhập địa chỉ"
        minHeight={110}
      />
    </View>
  );

  const renderStep3 = () => {
    const testName = methods.watch('step3.testName');
    const currentServiceType = methods.watch('step5.serviceType');

    const currentFilteredGenomeTests = (() => {
      if (!currentServiceType) return genomeTests;
      return genomeTests.filter(test => {
        const serviceName = test.service?.name?.toLowerCase();
        return serviceName === currentServiceType.toLowerCase();
      });
    })();

    return (
      <View className="bg-white rounded-3xl border border-slate-200 p-4">
        <FormSelect
          name="step3.genomeTestId"
          label="Xét nghiệm"
          required
          options={currentFilteredGenomeTests}
          getLabel={t => t.testName}
          getValue={t => t.testId}
          placeholder="Lựa chọn"
          modalTitle={`Chọn xét nghiệm${
            currentServiceType && currentFilteredGenomeTests.length > 0
              ? ` (${currentFilteredGenomeTests.length} xét nghiệm)`
              : genomeTests.length > 0
                ? ` (${genomeTests.length} xét nghiệm)`
                : ''
          }`}
        />

        {testName && (
          <>
            <View className="h-px bg-slate-100 my-2" />
            <FormReadOnly label="Tên xét nghiệm" value={testName} />
            <FormReadOnly label="Mẫu xét nghiệm" value={methods.watch('step3.testSample') || ''} />
            <FormReadOnly
              label="Nội dung xét nghiệm"
              value={methods.watch('step3.testContent') || ''}
            />
          </>
        )}
      </View>
    );
  };

  const renderStep4 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormFieldGroup>
        <FormNumericInput
          name="step4.patientHeight"
          label="Chiều cao (cm)"
          type="decimal"
          placeholder="VD: 165"
        />
        <FormNumericInput
          name="step4.patientWeight"
          label="Cân nặng (kg)"
          type="decimal"
          placeholder="VD: 60"
        />
      </FormFieldGroup>

      <FormTextarea
        name="step4.patientHistory"
        label="Tiền sử bệnh nhân"
        placeholder="Nhập tiền sử bệnh nhân"
        minHeight={110}
      />

      <FormTextarea
        name="step4.familyHistory"
        label="Tiền sử gia đình"
        placeholder="Nhập tiền sử gia đình"
        minHeight={110}
      />

      <FormTextarea
        name="step4.toxicExposure"
        label="Tiếp xúc độc tố"
        placeholder="Nhập thông tin tiếp xúc độc tố"
        minHeight={90}
      />

      <FormTextarea
        name="step4.medicalHistory"
        label="Tiền sử y tế"
        placeholder="Nhập tiền sử y tế"
        minHeight={110}
      />

      <FormTextarea
        name="step4.chronicDisease"
        label="Bệnh mãn tính"
        placeholder="Nhập bệnh mãn tính"
        minHeight={90}
      />

      <FormTextarea
        name="step4.acuteDisease"
        label="Bệnh cấp tính"
        placeholder="Nhập bệnh cấp tính"
        minHeight={90}
      />

      <FormTextarea
        name="step4.medicalUsing"
        label="Thuốc đang sử dụng"
        placeholder="Nhập thuốc đang sử dụng"
        minHeight={90}
      />
    </View>
  );

  const renderStep5 = () => {
    const selectedServiceType = methods.watch('step5.serviceType');

    return (
      <View className="bg-white rounded-3xl border border-slate-200 p-4">
        <FormSelect
          name="step5.serviceType"
          label="Nhóm xét nghiệm"
          required
          options={serviceOptions}
          getLabel={o => o.label}
          getValue={o => o.value}
          placeholder="Lựa chọn"
          modalTitle="Chọn nhóm xét nghiệm"
        />

        {selectedServiceType === 'reproduction' && (
          <>
            <View className="h-px bg-slate-100 my-3" />
            <Text className="text-[14px] font-extrabold text-slate-900 mb-3">
              Thông tin nhóm Sản
            </Text>
            <FormFieldGroup>
              <FormNumericInput
                name="step3.fetusesNumber"
                label="Số thai"
                type="integer"
                placeholder="VD: 1"
              />
              <FormNumericInput
                name="step3.fetusesWeek"
                label="Tuần thai"
                type="integer"
                placeholder="VD: 12"
              />
            </FormFieldGroup>
            <FormNumericInput
              name="step3.fetusesDay"
              label="Ngày thai"
              type="integer"
              placeholder="VD: 3"
            />
            <FormInput name="step3.ultrasoundDay" label="Ngày siêu âm" placeholder="YYYY-MM-DD" />
            <FormFieldGroup>
              <FormNumericInput
                name="step3.headRumpLength"
                label="Chiều dài đầu mông (mm)"
                type="decimal"
                placeholder="VD: 50.5"
              />
              <FormNumericInput
                name="step3.neckLength"
                label="Chiều dài cổ (mm)"
                type="decimal"
                placeholder="VD: 2.5"
              />
            </FormFieldGroup>
            <FormTextarea
              name="step3.combinedTestResult"
              label="Kết quả xét nghiệm kết hợp"
              placeholder="Nhập kết quả"
              minHeight={90}
            />
            <FormTextarea
              name="step3.ultrasoundResult"
              label="Kết quả siêu âm"
              placeholder="Nhập kết quả"
              minHeight={90}
            />
          </>
        )}

        {selectedServiceType === 'embryo' && (
          <>
            <View className="h-px bg-slate-100 my-3" />
            <Text className="text-[14px] font-extrabold text-slate-900 mb-3">
              Thông tin nhóm Phôi
            </Text>
            <FormInput name="step3.biospy" label="Sinh thiết" placeholder="Nhập thông tin sinh thiết" />
            <FormInput name="step3.biospyDate" label="Ngày sinh thiết" placeholder="YYYY-MM-DD" />
            <FormInput
              name="step3.cellContainingSolution"
              label="Dung dịch chứa tế bào"
              placeholder="Nhập dung dịch"
            />
            <FormNumericInput
              name="step3.embryoCreate"
              label="Số phôi tạo"
              type="integer"
              placeholder="VD: 5"
            />
            <FormInput name="step3.embryoStatus" label="Trạng thái phôi" placeholder="Nhập trạng thái" />
            <FormTextarea
              name="step3.morphologicalAssessment"
              label="Đánh giá hình thái"
              placeholder="Nhập đánh giá"
              minHeight={90}
            />
            <FormSelect
              name="step3.cellNucleus"
              label="Nhân tế bào"
              options={[
                { value: true, label: 'Có' },
                { value: false, label: 'Không' },
              ]}
              getLabel={o => o.label}
              getValue={o => o.value}
              placeholder="Lựa chọn"
              modalTitle="Chọn nhân tế bào"
            />
            <FormInput name="step3.negativeControl" label="Đối chứng âm" placeholder="Nhập đối chứng" />
          </>
        )}

        {selectedServiceType === 'disease' && (
          <>
            <View className="h-px bg-slate-100 my-3" />
            <Text className="text-[14px] font-extrabold text-slate-900 mb-3">
              Thông tin nhóm Bệnh lý
            </Text>
            <FormTextarea name="step3.symptom" label="Triệu chứng" placeholder="Nhập triệu chứng" minHeight={90} />
            <FormTextarea name="step3.diagnose" label="Chẩn đoán" placeholder="Nhập chẩn đoán" minHeight={90} />
            <FormInput name="step3.diagnoseImage" label="Ảnh chẩn đoán" placeholder="Nhập đường dẫn ảnh" />
            <FormInput name="step3.testRelated" label="Xét nghiệm liên quan" placeholder="Nhập xét nghiệm" />
            <FormTextarea
              name="step3.treatmentMethods"
              label="Phương pháp điều trị"
              placeholder="Nhập phương pháp"
              minHeight={90}
            />
            <FormNumericInput
              name="step3.treatmentTimeDay"
              label="Thời gian điều trị (ngày)"
              type="integer"
              placeholder="VD: 7"
            />
            <FormInput name="step3.drugResistance" label="Kháng thuốc" placeholder="Nhập thông tin kháng thuốc" />
            <FormInput name="step3.relapse" label="Tái phát" placeholder="Nhập thông tin tái phát" />
          </>
        )}

        {selectedServiceType && (
          <FormInfoBox>Vui lòng điền đầy đủ thông tin cho nhóm xét nghiệm đã chọn.</FormInfoBox>
        )}
      </View>
    );
  };

  const renderStep6 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormFieldGroup>
        <FormNumericInput
          name="step6.paymentAmount"
          label="Số tiền thanh toán (VNĐ)"
          type="integer"
          placeholder="Nhập số tiền"
        />
        <FormSelect
          name="step6.paymentType"
          label="Hình thức thanh toán"
          required
          options={PAYMENT_TYPE_OPTIONS}
          getLabel={o => o.label}
          getValue={o => o.value}
          placeholder="Tiền mặt"
          modalTitle="Chọn hình thức thanh toán"
        />
      </FormFieldGroup>

      <FormInput name="step6.samplingSite" label="Địa điểm lấy mẫu" placeholder="Nhập địa điểm lấy mẫu" />

      <FormFieldGroup>
        <FormInput name="step6.sampleCollectDate" label="Ngày lấy mẫu" placeholder="YYYY-MM-DD" />
        <FormNumericInput
          name="step6.embryoNumber"
          label="Số phôi (nếu có)"
          type="integer"
          placeholder="VD: 2"
        />
      </FormFieldGroup>

      <FormInput
        name="step6.specifyVoteImagePath"
        label="Đường dẫn ảnh phiếu chỉ định"
        placeholder="Nhập đường dẫn ảnh (nếu có)"
      />
    </View>
  );

  const renderStep7 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormInfoBox>Cập nhật kết quả xét nghiệm di truyền cho đơn hàng này.</FormInfoBox>

      <FormTextarea
        name="step7.geneticTestResults"
        label="Kết quả xét nghiệm di truyền"
        placeholder="Nhập kết quả"
        minHeight={120}
      />

      <FormInput
        name="step7.geneticTestResultsRelationship"
        label="Mối quan hệ"
        placeholder="Nhập mối quan hệ"
      />

      <View className="h-px bg-slate-100 my-4" />

      <FormTextarea
        name="step7.orderNote"
        label="Ghi chú đơn hàng"
        placeholder="Nhập ghi chú cho đơn hàng (nếu có)"
        minHeight={120}
        maxLength={500}
      />
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
        return (
          <View className="bg-white rounded-3xl border border-slate-200 p-8 items-center">
            <Text className="text-sm font-bold text-slate-500">Bước {currentStep}</Text>
          </View>
        );
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
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <View className="pb-4 px-5 bg-white border-b border-slate-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleBack}
              className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-100 items-center justify-center"
              activeOpacity={0.75}
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
            >
              <Text className="text-sm font-extrabold text-slate-700">Xong</Text>
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

            <View className="px-3 py-1.5 rounded-2xl bg-cyan-50 border border-cyan-100">
              <Text className="text-sm font-extrabold text-cyan-700">{currentStep}</Text>
            </View>
          </View>

          <Stepper totalSteps={TOTAL_STEPS} currentStep={currentStep} onStepPress={s => setCurrentStep(s)} />
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

        <View
          pointerEvents="box-none"
          style={{
            position: isWeb ? 'fixed' : 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              padding: 16,
              paddingBottom: Math.max(16, insets.bottom),
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
              onPress={handleBack}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#334155' }}>
                {currentStep === 1 ? 'Huỷ' : 'Quay lại'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSubmitting ? '#22D3EE' : '#0891B2',
              }}
              onPress={handleNext}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '800', color: 'white' }}>
                  {currentStep === TOTAL_STEPS ? 'Hoàn thành' : 'Tiếp theo'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

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

                <Text className="mt-4 text-[16px] font-extrabold text-slate-900">
                  Cập nhật thành công
                </Text>
                <Text className="mt-2 text-[12px] font-bold text-slate-500 text-center leading-5">
                  Đơn hàng đã được cập nhật. Bạn có thể xem trong danh sách đơn hàng.
                </Text>
              </View>

              <View className="flex-row p-4 gap-3 border-t border-slate-200 bg-slate-50">
                <TouchableOpacity
                  className="flex-1 h-12 rounded-2xl items-center justify-center bg-white border border-slate-200"
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push('/orders');
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
