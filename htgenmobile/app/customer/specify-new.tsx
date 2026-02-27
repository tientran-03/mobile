import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuccessModal } from '@/components/modals';
import {
  Step1Patient,
  Step2Clinical,
  Step3ServiceTest,
  Step4GeneticResults,
  Step5ServiceType,
  Step6Note,
} from '@/components/specify/create-specify-steps';
import { useAuth } from '@/contexts/AuthContext';
import {
  specifyFormDefaultValues,
  specifyFormSchema,
  type SpecifyFormData,
} from '@/lib/schemas/specify-form-schema';
import { getApiResponseData } from '@/lib/types/api-types';
import { doctorService, type DoctorResponse } from '@/services/doctorService';
import { genomeTestService, type GenomeTestResponse } from '@/services/genomeTestService';
import { patientClinicalService } from '@/services/patientClinicalService';
import type { PatientResponse } from '@/services/patientService';
import { patientService } from '@/services/patientService';
import { serviceEntityService } from '@/services/serviceEntityService';
import {
  specifyVoteTestService,
  type SpecifyVoteTestRequest,
} from '@/services/specifyVoteTestService';

const TOTAL_STEPS = 6;
const STEP_TITLES = [
  'Thông tin bệnh nhân',
  'Thông tin lâm sàng',
  'Loại dịch vụ & Xét nghiệm',
  'Kết quả xét nghiệm di truyền',
  'Thông tin nhóm xét nghiệm',
  'Ghi chú',
];

const generatePatientId = () => `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
          width: totalSteps <= 1 ? '0%' : `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
        }}
      />
      <View className="flex-row items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const circleBg = isDone ? 'bg-sky-600' : 'bg-white';
          const circleBorder = isDone
            ? 'border-sky-600'
            : isActive
              ? 'border-sky-600'
              : 'border-slate-300';
          const textColor = isDone ? 'text-white' : isActive ? 'text-sky-700' : 'text-slate-500';

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

