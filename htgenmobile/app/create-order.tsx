import { zodResolver } from '@hookform/resolvers/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Check, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Alert, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';

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
import { ORDER_STATUS_DEFAULT } from '@/lib/constants/order-status';
import { getApiResponseData } from '@/lib/types/api-types';
import { BarcodeResponse, barcodeService } from '@/services/barcodeService';
import { CustomerResponse, customerService } from '@/services/customerService';
import { DoctorResponse, doctorService } from '@/services/doctorService';
import { GenomeTestResponse, genomeTestService } from '@/services/genomeTestService';
import { HospitalStaffResponse, hospitalStaffService } from '@/services/hospitalStaffService';
import { orderService, type OrderResponse } from '@/services/orderService';
import { patientService, type PatientResponse } from '@/services/patientService';
import { ServiceResponse, serviceService } from '@/services/serviceService';
import { specifyVoteTestService } from '@/services/specifyVoteTestService';
import { reproductionService } from '@/services/reproductionService';
import { embryoService } from '@/services/embryoService';
import { diseaseService } from '@/services/diseaseService';
import {
  patientMetadataService,
  type PatientMetadataResponse,
} from '@/services/patientMetadataService';

const TOTAL_STEPS = 7;
const STEP_TITLES = [
  'Thông tin cơ bản đơn hàng',
  'Thông tin người làm xét nghiệm',
  'Thông tin nhóm xét nghiệm',
  'Thông tin lâm sàng',
  'Thông tin xét nghiệm',
  'Thanh toán & mẫu xét nghiệm',
  'Thông tin Patient Metadata',
];

const toISO = (s?: string) => {
  if (!s || !s.trim()) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
};

