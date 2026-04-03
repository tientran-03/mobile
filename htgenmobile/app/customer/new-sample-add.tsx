import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SuccessModal } from "@/components/modals";
import { getApiResponseData, getApiResponseSingle } from "@/lib/types/api-types";
import { sampleAddService } from "@/services/sampleAddService";
import { sampleAddServiceCatalogService, SampleAddServiceCatalogResponse } from "@/services/sampleAddServiceCatalogService";
import { orderService, OrderResponse } from "@/services/orderService";

const formatCurrency = (amount?: number) => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("vi-VN").format(amount);
};

export default function CustomerNewSampleAddScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { data: orderRes, isLoading: loadingOrder } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: !!orderId,
  });

  const { data: servicesRes, isLoading: loadingServices } = useQuery({
    queryKey: ["sample-add-services-catalog"],
    queryFn: () => sampleAddServiceCatalogService.getAll(),
  });

  const order = getApiResponseSingle<OrderResponse>(orderRes);
  const services = getApiResponseData<SampleAddServiceCatalogResponse>(servicesRes) || [];
  const selectedService = services.find((s) => s.id === selectedServiceId);

  const specify = order?.specifyId as any;
  const specifyId = specify?.specifyVoteID || specify?.specifyVoteId || "";
  const patientId = specify?.patientId || specify?.patient?.patientId || "";

  const createMutation = useMutation({
    mutationFn: (data: any) => sampleAddService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-sample-adds"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "customer"] });
      setShowSuccessModal(true);
    },
    onError: (err: any) => {
      Alert.alert("Lỗi", err?.message || "Không thể thêm mẫu bổ sung. Vui lòng thử lại.");
    },
  });

  const handleSubmit = () => {
    if (!selectedService) {
      Alert.alert("Lỗi", "Vui lòng chọn loại mẫu bổ sung");
      return;
    }
    if (!orderId || !specifyId || !patientId) {
      Alert.alert("Lỗi", "Thiếu thông tin đơn hàng. Vui lòng quay lại và thử lại.");
      return;
    }

    setIsSubmitting(true);
    createMutation.mutate(
      {
        sampleName: selectedService.sampleName,
        specifyId,
        orderId,
        patientId,
        note: note.trim() || undefined,
      },
      {
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  const isLoading = loadingOrder || loadingServices;

  if (loadingOrder && !order) {
    return (
      <SafeAreaView className="flex-1 bg-sky-50" edges={["top", "left", "right"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0284C7" />
          <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order && !loadingOrder) {
    return (
      <SafeAreaView className="flex-1 bg-sky-50" edges={["top", "left", "right"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-slate-700 font-bold text-center">Không tìm thấy đơn hàng</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 px-6 py-3 rounded-xl bg-sky-600"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="pb-3 px-4 bg-white border-b border-sky-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#0284C7" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">Thêm mẫu bổ sung</Text>
            <Text className="mt-0.5 text-xs text-slate-500">Đơn: {order?.orderId || orderId}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
          <Text className="text-[13px] text-slate-500 mb-1">Mã đơn hàng</Text>
          <Text className="text-[15px] font-bold text-slate-900">{order?.orderId}</Text>
          {order?.orderName && (
            <>
              <Text className="text-[13px] text-slate-500 mt-3 mb-1">Tên đơn hàng</Text>
              <Text className="text-[15px] font-bold text-slate-900">{order.orderName}</Text>
            </>
          )}
        </View>

        <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
          <Text className="text-[15px] font-extrabold text-slate-900 mb-3">
            Loại mẫu bổ sung <Text className="text-red-500">*</Text>
          </Text>
          {loadingServices ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#0284C7" />
              <Text className="mt-2 text-slate-500 text-sm">Đang tải danh sách...</Text>
            </View>
          ) : services.length === 0 ? (
            <Text className="text-slate-500 text-sm">Không có dịch vụ mẫu bổ sung</Text>
          ) : (
            <View className="gap-2">
              {services.map((svc) => {
                const isSelected = selectedServiceId === svc.id;
                return (
                  <TouchableOpacity
                    key={svc.id}
                    onPress={() => setSelectedServiceId(svc.id)}
                    className={`p-4 rounded-xl border-2 ${
                      isSelected ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"
                    }`}
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-[14px] font-bold text-slate-900">{svc.sampleName}</Text>
                        <Text className="text-[13px] text-sky-600 font-semibold mt-1">
                          {formatCurrency(svc.finalPrice)} VNĐ
                        </Text>
                      </View>
                      {isSelected && <Plus size={20} color="#0284C7" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {selectedService && (
          <View className="bg-sky-50 rounded-2xl border border-sky-200 p-4 mb-4">
            <Text className="text-[13px] font-bold text-slate-700 mb-2">Tổng tiền</Text>
            <Text className="text-[20px] font-extrabold text-sky-700">
              {formatCurrency(selectedService.finalPrice)} VNĐ
            </Text>
          </View>
        )}

        <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
          <Text className="text-[15px] font-extrabold text-slate-900 mb-3">Ghi chú</Text>
          <TextInput
            className="h-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
            placeholder="Nhập ghi chú (không bắt buộc)"
            placeholderTextColor="#94A3B8"
            value={note}
            onChangeText={setNote}
            multiline
            editable={!isSubmitting}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || !selectedServiceId}
          className="h-14 rounded-2xl bg-sky-600 items-center justify-center"
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-[16px] font-extrabold">Thêm mẫu bổ sung</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <SuccessModal
        visible={showSuccessModal}
        title="Thêm mẫu thành công"
        message="Yêu cầu bổ sung mẫu đã được gửi. Bạn có thể xem trạng thái tại mục Bổ sung mẫu."
        onClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
