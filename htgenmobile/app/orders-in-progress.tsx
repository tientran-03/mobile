import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Search, X, Eye, ChevronDown } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getOrderStatusLabel } from "@/lib/constants/order-status";
import { orderService, OrderResponse } from "@/services/orderService";
import { OrderStatus as OrderStatusEnum, SpecifyStatus } from "@/lib/schemas/order-form-schema";
import { specifyVoteTestService } from "@/services/specifyVoteTestService";
import { OrderStatus } from "@/types";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
};

const getStatusPillClass = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "initiation") return { bg: "bg-orange-500/12", text: "text-orange-600", border: "border-orange-200" };
  if (s === "in_progress" || s === "forward_analysis") return { bg: "bg-sky-500/12", text: "text-sky-700", border: "border-sky-200" };
  if (s === "accepted") return { bg: "bg-emerald-500/12", text: "text-emerald-700", border: "border-emerald-200" };
  if (s === "sample_error") return { bg: "bg-red-500/12", text: "text-red-700", border: "border-red-200" };
  if (s === "rerun_testing") return { bg: "bg-yellow-500/12", text: "text-yellow-700", border: "border-yellow-200" };
  return { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-200" };
};

// Status options for IN_PROGRESS orders
const IN_PROGRESS_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: OrderStatusEnum.FORWARD_ANALYSIS as OrderStatus, label: "Chuyển phân tích" },
  { value: OrderStatusEnum.IN_PROGRESS as OrderStatus, label: "Đang phân tích" },
  { value: OrderStatusEnum.SAMPLE_ERROR as OrderStatus, label: "Lỗi mẫu" },
  { value: OrderStatusEnum.RERUN_TESTING as OrderStatus, label: "Chạy lại xét nghiệm" },
];

