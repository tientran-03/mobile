import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import React, { useState, useMemo, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  StatusBar,
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
  orderFormSchema,
  defaultOrderFormValues,
  PaymentType,
  OrderStatus,
  PaymentStatus,
  BarcodeStatus,
  StaffPosition,
  SpecifyStatus,
  type OrderFormData,
} from '@/lib/schemas/order-form-schema';
import { getApiResponseData } from '@/lib/types/api-types';
import { barcodeService, type BarcodeResponse } from '@/services/barcodeService';
import { doctorService, type DoctorResponse } from '@/services/doctorService';
import { genomeTestService, type GenomeTestResponse } from '@/services/genomeTestService';
import { hospitalStaffService, type HospitalStaffResponse } from '@/services/hospitalStaffService';
import { orderService, type OrderResponse } from '@/services/orderService';
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
          width:
            totalSteps <= 1
              ? '0%'
              : `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
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

          const textColor = isDone
            ? 'text-white'
            : isActive
              ? 'text-cyan-700'
              : 'text-slate-500';

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
                  <Text className={`text-[12px] font-extrabold ${textColor}`}>
                    {stepNum}
                  </Text>
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
    // Filter LAB_TECHNICIAN staff - backend uses "lab_technician" (lowercase)
    // StaffPosition.LAB_TECHNICIAN = "lab_technician"
    const filtered = allHospitalStaff.filter(
      s => {
        const position = s.staffPosition;
        return (
          position === StaffPosition.LAB_TECHNICIAN || // "lab_technician"
          position === 'lab_technician' ||
          position === 'LAB_TECHNICIAN' ||
          (typeof position === 'string' && position.toLowerCase() === 'lab_technician')
        );
      }
    );
    console.log('[CreateOrder] Total hospital staff:', allHospitalStaff.length);
    console.log('[CreateOrder] Filtered sampleCollectorList:', filtered.length, 'items');
    if (filtered.length === 0 && allHospitalStaff.length > 0) {
      console.warn('[CreateOrder] No LAB_TECHNICIAN found. Available positions:', 
        [...new Set(allHospitalStaff.map(s => s.staffPosition).filter(Boolean))]);
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


  // Auto-sync staffAnalystId with sampleCollectorId - nhân viên phụ trách = nhân viên thu mẫu
  const sampleCollectorId = watch('sampleCollectorId');
  useEffect(() => {
    if (sampleCollectorId && sampleCollectorId.trim() !== '') {
      // Set staffAnalystId to same value as sampleCollectorId
      const currentStaffAnalystId = getValues('staffAnalystId');
      if (currentStaffAnalystId !== sampleCollectorId) {
        console.log('[CreateOrder] Auto-syncing staffAnalystId with sampleCollectorId:', sampleCollectorId);
        setValue('staffAnalystId', sampleCollectorId, { shouldValidate: true, shouldDirty: true });
      }
    } else {
      // Clear staffAnalystId if sampleCollectorId is cleared
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

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      if (!user?.id) throw new Error('Không tìm thấy thông tin người dùng');

      if (!data.paymentType ) {
        console.error('[CreateOrder] PaymentType is empty or missing:', data.paymentType);
        throw new Error('Vui lòng chọn hình thức thanh toán');
      }

      const paymentTypeValue = data.paymentType as PaymentType;
      if (paymentTypeValue !== PaymentType.CASH && paymentTypeValue !== PaymentType.ONLINE_PAYMENT) {
        console.error('[CreateOrder] Invalid PaymentType:', paymentTypeValue);
        throw new Error('Hình thức thanh toán không hợp lệ');
      }

      const createRequest: any = {
        orderName: data.orderName.trim(),
        customerId: user.id, 
        specifyId: data.specifyId || undefined,
        paymentType: paymentTypeValue,
        orderNote: data.orderNote?.trim() || undefined,
        orderStatus: OrderStatus.INITIATION,
        paymentStatus: PaymentStatus.PENDING,
        ...(data.staffId && { staffId: data.staffId }),
        ...(data.paymentAmount && { paymentAmount: parseFloat(data.paymentAmount as any) }),
        ...(data.staffAnalystId && { staffAnalystId: data.staffAnalystId }),
        ...(data.sampleCollectorId && { sampleCollectorId: data.sampleCollectorId }),
        ...(data.barcodeId && { barcodeId: data.barcodeId }),
        ...(data.specifyVoteTestImagePath && { specifyVoteImagePath: data.specifyVoteTestImagePath }),
      };

      console.log('[CreateOrder] Sending request:', JSON.stringify(createRequest, null, 2));
      console.log('[CreateOrder] Form data staffAnalystId:', data.staffAnalystId);
      console.log('[CreateOrder] Form data sampleCollectorId:', data.sampleCollectorId);
      console.log('[CreateOrder] Form data staffId:', data.staffId);
      console.log('[CreateOrder] Form data barcodeId:', data.barcodeId);

      try {
        const response = await orderService.create(createRequest);
        console.log('[CreateOrder] Response:', JSON.stringify(response, null, 2));
        
        if (!response.success) {
          let errorMessage = response.message || response.error || 'Tạo đơn hàng thất bại';
          if (response.data && Array.isArray(response.data)) {
            const validationErrors = response.data.map((err: any) => {
              if (typeof err === 'object' && err.message) {
                return err.message;
              }
              return String(err);
            }).join('; ');
            if (validationErrors) {
              errorMessage = `${errorMessage}: ${validationErrors}`;
            }
          }
          
          console.error('[CreateOrder] API error:', errorMessage, response);
          throw new Error(errorMessage);
        }
        return response;
      } catch (error: any) {
        console.error('[CreateOrder] Exception:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(error?.message || 'Tạo đơn hàng thất bại');
      }
    },
    onSuccess: response => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });

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
      Alert.alert('Lỗi tạo đơn hàng', error?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
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
        return <Step2SpecifyImage isUploading={isUploadingImage} onImageSelect={handleImageUpload} />;
      case 3:
        return (
          <Step3SpecifyInfo specifyList={specifyList} genomeTests={genomeTests} isEditMode={false} />
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
            router.push('/orders');
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
                    router.push('/orders');
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
                        pathname: '/payment',
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
