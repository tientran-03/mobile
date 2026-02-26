import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import { SuccessModal } from '@/components/modals';
import { sampleAddService } from '@/services/sampleAddService';
import { orderService } from '@/services/orderService';
import { specifyVoteTestService } from '@/services/specifyVoteTestService';
import { patientService } from '@/services/patientService';

export default function NewSampleAddScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sampleName, setSampleName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [specifyId, setSpecifyId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
  });

  const { data: specifiesResponse } = useQuery({
    queryKey: ['specify-vote-tests'],
    queryFn: () => specifyVoteTestService.getAll(),
  });

  const { data: patientsResponse } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getAll(),
  });

  const orders = ordersResponse?.success ? (ordersResponse.data as any[]) || [] : [];
  const specifies = specifiesResponse?.success ? (specifiesResponse.data as any[]) || [] : [];
  const patients = patientsResponse?.success ? (patientsResponse.data as any[]) || [] : [];

  const handleSubmit = async () => {
    if (!sampleName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên mẫu xét nghiệm');
      return;
    }

    setIsSubmitting(true);
    try {
      const request: any = {
        sampleName: sampleName.trim(),
        ...(orderId && { orderId }),
        ...(specifyId && { specifyId }),
        ...(patientId && { patientId }),
        ...(note.trim() && { note: note.trim() }),
      };

      const response = await sampleAddService.create(request);

      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['sample-adds'] });
        setShowSuccessModal(true);
      } else {
        Alert.alert('Lỗi', response.error || response.message || 'Không thể tạo mẫu xét nghiệm');
      }
    } catch (error: any) {
      console.error('Error creating sample add:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể tạo mẫu xét nghiệm. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View className="pb-3 px-4 bg-white border-b border-sky-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">Tạo mẫu xét nghiệm bổ sung</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 rounded-2xl bg-white border border-slate-200 p-4">
          <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
            Thông tin mẫu xét nghiệm
          </Text>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-slate-700 mb-2">
              Tên mẫu xét nghiệm <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 font-semibold"
              placeholder="Nhập tên mẫu xét nghiệm"
              placeholderTextColor="#94A3B8"
              value={sampleName}
              onChangeText={setSampleName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-slate-700 mb-2">Mã đơn hàng</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 font-semibold"
                placeholder="Nhập mã đơn hàng"
                placeholderTextColor="#94A3B8"
                value={orderId}
                onChangeText={setOrderId}
              />
              {orders.length > 0 && (
                <TouchableOpacity
                  className="h-12 px-4 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center"
                  onPress={() => {
                    // Show order picker modal
                    Alert.alert(
                      'Chọn đơn hàng',
                      'Chức năng chọn đơn hàng sẽ được thêm sau',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text className="text-xs font-bold text-sky-700">Chọn</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-slate-700 mb-2">Mã phiếu chỉ định</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 font-semibold"
                placeholder="Nhập mã phiếu chỉ định"
                placeholderTextColor="#94A3B8"
                value={specifyId}
                onChangeText={setSpecifyId}
              />
              {specifies.length > 0 && (
                <TouchableOpacity
                  className="h-12 px-4 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center"
                  onPress={() => {
                    Alert.alert(
                      'Chọn phiếu chỉ định',
                      'Chức năng chọn phiếu chỉ định sẽ được thêm sau',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text className="text-xs font-bold text-sky-700">Chọn</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-slate-700 mb-2">Mã bệnh nhân</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 font-semibold"
                placeholder="Nhập mã bệnh nhân"
                placeholderTextColor="#94A3B8"
                value={patientId}
                onChangeText={setPatientId}
              />
              {patients.length > 0 && (
                <TouchableOpacity
                  className="h-12 px-4 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center"
                  onPress={() => {
                    Alert.alert(
                      'Chọn bệnh nhân',
                      'Chức năng chọn bệnh nhân sẽ được thêm sau',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text className="text-xs font-bold text-sky-700">Chọn</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-slate-700 mb-2">Ghi chú</Text>
            <TextInput
              className="min-h-[100px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900 font-semibold"
              placeholder="Nhập ghi chú (nếu có)"
              placeholderTextColor="#94A3B8"
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || !sampleName.trim()}
          className={`rounded-2xl py-4 px-6 items-center ${
            isSubmitting || !sampleName.trim() ? 'bg-slate-300' : 'bg-sky-600'
          }`}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-[15px]">Tạo mẫu xét nghiệm</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <SuccessModal
        visible={showSuccessModal}
        title="Tạo thành công"
        message="Mẫu xét nghiệm bổ sung đã được tạo thành công."
        onClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