export default function OrdersInProgressScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [focusSearch, setFocusSearch] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { data: ordersResponse, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["orders", "in_progress"],
    queryFn: () => orderService.getByStatus(OrderStatus.IN_PROGRESS),
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, specifyId }: { orderId: string; status: OrderStatus; specifyId?: string }) => {
      console.log(`[OrdersInProgress] Mutation started: orderId=${orderId}, status=${status} (type: ${typeof status}), specifyId=${specifyId}`);
      
      try {
        // Ensure status is a string
        const statusString = typeof status === 'string' ? status : String(status);
        console.log(`[OrdersInProgress] Status string to send to API: ${statusString}`);
        
        // Update order status
        console.log(`[OrdersInProgress] Calling orderService.updateStatus with statusString=${statusString}...`);
        const orderResponse = await orderService.updateStatus(orderId, statusString);
        console.log(`[OrdersInProgress] Order update response:`, JSON.stringify(orderResponse, null, 2));
        
        if (!orderResponse.success) {
          const errorMsg = orderResponse.error || orderResponse.message || 'Không thể cập nhật trạng thái đơn hàng';
          console.error(`[OrdersInProgress] Order update failed: ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        console.log(`[OrdersInProgress] Order status updated successfully`);
        
        // If status is FORWARD_ANALYSIS, also update specify status (matching frontend behavior)
        console.log(`[OrdersInProgress] Checking if status is FORWARD_ANALYSIS: statusString=${statusString}, OrderStatusEnum.FORWARD_ANALYSIS=${OrderStatusEnum.FORWARD_ANALYSIS}`);
        if (statusString === OrderStatusEnum.FORWARD_ANALYSIS && specifyId) {
          try {
            console.log(`[OrdersInProgress] Updating specify status to FORWARD_ANALYSIS...`);
            const specifyResponse = await specifyVoteTestService.updateStatus(specifyId, SpecifyStatus.FORWARD_ANALYSIS);
            console.log(`[OrdersInProgress] Specify update response:`, JSON.stringify(specifyResponse, null, 2));
            console.log(`[OrdersInProgress] Updated specify ${specifyId} status to FORWARD_ANALYSIS`);
          } catch (specifyError: any) {
            console.error('[OrdersInProgress] Failed to update specify status:', specifyError);
            // Continue anyway, order status was updated successfully
          }
        }
        
        return orderResponse;
      } catch (error: any) {
        console.error(`[OrdersInProgress] Mutation error:`, error);
        console.error(`[OrdersInProgress] Error details:`, {
          message: error?.message,
          response: error?.response,
          stack: error?.stack
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(`[OrdersInProgress] Mutation onSuccess called`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "in_progress"] });
      setShowStatusModal(false);
      setSelectedOrderId(null);
      Alert.alert("Thành công", "Cập nhật trạng thái thành công");
    },
    onError: (error: any) => {
      console.error(`[OrdersInProgress] Mutation onError:`, error);
      const errorMessage = error?.message || error?.response?.data?.error || "Không thể cập nhật trạng thái";
      Alert.alert("Lỗi", errorMessage);
    },
  });

  const orders = useMemo(() => {
    if (!ordersResponse?.success || !ordersResponse.data) return [];
    const orders = ordersResponse.data as OrderResponse[];

    return orders
      .map((order) => {
        const patientName =
          order.patientMetadata && order.patientMetadata.length > 0
            ? order.patientMetadata[0].patientId || ""
            : (order as any)?.specifyId?.patient?.patientName || "";

        return {
          id: order.orderId,
          code: order.orderId,
          name: order.orderName,
          status: order.orderStatus,
          customerName: order.customerName || "",
          patientName,
          hospitalName: (order as any)?.specifyId?.hospital?.hospitalName || "",
          testName: (order as any)?.specifyId?.genomeTest?.testName || "",
          date: formatDate(order.createdAt),
          createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [ordersResponse]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((o) => {
      return (
        (o.code || "").toLowerCase().includes(q) ||
        (o.name || "").toLowerCase().includes(q) ||
        (o.customerName || "").toLowerCase().includes(q) ||
        (o.patientName || "").toLowerCase().includes(q) ||
        (o.hospitalName || "").toLowerCase().includes(q) ||
        (o.testName || "").toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    console.log(`[OrdersInProgress] handleStatusChange called: orderId=${orderId}, status=${newStatus} (type: ${typeof newStatus})`);
    
    // Find order to get specifyId from the original order data
    const orderData = ordersResponse?.success && ordersResponse.data 
      ? (ordersResponse.data as OrderResponse[]).find(o => o.orderId === orderId)
      : null;
    const specifyId = orderData?.specifyId?.specifyVoteID;
    
    console.log(`[OrdersInProgress] Found order data:`, orderData ? 'Yes' : 'No');
    console.log(`[OrdersInProgress] SpecifyId:`, specifyId);
    console.log(`[OrdersInProgress] Current order status:`, orderData?.orderStatus);
    
    // Convert enum value to string if needed
    const statusString = typeof newStatus === 'string' ? newStatus : (newStatus as any).value || String(newStatus);
    console.log(`[OrdersInProgress] Status string to send:`, statusString);
    
    updateStatusMutation.mutate({ 
      orderId, 
      status: statusString as OrderStatus,
      specifyId: specifyId || undefined
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50 px-4">
        <Text className="text-red-600 text-center font-bold">Có lỗi xảy ra khi tải dữ liệu</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="mt-4 px-6 py-3 bg-sky-600 rounded-xl"
        >
          <Text className="text-white font-bold">Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <StatusBar barStyle="dark-content" />

      {/* Header */}
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
            <Text className="text-slate-900 text-lg font-extrabold">Đơn hàng đang phân tích</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filtered.length} đơn hàng
            </Text>
          </View>
        </View>

        {/* Search */}
        <View className={`mt-3 h-12 rounded-2xl flex-row items-center px-4 border ${
          focusSearch ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-slate-50"
        }`}>
          <Search size={18} color={focusSearch ? "#0284C7" : "#64748B"} />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-slate-900 font-semibold"
            placeholder="Tìm kiếm đơn hàng..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocusSearch(true)}
            onBlur={() => setFocusSearch(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#0284C7" />
        }
      >
        {filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-slate-500 text-base font-semibold">
              {searchQuery ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng đang phân tích"}
            </Text>
          </View>
        ) : (
          filtered.map((order) => {
            const statusClass = getStatusPillClass(order.status);
            return (
              <TouchableOpacity
                key={order.id}
                className="bg-white rounded-2xl border border-sky-100 p-4 mb-3"
                activeOpacity={0.85}
                onPress={() => router.push(`/order-detail?id=${order.id}`)}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-slate-900 text-base font-extrabold" numberOfLines={1}>
                      {order.name || order.code}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500 font-semibold">
                      Mã: {order.code}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-xl border ${statusClass.bg} ${statusClass.border}`}
                  >
                    <Text className={`text-xs font-extrabold ${statusClass.text}`}>
                      {getOrderStatusLabel(order.status)}
                    </Text>
                  </View>
                </View>

                {order.hospitalName && (
                  <View className="flex-row items-center mt-2">
                    <Text className="text-xs text-slate-500 font-semibold">
                      Bệnh viện: {order.hospitalName}
                    </Text>
                  </View>
                )}

                {order.testName && (
                  <View className="flex-row items-center mt-1">
                    <Text className="text-xs text-slate-500 font-semibold" numberOfLines={1}>
                      Dịch vụ: {order.testName}
                    </Text>
                  </View>
                )}

                {order.patientName && (
                  <View className="flex-row items-center mt-1">
                    <Text className="text-xs text-slate-500 font-semibold">
                      Bệnh nhân: {order.patientName}
                    </Text>
                  </View>
                )}

                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <Text className="text-xs text-slate-400 font-semibold">
                    {order.date}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(order.id);
                        setShowStatusModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 flex-row items-center"
                      activeOpacity={0.8}
                    >
                      <ChevronDown size={14} color="#0284C7" />
                      <Text className="ml-1 text-xs font-extrabold text-sky-700">Đổi trạng thái</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/order-detail?id=${order.id}`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
                      activeOpacity={0.8}
                    >
                      <Eye size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowStatusModal(false);
          setSelectedOrderId(null);
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-5">
          <View className="bg-white rounded-3xl w-full max-w-[400px] overflow-hidden border border-slate-200">
            <View className="p-5 border-b border-slate-200">
              <Text className="text-lg font-extrabold text-slate-900">Chọn trạng thái mới</Text>
              <Text className="mt-1 text-sm text-slate-500">
                Chọn trạng thái để cập nhật cho đơn hàng
              </Text>
            </View>

            <ScrollView className="max-h-[400px]">
              {IN_PROGRESS_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  onPress={() => {
                    if (selectedOrderId) {
                      console.log(`[OrdersInProgress] Status option pressed: ${status.label} (${status.value})`);
                      handleStatusChange(selectedOrderId, status.value);
                    }
                  }}
                  className="px-5 py-4 border-b border-slate-100 active:bg-slate-50"
                  disabled={updateStatusMutation.isPending}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-slate-900">
                      {status.label}
                    </Text>
                    {updateStatusMutation.isPending && selectedOrderId && (
                      <ActivityIndicator size="small" color="#0284C7" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="p-4 border-t border-slate-200 bg-slate-50">
              <TouchableOpacity
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedOrderId(null);
                }}
                className="h-12 rounded-2xl items-center justify-center bg-white border border-slate-200"
                activeOpacity={0.85}
              >
                <Text className="text-[14px] font-extrabold text-slate-700">Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