export default function SpecifyNewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSpecifyId, setCreatedSpecifyId] = useState<string | null>(null);

  const hospitalId = user?.hospitalId != null ? String(user.hospitalId) : '';

  const methods = useForm<SpecifyFormData>({
    resolver: zodResolver(specifyFormSchema),
    mode: 'onTouched',
    defaultValues: specifyFormDefaultValues,
  });

  const { getValues, setValue } = methods;

  React.useEffect(() => {
    if (hospitalId) setValue('hospitalId', hospitalId);
  }, [hospitalId, setValue]);

  const { data: patientsResponse } = useQuery({
    queryKey: ['patients', hospitalId],
    queryFn: () =>
      hospitalId && hospitalId.trim()
        ? patientService.getByHospitalId(hospitalId.trim())
        : patientService.getAll({ size: 500 }),
    enabled: true,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceEntityService.getAll(),
  });

  const { data: doctorsResponse } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorService.getAll(),
  });

  const serviceId = methods.watch('serviceId');
  const { data: genomeTestsResponse } = useQuery({
    queryKey: ['genome-tests', serviceId],
    queryFn: () => genomeTestService.getByServiceId(serviceId!),
    enabled: !!serviceId,
  });

  const patients = useMemo(
    () => getApiResponseData<PatientResponse>(patientsResponse) || [],
    [patientsResponse]
  );
  const services = useMemo(() => getApiResponseData(servicesResponse) || [], [servicesResponse]);
  const doctors = useMemo(
    () => getApiResponseData<DoctorResponse>(doctorsResponse) || [],
    [doctorsResponse]
  );
  const genomeTests = useMemo(
    () => getApiResponseData<GenomeTestResponse>(genomeTestsResponse) || [],
    [genomeTestsResponse]
  );

  const createSpecifyMutation = useMutation({
    mutationFn: async (formData: SpecifyFormData) => {
      let patientId = formData.selectedPatientId;

      if (formData.isNewPatient) {
        const patientPayload = {
          patientId: generatePatientId(),
          patientName: formData.patientName!,
          patientPhone: formData.patientPhone!,
          patientDob: formData.patientDob ? new Date(formData.patientDob).toISOString() : null,
          gender: formData.patientGender || null,
          patientEmail: formData.patientEmail?.trim() || null,
          patientJob: formData.patientJob?.trim() || null,
          patientContactName: formData.patientContactName?.trim() || null,
          patientContactPhone: formData.patientContactPhone?.trim() || null,
          patientAddress: formData.patientAddress?.trim() || null,
        };

        const patientRes = await patientService.create(patientPayload);
        if (!patientRes.success) {
          throw new Error(patientRes.error || patientRes.message || 'Không thể tạo bệnh nhân');
        }
        patientId = (patientRes.data as any)?.patientId ?? patientPayload.patientId;

        const hasClinical =
          formData.patientHeight ||
          formData.patientWeight ||
          formData.patientHistory ||
          formData.familyHistory ||
          formData.chronicDisease ||
          formData.acuteDisease ||
          formData.toxicExposure;

        if (hasClinical) {
          const height =
            formData.patientHeight != null ? Number(formData.patientHeight) : undefined;
          const weight =
            formData.patientWeight != null ? Number(formData.patientWeight) : undefined;

          const ensuredPatientId = patientId ?? '';
          if (!ensuredPatientId) {
            throw new Error('Không xác định được patientId để lưu thông tin lâm sàng');
          }

          await patientClinicalService.create({
            patientId: ensuredPatientId,
            patientHeight: height,
            patientWeight: weight,
            patientHistory: formData.patientHistory?.trim() || undefined,
            familyHistory: formData.familyHistory?.trim() || undefined,
            chronicDisease: formData.chronicDisease?.trim() || undefined,
            acuteDisease: formData.acuteDisease?.trim() || undefined,
            toxicExposure: formData.toxicExposure?.trim() || undefined,
          });
        }
      }

      if (!patientId || !formData.serviceId || !formData.genomeTestId) {
        throw new Error('Thiếu thông tin bắt buộc: bệnh nhân, loại dịch vụ, xét nghiệm');
      }

      const specifyReq: SpecifyVoteTestRequest = {
        serviceId: formData.serviceId,
        patientId,
        genomeTestId: formData.genomeTestId,
        hospitalId: formData.hospitalId || hospitalId || undefined,
        doctorId: formData.doctorId?.trim() || undefined,
        samplingSite: formData.samplingSite?.trim() || undefined,
        sampleCollectDate: formData.sampleCollectDate
          ? new Date(formData.sampleCollectDate).toISOString()
          : undefined,
        embryoNumber:
          formData.embryoNumber != null && formData.embryoNumber !== ''
            ? Number(formData.embryoNumber)
            : undefined,
        geneticTestResults: formData.geneticTestResults?.trim() || undefined,
        geneticTestResultsRelationship:
          formData.geneticTestResultsRelationship?.trim() || undefined,
        specifyNote: formData.specifyNote?.trim() || undefined,
        sendEmailPatient: formData.sendEmailPatient ?? false,
      };

      const specifyRes = await specifyVoteTestService.create(specifyReq);
      if (!specifyRes.success || !specifyRes.data) {
        throw new Error(specifyRes.error || 'Không thể tạo phiếu xét nghiệm');
      }

      return specifyRes.data.specifyVoteID;
    },
    onError: (error: any) => {
      Alert.alert(
        'Lỗi tạo phiếu',
        error?.message || 'Không thể tạo phiếu xét nghiệm. Vui lòng thử lại.'
      );
    },
  });

  const validateStep = (step: number): boolean => {
    const data = getValues();

    switch (step) {
      case 1:
        if (data.isNewPatient) {
          if (!data.patientName?.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập họ tên bệnh nhân');
            return false;
          }
          if (!data.patientPhone?.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
            return false;
          }
        } else {
          if (!data.selectedPatientId) {
            Alert.alert('Lỗi', 'Vui lòng chọn bệnh nhân');
            return false;
          }
        }
        return true;
      case 3:
        if (!data.serviceId) {
          Alert.alert('Lỗi', 'Vui lòng chọn loại dịch vụ');
          return false;
        }
        if (!data.genomeTestId) {
          Alert.alert('Lỗi', 'Vui lòng chọn xét nghiệm');
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
        const specifyId = await createSpecifyMutation.mutateAsync(formData);
        setCreatedSpecifyId(specifyId);
        queryClient.invalidateQueries({ queryKey: ['customer-specifies'] });
        queryClient.invalidateQueries({ queryKey: ['specify-vote-tests'] });
        setShowSuccessModal(true);
      } catch {
        // Error handled in mutation
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(p => Math.min(p + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep(p => Math.max(p - 1, 1));
    }
  };

  const handlePatientSelect = async (patientId: string) => {
    try {
      const clinicalRes = await patientClinicalService.getByPatientId(patientId);
      const clinical = clinicalRes.data;
      if (clinical) {
        setValue(
          'patientClinicalId',
          (clinical as any).id ?? (clinical as any).patientClinicalId ?? ''
        );
        setValue('patientHeight', clinical.patientHeight?.toString() ?? '');
        setValue('patientWeight', clinical.patientWeight?.toString() ?? '');
        setValue('patientHistory', clinical.patientHistory ?? '');
        setValue('familyHistory', clinical.familyHistory ?? '');
        setValue('chronicDisease', clinical.chronicDisease ?? '');
        setValue('acuteDisease', clinical.acuteDisease ?? '');
        setValue('toxicExposure', (clinical as any).toxicExposure ?? '');
        setValue(
          'medicalUsing',
          Array.isArray(clinical.medicalUsing) ? clinical.medicalUsing.join(', ') : ''
        );
      } else {
        setValue('patientClinicalId', '');
        setValue('patientHeight', '');
        setValue('patientWeight', '');
        setValue('patientHistory', '');
        setValue('familyHistory', '');
        setValue('chronicDisease', '');
        setValue('acuteDisease', '');
        setValue('toxicExposure', '');
        setValue('medicalUsing', '');
      }
    } catch {
      setValue('patientClinicalId', '');
      setValue('patientHeight', '');
      setValue('patientWeight', '');
      setValue('patientHistory', '');
      setValue('familyHistory', '');
      setValue('chronicDisease', '');
      setValue('acuteDisease', '');
      setValue('toxicExposure', '');
      setValue('medicalUsing', '');
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

  return (
    <FormProvider {...methods}>
      <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
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
                Thêm phiếu xét nghiệm
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
            onStepPress={s => setCurrentStep(s)}
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
              {currentStep === 1 ? 'Huỷ' : 'Quay lại'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 h-12 rounded-2xl items-center justify-center ${
              isSubmitting ? 'bg-sky-400' : 'bg-sky-600'
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
      </SafeAreaView>

      <SuccessModal
        visible={showSuccessModal}
        title="Tạo phiếu thành công"
        message={`Phiếu xét nghiệm ${createdSpecifyId || ''} đã được tạo thành công.`}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/customer/specifies');
        }}
      />
    </FormProvider>
  );
}
