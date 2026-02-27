import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  FileText,
  Search,
  X,
  ChevronRight,
  Download,
  Printer,
  Mail,
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { getApiResponseData } from "@/lib/types/api-types";
import { orderService, OrderResponse } from "@/services/orderService";

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

export default function PatientResultsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState<string>("all");
  const [focusSearch, setFocusSearch] = useState(false);

  const {
    data: ordersResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["customer-orders-results", user?.id],
    queryFn: () => orderService.getByCustomerId(user!.id, {}),
    enabled: !!user?.id,
    retry: false,
  });

  const orders = useMemo(() => {
    return getApiResponseData<OrderResponse>(ordersResponse) || [];
  }, [ordersResponse]);

  const completedOrders = useMemo(() => {
    return orders.filter(
      (o) => (o.orderStatus || "").toLowerCase() === "completed"
    );
  }, [orders]);

  const hospitals = useMemo(() => {
    const set = new Set<string>();
    completedOrders.forEach((o) => {
      const name = (o as any).specifyId?.hospital?.hospitalName;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [completedOrders]);

  const filtered = useMemo(() => {
    return completedOrders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const ord = order as any;
      const matchesSearch =
        !q ||
        String(order.orderId || "").toLowerCase().includes(q) ||
        String(order.orderName || "").toLowerCase().includes(q) ||
        String(ord.specifyId?.patient?.patientName || "")
          .toLowerCase()
          .includes(q) ||
        String(ord.specifyId?.genomeTest?.testName || "")
          .toLowerCase()
          .includes(q) ||
        String(ord.specifyId?.hospital?.hospitalName || "")
          .toLowerCase()
          .includes(q);

      const matchesHospital =
        hospitalFilter === "all" ||
        ord.specifyId?.hospital?.hospitalName === hospitalFilter;

      return matchesSearch && matchesHospital;
    });
  }, [completedOrders, searchQuery, hospitalFilter]);

  const handleDownload = () => {
    Alert.alert(
      "Tính năng đang phát triển",
      "Tải kết quả xét nghiệm sẽ được triển khai trong phiên bản tiếp theo. Vui lòng sử dụng phiên bản web để tải kết quả."
    );
  };

  const handlePrint = () => {
    Alert.alert(
      "Tính năng đang phát triển",
      "In kết quả xét nghiệm sẽ được triển khai trong phiên bản tiếp theo."
    );
  };

  const handleSendEmail = () => {
    Alert.alert(
      "Tính năng đang phát triển",
      "Gửi kết quả qua email sẽ được triển khai trong phiên bản tiếp theo."
    );
  };

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
              Trả kết quả
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filtered.length} đơn hàng đã hoàn thành
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
            placeholder="Tìm theo đơn hàng, bệnh nhân, xét nghiệm..."
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

        {hospitals.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2 -mx-1"
          >
            <View className="flex-row gap-2 px-1">
              <TouchableOpacity
                onPress={() => setHospitalFilter("all")}
                className={`px-3 py-1.5 rounded-full border ${
                  hospitalFilter === "all"
                    ? "bg-sky-600 border-sky-600"
                    : "bg-white border-sky-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    hospitalFilter === "all" ? "text-white" : "text-slate-600"
                  }`}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              {hospitals.slice(0, 4).map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setHospitalFilter(h)}
                  className={`px-3 py-1.5 rounded-full border ${
                    hospitalFilter === h
                      ? "bg-sky-600 border-sky-600"
                      : "bg-white border-sky-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      hospitalFilter === h ? "text-white" : "text-slate-600"
                    }`}
                    numberOfLines={1}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
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
              Chưa có đơn hàng hoàn thành nào để trả kết quả
            </Text>
          </View>
        ) : (
          filtered.map((order) => {
            const ord = order as any;
            const patientName = ord.specifyId?.patient?.patientName || "N/A";
            const hospitalName = ord.specifyId?.hospital?.hospitalName || "N/A";
            const testName = ord.specifyId?.genomeTest?.testName || "N/A";

            return (
              <View
                key={order.orderId}
                className="bg-white rounded-2xl p-4 mb-3 border border-sky-100"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <Text className="text-sm font-extrabold text-slate-900 flex-1">
                    {order.orderName || order.orderId}
                  </Text>
                  <View className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                    <Text className="text-[10px] font-bold text-emerald-700">
                      Hoàn thành
                    </Text>
                  </View>
                </View>

                <View className="mt-2 pt-2 border-t border-sky-50">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-xs text-slate-500">Bệnh nhân:</Text>
                    <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                      {patientName}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-xs text-slate-500">Xét nghiệm:</Text>
                    <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                      {testName}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xs text-slate-500">Bệnh viện:</Text>
                    <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                      {hospitalName}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-sky-50">
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={handleDownload}
                      className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg bg-sky-50"
                    >
                      <Download size={14} color="#0284C7" />
                      <Text className="text-xs font-bold text-sky-700">Tải</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handlePrint}
                      className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg bg-sky-50"
                    >
                      <Printer size={14} color="#0284C7" />
                      <Text className="text-xs font-bold text-sky-700">In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSendEmail}
                      className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg bg-sky-50"
                    >
                      <Mail size={14} color="#0284C7" />
                      <Text className="text-xs font-bold text-sky-700">Gửi</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/customer/order-detail",
                        params: { orderId: order.orderId },
                      })
                    }
                    className="flex-row items-center gap-1"
                  >
                    <Text className="text-xs font-bold text-sky-600">Chi tiết</Text>
                    <ChevronRight size={16} color="#0284C7" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
