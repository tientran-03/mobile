import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Step1BasicOrderInfo,
  Step2SpecifyImage,
  Step3SpecifyInfo,
  Step4ClinicalInfo,
  Step5GeneticResults,
  Step6ServiceType,
  Step7OrderNote,
} from '@/components/order/create-order-steps';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarcodeStatus,
  defaultOrderFormValues,
  orderFormSchema,
  OrderStatus,
  PaymentStatus,
  PaymentType,
  SpecifyStatus,
  StaffPosition,
  type OrderFormData,
} from '@/lib/schemas/order-form-schema';
import { getApiResponseData } from '@/lib/types/api-types';
import { barcodeService, type BarcodeResponse } from '@/services/barcodeService';
import { diseaseService } from '@/services/diseaseService';
import { doctorService, type DoctorResponse } from '@/services/doctorService';
import { embryoService } from '@/services/embryoService';
import { genomeTestService, type GenomeTestResponse } from '@/services/genomeTestService';
import { hospitalStaffService, type HospitalStaffResponse } from '@/services/hospitalStaffService';
import { orderService, type OrderResponse } from '@/services/orderService';
import { patientService } from '@/services/patientService';
import { reproductionService } from '@/services/reproductionService';
import { serviceService, type ServiceResponse } from '@/services/serviceService';
import {
  specifyVoteTestService,
  type SpecifyVoteTestResponse,
} from '@/services/specifyVoteTestService';