export default function CreateOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [hasPreviousOrders, setHasPreviousOrders] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<string[]>([]);
  const [patientMetadataList, setPatientMetadataList] = useState<PatientMetadataResponse[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [showFooter, setShowFooter] = useState(false);

  const methods = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    mode: 'onTouched',
    defaultValues: createOrderDefaultValues,
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

  const { data: patientsResponse } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getAll(),
    retry: false,
  });

  const patients = getApiResponseData<PatientResponse>(patientsResponse);

  const { data: servicesResponse } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceService.getAll(),
    retry: false,
  });

  const doctors = getApiResponseData<DoctorResponse>(doctorsResponse);
  const customers = getApiResponseData<CustomerResponse>(customersResponse);
  const staffs = getApiResponseData<HospitalStaffResponse>(staffResponse);
  const allBarcodes = getApiResponseData<BarcodeResponse>(barcodesResponse);
  const genomeTests = getApiResponseData<GenomeTestResponse>(genomeTestsResponse);
  const services = getApiResponseData<ServiceResponse>(servicesResponse);
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
          uniqueKey: `${service.serviceId}-${index}`, // Always unique key
        });
      }
    });

    return uniqueServices;
  }, [services]);

  useFocusEffect(
    useCallback(() => {
      const checkForNewTest = async () => {
        try {
          const newTestId = await AsyncStorage.getItem('newlyCreatedTestId');
          if (newTestId && genomeTests.length > 0) {
            const newTest = genomeTests.find((t: any) => t.testId === newTestId);
            if (newTest) {
              methods.setValue('step5.genomeTestId', newTestId, {
                shouldDirty: true,
                shouldTouch: true,
              });
              setCurrentStep(5);
              await AsyncStorage.removeItem('newlyCreatedTestId');
            }
          }
        } catch {}
      };
      queryClient.invalidateQueries({ queryKey: ['genome-tests'] });
      setTimeout(checkForNewTest, 300);
    }, [queryClient, genomeTests, methods])
  );

  const usedBarcodeIds = useMemo(() => {
    const used = new Set<string>();
    const orders = getApiResponseData<OrderResponse>(ordersResponse);
    orders.forEach(o => {
      if (o.barcodeId) used.add(String(o.barcodeId).trim());
    });
    return used;
  }, [ordersResponse]);

  const availableBarcodes = useMemo(() => {
    return allBarcodes.filter(b => !usedBarcodeIds.has(String(b.barcode).trim()));
  }, [allBarcodes, usedBarcodeIds]);

  const serviceType = methods.watch('step3.serviceType');
  const filteredGenomeTests = useMemo(() => {
    if (!serviceType) return genomeTests;
    return genomeTests.filter(test => {
      const serviceName = test.service?.name?.toLowerCase();
      return serviceName === serviceType.toLowerCase();
    });
  }, [genomeTests, serviceType]);

  const genomeTestId = methods.watch('step5.genomeTestId');
  useEffect(() => {
    if (!genomeTestId) return;
    const test = genomeTests.find((t: any) => t.testId === genomeTestId);
    if (!test) return;
    methods.setValue('step5.testName', test.testName || '', {
      shouldDirty: true,
      shouldTouch: true,
    });
    methods.setValue(
      'step5.testSample',
      Array.isArray(test.testSample) ? test.testSample.join(', ') : test.testSample || '',
      { shouldDirty: true, shouldTouch: true }
    );
    methods.setValue('step5.testContent', test.testDescription || '', {
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [genomeTestId, genomeTests, methods]);

  const patientPhoneRaw = methods.watch('step2.patientPhone');
  const patientPhone = String(patientPhoneRaw ?? '');

  useEffect(() => {
    const loadPatientInfo = async () => {
      const trimmed = patientPhone.trim();

      if (!trimmed || trimmed.length < 10) {
        setHasPreviousOrders(false);
        return;
      }

      if (currentStep !== 2) return;

      setIsLoadingPatient(true);
      try {
        const phone = trimmed.replace(/[\s\-\(\)]/g, '');
        if (phone.length < 10) {
          setIsLoadingPatient(false);
          return;
        }

        const patientResponse = await patientService.getByPhone(phone);

        if (patientResponse?.error) {
          const err = String(patientResponse.error).toLowerCase();
          if (err.includes('not found') || err.includes('404')) {
            setHasPreviousOrders(false);
            setIsLoadingPatient(false);
            return;
          }
        }

        if (patientResponse?.success && patientResponse?.data) {
          const patient: any = patientResponse.data;

          const patientName = (patient.patientName || patient.name || '').toString();
          if (patientName.trim()) {
            methods.setValue('step2.patientName', patientName.trim(), {
              shouldDirty: true,
              shouldTouch: true,
            });
          }

          const patientDob = patient.patientDob || patient.dateOfBirth;
          if (patientDob) {
            const dob = patientDob instanceof Date ? patientDob : new Date(patientDob);
            if (!isNaN(dob.getTime())) {
              const formattedDob = dob.toISOString().split('T')[0];
              methods.setValue('step2.patientDob', formattedDob, {
                shouldDirty: true,
                shouldTouch: true,
              });
            }
          }

          if (patient.gender) {
            const genderValue = String(patient.gender).toLowerCase();
            if (genderValue === 'male' || genderValue === 'female' || genderValue === 'other') {
              methods.setValue('step2.patientGender', genderValue, {
                shouldDirty: true,
                shouldTouch: true,
              });
            }
          }

          const patientEmail = (patient.patientEmail || patient.email || '').toString();
          if (patientEmail.trim()) {
            methods.setValue('step2.patientEmail', patientEmail.trim(), {
              shouldDirty: true,
              shouldTouch: true,
            });
          }

          const patientJob = (patient.patientJob || '').toString();
          if (patientJob.trim()) {
            methods.setValue('step2.patientJob', patientJob.trim(), {
              shouldDirty: true,
              shouldTouch: true,
            });
          }

          const patientContactName = (patient.patientContactName || '').toString();
          if (patientContactName.trim()) {
            methods.setValue('step2.patientContactName', patientContactName.trim(), {
              shouldDirty: true,
              shouldTouch: true,
            });
          }

          const patientContactPhone = (patient.patientContactPhone || '').toString();
          if (patientContactPhone.trim()) {
            methods.setValue('step2.patientContactPhone', patientContactPhone.trim(), {
              shouldDirty: true,
              shouldTouch: true,
            });
          }

          const patientAddress = (patient.patientAddress || patient.address || '').toString();
          if (patientAddress.trim()) {
            methods.setValue('step2.patientAddress', patientAddress.trim(), {
              shouldDirty: true,
              shouldTouch: true,
            });
          }

          if (patient.patientId) {
            methods.setValue('step2.patientId', String(patient.patientId), {
              shouldDirty: true,
              shouldTouch: true,
            });
            try {
              const prev = await orderService.getByPatientId(patient.patientId);
              if (prev?.success && Array.isArray(prev?.data) && prev.data.length > 0) {
                setHasPreviousOrders(true);
                setAutofilledFields([]);
              } else {
                setHasPreviousOrders(false);
                setAutofilledFields([]);
              }
            } catch {
              setHasPreviousOrders(false);
              setAutofilledFields([]);
            }
          } else {
            setHasPreviousOrders(false);
          }
        } else {
          setHasPreviousOrders(false);
        }
      } catch {
        setHasPreviousOrders(false);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    const timeoutId = setTimeout(loadPatientInfo, 800);
    return () => clearTimeout(timeoutId);
  }, [patientPhone, currentStep, methods]);
  useEffect(() => {
    if (currentStep !== 7) {
      return;
    }

    const formData = methods.getValues();

    const metadataFromSteps: any[] = [];

    if (formData.step2) {
      const patientInfo: any = {};
      if (formData.step2.patientId) patientInfo.patientId = formData.step2.patientId;
      if (formData.step2.patientName) patientInfo.patientName = formData.step2.patientName;
      if (formData.step2.patientPhone) patientInfo.patientPhone = formData.step2.patientPhone;
      if (formData.step2.patientDob) patientInfo.patientDob = formData.step2.patientDob;
      if (formData.step2.patientGender) patientInfo.patientGender = formData.step2.patientGender;
      if (formData.step2.patientEmail) patientInfo.patientEmail = formData.step2.patientEmail;
      if (formData.step2.patientAddress) patientInfo.patientAddress = formData.step2.patientAddress;
      if (Object.keys(patientInfo).length > 0) {
        metadataFromSteps.push({ type: 'Thông tin bệnh nhân', data: patientInfo });
      }
    }

    if (formData.step3) {
      const serviceInfo: any = {};
      if (formData.step3.serviceType) serviceInfo.serviceType = formData.step3.serviceType;
      if (formData.step3.fetusesNumber) serviceInfo.fetusesNumber = formData.step3.fetusesNumber;
      if (formData.step3.fetusesWeek) serviceInfo.fetusesWeek = formData.step3.fetusesWeek;
      if (formData.step3.biospy) serviceInfo.biospy = formData.step3.biospy;
      if (formData.step3.symptom) serviceInfo.symptom = formData.step3.symptom;
      if (formData.step3.diagnose) serviceInfo.diagnose = formData.step3.diagnose;
      if (Object.keys(serviceInfo).length > 0) {
        metadataFromSteps.push({ type: 'Thông tin nhóm xét nghiệm', data: serviceInfo });
      }
    }

    if (formData.step4) {
      const clinicalInfo: any = {};
      if (formData.step4.patientHeight) clinicalInfo.patientHeight = formData.step4.patientHeight;
      if (formData.step4.patientWeight) clinicalInfo.patientWeight = formData.step4.patientWeight;
      if (formData.step4.patientHistory)
        clinicalInfo.patientHistory = formData.step4.patientHistory;
      if (formData.step4.familyHistory) clinicalInfo.familyHistory = formData.step4.familyHistory;
      if (formData.step4.medicalHistory)
        clinicalInfo.medicalHistory = formData.step4.medicalHistory;
      if (Object.keys(clinicalInfo).length > 0) {
        metadataFromSteps.push({ type: 'Thông tin lâm sàng', data: clinicalInfo });
      }
    }

    if (formData.step5) {
      const testInfo: any = {};
      if (formData.step5.testName) testInfo.testName = formData.step5.testName;
      if (formData.step5.testSample) testInfo.testSample = formData.step5.testSample;
      if (formData.step5.testContent) testInfo.testContent = formData.step5.testContent;
      if (Object.keys(testInfo).length > 0) {
        metadataFromSteps.push({ type: 'Thông tin xét nghiệm', data: testInfo });
      }
    }

    if (formData.step6) {
      const sampleInfo: any = {};
      if (formData.step6.samplingSite) sampleInfo.samplingSite = formData.step6.samplingSite;
      if (formData.step6.sampleCollectDate)
        sampleInfo.sampleCollectDate = formData.step6.sampleCollectDate;
      if (formData.step6.embryoNumber) sampleInfo.embryoNumber = formData.step6.embryoNumber;
      if (formData.step6.paymentAmount) sampleInfo.paymentAmount = formData.step6.paymentAmount;
      if (formData.step6.paymentType) sampleInfo.paymentType = formData.step6.paymentType;
      if (Object.keys(sampleInfo).length > 0) {
        metadataFromSteps.push({ type: 'Thông tin thanh toán & mẫu', data: sampleInfo });
      }
    }

    setPatientMetadataList(metadataFromSteps as any);

    if (!methods.getValues('step7.geneticTestResults')) {
      const testContent = formData.step5?.testContent || formData.step5?.testSample || '';
      if (testContent) {
        methods.setValue('step7.geneticTestResults', testContent, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    }

    if (!methods.getValues('step7.geneticTestResultsRelationship')) {
      const testName = formData.step5?.testName || formData.step2?.patientName || '';
      if (testName) {
        methods.setValue('step7.geneticTestResultsRelationship', testName, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    }
  }, [currentStep, methods]);

  const validateStep1 = async () => {
    const fields = [
      'step1.orderName',
      'step1.doctorId',
      'step1.staffAnalystId',
      'step1.sampleCollectorId',
      'step1.barcodeId',
    ];
    const isValid = await methods.trigger(fields as any);
    if (!isValid) {
      const errors = methods.formState.errors;
      if (errors.step1?.orderName) Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
      else if (errors.step1?.doctorId) Alert.alert('Lỗi', 'Vui lòng chọn bác sĩ chỉ định');
      else if (errors.step1?.staffAnalystId)
        Alert.alert('Lỗi', 'Vui lòng chọn nhân viên phụ trách');
      else if (errors.step1?.sampleCollectorId)
        Alert.alert('Lỗi', 'Vui lòng chọn nhân viên thu mẫu');
      else if (errors.step1?.barcodeId) Alert.alert('Lỗi', 'Vui lòng chọn mã Barcode PCĐ');
    }
    return isValid;
  };

  const validateStep2 = async () => {
    const isValid = await methods.trigger([
      'step2.patientName',
      'step2.patientPhone',
      'step2.patientGender',
    ] as any);
    if (!isValid) {
      const errors = methods.formState.errors;
      if (errors.step2?.patientName) Alert.alert('Lỗi', 'Vui lòng nhập tên người làm xét nghiệm');
      else if (errors.step2?.patientPhone) Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      else if (errors.step2?.patientGender) Alert.alert('Lỗi', 'Vui lòng chọn giới tính');
    }
    return isValid;
  };

  const validateStep3 = async () => {
    const isValid = await methods.trigger('step3.serviceType');
    if (!isValid) Alert.alert('Lỗi', 'Vui lòng chọn nhóm xét nghiệm');
    return isValid;
  };

  const validateStep5 = async () => {
    const isValid = await methods.trigger('step5.genomeTestId');
    if (!isValid) Alert.alert('Lỗi', 'Vui lòng chọn xét nghiệm');
    return isValid;
  };

  const validateStep6 = async () => {
    const isValid = await methods.trigger('step6.paymentType');
    if (!isValid) Alert.alert('Lỗi', 'Vui lòng chọn hình thức thanh toán');
    return isValid;
  };

  const validateStep7 = async () => {
    return true;
  };

  const handleNext = async () => {
    let isValid = true;
    if (currentStep === 1) isValid = await validateStep1();
    else if (currentStep === 2) isValid = await validateStep2();
    else if (currentStep === 3) isValid = await validateStep3();
    else if (currentStep === 5) isValid = await validateStep5();
    else if (currentStep === 6) isValid = await validateStep6();
    else if (currentStep === 7) isValid = await validateStep7();
    if (!isValid) return;
    if (currentStep === 7) {
      await handleSubmit();
      return;
    }
    if (currentStep < TOTAL_STEPS) setCurrentStep(p => p + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(p => p - 1);
    else router.back();
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating order with payload:', JSON.stringify(data, null, 2));
      const response = await orderService.create(data);
      console.log('Order creation response:', response);
      if (!response.success) {
        const errorMsg = response.error || 'Không thể tạo đơn hàng';
        console.error('Order creation failed:', errorMsg);
        throw new Error(errorMsg);
      }
      return response;
    },
    onSuccess: async (response) => {
      // Show success modal immediately after order is created successfully
      // Don't wait for metadata creation/update
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['barcodes'] });
      setShowSuccessModal(true);
      
      // Create patient metadata after order is created successfully (in background)
      // This is optional and shouldn't block success notification
      try {
        const formData = methods.getValues();
        const orderData = response.data as any;
        
        // Get specifyId from order response or form data
        const finalSpecifyId = orderData?.specifyId?.specifyVoteID || 
                              orderData?.specifyId || 
                              (formData.step2.specifyId || '').trim() || 
                              undefined;
        const patientId = (formData.step2.patientId || '').trim();
        
        if (finalSpecifyId && patientId && patientId.trim() !== '') {
          const sampleName = formData.step6.samplingSite?.trim() || 
                            formData.step5.testSample?.trim() || 
                            formData.step2.patientName?.trim() || 
                            undefined;
          
          const metadataPayload: any = {
            specifyId: finalSpecifyId,
            patientId: patientId.trim(),
            sampleName: sampleName,
          };
          
          console.log('Creating patient metadata:', metadataPayload);
          const metadataResponse = await patientMetadataService.create(metadataPayload);
          
          if (metadataResponse.success && metadataResponse.data) {
            console.log('Patient metadata created successfully:', metadataResponse.data);
            
            // Update order with patient metadata ID
            const orderId = (response.data as any)?.orderId;
            if (orderId && metadataResponse.data.labcode) {
              try {
                const currentOrder = response.data as any;
                const updatePayload: any = {
                  orderName: formData.step1.orderName.trim(),
                  orderStatus: ORDER_STATUS_DEFAULT,
                  paymentStatus: 'PENDING',
                  paymentType: formData.step6.paymentType || 'CASH',
                  patientMetadataIds: [metadataResponse.data.labcode],
                };
                
                if (finalSpecifyId) updatePayload.specifyId = finalSpecifyId;
                if (formData.step1.customerId?.trim()) {
                  const selectedCustomer = customers.find((c: any) => c.customerId === formData.step1.customerId?.trim());
                  if (selectedCustomer?.userId) updatePayload.customerId = String(selectedCustomer.userId).trim();
                }
                if (formData.step1.sampleCollectorId?.trim()) updatePayload.sampleCollectorId = formData.step1.sampleCollectorId.trim();
                if (formData.step1.staffAnalystId?.trim()) updatePayload.staffAnalystId = formData.step1.staffAnalystId.trim();
                if (formData.step1.barcodeId?.trim()) updatePayload.barcodeId = formData.step1.barcodeId.trim();
                if (formData.step6.paymentAmount?.trim()) {
                  const amount = parseFloat(formData.step6.paymentAmount);
                  if (!isNaN(amount) && amount > 0) updatePayload.paymentAmount = amount;
                }
                
                console.log('Updating order with metadata:', updatePayload);
                await orderService.update(orderId, updatePayload);
                console.log('Order updated with patient metadata successfully');
                queryClient.invalidateQueries({ queryKey: ['orders'] });
                queryClient.invalidateQueries({ queryKey: ['order', orderId] });
              } catch (updateError) {
                console.error('Error updating order with metadata:', updateError);
                // Don't throw - order was created successfully, metadata update is optional
              }
            }
          } else {
            console.warn('Failed to create patient metadata:', metadataResponse.error);
            // Don't throw - order was created successfully, metadata creation is optional
          }
        }
      } catch (metadataError) {
        console.error('Error creating patient metadata:', metadataError);
        // Don't throw - order was created successfully, metadata creation is optional
      }
    },
    onError: (error: any) => {
      console.error('Order creation error:', error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.error ||
        'Không thể tạo đơn hàng. Vui lòng thử lại.';
      Alert.alert('Lỗi tạo đơn hàng', errorMessage);
    },
  });

  const handleSubmit = async () => {
    try {
      const formData = methods.getValues();

      let selectedCustomer: any = null;
      const customerId = formData.step1.customerId?.trim();
      if (customerId) {
        selectedCustomer = customers.find((c: any) => c.customerId === customerId);
        if (!selectedCustomer)
          return Alert.alert('Lỗi', 'Khách hàng được chọn không hợp lệ. Vui lòng chọn lại.');
        if (!selectedCustomer.userId)
          return Alert.alert(
            'Lỗi',
            `Khách hàng "${selectedCustomer.customerName}" không có userId.\n\nVui lòng chọn khách hàng khác hoặc để trống.`
          );
      }

      let finalSpecifyId = (formData.step2.specifyId || '').trim() || undefined;
      let patientId = (formData.step2.patientId || '').trim();

      if (!patientId && formData.step2.patientName.trim()) {
        const generateUUID = () =>
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

        patientId = generateUUID();

        const patientPayload: any = {
          patientId,
          patientName: formData.step2.patientName.trim(),
          patientPhone: String(formData.step2.patientPhone ?? '').trim() || '0000000000',
          patientDob: toISO(formData.step2.patientDob),
          gender: formData.step2.patientGender || undefined,
          patientEmail: formData.step2.patientEmail?.trim() || undefined,
          patientJob: formData.step2.patientJob?.trim() || undefined,
          patientContactName: formData.step2.patientContactName?.trim() || undefined,
          patientContactPhone: String(formData.step2.patientContactPhone ?? '').trim() || undefined,
          patientAddress: formData.step2.patientAddress?.trim() || undefined,
          hospitalId: user?.hospitalId ? String(user.hospitalId) : undefined,
        };

        const patientResponse = await patientService.create(patientPayload);
        if (!patientResponse.success)
          throw new Error(patientResponse.error || 'Không thể tạo bệnh nhân');
        methods.setValue('step2.patientId', patientId, { shouldDirty: true, shouldTouch: true });
      }

      const serviceType = formData.step3.serviceType?.toLowerCase();
      if (serviceType && patientId && patientId.trim() !== '') {
        const selectedService = services.find(s => {
          const serviceName = s.name?.toLowerCase();
          return (
            serviceName === serviceType ||
            (serviceType === 'reproduction' &&
              (serviceName === 'sản' || serviceName === 'reproduction')) ||
            (serviceType === 'embryo' && (serviceName === 'phôi' || serviceName === 'embryo')) ||
            (serviceType === 'disease' && (serviceName === 'bệnh lý' || serviceName === 'disease'))
          );
        });
        if (
          !selectedService ||
          !selectedService.serviceId ||
          selectedService.serviceId.trim() === ''
        ) {
          throw new Error('Không tìm thấy thông tin dịch vụ. Vui lòng chọn lại nhóm xét nghiệm.');
        }

        console.log('Creating service with:', {
          serviceType,
          serviceId: selectedService.serviceId,
          patientId,
        });

        if (serviceType === 'reproduction') {
          const reproductionPayload: any = {
            serviceId: selectedService.serviceId.trim(),
            patientId: patientId.trim(),
            fetusesNumber: formData.step3.fetusesNumber
              ? parseInt(String(formData.step3.fetusesNumber), 10)
              : undefined,
            fetusesWeek: formData.step3.fetusesWeek
              ? parseInt(String(formData.step3.fetusesWeek), 10)
              : undefined,
            fetusesDay: formData.step3.fetusesDay
              ? parseInt(String(formData.step3.fetusesDay), 10)
              : undefined,
            ultrasoundDay: toISO(formData.step3.ultrasoundDay),
            headRumpLength: formData.step3.headRumpLength
              ? parseFloat(String(formData.step3.headRumpLength))
              : undefined,
            neckLength: formData.step3.neckLength
              ? parseFloat(String(formData.step3.neckLength))
              : undefined,
            combinedTestResult: formData.step3.combinedTestResult?.trim() || undefined,
            ultrasoundResult: formData.step3.ultrasoundResult?.trim() || undefined,
          };

          console.log(
            'Reproduction service payload:',
            JSON.stringify(reproductionPayload, null, 2)
          );
          const reproductionResponse = await reproductionService.create(reproductionPayload);
          console.log('Reproduction service response:', reproductionResponse);
          if (!reproductionResponse.success) {
            throw new Error(reproductionResponse.error || 'Không thể tạo thông tin nhóm Sản');
          }
        } else if (serviceType === 'embryo') {
          const embryoPayload: any = {
            serviceId: selectedService.serviceId.trim(),
            patientId: patientId.trim(),
            biospy: formData.step3.biospy?.trim() || undefined,
            biospyDate: toISO(formData.step3.biospyDate),
            cellContainingSolution: formData.step3.cellContainingSolution?.trim() || undefined,
            embryoCreate: formData.step3.embryoCreate
              ? parseInt(String(formData.step3.embryoCreate), 10)
              : undefined,
            embryoStatus: formData.step3.embryoStatus?.trim() || undefined,
            morphologicalAssessment: formData.step3.morphologicalAssessment?.trim() || undefined,
            cellNucleus:
              formData.step3.cellNucleus !== undefined
                ? Boolean(formData.step3.cellNucleus)
                : undefined,
            negativeControl: formData.step3.negativeControl?.trim() || undefined,
          };

          const embryoResponse = await embryoService.create(embryoPayload);
          if (!embryoResponse.success) {
            throw new Error(embryoResponse.error || 'Không thể tạo thông tin nhóm Phôi');
          }
        } else if (serviceType === 'disease') {
          const diseasePayload: any = {
            serviceId: selectedService.serviceId.trim(),
            patientId: patientId.trim(),
            symptom: formData.step3.symptom?.trim() || undefined,
            diagnose: formData.step3.diagnose?.trim() || undefined,
            diagnoseImage: formData.step3.diagnoseImage?.trim() || undefined,
            testRelated: formData.step3.testRelated?.trim() || undefined,
            treatmentMethods: formData.step3.treatmentMethods?.trim() || undefined,
            treatmentTimeDay: formData.step3.treatmentTimeDay
              ? parseInt(String(formData.step3.treatmentTimeDay), 10)
              : undefined,
            drugResistance: formData.step3.drugResistance?.trim() || undefined,
            relapse: formData.step3.relapse?.trim() || undefined,
          };

          const diseaseResponse = await diseaseService.create(diseasePayload);
          if (!diseaseResponse.success) {
            throw new Error(diseaseResponse.error || 'Không thể tạo thông tin nhóm Bệnh lý');
          }
        }
      }

      if (
        !finalSpecifyId &&
        formData.step2.patientName.trim() &&
        formData.step5.genomeTestId.trim()
      ) {
        const selectedGenomeTest: any = genomeTests.find(
          (t: any) => t.testId === formData.step5.genomeTestId
        );
        if (!selectedGenomeTest) throw new Error('Không tìm thấy xét nghiệm đã chọn');
        if (!selectedGenomeTest.service?.serviceId)
          throw new Error('Xét nghiệm không có thông tin dịch vụ. Vui lòng chọn xét nghiệm khác.');

        const specifyPayload: any = {
          serviceId: selectedGenomeTest.service.serviceId,
          patientId,
          genomeTestId: formData.step5.genomeTestId.trim(),
          doctorId: formData.step1.doctorId?.trim() || undefined,
          hospitalId: user?.hospitalId ? String(user.hospitalId) : undefined,
          samplingSite: formData.step6.samplingSite?.trim() || undefined,
          sampleCollectDate: toISO(formData.step6.sampleCollectDate),
          embryoNumber: formData.step6.embryoNumber
            ? parseInt(String(formData.step6.embryoNumber), 10)
            : undefined,
          geneticTestResults: formData.step7.geneticTestResults?.trim() || undefined,
          geneticTestResultsRelationship:
            formData.step7.geneticTestResultsRelationship?.trim() || undefined,
          specifyNote: (formData.step2.specifyImagePath || '').trim() || undefined,
          sendEmailPatient: false,
        };

        const specifyResponse = await specifyVoteTestService.create(specifyPayload);
        if (!specifyResponse.success)
          throw new Error(specifyResponse.error || 'Không thể tạo phiếu chỉ định');
        finalSpecifyId =
          (specifyResponse.data as any)?.specifyVoteID || (specifyResponse.data as any)?.specifyId;
      }

      const payload: any = {
        orderName: formData.step1.orderName.trim(),
        orderStatus: ORDER_STATUS_DEFAULT,
        paymentStatus: 'PENDING',
        paymentType: formData.step6.paymentType || 'CASH',
      };

      if (finalSpecifyId) payload.specifyId = finalSpecifyId;
      if (formData.step6.specifyVoteImagePath?.trim()) {
        payload.specifyVoteImagePath = formData.step6.specifyVoteImagePath.trim();
      }

      if (selectedCustomer?.userId) payload.customerId = String(selectedCustomer.userId).trim();
      if (formData.step1.sampleCollectorId?.trim())
        payload.sampleCollectorId = formData.step1.sampleCollectorId.trim();
      if (formData.step1.staffAnalystId?.trim())
        payload.staffAnalystId = formData.step1.staffAnalystId.trim();
      if (formData.step1.barcodeId?.trim()) payload.barcodeId = formData.step1.barcodeId.trim();

      if (formData.step6.paymentAmount?.trim()) {
        const amount = parseFloat(formData.step6.paymentAmount);
        if (!isNaN(amount) && amount > 0) payload.paymentAmount = amount;
      }

      console.log('Order creation payload:', JSON.stringify(payload, null, 2));
      
      // Create order first
      const orderResponse = await orderService.create(payload);
      if (!orderResponse.success) {
        throw new Error(orderResponse.error || 'Không thể tạo đơn hàng');
      }
      
      console.log('Order created successfully:', orderResponse.data);
      
      // Create patient metadata if we have specifyId and patientId
      if (finalSpecifyId && patientId && patientId.trim() !== '') {
        try {
          const sampleName = formData.step6.samplingSite?.trim() || 
                            formData.step5.testSample?.trim() || 
                            formData.step2.patientName?.trim() || 
                            undefined;
          
          const metadataPayload: any = {
            specifyId: finalSpecifyId,
            patientId: patientId.trim(),
            sampleName: sampleName,
          };
          
          console.log('Creating patient metadata:', metadataPayload);
          const metadataResponse = await patientMetadataService.create(metadataPayload);
          
          if (metadataResponse.success && metadataResponse.data) {
            console.log('Patient metadata created successfully:', metadataResponse.data);
            
            // Update order with patient metadata ID
            const orderId = (orderResponse.data as any)?.orderId;
            if (orderId && metadataResponse.data.labcode) {
              try {
                const updatePayload: any = {
                  orderName: formData.step1.orderName.trim(),
                  orderStatus: ORDER_STATUS_DEFAULT,
                  paymentStatus: 'PENDING',
                  paymentType: formData.step6.paymentType || 'CASH',
                  patientMetadataIds: [metadataResponse.data.labcode],
                };
                
                if (finalSpecifyId) updatePayload.specifyId = finalSpecifyId;
                if (selectedCustomer?.userId) updatePayload.customerId = String(selectedCustomer.userId).trim();
                if (formData.step1.sampleCollectorId?.trim()) updatePayload.sampleCollectorId = formData.step1.sampleCollectorId.trim();
                if (formData.step1.staffAnalystId?.trim()) updatePayload.staffAnalystId = formData.step1.staffAnalystId.trim();
                if (formData.step1.barcodeId?.trim()) updatePayload.barcodeId = formData.step1.barcodeId.trim();
                if (formData.step6.paymentAmount?.trim()) {
                  const amount = parseFloat(formData.step6.paymentAmount);
                  if (!isNaN(amount) && amount > 0) updatePayload.paymentAmount = amount;
                }
                
                console.log('Updating order with metadata:', updatePayload);
                await orderService.update(orderId, updatePayload);
                console.log('Order updated with patient metadata successfully');
              } catch (updateError) {
                console.error('Error updating order with metadata:', updateError);
                // Don't throw - order was created successfully, metadata update is optional
              }
            }
          } else {
            console.warn('Failed to create patient metadata:', metadataResponse.error);
            // Don't throw - order was created successfully, metadata creation is optional
          }
        } catch (metadataError) {
          console.error('Error creating patient metadata:', metadataError);
          // Don't throw - order was created successfully, metadata creation is optional
        }
      }
      
      // Use mutation for success/error handling
      createOrderMutation.mutate(payload, {
        onSuccess: () => {
          // Already handled above
        },
      });
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
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
        required
        options={doctors}
        getLabel={d => d.doctorName}
        getValue={d => d.doctorId}
        placeholder="Lựa chọn"
        modalTitle="Chọn bác sĩ chỉ định"
      />

      <FormNumericInput
        name="step1.paymentAmount"
        label="Số tiền tạm ứng (VNĐ)"
        type="integer"
        placeholder="Nhập số tiền"
      />

      <FormFieldGroup>
        <FormSelect
          name="step1.staffId"
          label="Người thu tiền"
          options={staffs}
          getLabel={s => s.staffName}
          getValue={s => s.staffId}
          placeholder="Lựa chọn"
          modalTitle="Chọn người thu tiền"
        />
        <FormSelect
          name="step1.barcodeId"
          label="Mã Barcode PCĐ"
          required
          options={availableBarcodes}
          getLabel={b => b.barcode}
          getValue={b => b.barcode}
          placeholder="Lựa chọn"
          modalTitle="Chọn mã Barcode"
        />
      </FormFieldGroup>

      <FormSelect
        name="step1.staffAnalystId"
        label="Nhân viên phụ trách"
        required
        options={staffs}
        getLabel={s => s.staffName}
        getValue={s => s.staffId}
        placeholder="Lựa chọn"
        modalTitle="Chọn nhân viên phụ trách"
      />

      <FormSelect
        name="step1.sampleCollectorId"
        label="Nhân viên thu mẫu"
        required
        options={staffs}
        getLabel={s => s.staffName}
        getValue={s => s.staffId}
        placeholder="Lựa chọn"
        modalTitle="Chọn nhân viên thu mẫu"
      />
    </View>
  );

  const renderStep2 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      {hasPreviousOrders && (
        <View className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-2xl">
          <Text className="text-xs font-bold text-cyan-800">
            Bệnh nhân này đã có đơn hàng trước đó trong hệ thống. Thông tin bệnh nhân đã được tự
            động điền.
          </Text>
        </View>
      )}

      <FormInput
        name="step2.patientName"
        label="Tên người làm xét nghiệm"
        required
        placeholder="Nhập tên"
        editable={!isLoadingPatient}
      />

      <FormFieldGroup>
        <FormNumericInput
          name="step2.patientPhone"
          label="Số điện thoại"
          required
          type="phone"
          placeholder="Nhập số điện thoại"
          disabled={isLoadingPatient}
        />
        <FormSelect
          name="step2.patientGender"
          label="Giới tính"
          required
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

      <FormInput name="step2.patientJob" label="Nghề nghiệp" placeholder="Nhập nghề nghiệp" />

      <FormFieldGroup>
        <FormInput name="step2.patientContactName" label="Người liên hệ" placeholder="Nhập tên" />
        <FormNumericInput
          name="step2.patientContactPhone"
          label="SĐT liên hệ"
          type="phone"
          placeholder="Nhập số"
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
    const selectedServiceType = methods.watch('step3.serviceType');
    const selectedService = services.find(s => s.name === selectedServiceType);
    const serviceLabel = selectedServiceType
      ? SERVICE_TYPE_MAPPER[selectedServiceType] || selectedServiceType
      : null;

    return (
      <View className="bg-white rounded-3xl border border-slate-200 p-4">
        <FormSelect
          name="step3.serviceType"
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
            <FormInput
              name="step3.biospy"
              label="Sinh thiết"
              placeholder="Nhập thông tin sinh thiết"
            />
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
            <FormInput
              name="step3.embryoStatus"
              label="Trạng thái phôi"
              placeholder="Nhập trạng thái"
            />
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
            <FormInput
              name="step3.negativeControl"
              label="Đối chứng âm"
              placeholder="Nhập đối chứng"
            />
          </>
        )}

        {selectedServiceType === 'disease' && (
          <>
            <View className="h-px bg-slate-100 my-3" />
            <Text className="text-[14px] font-extrabold text-slate-900 mb-3">
              Thông tin nhóm Bệnh lý
            </Text>
            <FormTextarea
              name="step3.symptom"
              label="Triệu chứng"
              placeholder="Nhập triệu chứng"
              minHeight={90}
            />
            <FormTextarea
              name="step3.diagnose"
              label="Chẩn đoán"
              placeholder="Nhập chẩn đoán"
              minHeight={90}
            />
            <FormInput
              name="step3.diagnoseImage"
              label="Ảnh chẩn đoán"
              placeholder="Nhập đường dẫn ảnh"
            />
            <FormInput
              name="step3.testRelated"
              label="Xét nghiệm liên quan"
              placeholder="Nhập xét nghiệm"
            />
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
            <FormInput
              name="step3.drugResistance"
              label="Kháng thuốc"
              placeholder="Nhập thông tin kháng thuốc"
            />
            <FormInput
              name="step3.relapse"
              label="Tái phát"
              placeholder="Nhập thông tin tái phát"
            />
          </>
        )}

        {selectedServiceType && (
          <FormInfoBox>Vui lòng điền đầy đủ thông tin cho nhóm xét nghiệm đã chọn.</FormInfoBox>
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
    const testName = methods.watch('step5.testName');
    return (
      <View className="bg-white rounded-3xl border border-slate-200 p-4">
        <View className="mb-4">
          <View className="flex-row items-end justify-between mb-2">
            <Text className="text-slate-700 font-medium">
              Xét nghiệm <Text className="text-red-500">*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => {
                const selectedServiceType = methods.getValues('step3.serviceType');
                const params = selectedServiceType
                  ? `?serviceType=${encodeURIComponent(selectedServiceType)}`
                  : '';
                router.push(`/create-genome-test${params}` as any);
              }}
              className="bg-cyan-600 w-8 h-8 rounded-full items-center justify-center ml-2"
            >
              <Plus size={16} color="white" />
            </TouchableOpacity>
          </View>
          <FormSelect
            name="step5.genomeTestId"
            label=""
            required
            options={filteredGenomeTests}
            getLabel={t => t.testName}
            getValue={t => t.testId}
            placeholder="Lựa chọn"
            modalTitle="Chọn xét nghiệm"
          />
        </View>

        {!!testName && (
          <>
            <View className="h-px bg-slate-100 my-2" />
            <FormReadOnly label="Tên xét nghiệm" value={testName} />
            <FormReadOnly label="Mẫu xét nghiệm" value={methods.watch('step5.testSample') || ''} />
            <FormReadOnly
              label="Nội dung xét nghiệm"
              value={methods.watch('step5.testContent') || ''}
            />
          </>
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

      <FormInput
        name="step6.samplingSite"
        label="Địa điểm lấy mẫu"
        placeholder="Nhập địa điểm lấy mẫu"
      />

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

  const renderStep7 = () => {
    const formData = methods.getValues();
    const hasPreviousData =
      formData.step2?.patientName || formData.step3?.serviceType || formData.step5?.testName;

    return (
      <View className="bg-white rounded-3xl border border-slate-200 p-4">
        {hasPreviousData ? (
          <>
            {patientMetadataList.length > 0 ? (
              <>
                <View className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-2xl">
                  <Text className="text-xs font-bold text-cyan-800 mb-2">
                    Thông tin đã nhập từ các bước trước ({patientMetadataList.length} nhóm thông
                    tin)
                  </Text>
                  {patientMetadataList.map((metadata: any, index: number) => (
                    <View
                      key={index}
                      className="mt-2 p-2 bg-white rounded-lg border border-cyan-100"
                    >
                      <Text className="text-xs font-semibold text-slate-700 mb-1">
                        {metadata.type}
                      </Text>
                      {Object.entries(metadata.data || {}).map(([key, value]: [string, any]) => {
                        if (!value || value === '' || value === undefined) return null;
                        return (
                          <Text key={key} className="text-xs text-slate-600 mt-0.5">
                            {key}: {String(value)}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                  <Text className="text-xs text-cyan-700 mt-2">
                    Các trường có sẵn đã được tự động điền vào form bên dưới. Bạn có thể chỉnh sửa
                    nếu cần.
                  </Text>
                </View>
              </>
            ) : (
              <View className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
                <Text className="text-xs font-bold text-yellow-800">
                  Chưa có thông tin từ các bước trước. Vui lòng điền thông tin thủ công.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <Text className="text-xs font-bold text-yellow-800">
              Vui lòng hoàn thành các bước trước để có thông tin tự động điền.
            </Text>
          </View>
        )}

        <FormTextarea
          name="step7.geneticTestResults"
          label="Kết quả xét nghiệm di truyền"
          placeholder="Nhập kết quả xét nghiệm di truyền"
          minHeight={110}
        />

        <FormTextarea
          name="step7.geneticTestResultsRelationship"
          label="Mối quan hệ kết quả xét nghiệm di truyền"
          placeholder="Nhập mối quan hệ kết quả xét nghiệm di truyền"
          minHeight={110}
        />
      </View>
    );
  };

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
            <Text className="text-sm font-bold text-slate-500">
              Bước {currentStep} - Đang phát triển
            </Text>
          </View>
        );
    }
  };

  return (
    <FormProvider {...methods}>
      <View className="flex-1 bg-slate-50">
        <View className="pt-14 pb-4 px-5 bg-white border-b border-slate-200">
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
          <View className="mt-4 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-cyan-600 rounded-full"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 2, gap: 8 }}
          >
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === currentStep;
              const isDone = stepNum < currentStep;

              return (
                <View
                  key={i}
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    isActive
                      ? 'bg-cyan-600 border-sky-700'
                      : isDone
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-white border-slate-200'
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center ${isActive ? 'bg-white/20' : isDone ? 'bg-white/20' : 'bg-slate-100'}`}
                  >
                    {isDone ? (
                      <Check size={12} color="#fff" strokeWidth={3} />
                    ) : (
                      <Text
                        className={`text-[11px] font-extrabold ${isActive ? 'text-white' : 'text-slate-600'}`}
                      >
                        {stepNum}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ 
            padding: 16, 
            paddingBottom: showFooter ? (Platform.OS === 'android' ? 100 : 120) : 16
          }}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            setShowFooter(isAtBottom);
          }}
          scrollEventThrottle={16}
        >
          <View className="bg-white rounded-2xl border border-slate-200 p-4">
            {renderCurrentStep()}
          </View>
        </ScrollView>

        {showFooter && (
          <View 
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200"
            style={{ 
              paddingBottom: Platform.OS === 'android' ? 8 : 20,
              paddingTop: 16,
              paddingHorizontal: 16,
              zIndex: 1000,
              elevation: Platform.OS === 'android' ? 8 : 0,
              shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
              shadowRadius: Platform.OS === 'ios' ? 4 : 0,
            }}
          >
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 h-12 rounded-2xl items-center justify-center bg-white border border-slate-200"
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text className="text-[15px] font-extrabold text-slate-700">
                  {currentStep === 1 ? 'Huỷ' : 'Quay lại'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 h-12 rounded-2xl items-center justify-center bg-cyan-600"
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text className="text-[15px] font-extrabold text-white">
                  {currentStep === TOTAL_STEPS ? 'Hoàn thành' : 'Tiếp theo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
      </View>
    </FormProvider>
  );
}
