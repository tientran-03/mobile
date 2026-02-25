import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  SERVICE_TYPE_OPTIONS,
  type CreateOrderFormData,
} from '@/lib/schemas/order-schemas';
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_DEFAULT } from '@/lib/constants/order-status';
import { OrderStatus } from '@/types';
import { BarcodeResponse, barcodeService } from '@/services/barcodeService';
import { CustomerResponse, customerService } from '@/services/customerService';
import { DoctorResponse, doctorService } from '@/services/doctorService';
import { GenomeTestResponse, genomeTestService } from '@/services/genomeTestService';
import { HospitalStaffResponse, hospitalStaffService } from '@/services/hospitalStaffService';
import { OrderResponse, orderService } from '@/services/orderService';
import { patientClinicalService } from '@/services/patientClinicalService';
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

const toISO = (s?: string) => {
  if (!s || !s.trim()) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
};

const formatDateInput = (isoDate?: string): string => {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function UpdateOrderWizardScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [showFooter, setShowFooter] = useState(false);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!(orderResponse as any)?.success || !(orderResponse as any).data) return;

    const order: OrderResponse = (orderResponse as any).data;

    const customer = customers.find((c: any) => c.customerId === order.customerId);
    methods.setValue('step1.orderName', order.orderName || '');
    methods.setValue('step1.doctorId', order.specifyId?.doctorId || '');
    methods.setValue('step1.customerId', order.customerId || '');
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
    methods.setValue(
      'step6.sampleCollectDate',
      formatDateInput(order.specifyId?.sampleCollectDate)
    );
    methods.setValue('step6.embryoNumber', order.specifyId?.embryoNumber?.toString() || '');
    methods.setValue('step6.specifyVoteImagePath', order.specifyVoteImagePath || '');

    methods.setValue('step7.geneticTestResults', order.specifyId?.geneticTestResults || '');
    methods.setValue(
      'step7.geneticTestResultsRelationship',
      order.specifyId?.geneticTestResultsRelationship || ''
    );

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
            const serviceName = test.service.name.toLowerCase();
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
    console.log('[UpdateOrderWizard] handleNext called, currentStep:', currentStep);
    let isValid = true;
    if (currentStep === 1) {
      console.log('[UpdateOrderWizard] Validating step 1...');
      isValid = await validateStep1();
      console.log('[UpdateOrderWizard] Step 1 validation result:', isValid);
    } else if (currentStep === 3) {
      console.log('[UpdateOrderWizard] Validating step 3...');
      isValid = await validateStep3();
      console.log('[UpdateOrderWizard] Step 3 validation result:', isValid);
    } else if (currentStep === 6) {
      console.log('[UpdateOrderWizard] Validating step 6...');
      isValid = await validateStep6();
      console.log('[UpdateOrderWizard] Step 6 validation result:', isValid);
    }

    if (!isValid) {
      console.log('[UpdateOrderWizard] Validation failed, returning early');
      return;
    }

    if (currentStep === TOTAL_STEPS) {
      console.log('[UpdateOrderWizard] At final step, preparing to submit...');
      // Validate before submit
      const formData = methods.getValues();
      const currentOrderData = (orderResponse as any)?.data as OrderResponse | undefined;
      const orderName = formData.step1.orderName?.trim() || currentOrderData?.orderName?.trim();
      if (!orderName) {
        console.log('[UpdateOrderWizard] Order name missing!');
        Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
        return;
      }
      console.log('[UpdateOrderWizard] Calling handleSubmit...');
      await handleSubmit();
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      console.log('[UpdateOrderWizard] Moving to next step...');
      setCurrentStep(p => p + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(p => p - 1);
    else router.back();
  };

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await orderService.update(orderId!, data);
      if (!response.success) throw new Error(response.error || 'Không thể cập nhật đơn hàng');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      Alert.alert(
        'Lỗi cập nhật đơn hàng',
        error?.message || 'Không thể cập nhật đơn hàng. Vui lòng thử lại.'
      );
    },
  });

  const handleSubmit = async () => {
    try {
      console.log('[UpdateOrderWizard] Starting submit...');
      const formData = methods.getValues();
      console.log('[UpdateOrderWizard] Form data:', JSON.stringify(formData, null, 2));

      // Get current order data for fallback values
      const currentOrderData = (orderResponse as any)?.data as OrderResponse | undefined;
      const currentSpecifyId = currentOrderData?.specifyId?.specifyVoteID;
      const currentPatientId = currentOrderData?.specifyId?.patientId;

      let selectedCustomer: any = null;
      const customerId = formData.step1.customerId?.trim();
      if (customerId) {
        selectedCustomer = customers.find((c: any) => c.customerId === customerId);
        if (!selectedCustomer) {
          throw new Error('Khách hàng được chọn không hợp lệ.');
        }
        if (!selectedCustomer.userId) {
          throw new Error(`Khách hàng "${selectedCustomer.customerName}" không có userId.`);
        }
      }

      let finalSpecifyId = (formData.step2.specifyId || '').trim() || currentSpecifyId || undefined;

      const genomeTestId = formData.step3.genomeTestId?.trim();
      // --- Patient: create/update (optional) ---
      let patientId = (formData.step2.patientId || '').trim() || currentPatientId || '';
      const patientName = (formData.step2.patientName || '').trim();
      const patientPhone = (formData.step2.patientPhone || '').trim();

      const generateUUID = () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

      // Only create patient if user actually entered patient info and we don't have an id yet
      if (!patientId && patientName && genomeTestId) {
        patientId = generateUUID();
        const patientPayload = {
          patientId,
          patientName,
          patientPhone: patientPhone || '0000000000',
          patientDob: toISO(formData.step2.patientDob),
          gender: formData.step2.patientGender || undefined,
          patientEmail: formData.step2.patientEmail?.trim() || undefined,
          patientJob: formData.step2.patientJob?.trim() || undefined,
          patientContactName: formData.step2.patientContactName?.trim() || undefined,
          patientContactPhone: formData.step2.patientContactPhone?.trim() || undefined,
          patientAddress: formData.step2.patientAddress?.trim() || undefined,
          hospitalId: user?.hospitalId ? String(user.hospitalId) : undefined,
        };

        const patientResponse = await patientService.create(patientPayload);
        if (!patientResponse.success) {
          throw new Error(patientResponse.error || 'Không thể tạo bệnh nhân');
        }
      }

      // Update patient if we have an id and required minimum fields
      if (patientId && patientName && patientPhone) {
        const patientUpdatePayload = {
          patientId,
          patientName,
          patientPhone,
          patientDob: toISO(formData.step2.patientDob),
          gender: formData.step2.patientGender || undefined,
          patientEmail: formData.step2.patientEmail?.trim() || undefined,
          patientJob: formData.step2.patientJob?.trim() || undefined,
          patientContactName: formData.step2.patientContactName?.trim() || undefined,
          patientContactPhone: formData.step2.patientContactPhone?.trim() || undefined,
          patientAddress: formData.step2.patientAddress?.trim() || undefined,
          hospitalId: user?.hospitalId ? String(user.hospitalId) : undefined,
        };

        const patientUpdateResp = await patientService.update(patientId, patientUpdatePayload);
        if (!patientUpdateResp.success) {
          throw new Error(patientUpdateResp.error || 'Không thể cập nhật thông tin bệnh nhân');
        }
      }

      // --- Patient clinical (Step 4): create/update (optional) ---
      if (patientId) {
        const s4 = formData.step4;
        const hasClinical =
          !!(s4.patientHeight || '').trim() ||
          !!(s4.patientWeight || '').trim() ||
          !!(s4.patientHistory || '').trim() ||
          !!(s4.familyHistory || '').trim() ||
          !!(s4.toxicExposure || '').trim() ||
          !!(s4.medicalHistory || '').trim() ||
          !!(s4.chronicDisease || '').trim() ||
          !!(s4.acuteDisease || '').trim() ||
          !!(s4.medicalUsing || '').trim();

        if (hasClinical) {
          const parseMaybeNumber = (v?: string) => {
            const n = parseFloat(String(v || '').trim());
            return Number.isFinite(n) ? n : undefined;
          };

          const clinicalPayload: any = {
            patientId,
            patientHeight: parseMaybeNumber(s4.patientHeight),
            patientWeight: parseMaybeNumber(s4.patientWeight),
            patientHistory: (s4.patientHistory || '').trim() || undefined,
            familyHistory: (s4.familyHistory || '').trim() || undefined,
            toxicExposure: (s4.toxicExposure || '').trim() || undefined,
            medicalHistory: (s4.medicalHistory || '').trim() || undefined,
            chronicDisease: (s4.chronicDisease || '').trim() || undefined,
            acuteDisease: (s4.acuteDisease || '').trim() || undefined,
          };

          const medUsing = (s4.medicalUsing || '').trim();
          if (medUsing) {
            // Accept comma/newline separated input
            clinicalPayload.medicalUsing = medUsing
              .split(/[,\\n]/g)
              .map(x => x.trim())
              .filter(Boolean);
          }

          // Kiểm tra xem đã có patient clinical chưa
          const clinicalExisting = await patientClinicalService.getByPatientId(patientId);
          let clinicalId: string | undefined = undefined;
          
          if (clinicalExisting.success && clinicalExisting.data) {
            // Thử lấy ID từ nhiều field có thể có
            const data = clinicalExisting.data as any;
            clinicalId = data?.patientClinicalId || data?.id;
          }
          
          // Nếu có ID hợp lệ, update
          if (clinicalId && clinicalId !== 'undefined' && clinicalId.trim()) {
            const upd = await patientClinicalService.update(clinicalId, clinicalPayload);
            if (!upd.success) {
              throw new Error(upd.error || 'Không thể cập nhật thông tin lâm sàng');
            }
          } else {
            // Thử tạo mới, nếu đã tồn tại thì lấy lại và update
            try {
              const created = await patientClinicalService.create(clinicalPayload);
              if (!created.success) {
                // Nếu lỗi là "already exists", thử lại get và update
                const errorMsg = created.error?.toLowerCase() || '';
                if (errorMsg.includes('already exists') || errorMsg.includes('đã tồn tại') || errorMsg.includes('exists')) {
                  const retryGet = await patientClinicalService.getByPatientId(patientId);
                  if (retryGet.success && retryGet.data) {
                    const retryData = retryGet.data as any;
                    const retryId = retryData?.patientClinicalId || retryData?.id;
                    if (retryId && retryId !== 'undefined' && retryId.trim()) {
                      const retryUpdate = await patientClinicalService.update(retryId, clinicalPayload);
                      if (!retryUpdate.success) {
                        throw new Error(retryUpdate.error || 'Không thể cập nhật thông tin lâm sàng');
                      }
                    } else {
                      // Nếu không lấy được ID, bỏ qua việc lưu patient clinical (không bắt buộc)
                      console.warn('[UpdateOrderWizard] Không thể lấy ID của patient clinical, bỏ qua việc lưu thông tin lâm sàng');
                    }
                  } else {
                    // Nếu không get được, bỏ qua (không bắt buộc)
                    console.warn('[UpdateOrderWizard] Không thể lấy patient clinical để cập nhật, bỏ qua');
                  }
                } else {
                  throw new Error(created.error || 'Không thể tạo thông tin lâm sàng');
                }
              }
            } catch (error: any) {
              // Nếu lỗi là "already exists", thử lại get và update
              const errorMsg = error?.message?.toLowerCase() || '';
              if (errorMsg.includes('already exists') || errorMsg.includes('đã tồn tại') || errorMsg.includes('exists')) {
                try {
                  const retryGet = await patientClinicalService.getByPatientId(patientId);
                  if (retryGet.success && retryGet.data) {
                    const retryData = retryGet.data as any;
                    const retryId = retryData?.patientClinicalId || retryData?.id;
                    if (retryId && retryId !== 'undefined' && retryId.trim()) {
                      const retryUpdate = await patientClinicalService.update(retryId, clinicalPayload);
                      if (!retryUpdate.success) {
                        throw new Error(retryUpdate.error || 'Không thể cập nhật thông tin lâm sàng');
                      }
                    } else {
                      // Nếu không lấy được ID, bỏ qua (không bắt buộc)
                      console.warn('[UpdateOrderWizard] Không thể lấy ID của patient clinical, bỏ qua việc lưu thông tin lâm sàng');
                    }
                  } else {
                    // Nếu không get được, bỏ qua (không bắt buộc)
                    console.warn('[UpdateOrderWizard] Không thể lấy patient clinical để cập nhật, bỏ qua');
                  }
                } catch (retryError) {
                  // Nếu retry cũng fail, bỏ qua (không bắt buộc)
                  console.warn('[UpdateOrderWizard] Lỗi khi retry patient clinical:', retryError);
                }
              } else {
                // Nếu không phải lỗi "already exists", bỏ qua (không bắt buộc)
                console.warn('[UpdateOrderWizard] Lỗi khi lưu patient clinical (không bắt buộc):', error?.message);
              }
            }
          }
        }
      }

      // --- Specify vote test: update if exists, otherwise create (Step 3/6/7) ---
      if (genomeTestId && patientId) {
        const selectedGenomeTest: any = genomeTests.find((t: any) => t.testId === genomeTestId);
        if (!selectedGenomeTest) throw new Error('Không tìm thấy xét nghiệm đã chọn');
        if (!selectedGenomeTest.service?.serviceId) throw new Error('Xét nghiệm không có thông tin dịch vụ.');

        const specifyPayload: any = {
          serviceId: selectedGenomeTest.service.serviceId,
          patientId,
          genomeTestId,
          doctorId: formData.step1.doctorId?.trim() || undefined,
          hospitalId: user?.hospitalId ? String(user.hospitalId) : undefined,
          samplingSite: formData.step6.samplingSite?.trim() || undefined,
          sampleCollectDate: toISO(formData.step6.sampleCollectDate),
          embryoNumber: formData.step6.embryoNumber ? parseInt(formData.step6.embryoNumber) : undefined,
          geneticTestResults: formData.step7.geneticTestResults?.trim() || undefined,
          geneticTestResultsRelationship: formData.step7.geneticTestResultsRelationship?.trim() || undefined,
          specifyNote: (formData.step2.specifyImagePath || '').trim() || undefined,
          sendEmailPatient: false,
        };

        if (finalSpecifyId) {
          const updSpecify = await specifyVoteTestService.update(finalSpecifyId, specifyPayload);
          if (!updSpecify.success) {
            throw new Error(updSpecify.error || 'Không thể cập nhật phiếu chỉ định');
          }
        } else {
          const createdSpecify = await specifyVoteTestService.create(specifyPayload);
          if (!createdSpecify.success) {
            throw new Error(createdSpecify.error || 'Không thể tạo phiếu chỉ định');
          }
          finalSpecifyId = (createdSpecify.data as any)?.specifyVoteID || (createdSpecify.data as any)?.specifyId;
        }
      }

      // Validate required fields - use fallback from current order if form is empty
      const orderName = formData.step1.orderName?.trim() || currentOrderData?.orderName?.trim();
      if (!orderName) {
        throw new Error('Vui lòng nhập tên đơn hàng');
      }

      const orderStatusValue = formData.step1.orderStatus || currentOrderData?.orderStatus || ORDER_STATUS_DEFAULT;
      const paymentStatusValue = currentOrderData?.paymentStatus || 'PENDING';
      const paymentTypeValue = formData.step6.paymentType || currentOrderData?.paymentType || 'CASH';

      console.log('[UpdateOrderWizard] Validated values:', {
        orderName: orderName,
        orderStatus: orderStatusValue,
        paymentStatus: paymentStatusValue,
        paymentType: paymentTypeValue,
      });

      const payload: any = {
        orderName: orderName,
        orderStatus: orderStatusValue,
        paymentStatus: paymentStatusValue,
        paymentType: paymentTypeValue,
        specifyVoteImagePath: (formData.step6.specifyVoteImagePath || '').trim() || undefined,
      };

      if (finalSpecifyId) {
        payload.specifyId = finalSpecifyId;
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

      console.log('[UpdateOrderWizard] Final payload:', JSON.stringify(payload, null, 2));
      console.log('[UpdateOrderWizard] Calling mutation...');
      
      const result = await updateOrderMutation.mutateAsync(payload);
      console.log('[UpdateOrderWizard] Mutation success:', result);
      
      // Sau khi lưu thành công, tự động quay về trang đơn hàng chờ cập nhật sau 0.5 giây
      // Clear timeout cũ nếu có
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      
      // Tự động quay về sau 0.5 giây
      navigateTimeoutRef.current = setTimeout(() => {
        console.log('[UpdateOrderWizard] Navigating to pending-orders');
        router.replace('/pending-orders');
        navigateTimeoutRef.current = null;
      }, 500);
    } catch (e: any) {
      console.error('[UpdateOrderWizard] Submit error:', e);
      console.error('[UpdateOrderWizard] Error stack:', e?.stack);
      const errorMessage = e?.message || e?.error || 'Không thể cập nhật đơn hàng. Vui lòng thử lại.';
      Alert.alert('❌ Lỗi', errorMessage);
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
        getValue={c => c.customerId}
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
    const genomeTestId = methods.watch('step3.genomeTestId');
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

  const renderStep5 = () => (
    <View className="bg-white rounded-3xl border border-slate-200 p-4">
      <FormSelect
        name="step5.serviceType"
        label="Nhóm xét nghiệm"
        options={SERVICE_TYPE_OPTIONS}
        getLabel={o => o.label}
        getValue={o => o.value}
        placeholder="Lựa chọn"
        modalTitle="Chọn nhóm xét nghiệm"
      />

      <FormInfoBox>Chọn nhóm xét nghiệm để lọc danh sách xét nghiệm ở bước tiếp theo.</FormInfoBox>
    </View>
  );

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
            <Text className="text-sm font-bold text-slate-500">
              Bước {currentStep} - Đang phát triển
            </Text>
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
                    className={`w-5 h-5 rounded-full items-center justify-center ${
                      isActive ? 'bg-white/20' : isDone ? 'bg-white/20' : 'bg-slate-100'
                    }`}
                  >
                    {isDone ? (
                      <Check size={12} color="#fff" strokeWidth={3} />
                    ) : (
                      <Text
                        className={`text-[11px] font-extrabold ${
                          isActive ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {stepNum}
                      </Text>
                    )}
                  </View>

                  <Text
                    className={`ml-2 text-[11px] font-extrabold ${
                      isActive || isDone ? 'text-white' : 'text-slate-600'
                    }`}
                    numberOfLines={1}
                  >
                    {`B${stepNum}`}
                  </Text>
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
                className={`flex-1 h-12 rounded-2xl items-center justify-center ${
                  updateOrderMutation.isPending ? 'bg-cyan-400' : 'bg-cyan-600'
                }`}
                onPress={async () => {
                  try {
                    await handleNext();
                  } catch (error: any) {
                    console.error('[UpdateOrderWizard] Error in onPress:', error);
                    Alert.alert('❌ Lỗi', error?.message || 'Có lỗi xảy ra khi xử lý. Vui lòng thử lại.');
                  }
                }}
                activeOpacity={0.85}
                disabled={updateOrderMutation.isPending}
              >
                {updateOrderMutation.isPending ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#fff" size="small" />
                    <Text className="text-[15px] font-extrabold text-white">Đang lưu...</Text>
                  </View>
                ) : (
                  <Text className="text-[15px] font-extrabold text-white">
                    {currentStep === TOTAL_STEPS ? 'Lưu thay đổi' : 'Tiếp theo'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </FormProvider>
  );
}