const TOTAL_STEPS = 7;
const STEP_TITLES = [
  'Thông tin cơ bản đơn hàng',
  'Hình ảnh phiếu xét nghiệm',
  'Thông tin phiếu xét nghiệm',
  'Thông tin lâm sàng',
  'Kết quả xét nghiệm di truyền',
  'Thông tin nhóm xét nghiệm',
  'Ghi chú đơn hàng',
];
const generatePatientId = () => {
  return `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

export default function CreateOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [manualServiceTypeSet, setManualServiceTypeSet] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<{
    orderId: string;
    orderName: string;
    paymentAmount: number;
    specifyId?: string;
  } | null>(null);

  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onTouched',
    defaultValues: defaultOrderFormValues,
  });

  const { watch, setValue, getValues } = methods;

  const doctorId = watch('doctorId');

  const { data: doctorsResponse, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorService.getAll(),
  });

  const { data: allHospitalStaffResponse, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['hospital-staff'],
    queryFn: () => hospitalStaffService.getAll(),
  });

  const { data: barcodesResponse, isLoading: isLoadingBarcodes } = useQuery({
    queryKey: ['barcodes', BarcodeStatus.CREATED],
    queryFn: () => barcodeService.getByStatus(BarcodeStatus.CREATED),
  });

  const { data: specifyListResponse, isLoading: isLoadingSpecify } = useQuery({
    queryKey: ['specify-vote-tests', SpecifyStatus.INITIATION],
    queryFn: () => specifyVoteTestService.getByStatus(SpecifyStatus.INITIATION),
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
  });

  const { data: genomeTestsResponse, isLoading: isLoadingGenomeTests } = useQuery({
    queryKey: ['genome-tests'],
    queryFn: () => genomeTestService.getAll(),
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceService.getAll(),
  });

  const doctors = useMemo(
    () => getApiResponseData<DoctorResponse>(doctorsResponse) || [],
    [doctorsResponse]
  );
  const allHospitalStaff = useMemo(
    () => getApiResponseData<HospitalStaffResponse>(allHospitalStaffResponse) || [],
    [allHospitalStaffResponse]
  );
  const barcodes = useMemo(
    () => getApiResponseData<BarcodeResponse>(barcodesResponse) || [],
    [barcodesResponse]
  );
  const orders = useMemo(
    () => getApiResponseData<OrderResponse>(ordersResponse) || [],
    [ordersResponse]
  );
  const services = useMemo(
    () => getApiResponseData<ServiceResponse>(servicesResponse) || [],
    [servicesResponse]
  );

  const usedSpecifyIds = useMemo(() => {
    const ids = new Set<string>();
    orders.forEach(order => {
      if (order.specifyId) {
        if (typeof order.specifyId === 'object' && (order.specifyId as any).specifyVoteID) {
          ids.add((order.specifyId as any).specifyVoteID);
        } else if (typeof order.specifyId === 'string') {
          ids.add(order.specifyId);
        }
      }
    });
    return ids;
  }, [orders]);

  const specifyList = useMemo(() => {
    const allSpecifies = getApiResponseData<SpecifyVoteTestResponse>(specifyListResponse) || [];
    return allSpecifies.filter(specify => !usedSpecifyIds.has(specify.specifyVoteID));
  }, [specifyListResponse, usedSpecifyIds]);

  const genomeTests = useMemo(
    () => getApiResponseData<GenomeTestResponse>(genomeTestsResponse) || [],
    [genomeTestsResponse]
  );

  const staffList = useMemo(() => {
    return allHospitalStaff.filter(s => s.staffPosition === StaffPosition.STAFF);
  }, [allHospitalStaff]);

  const sampleCollectorList = useMemo(() => {
    const filtered = allHospitalStaff.filter(s => {
      const position = s.staffPosition;
      return (
        position === StaffPosition.LAB_TECHNICIAN || // "lab_technician"
        position === 'lab_technician' ||
        position === 'LAB_TECHNICIAN' ||
        (typeof position === 'string' && position.toLowerCase() === 'lab_technician')
      );
    });
    console.log('[CreateOrder] Total hospital staff:', allHospitalStaff.length);
    console.log('[CreateOrder] Filtered sampleCollectorList:', filtered.length, 'items');
    if (filtered.length === 0 && allHospitalStaff.length > 0) {
      console.warn('[CreateOrder] No LAB_TECHNICIAN found. Available positions:', [
        ...new Set(allHospitalStaff.map(s => s.staffPosition).filter(Boolean)),
      ]);
    }
    return filtered;
  }, [allHospitalStaff]);

  // Staff analyst list - must be same as sample collector (LAB_TECHNICIAN staff)
  const staffAnalystList = useMemo(() => {
    // Use same list as sampleCollectorList - nhân viên phụ trách = nhân viên thu mẫu
    return sampleCollectorList.map(s => ({
      id: s.staffId,
      name: s.staffName,
      position: s.staffPosition || 'lab_technician',
      type: 'staff' as const,
    }));
  }, [sampleCollectorList]);

  const hospitalName = useMemo(() => {
    const selectedDoctor = doctors.find(d => d.doctorId === doctorId);
    return selectedDoctor?.hospitalName || '';
  }, [doctors, doctorId]);

  useEffect(() => {
    const fetchCurrentUserStaff = async () => {
      if (!user?.id) return;
      try {
        const currentStaff = allHospitalStaff.find((s: any) => s.userId === user.id);
        if (currentStaff && !getValues('staffId')) {
          setValue('staffId', currentStaff.staffId);
        }
      } catch (error) {
        console.error('Failed to fetch current user staff:', error);
      }
    };
    if (allHospitalStaff.length > 0) {
      fetchCurrentUserStaff();
    }
  }, [user?.id, allHospitalStaff, setValue, getValues]);

  const sampleCollectorId = watch('sampleCollectorId');
  useEffect(() => {
    if (sampleCollectorId && sampleCollectorId.trim() !== '') {
      const currentStaffAnalystId = getValues('staffAnalystId');
      if (currentStaffAnalystId !== sampleCollectorId) {
        console.log(
          '[CreateOrder] Auto-syncing staffAnalystId with sampleCollectorId:',
          sampleCollectorId
        );
        setValue('staffAnalystId', sampleCollectorId, { shouldValidate: true, shouldDirty: true });
      }
    } else {
      const currentStaffAnalystId = getValues('staffAnalystId');
      if (currentStaffAnalystId && currentStaffAnalystId.trim() !== '') {
        console.log('[CreateOrder] Clearing staffAnalystId because sampleCollectorId is empty');
        setValue('staffAnalystId', '', { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [sampleCollectorId, setValue, getValues]);

  const specifyId = watch('specifyId');
  useEffect(() => {
    if (!specifyId) return;

    const selectedSpecify = specifyList.find(s => s.specifyVoteID === specifyId);
    if (!selectedSpecify) return;

    const patient = (selectedSpecify as any).patient;
    if (patient) {
      setValue('patientPhone', patient.patientPhone || '');
      setValue('patientName', patient.patientName || '');
      setValue('patientDob', patient.patientDob ? String(patient.patientDob).split('T')[0] : '');
      setValue('patientGender', patient.gender || '');
      setValue('patientEmail', patient.patientEmail || '');
      setValue('patientJob', patient.patientJob || '');
      setValue('patientContactName', patient.patientContactName || '');
      setValue('patientContactPhone', patient.patientContactPhone || '');
      setValue('patientAddress', patient.patientAddress || '');
    }

    if ((selectedSpecify as any).genomeTest) {
      setValue('genomeTestId', (selectedSpecify as any).genomeTestId || '');
      setValue('testName', (selectedSpecify as any).genomeTest.testName || '');
      setValue('testContent', (selectedSpecify as any).genomeTest.testDescription || '');
      setValue('testSample', ((selectedSpecify as any).genomeTest.testSample || []).join(', '));
    }

    setValue('samplingSite', (selectedSpecify as any).samplingSite || '');
    setValue(
      'sampleCollectDate',
      (selectedSpecify as any).sampleCollectDate
        ? new Date((selectedSpecify as any).sampleCollectDate).toISOString().slice(0, 16)
        : ''
    );
    setValue('embryoNumber', (selectedSpecify as any).embryoNumber?.toString() || '');

    setValue('geneticTestResults', (selectedSpecify as any).geneticTestResults || '');
    setValue(
      'geneticTestResultsRelationship',
      (selectedSpecify as any).geneticTestResultsRelationship || ''
    );

    if ((selectedSpecify as any).serviceType && !manualServiceTypeSet) {
      const sType = String((selectedSpecify as any).serviceType).toLowerCase();
      if (sType === 'reproduction' || sType === 'embryo' || sType === 'disease') {
        setValue('serviceType', sType as any);
      }
    }
  }, [specifyId, specifyList, setValue, manualServiceTypeSet]);

  const genomeTestId = watch('genomeTestId');
  useEffect(() => {
    if (!genomeTestId) return;
    const selectedTest = genomeTests.find(t => t.testId === genomeTestId);
    if (selectedTest) {
      setValue('testName', selectedTest.testName || '');
      setValue('testContent', selectedTest.testDescription || '');
      setValue('testSample', (selectedTest.testSample || []).join(', '));
    }
  }, [genomeTestId, genomeTests, setValue]);

  // Helper function to get serviceId from serviceType
  const getServiceId = (serviceType?: string): string | undefined => {
    if (!serviceType || !services.length) return undefined;
    const service = services.find(
      s =>
        s.name?.toLowerCase() === serviceType.toLowerCase() ||
        s.serviceId?.toLowerCase() === serviceType.toLowerCase()
    );
    return service?.serviceId || serviceType;
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      if (!user?.id) throw new Error('Không tìm thấy thông tin người dùng');

      if (!data.paymentType) {
        console.error('[CreateOrder] PaymentType is empty or missing:', data.paymentType);
        throw new Error('Vui lòng chọn hình thức thanh toán');
      }

      const paymentTypeValue = data.paymentType as PaymentType;
      if (
        paymentTypeValue !== PaymentType.CASH &&
        paymentTypeValue !== PaymentType.ONLINE_PAYMENT
      ) {
        console.error('[CreateOrder] Invalid PaymentType:', paymentTypeValue);
        throw new Error('Hình thức thanh toán không hợp lệ');
      }

      let finalSpecifyId = data.specifyId;

      if (!finalSpecifyId && data.patientName?.trim() && data.patientPhone?.trim()) {
        console.log('[CreateOrder] Creating new patient and specify...');

        if (!data.serviceType || !data.genomeTestId) {
          throw new Error('Vui lòng chọn loại xét nghiệm và mã xét nghiệm để tạo bệnh nhân mới');
        }

        const patientRequest: any = {
          patientId: generatePatientId(),
          patientPhone: data.patientPhone.trim(),
          patientName: data.patientName.trim(),
          patientDob: data.patientDob ? new Date(data.patientDob).toISOString() : undefined,
          gender: data.patientGender?.toLowerCase() || undefined,
          patientEmail: data.patientEmail?.trim() || undefined,
          patientJob: data.patientJob?.trim() || undefined,
          patientContactName: data.patientContactName?.trim() || undefined,
          patientContactPhone: data.patientContactPhone?.trim() || undefined,
          patientAddress: data.patientAddress?.trim() || undefined,
          hospitalId: user.hospitalId || undefined,
        };

        console.log('[CreateOrder] Creating patient:', JSON.stringify(patientRequest, null, 2));
        const patientRes = await patientService.create(patientRequest);

        if (!patientRes.success) {
          throw new Error(patientRes.error || patientRes.message || 'Không thể tạo bệnh nhân');
        }

        const finalPatientId = patientRes.data?.patientId || patientRequest.patientId;
        console.log('[CreateOrder] Patient created with ID:', finalPatientId);

        const serviceId = getServiceId(data.serviceType);
        if (!serviceId) {
          throw new Error('Không tìm thấy dịch vụ tương ứng với loại xét nghiệm');
        }

        if (data.serviceType === 'reproduction') {
          const reproductionRequest: any = {
            serviceId,
            patientId: finalPatientId,
            fetusesNumber: data.fetusesNumber ? parseInt(data.fetusesNumber) : undefined,
            fetusesWeek: data.fetusesWeek ? parseInt(data.fetusesWeek) : undefined,
            fetusesDay: data.fetusesDay ? parseInt(data.fetusesDay) : undefined,
            ultrasoundDay: data.ultrasoundDay || undefined,
            headRumpLength: data.headRumpLength ? parseFloat(data.headRumpLength) : undefined,
            neckLength: data.neckLength ? parseFloat(data.neckLength) : undefined,
            combinedTestResult: data.combinedTestResult || undefined,
            ultrasoundResult: data.ultrasoundResult || undefined,
          };
          await reproductionService.create(reproductionRequest);
        } else if (data.serviceType === 'embryo') {
          const embryoRequest: any = {
            serviceId,
            patientId: finalPatientId,
            biospy: data.biospy || undefined,
            biospyDate: data.biospyDate || undefined,
            cellContainingSolution: data.cellContainingSolution || undefined,
            embryoCreate: data.embryoCreate ? parseInt(data.embryoCreate) : undefined,
            embryoStatus: data.embryoStatus || undefined,
            morphologicalAssessment: data.morphologicalAssessment || undefined,
            cellNucleus: data.cellNucleus || false,
            negativeControl: data.negativeControl || undefined,
          };
          await embryoService.create(embryoRequest);
        } else if (data.serviceType === 'disease') {
          const diseaseRequest: any = {
            serviceId,
            patientId: finalPatientId,
            symptom: data.symptom || undefined,
            diagnose: data.diagnose || undefined,
            testRelated: data.testRelated || undefined,
            treatmentMethods: data.treatmentMethods || undefined,
            treatmentTimeDay: data.treatmentTimeDay ? parseInt(data.treatmentTimeDay) : undefined,
            drugResistance: data.drugResistance || undefined,
            relapse: data.relapse || undefined,
          };
          await diseaseService.create(diseaseRequest);
        }

        const specifyRequest: any = {
          serviceId,
          patientId: finalPatientId,
          genomeTestId: data.genomeTestId,
          embryoNumber: data.embryoNumber ? parseInt(data.embryoNumber) : undefined,
          hospitalId: user.hospitalId || undefined,
          doctorId: data.doctorId || undefined,
          samplingSite: data.samplingSite?.trim() || undefined,
          sampleCollectDate: data.sampleCollectDate
            ? new Date(data.sampleCollectDate).toISOString()
            : undefined,
          geneticTestResults: data.geneticTestResults?.trim() || undefined,
          geneticTestResultsRelationship: data.geneticTestResultsRelationship?.trim() || undefined,
          specifyNote: data.orderNote?.trim() || undefined,
          sendEmailPatient: false,
        };

        console.log('[CreateOrder] Creating specify:', JSON.stringify(specifyRequest, null, 2));
        const specifyRes = await specifyVoteTestService.create(specifyRequest);

        if (!specifyRes.success) {
          throw new Error(specifyRes.error || specifyRes.message || 'Không thể tạo phiếu chỉ định');
        }

        finalSpecifyId = specifyRes.data?.specifyVoteID;
        if (finalSpecifyId && data.sendEmailToPatient && data.patientEmail?.trim()) {
          try {
            console.log(
              '[CreateOrder] Updating specify to enable email sending BEFORE creating order:',
              finalSpecifyId
            );
            const specifyDetail = await specifyVoteTestService.getById(finalSpecifyId);
            if (specifyDetail.success && specifyDetail.data) {
              const specify = specifyDetail.data;
              if (!specify.sendEmailPatient) {
                const updateRequest: any = {
                  serviceId: specify.serviceID || '',
                  patientId: specify.patientId || '',
                  genomeTestId: specify.genomeTestId || '',
                  embryoNumber: specify.embryoNumber || undefined,
                  hospitalId: specify.hospitalId || undefined,
                  doctorId: specify.doctorId || undefined,
                  samplingSite: specify.samplingSite || undefined,
                  sampleCollectDate: specify.sampleCollectDate || undefined,
                  geneticTestResults: specify.geneticTestResults || undefined,
                  geneticTestResultsRelationship:
                    specify.geneticTestResultsRelationship || undefined,
                  specifyNote: specify.specifyNote || undefined,
                  sendEmailPatient: true,
                };
                await specifyVoteTestService.update(finalSpecifyId, updateRequest);
                console.log('[CreateOrder] Specify updated to enable email sending');
              } else {
                console.log('[CreateOrder] Specify already has sendEmailPatient = true');
              }
            }
          } catch (updateError) {
            console.error('[CreateOrder] Failed to update specify for email sending:', updateError);
          }
        }
        console.log('[CreateOrder] Specify created with ID:', finalSpecifyId);
      }

      const createRequest: any = {
        orderName: data.orderName.trim(),
        ...(user.role === 'ROLE_CUSTOMER' && { customerId: user.id }),
        specifyId: finalSpecifyId || undefined,
        paymentType: paymentTypeValue,
        orderNote: data.orderNote?.trim() || undefined,
        orderStatus: OrderStatus.INITIATION,
        paymentStatus: PaymentStatus.PENDING,
        ...(data.staffId && { staffId: data.staffId }),
        ...(data.paymentAmount && { paymentAmount: parseFloat(data.paymentAmount as any) }),
        ...(data.staffAnalystId && { staffAnalystId: data.staffAnalystId }),
        ...(data.sampleCollectorId && { sampleCollectorId: data.sampleCollectorId }),
        ...(data.barcodeId && { barcodeId: data.barcodeId }),
        ...(data.specifyVoteTestImagePath && {
          specifyVoteImagePath: data.specifyVoteTestImagePath,
        }),
      };

      console.log('[CreateOrder] Creating order:', JSON.stringify(createRequest, null, 2));

      try {
        const response = await orderService.create(createRequest);
        console.log('[CreateOrder] Order creation response:', JSON.stringify(response, null, 2));

        if (!response.success) {
          let errorMessage = response.message || response.error || 'Tạo đơn hàng thất bại';
          if (response.data && Array.isArray(response.data)) {
            const validationErrors = response.data
              .map((err: any) => {
                if (typeof err === 'object' && err.message) {
                  return err.message;
                }
                return String(err);
              })
              .join('; ');
            if (validationErrors) {
              errorMessage = `${errorMessage}: ${validationErrors}`;
            }
          }

          console.error('[CreateOrder] API error:', errorMessage, response);
          throw new Error(errorMessage);
        }

        if (data.sendZaloToPatient && data.patientPhone?.trim()) {
          console.log('[CreateOrder] Zalo notification requested');
          console.log('[CreateOrder] Patient phone:', data.patientPhone);
        }

        return response;
      } catch (error: any) {
        console.error('[CreateOrder] Exception:', error);
        let errorMessage = 'Tạo đơn hàng thất bại';

        if (error instanceof Error) {
          errorMessage = error.message;
          if (
            errorMessage.includes('already used') ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('uk66b7ribqen473vde5ay62u050')
          ) {
            errorMessage =
              'Phiếu chỉ định này đã được sử dụng cho một đơn hàng khác. Vui lòng chọn phiếu chỉ định khác hoặc tạo phiếu chỉ định mới.';
          }
          errorMessage = error.message;
          if (
            errorMessage.includes('already used') ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('uk66b7ribqen473vde5ay62u050')
          ) {
            errorMessage =
              'Phiếu chỉ định này đã được sử dụng cho một đơn hàng khác. Vui lòng chọn phiếu chỉ định khác hoặc tạo phiếu chỉ định mới.';
          }
        }

        throw new Error(errorMessage);
      }
    },
    onSuccess: response => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['specify-vote-tests'] });

      if (response.data) {
        const orderData = response.data as any;
        const formData = getValues();
        const paymentAmount =
          typeof (formData as any).paymentAmount === 'string'
            ? parseFloat((formData as any).paymentAmount) || 0
            : (formData as any).paymentAmount || 0;

        setCreatedOrderData({
          orderId: orderData.orderId,
          orderName: orderData.orderName || (formData as any).orderName,
          paymentAmount,
          specifyId: (formData as any).specifyId,
        });
      }

      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      Alert.alert(
        'Lỗi tạo đơn hàng',
        error?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.'
      );
    },
  });

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1: {
        const orderName = getValues('orderName');
        const paymentType = getValues('paymentType');

        if (!orderName || !orderName.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
          return false;
        }

        if (!paymentType) {
          Alert.alert('Lỗi', 'Vui lòng chọn hình thức thanh toán');
          return false;
        }

        return true;
      }
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (currentStep === TOTAL_STEPS) {
      handleSubmit();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = async () => {
    const orderName = getValues('orderName');
    const paymentType = getValues('paymentType');

    if (!orderName || !orderName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
      setCurrentStep(1);
      return;
    }

    if (!paymentType) {
      Alert.alert('Lỗi', 'Vui lòng chọn hình thức thanh toán');
      setCurrentStep(1);
      return;
    }

    if (!user?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = getValues();
      await createOrderMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (uri: string): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      return uri;
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại.');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicOrderInfo
            doctors={doctors}
            staffList={staffList}
            staffAnalystList={staffAnalystList}
            sampleCollectorList={sampleCollectorList}
            barcodes={barcodes}
            hospitalName={hospitalName}
            isEditMode={false}
          />
        );
      case 2:
        return (
          <Step2SpecifyImage isUploading={isUploadingImage} onImageSelect={handleImageUpload} />
        );
      case 3:
        return (
          <Step3SpecifyInfo
            specifyList={specifyList}
            genomeTests={genomeTests}
            isEditMode={false}
          />
        );
      case 4:
        return <Step4ClinicalInfo isEditMode={false} />;
      case 5:
        return <Step5GeneticResults />;
      case 6:
        return (
          <Step6ServiceType
            isEditMode={false}
            onManualServiceTypeSet={() => setManualServiceTypeSet(true)}
          />
        );
      case 7:
        return <Step7OrderNote />;
      default:
        return null;
    }
  };

  const isLoading =
    isLoadingDoctors ||
    isLoadingStaff ||
    isLoadingBarcodes ||
    isLoadingSpecify ||
    isLoadingGenomeTests;

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0891B2" />
        <Text className="mt-4 text-slate-600">Đang tải dữ liệu...</Text>
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
                Thêm đơn hàng
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

          <Stepper
            totalSteps={TOTAL_STEPS}
            currentStep={currentStep}
            onStepPress={step => setCurrentStep(step)}
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 110 + insets.bottom }}
        >
          {renderCurrentStep()}
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
              {currentStep === 1 ? 'Huỷ' : 'Quay lại'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 h-12 rounded-2xl items-center justify-center ${
              isSubmitting ? 'bg-cyan-400' : 'bg-cyan-600'
            }`}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-[15px] font-extrabold text-white">
                {currentStep === TOTAL_STEPS ? 'Hoàn thành' : 'Tiếp theo'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowSuccessModal(false);
            router.push('/staff/orders');
          }}
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-5">
            <View className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden border border-slate-200">
              <View className="items-center p-6">
                <View className="w-16 h-16 rounded-2xl bg-emerald-500/12 border border-emerald-200 items-center justify-center">
                  <Check size={30} color="#22C55E" strokeWidth={3} />
                </View>

                <Text className="mt-4 text-[16px] font-extrabold text-slate-900">
                  Tạo đơn thành công
                </Text>
                <Text className="mt-2 text-[12px] font-bold text-slate-500 text-center leading-5">
                  Đơn hàng đã được lưu. Bạn có thể xem trong danh sách đơn hàng.
                </Text>
              </View>

              <View className="flex-row p-4 gap-3 border-t border-slate-200 bg-slate-50">
                <TouchableOpacity
                  className="flex-1 h-12 rounded-2xl items-center justify-center bg-white border border-slate-200"
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push('/staff/orders');
                  }}
                  activeOpacity={0.85}
                >
                  <Text className="text-[14px] font-extrabold text-slate-700">Xem danh sách</Text>
                </TouchableOpacity>

                {createdOrderData && createdOrderData.paymentAmount > 0 && (
                  <TouchableOpacity
                    className="flex-1 h-12 rounded-2xl items-center justify-center bg-emerald-600"
                    onPress={() => {
                      setShowSuccessModal(false);
                      router.push({
                        pathname: '/staff/payment',
                        params: {
                          orderId: createdOrderData.orderId,
                          orderName: createdOrderData.orderName,
                          amount: createdOrderData.paymentAmount.toString(),
                          specifyId: createdOrderData.specifyId || '',
                        },
                      });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text className="text-[14px] font-extrabold text-white">Thanh toán</Text>
                  </TouchableOpacity>
                )}

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
