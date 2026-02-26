import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import {
  Coins,
  FilePlus,
  ChevronRight,
  ArrowLeft,
  Stethoscope,
  Users,
  Building2,
  Barcode,
  TestTube,
} from 'lucide-react-native';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormInput, FormNumericInput, FormInfoBox } from '@/components/form';
import { SelectionModal } from '@/components/modals';
import { ORDER_STATUS_DEFAULT } from '@/lib/constants/order-status';
import {
  quickOrderSchema,
  quickOrderDefaultValues,
  type QuickOrderFormData,
  PAYMENT_TYPE_OPTIONS,
} from '@/lib/schemas/order-schemas';
import { SERVICE_TYPE_MAPPER } from '@/lib/schemas/order-schemas';
import { customerService } from '@/services/customerService';
import { doctorService, DoctorResponse } from '@/services/doctorService';
import { hospitalStaffService, HospitalStaffResponse } from '@/services/hospitalStaffService';
import { orderService, OrderResponse } from '@/services/orderService';
import { serviceService, ServiceResponse } from '@/services/serviceService';
import { specifyVoteTestService, SpecifyVoteTestResponse } from '@/services/specifyVoteTestService';

export default function QuickOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const methods = useForm<QuickOrderFormData>({
    resolver: zodResolver(quickOrderSchema),
    mode: 'onTouched',
    defaultValues: quickOrderDefaultValues,
  });

  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showStaffAnalystModal, setShowStaffAnalystModal] = useState(false);
  const [showSampleCollectorModal, setShowSampleCollectorModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);
  const [showSpecifyVoteTestCodeModal, setShowSpecifyVoteTestCodeModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
    retry: false,
  });

  const { data: doctorsResponse } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorService.getAll(),
    retry: false,
  });

  const { data: staffsResponse } = useQuery({
    queryKey: ['hospitalStaffs'],
    queryFn: () => hospitalStaffService.getAll(),
    retry: false,
  });

  const { data: specifyResponse } = useQuery({
    queryKey: ['specifyVoteTests'],
    queryFn: () => specifyVoteTestService.getAll(),
    retry: false,
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    retry: false,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceService.getAll(),
    retry: false,
  });

  const customers = (customersResponse as any)?.success
    ? ((customersResponse as any).data as any[]) || []
    : [];

  const doctors = (doctorsResponse as any)?.success
    ? ((doctorsResponse as any).data as DoctorResponse[]) || []
    : [];

  const staffs = (staffsResponse as any)?.success
    ? ((staffsResponse as any).data as HospitalStaffResponse[]) || []
    : [];

  const allSpecifies = (specifyResponse as any)?.success
    ? ((specifyResponse as any).data as SpecifyVoteTestResponse[]) || []
    : [];

  const orders = (ordersResponse as any)?.success
    ? ((ordersResponse as any).data as OrderResponse[]) || []
    : [];
  const usedSpecifyIds = useMemo(() => {
    const ids = new Set<string>();
    orders.forEach(order => {
      if (order.specifyId) {
        if (typeof order.specifyId === 'object' && order.specifyId.specifyVoteID) {
          ids.add(order.specifyId.specifyVoteID);
        } else if (typeof order.specifyId === 'string') {
          ids.add(order.specifyId);
        }
      }
    });
    return ids;
  }, [orders]);
  const specifies = useMemo(() => {
    return allSpecifies.filter(specify => !usedSpecifyIds.has(specify.specifyVoteID));
  }, [allSpecifies, usedSpecifyIds]);

  const services = (servicesResponse as any)?.success
    ? ((servicesResponse as any).data as ServiceResponse[]) || []
    : [];
  const hospitals = useMemo(() => {
    const hospitalMap = new Map<string, { hospitalId: string; hospitalName: string }>();
    doctors.forEach(doctor => {
      if (doctor.hospitalId && !hospitalMap.has(doctor.hospitalId)) {
        hospitalMap.set(doctor.hospitalId, {
          hospitalId: doctor.hospitalId,
          hospitalName: doctor.hospitalName || doctor.hospitalId,
        });
      }
    });
    return Array.from(hospitalMap.values());
  }, [doctors]);
  const pendingPaymentRef = useRef<{
    paymentType: string;
    orderName: string;
    paymentAmount: number;
    specifyId?: string;
  } | null>(null);

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating order with payload:', JSON.stringify(data, null, 2));
      const response = await orderService.create(data);
      console.log('Order creation response:', response);
      if (!response.success) {
        const errorMsg = response.error || response.message || 'Không thể tạo đơn hàng';
        throw new Error(errorMsg);
      }
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['barcodes'] });

      const createdOrder = response.data;
      const pendingPayment = pendingPaymentRef.current;
      if (pendingPayment?.paymentType === 'ONLINE_PAYMENT' && createdOrder?.orderId) {
        router.push({
          pathname: '/staff/payment',
          params: {
            orderId: createdOrder.orderId,
            orderName: pendingPayment.orderName,
            amount: pendingPayment.paymentAmount.toString(),
            specifyId: pendingPayment.specifyId || '',
          },
        });
        pendingPaymentRef.current = null;
      } else {
        Alert.alert(
          'Thành công',
          'Đơn hàng đã được tạo thành công.\nBạn có thể xem trong danh sách đơn hàng.',
          [
            { text: 'Xem danh sách', onPress: () => router.push('/staff/orders') },
            { text: 'OK', style: 'cancel', onPress: () => router.back() },
          ]
        );
      }
    },
    onError: (error: any) => {
      pendingPaymentRef.current = null;
      console.error('Order creation error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMessage = 'Không thể tạo đơn hàng. Vui lòng thử lại.';
      if (error?.response?.data) {
        const responseData = error.response.data;
        if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      }

      if (errorMessage.includes('not found') && errorMessage.includes('Customer')) {
        errorMessage = 'Khách hàng không tồn tại. Vui lòng chọn lại khách hàng.';
      } else if (errorMessage.includes('not found') && errorMessage.includes('Sample collector')) {
        errorMessage = 'Nhân viên thu mẫu không tồn tại. Vui lòng chọn lại.';
      } else if (errorMessage.includes('not found') && errorMessage.includes('Staff analyst')) {
        errorMessage = 'Nhân viên phụ trách không tồn tại. Vui lòng chọn lại.';
      } else if (errorMessage.includes('already exists')) {
        errorMessage = 'Tên đơn hàng đã tồn tại. Vui lòng chọn tên khác.';
      } else if (errorMessage.includes('required') || errorMessage.includes('is required')) {
        errorMessage = `Thiếu thông tin bắt buộc: ${errorMessage}`;
      } else if (
        errorMessage.includes('500') ||
        errorMessage.includes('Internal Server Error') ||
        errorMessage.includes('An unexpected error occurred')
      ) {
        errorMessage = 'Lỗi máy chủ. Vui lòng kiểm tra lại thông tin và thử lại sau.';
      }

      Alert.alert('Lỗi tạo đơn hàng', errorMessage);
    },
  });

  const getSelectedCustomerName = () => {
    const customerId = methods.watch('customerId');
    const customer = customers.find(c => c.customerId === customerId);
    return customer?.customerName || 'Chọn khách hàng (tùy chọn)';
  };

  const getSelectedDoctorName = () => {
    const doctorId = methods.watch('doctorId');
    const doctor = doctors.find(d => d.doctorId === doctorId);
    return doctor?.doctorName || 'Lựa chọn';
  };

  const getSelectedHospitalName = () => {
    const doctorId = methods.watch('doctorId');
    const doctor = doctors.find(d => d.doctorId === doctorId);
    return doctor?.hospitalName || 'Chọn bác sĩ để hiển thị';
  };

  const getSelectedSpecifyVoteTestCodeName = () => {
    const specifyVoteTestCode = methods.watch('specifyVoteTestCode');
    if (!specifyVoteTestCode) return 'Lựa chọn';
    const specify = specifies.find(s => s.specifyVoteID === specifyVoteTestCode);
    if (!specify) return 'Lựa chọn';
    const testName = specify.genomeTest?.testName || '';
    const code = specify.specifyVoteID || '';
    return testName ? `${code} - ${testName}` : code;
  };

  const getSelectedServiceName = () => {
    const serviceId = methods.watch('serviceId');
    const service = services.find(s => s.serviceId === serviceId);
    if (!service) return 'Lựa chọn';
    return SERVICE_TYPE_MAPPER[service.name] || service.name || 'Lựa chọn';
  };

  const getSelectedStaffAnalystName = () => {
    const staffAnalystId = methods.watch('staffAnalystId');
    const staff = staffs.find(s => s.staffId === staffAnalystId);
    return staff?.staffName || 'Lựa chọn';
  };

  const getSelectedSampleCollectorName = () => {
    const sampleCollectorId = methods.watch('sampleCollectorId');
    const staff = staffs.find(s => s.staffId === sampleCollectorId);
    return staff?.staffName || 'Lựa chọn';
  };

  const getSelectedStaffName = () => {
    const staffId = methods.watch('staffId');
    const staff = staffs.find(s => s.staffId === staffId);
    return staff?.staffName || 'Lựa chọn';
  };

  const getSelectedPaymentTypeName = () => {
    const paymentType = methods.watch('paymentType');
    const option = PAYMENT_TYPE_OPTIONS.find(opt => opt.value === paymentType);
    return option?.label || 'Lựa chọn';
  };

  const doctorOptions = useMemo(
    () =>
      doctors.map(d => ({
        value: d.doctorId,
        label: d.doctorName,
      })),
    [doctors]
  );

  const staffAnalystOptions = useMemo(
    () =>
      staffs.map(s => ({
        value: s.staffId,
        label: s.staffName,
      })),
    [staffs]
  );

  const sampleCollectorOptions = useMemo(
    () =>
      staffs.map(s => ({
        value: s.staffId,
        label: s.staffName,
      })),
    [staffs]
  );

  const staffOptions = useMemo(
    () =>
      staffs.map(s => ({
        value: s.staffId,
        label: s.staffName,
      })),
    [staffs]
  );

  const paymentTypeOptions = useMemo(
    () =>
      PAYMENT_TYPE_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
      })),
    []
  );

  const specifyVoteTestCodeOptions = useMemo(
    () =>
      specifies.map(s => {
        const testName = s.genomeTest?.testName || '';
        const code = s.specifyVoteID || '';
        const label = testName ? `${code} - ${testName}` : code;
        return {
          value: s.specifyVoteID,
          label,
        };
      }),
    [specifies]
  );

  const serviceOptions = useMemo(
    () =>
      services.map(s => ({
        value: s.serviceId,
        label: SERVICE_TYPE_MAPPER[s.name] || s.name,
      })),
    [services]
  );

  useEffect(() => {
    const subscription = methods.watch((value, { name }) => {
      if (name === 'doctorId' && value.doctorId && doctors.length > 0) {
        const doctor = doctors.find(d => d.doctorId === value.doctorId);
        if (doctor && doctor.hospitalId) {
          methods.setValue('hospitalId', doctor.hospitalId);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [doctors, methods]);

  const handleSubmit = () => {
    methods.trigger().then(isValid => {
      if (!isValid) {
        const errors = methods.formState.errors;
        if (errors.orderName) {
          Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
        }
        return;
      }

      const formData = methods.getValues();

      const selectedCustomer = formData.customerId
        ? customers.find(c => c.customerId === formData.customerId?.trim())
        : null;

      const payload: any = {
        orderName: formData.orderName.trim(),
        orderStatus: ORDER_STATUS_DEFAULT,
        paymentStatus: 'PENDING',
        paymentType: formData.paymentType || 'CASH',
      };

      if (selectedCustomer?.userId) payload.customerId = selectedCustomer.userId.trim();
      else if (formData.customerId && formData.customerId.trim())
        payload.customerId = formData.customerId.trim();
      if (formData.staffAnalystId?.trim()) payload.staffAnalystId = formData.staffAnalystId.trim();
      if (formData.sampleCollectorId?.trim())
        payload.sampleCollectorId = formData.sampleCollectorId.trim();

      if (formData.paymentAmount && formData.paymentAmount.trim()) {
        const amount = parseFloat(formData.paymentAmount);
        if (!isNaN(amount) && amount > 0) payload.paymentAmount = amount;
      }

      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      ) as Record<string, unknown>;
      const paymentAmount = formData.paymentAmount?.trim()
        ? parseFloat(formData.paymentAmount)
        : 0;

      pendingPaymentRef.current = {
        paymentType: formData.paymentType || 'CASH',
        orderName: formData.orderName.trim(),
        paymentAmount: paymentAmount,
        specifyId: formData.specifyVoteTestCode || undefined,
      };

      console.log('Submitting order with payload:', JSON.stringify(cleanPayload, null, 2));
      createOrderMutation.mutate(cleanPayload as any);
    });
  };

  return (
    <FormProvider {...methods}>
      <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <View className="pb-4 px-4 bg-white border-b border-sky-100">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
            >
              <ArrowLeft size={20} color="#0284C7" />
            </TouchableOpacity>

            <View className="flex-1">
              <Text className="text-slate-900 text-lg font-extrabold">Thêm nhanh đơn hàng</Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                Tạo đơn hàng với thông tin tối thiểu
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          <View className="bg-white rounded-2xl border border-sky-100 p-4">
            <FormInput
              name="orderName"
              label="Tên đơn hàng"
              required
              placeholder="Nhập tên đơn hàng"
              icon={<FilePlus size={18} color="#0284C7" />}
              helperText='Ví dụ: "XN NIPT - Nguyễn Văn A"'
            />

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">
                Bác sĩ chỉ định <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="h-12 rounded-2xl border border-sky-100 bg-white px-3 flex-row items-center"
                activeOpacity={0.75}
                onPress={() => setShowDoctorModal(true)}
              >
                <Stethoscope size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !methods.watch('doctorId') ? 'text-slate-400' : 'text-slate-900'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedDoctorName()}
                </Text>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">
                Phòng khám/Bệnh viện <Text className="text-red-500">*</Text>
              </Text>
              <View className="h-12 rounded-2xl border border-sky-100 bg-slate-50 px-3 flex-row items-center">
                <Building2 size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !getSelectedHospitalName() ? 'text-slate-400' : 'text-slate-600'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedHospitalName() || 'Chọn bác sĩ để hiển thị'}
                </Text>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">
                Nhân viên phụ trách <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="h-12 rounded-2xl border border-sky-100 bg-white px-3 flex-row items-center"
                activeOpacity={0.75}
                onPress={() => setShowStaffAnalystModal(true)}
              >
                <Users size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !methods.watch('staffAnalystId') ? 'text-slate-400' : 'text-slate-900'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedStaffAnalystName()}
                </Text>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-slate-900">Gửi kết quả cho bệnh nhân:</Text>
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`text-sm font-semibold ${methods.watch('sendEmailPatient') ? 'text-sky-600' : 'text-slate-400'}`}
                  >
                    {methods.watch('sendEmailPatient') ? 'Bật' : 'Tắt'}
                  </Text>
                  <Switch
                    value={methods.watch('sendEmailPatient')}
                    onValueChange={value => methods.setValue('sendEmailPatient', value)}
                    trackColor={{ false: '#E2E8F0', true: '#0284C7' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">
                Nhân viên thu mẫu <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="h-12 rounded-2xl border border-sky-100 bg-white px-3 flex-row items-center"
                activeOpacity={0.75}
                onPress={() => setShowSampleCollectorModal(true)}
              >
                <Users size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !methods.watch('sampleCollectorId') ? 'text-slate-400' : 'text-slate-900'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedSampleCollectorName()}
                </Text>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">Hình thức</Text>
              <TouchableOpacity
                className="h-12 rounded-2xl border border-sky-100 bg-white px-3 flex-row items-center"
                activeOpacity={0.75}
                onPress={() => setShowPaymentTypeModal(true)}
              >
                <Coins size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !methods.watch('paymentType') ? 'text-slate-400' : 'text-slate-900'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedPaymentTypeName()}
                </Text>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <FormNumericInput
              name="paymentAmount"
              label="Số tiền đã thu"
              type="integer"
              placeholder="Nhập số tiền (tùy chọn)"
              icon={<Coins size={18} color="#0284C7" />}
            />

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">Người thu tiền</Text>
              <TouchableOpacity
                className="h-12 rounded-2xl border border-sky-100 bg-white px-3 flex-row items-center"
                activeOpacity={0.75}
                onPress={() => setShowStaffModal(true)}
              >
                <Users size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !methods.watch('staffId') ? 'text-slate-400' : 'text-slate-900'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedStaffName()}
                </Text>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">Mã phiếu xét nghiệm</Text>
              <TouchableOpacity
                className="h-12 rounded-2xl border border-sky-100 bg-white px-3 flex-row items-center"
                activeOpacity={0.75}
                onPress={() => setShowSpecifyVoteTestCodeModal(true)}
              >
                <Barcode size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !methods.watch('specifyVoteTestCode') ? 'text-slate-400' : 'text-slate-900'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedSpecifyVoteTestCodeName()}
                </Text>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-bold text-slate-900 mb-2">
                Nhóm xét nghiệm <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="h-12 rounded-2xl border border-sky-100 bg-white px-3 flex-row items-center"
                activeOpacity={0.75}
                onPress={() => setShowServiceModal(true)}
              >
                <TestTube size={18} color="#0284C7" />
                <Text
                  className={`ml-2 flex-1 text-[14px] font-semibold ${
                    !methods.watch('serviceId') ? 'text-slate-400' : 'text-slate-900'
                  }`}
                  numberOfLines={1}
                >
                  {getSelectedServiceName()}
                </Text>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <FormInfoBox>
              Đơn hàng sẽ được tạo với trạng thái <Text className="font-bold">Khởi tạo</Text> và có
              thể chỉnh sửa sau.
            </FormInfoBox>
          </View>
        </ScrollView>

        {/* Selection Modals */}
        <SelectionModal
          visible={showDoctorModal}
          title="Chọn bác sĩ chỉ định"
          options={doctorOptions}
          selectedValue={methods.watch('doctorId')}
          onSelect={value => methods.setValue('doctorId', value)}
          onClose={() => setShowDoctorModal(false)}
        />

        <SelectionModal
          visible={showStaffAnalystModal}
          title="Chọn nhân viên phụ trách"
          options={staffAnalystOptions}
          selectedValue={methods.watch('staffAnalystId')}
          onSelect={value => methods.setValue('staffAnalystId', value)}
          onClose={() => setShowStaffAnalystModal(false)}
        />

        <SelectionModal
          visible={showSampleCollectorModal}
          title="Chọn nhân viên thu mẫu"
          options={sampleCollectorOptions}
          selectedValue={methods.watch('sampleCollectorId')}
          onSelect={value => methods.setValue('sampleCollectorId', value)}
          onClose={() => setShowSampleCollectorModal(false)}
        />

        <SelectionModal
          visible={showStaffModal}
          title="Chọn người thu tiền"
          options={staffOptions}
          selectedValue={methods.watch('staffId')}
          onSelect={value => methods.setValue('staffId', value)}
          onClose={() => setShowStaffModal(false)}
        />

        <SelectionModal
          visible={showPaymentTypeModal}
          title="Chọn hình thức thanh toán"
          options={paymentTypeOptions}
          selectedValue={methods.watch('paymentType')}
          onSelect={value => methods.setValue('paymentType', value as 'CASH' | 'ONLINE_PAYMENT')}
          onClose={() => setShowPaymentTypeModal(false)}
        />

        <SelectionModal
          visible={showSpecifyVoteTestCodeModal}
          title="Chọn mã phiếu xét nghiệm"
          options={specifyVoteTestCodeOptions}
          selectedValue={methods.watch('specifyVoteTestCode')}
          onSelect={value => methods.setValue('specifyVoteTestCode', value)}
          onClose={() => setShowSpecifyVoteTestCodeModal(false)}
        />

        <SelectionModal
          visible={showServiceModal}
          title="Chọn nhóm xét nghiệm"
          options={serviceOptions}
          selectedValue={methods.watch('serviceId')}
          onSelect={value => methods.setValue('serviceId', value)}
          onClose={() => setShowServiceModal(false)}
        />

        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-sky-100 p-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 h-12 rounded-2xl items-center justify-center bg-white border border-sky-200"
            onPress={() => router.back()}
            activeOpacity={0.8}
            disabled={createOrderMutation.isPending}
          >
            <Text className="text-[15px] font-extrabold text-slate-600">Huỷ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 h-12 rounded-2xl items-center justify-center ${
              createOrderMutation.isPending ? 'bg-sky-400' : 'bg-sky-600'
            }`}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-[15px] font-extrabold text-white">Thêm mới</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </FormProvider>
  );
}
