import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  FileText,
  Search,
  X,
  ChevronRight,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { getApiResponseData } from "@/lib/types/api-types";
import { orderService } from "@/services/orderService";
import { sampleAddService, SampleAddResponse } from "@/services/sampleAddService";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount?: number): string => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("vi-VN").format(amount);
};

const getStatusLabel = (status: string): string => {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    initation: "Khởi tạo",
    forward_analysis: "Chuyển phân tích",
    accepted: "Đã chấp nhận",
    rejected: "Từ chối",
  };
  return map[s] || status;
};

interface SampleAddWithOrder extends SampleAddResponse {
  id?: string;
  orderName?: string;
  patientName?: string;
  hospitalName?: string;
}

export default function CustomerSampleAddsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [focusSearch, setFocusSearch] = useState(false);

  const {
    data: ordersResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["customer-sample-adds", user?.id],
    queryFn: async () => {
      if (!user?.id) return { success: false, data: [] };
      const ordersRes = await orderService.getByCustomerId(user.id, {});
      const orders = getApiResponseData(ordersRes) || [];
      const allSampleAdds: SampleAddWithOrder[] = [];

      for (const order of orders) {
        try {
          const saRes = await sampleAddService.getByOrderId(order.orderId);
          const items = (saRes?.success && saRes?.data ? saRes.data : []) as SampleAddResponse[];
          const ord = order as any;
          const withOrder = items.map((sa) => ({
            ...sa,
            id: sa.id ?? sa.sampleAddId,
            orderName: order.orderName,
            patientName: ord.specifyId?.patient?.patientName,
            hospitalName: ord.specifyId?.hospital?.hospitalName,
          }));
          allSampleAdds.push(...withOrder);
        } catch {
          // skip
        }
      }
      return { success: true, data: allSampleAdds };
    },
    enabled: !!user?.id,
    retry: false,
  });

  const sampleAdds = useMemo(() => {
    const res = ordersResponse as any;
    return res?.data || [];
  }, [ordersResponse]);

  const filtered = useMemo(() => {
    return sampleAdds.filter((sa: SampleAddWithOrder) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(sa.sampleName || "").toLowerCase().includes(q) ||
        String(sa.orderId || "").toLowerCase().includes(q) ||
        String(sa.orderName || "").toLowerCase().includes(q) ||
        String(sa.patientName || "").toLowerCase().includes(q) ||
        String(sa.hospitalName || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (sa.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [sampleAdds, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50 p-5">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-white rounded-2xl p-4 border border-sky-100 w-full max-w-[420px]">
          <Text className="text-base font-extrabold text-slate-900 text-center mb-2">
            Không tải được dữ liệu
          </Text>
          <TouchableOpacity
            className="bg-sky-600 py-3 rounded-2xl items-center mt-4"
            onPress={() => refetch()}
            activeOpacity={0.85}
          >
            <Text className="text-white text-sm font-extrabold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

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
            <Text className="text-slate-900 text-lg font-extrabold">
              Bổ sung mẫu
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filtered.length} yêu cầu
            </Text>
          </View>
        </View>

        <View
          className={`mt-3 flex-row items-center rounded-2xl px-3 bg-sky-50 border ${
            focusSearch ? "border-sky-400" : "border-sky-100"
          }`}
        >
          <Search size={18} color="#64748B" />
          <TextInput
            className="flex-1 h-11 ml-2 text-[14px] text-slate-900 font-semibold"
            placeholder="Tìm theo mẫu, đơn hàng, bệnh nhân..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocusSearch(true)}
            onBlur={() => setFocusSearch(false)}
          />
          {searchQuery.trim() ? (
            <TouchableOpacity
              className="w-9 h-9 rounded-xl items-center justify-center"
              onPress={() => setSearchQuery("")}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-1"
        >
          <View className="flex-row gap-2 px-1">
            {["all", "initation", "forward_analysis", "accepted", "rejected"].map(
              (s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full border ${
                    statusFilter === s
                      ? "bg-sky-600 border-sky-600"
                      : "bg-white border-sky-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      statusFilter === s ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {s === "all" ? "Tất cả" : getStatusLabel(s)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => refetch()}
            tintColor="#0284C7"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-sky-100">
            <FileText size={48} color="#cbd5e1" />
            <Text className="text-sm font-bold text-slate-500 mt-3 text-center">
              Không có yêu cầu bổ sung mẫu nào
            </Text>
          </View>
        ) : (
          filtered.map((sa: SampleAddWithOrder) => (
            <TouchableOpacity
              key={sa.id || sa.sampleAddId || sa.orderId + (sa.sampleName || "")}
              onPress={() =>
                router.push({
                  pathname: "/customer/order-detail",
                  params: { orderId: sa.orderId },
                })
              }
              className="bg-white rounded-2xl p-4 mb-3 border border-sky-100"
              activeOpacity={0.85}
            >
              <View className="flex-row items-start justify-between mb-2">
                <Text className="text-sm font-extrabold text-slate-900 flex-1">
                  {sa.sampleName || "N/A"}
                </Text>
                <View className="px-2 py-1 rounded-lg bg-sky-50 border border-sky-200">
                  <Text className="text-[10px] font-bold text-sky-700">
                    {getStatusLabel(sa.status || "")}
                  </Text>
                </View>
              </View>
              <View className="mt-2 pt-2 border-t border-sky-50">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-xs text-slate-500">Đơn hàng:</Text>
                  <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                    {sa.orderName || sa.orderId || "N/A"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-xs text-slate-500">Bệnh nhân:</Text>
                  <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                    {sa.patientName || "N/A"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-slate-500">Bệnh viện:</Text>
                  <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                    {sa.hospitalName || "N/A"}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-end mt-3">
                <Text className="text-xs font-bold text-sky-600 mr-1">Xem đơn hàng</Text>
                <ChevronRight size={16} color="#0284C7" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
