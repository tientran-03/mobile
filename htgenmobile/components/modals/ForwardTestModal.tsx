import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Modal } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { orderService } from '@/services/orderService';
import { patientMetadataService } from '@/services/patientMetadataService';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentType } from '@/types';
import { PaymentStatus } from '@/lib/schemas/order-form-schema';

interface ForwardTestModalProps {
  visible: boolean;
  onClose: () => void;
  specifyData: {
    specifyVoteID: string;
    fullSpecifyData?: any;
  } | null;
  onSuccess?: () => void;
  /** When ONLINE_PAYMENT, called with order info to navigate to payment screen */
  onNavigateToPayment?: (params: { orderId: string; orderName: string; amount: number; specifyId: string }) => void;
}

export const ForwardTestModal: React.FC<ForwardTestModalProps> = ({
  visible,
  onClose,
  specifyData,
  onSuccess,
  onNavigateToPayment,
}) => {
  const { user } = useAuth();
  const [hasFastq, setHasFastq] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [orderName, setOrderName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasFastq(false);
      setPaymentType('CASH');
      setOrderName('');
      setOrderNote('');
    }
  }, [visible]);

  const handleFastqChange = (checked: boolean) => {
    setHasFastq(checked);
    setPaymentType(checked ? 'ONLINE_PAYMENT' : 'CASH');
  };

  const handleForward = async () => {
    if (!specifyData || !user?.id) {
      Alert.alert('Lỗi', 'Không thể xác định thông tin người dùng');
      return;
    }

    if (!orderName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên đơn hàng');
      return;
    }

    setIsForwarding(true);

    try {
      const genomeTest = specifyData.fullSpecifyData?.genomeTest;
      const paymentAmount = genomeTest?.finalPrice ?? genomeTest?.price ?? 0;
      const rawSamples = genomeTest?.testSample;
      const testSamples = Array.isArray(rawSamples) ? rawSamples : (rawSamples ? [String(rawSamples)] : []);
      const patientId = specifyData.fullSpecifyData?.patientId ?? specifyData.fullSpecifyData?.patient?.patientId;

      // Step 1: Create PatientMetadata for each sample
      const createdMetadataLabcodes: string[] = [];

      if (testSamples.length > 0 && patientId) {
        for (const sampleName of testSamples) {
          try {
            const metadataResult = await patientMetadataService.create({
              specifyId: specifyData.specifyVoteID,
              patientId: patientId,
              sampleName: sampleName,
            });
            if (metadataResult.success && metadataResult.data) {
              createdMetadataLabcodes.push(metadataResult.data.labcode);
            }
          } catch (metadataError) {
            console.error(`Error creating patient metadata for sample ${sampleName}:`, metadataError);
          }
        }
      }

      const orderRequest: any = {
        orderName: orderName.trim(),
        // Only include customerId if user has ROLE_CUSTOMER
        // Backend will throw error if customerId is provided but customer doesn't exist
        ...(user.role === 'ROLE_CUSTOMER' && { customerId: user.id }),
        specifyId: specifyData.specifyVoteID,
        paymentType: paymentType,
        paymentAmount: paymentAmount > 0 ? paymentAmount : undefined,
        orderStatus: 'initiation', // Match frontend: OrderStatus.INITIATION
        paymentStatus: paymentType === 'ONLINE_PAYMENT' ? PaymentStatus.PENDING : PaymentStatus.UNPAID,
        ...(orderNote.trim() && { orderNote: orderNote.trim() }),
      };

      const orderResult = await orderService.create(orderRequest);

      if (orderResult.success && orderResult.data) {
        const order = orderResult.data;
        const orderId = order.orderId;
        const orderNameVal = order.orderName || orderName.trim();
        const amountVal = paymentAmount > 0 ? paymentAmount : (order.paymentAmount ?? 0);

        if (paymentType === 'ONLINE_PAYMENT' && amountVal > 0 && onNavigateToPayment) {
          onClose();
          onSuccess?.();
          onNavigateToPayment({
            orderId,
            orderName: orderNameVal,
            amount: amountVal,
            specifyId: specifyData.specifyVoteID,
          });
        } else {
          Alert.alert(
            'Thành công',
            'Đã chuyển phiếu chỉ định thành đơn hàng thành công!',
            [
              {
                text: 'OK',
                onPress: () => {
                  onSuccess?.();
                  onClose();
                },
              },
            ]
          );
        }
      } else {
        throw new Error(orderResult.error || 'Không thể tạo đơn hàng');
      }
    } catch (error: any) {
      console.error('Error forwarding test:', error);
      
      // Handle duplicate specify_id error
      const errorMessage = error?.message || error?.toString() || '';
      if (
        errorMessage.includes('duplicate key') ||
        errorMessage.includes('uk66b7ribqen473vde5ay62u050') ||
        errorMessage.includes('already exists')
      ) {
        Alert.alert(
          'Lỗi',
          `Phiếu chỉ định ${specifyData.specifyVoteID} đã được chuyển thành đơn hàng rồi. Không thể tạo đơn hàng mới với cùng phiếu chỉ định.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Lỗi', errorMessage || 'Không thể chuyển phiếu chỉ định. Vui lòng thử lại.');
      }
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-2xl w-full max-w-md p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-extrabold text-slate-900">Chuyển phiếu chỉ định</Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={isForwarding}
              className="w-8 h-8 items-center justify-center"
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="mb-4">
              <Text className="text-[13px] font-semibold text-slate-700 mb-2">
                Tên đơn hàng <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 font-semibold"
                placeholder="Nhập tên đơn hàng"
                placeholderTextColor="#94A3B8"
                value={orderName}
                onChangeText={setOrderName}
                editable={!isForwarding}
              />
            </View>

            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-semibold text-slate-700">
                  Có FASTQ file
                </Text>
                <Switch
                  value={hasFastq}
                  onValueChange={handleFastqChange}
                  disabled={isForwarding}
                  trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text className="text-xs text-slate-500 mt-1">
                Nếu có FASTQ file, hình thức thanh toán sẽ là thanh toán online
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-[13px] font-semibold text-slate-700 mb-2">Ghi chú</Text>
              <TextInput
                className="min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900 font-semibold"
                placeholder="Nhập ghi chú (nếu có)"
                placeholderTextColor="#94A3B8"
                value={orderNote}
                onChangeText={setOrderNote}
                multiline
                textAlignVertical="top"
                editable={!isForwarding}
              />
            </View>

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={onClose}
                disabled={isForwarding}
                className="flex-1 rounded-xl py-3 px-4 bg-slate-100 items-center"
              >
                <Text className="text-slate-700 font-bold text-[14px]">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleForward}
                disabled={isForwarding || !orderName.trim()}
                className={`flex-1 rounded-xl py-3 px-4 items-center ${
                  isForwarding || !orderName.trim() ? 'bg-slate-300' : 'bg-sky-600'
                }`}
              >
                {isForwarding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-[14px]">Chuyển</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
