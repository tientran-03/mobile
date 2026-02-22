import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Search, X, FileText } from "lucide-react-native";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { patientMetadataService, PatientMetadataResponse } from "@/services/patientMetadataService";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
};

const getStatusLabel = (status?: string): string => {
  if (!status) return "Khởi tạo";
  const s = status.toLowerCase();
  const statusMap: Record<string, string> = {
    initiation: "Khởi tạo",
    pending: "Chờ xử lý",
    processing: "Đang xử lý",
    completed: "Hoàn thành",
    error: "Lỗi",
    canceled: "Hủy",
  };
  return statusMap[s] || status;
};

const getStatusPillClass = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "completed") return { bg: "bg-emerald-500/12", text: "text-emerald-700", border: "border-emerald-200" };
  if (s === "processing" || s === "pending") return { bg: "bg-sky-500/12", text: "text-sky-700", border: "border-sky-200" };
  if (s === "error" || s === "canceled") return { bg: "bg-red-500/12", text: "text-red-700", border: "border-red-200" };
  return { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-200" };
};

export default function PatientMetadatasScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [focusSearch, setFocusSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: metadataResponse, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["patient-metadatas"],
    queryFn: () => patientMetadataService.getAll(),
    retry: false,
  });

  const metadataList = useMemo(() => {
    if (!metadataResponse?.success || !metadataResponse.data) return [];
    return metadataResponse.data as PatientMetadataResponse[];
  }, [metadataResponse]);

  const filtered = useMemo(() => {
    let data = [...metadataList];
    
    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      data = data.filter((m) => {
        return (
          (m.labcode || "").toLowerCase().includes(q) ||
          (m.sampleName || "").toLowerCase().includes(q) ||
          (m.patientId || "").toLowerCase().includes(q) ||
          (m.specifyId || "").toLowerCase().includes(q)
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      data = data.filter((m) => (m.status || "").toLowerCase() === statusFilter.toLowerCase());
    }

    return data.sort((a, b) => {
      // Sort by labcode or date if available
      return (b.labcode || "").localeCompare(a.labcode || "");
    });
  }, [metadataList, searchQuery, statusFilter]);

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
            <Text className="text-slate-900 text-lg font-extrabold">Quản lý mẫu xét nghiệm</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filtered.length} mẫu
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
            placeholder="Tìm kiếm theo mã lab, tên mẫu..."
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

        {/* Status Filter */}
        <View className="mt-3 flex-row gap-2">
          {["all", "pending", "processing", "completed", "error"].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl border ${
                statusFilter === status
                  ? "bg-sky-600 border-sky-600"
                  : "bg-white border-slate-200"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-xs font-extrabold ${
                  statusFilter === status ? "text-white" : "text-slate-700"
                }`}
              >
                {status === "all" ? "Tất cả" : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Metadata List */}
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
            <FileText size={48} color="#94A3B8" />
            <Text className="mt-4 text-slate-500 text-base font-semibold">
              {searchQuery || statusFilter !== "all"
                ? "Không tìm thấy mẫu xét nghiệm"
                : "Chưa có mẫu xét nghiệm"}
            </Text>
          </View>
        ) : (
          filtered.map((metadata) => {
            const statusClass = getStatusPillClass(metadata.status);
            return (
              <TouchableOpacity
                key={metadata.labcode}
                className="bg-white rounded-2xl border border-sky-100 p-4 mb-3"
                activeOpacity={0.85}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-slate-900 text-base font-extrabold" numberOfLines={1}>
                      {metadata.sampleName || metadata.labcode}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500 font-semibold">
                      Lab Code: {metadata.labcode}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-xl border ${statusClass.bg} ${statusClass.border}`}
                  >
                    <Text className={`text-xs font-extrabold ${statusClass.text}`}>
                      {getStatusLabel(metadata.status)}
                    </Text>
                  </View>
                </View>

                {metadata.patientId && (
                  <View className="flex-row items-center mt-2">
                    <Text className="text-xs text-slate-500 font-semibold">
                      Bệnh nhân: {metadata.patientId}
                    </Text>
                  </View>
                )}

                {metadata.specifyId && (
                  <View className="flex-row items-center mt-1">
                    <Text className="text-xs text-slate-500 font-semibold" numberOfLines={1}>
                      Phiếu chỉ định: {metadata.specifyId}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
