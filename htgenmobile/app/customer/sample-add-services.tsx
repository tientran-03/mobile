import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Beaker, Search, X } from "lucide-react-native";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getApiResponseData } from "@/lib/types/api-types";
import {
  sampleAddServiceCatalogService,
  SampleAddServiceCatalogResponse,
} from "@/services/sampleAddServiceCatalogService";

const formatCurrency = (amount?: number): string => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("vi-VN").format(amount);
};

export default function CustomerSampleAddServicesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [focusSearch, setFocusSearch] = useState(false);

  const {
    data: servicesResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["sample-add-services-catalog"],
    queryFn: () => sampleAddServiceCatalogService.getAll(),
    retry: false,
  });

  const services = useMemo(() => {
    return getApiResponseData<SampleAddServiceCatalogResponse>(servicesResponse) || [];
  }, [servicesResponse]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return services;
    return services.filter(
      (s) =>
        String(s.sampleName || "").toLowerCase().includes(q) ||
        String(s.id || "").toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

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
              Dịch vụ thêm mẫu
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Danh sách dịch vụ bổ sung mẫu xét nghiệm
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
            placeholder="Tìm theo tên dịch vụ..."
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
            <Beaker size={48} color="#cbd5e1" />
            <Text className="text-sm font-bold text-slate-500 mt-3 text-center">
              Không có dịch vụ thêm mẫu nào
            </Text>
          </View>
        ) : (
          filtered.map((s) => (
            <View
              key={s.id}
              className="bg-white rounded-2xl p-4 mb-3 border border-sky-100"
            >
              <View className="flex-row items-start justify-between mb-2">
                <Text className="text-sm font-extrabold text-slate-900 flex-1">
                  {s.sampleName || "N/A"}
                </Text>
                <Text className="text-sm font-bold text-sky-600">
                  {formatCurrency(s.finalPrice ?? s.price)} đ
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-slate-500">Giá gốc:</Text>
                <Text className="text-xs font-bold text-slate-700">
                  {formatCurrency(s.price)} đ
                </Text>
                {s.taxRate != null && s.taxRate > 0 && (
                  <>
                    <Text className="text-xs text-slate-500">Thuế:</Text>
                    <Text className="text-xs font-bold text-slate-700">
                      {s.taxRate}%
                    </Text>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
