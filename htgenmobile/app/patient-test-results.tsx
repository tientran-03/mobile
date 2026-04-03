import { Stack, useRouter } from "expo-router";
import { ArrowLeft, FileText, Search, X } from "lucide-react-native";
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
} from "react-native";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";

import { PaginationControls } from "@/components/PaginationControls";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { patientMetadataService, PatientMetadataResponse } from "@/services/patientMetadataService";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
};

// Đồng bộ nhãn status với web (PATIENT_METADATA_STATUS_CONFIG)
const PATIENT_METADATA_STATUS_LABELS: Record<string, string> = {
  sample_run: "Mẫu khởi chạy",
  sample_waiting_analyze: "Mẫu chờ phân tích",
  sample_in_analyze: "Mẫu đang phân tích",
  sample_completed: "Mẫu hoàn thành",
  sample_error: "Mẫu lỗi",
  sample_added: "Mẫu bổ sung",
  sample_rerun: "Mẫu chạy lại",
};

const getStatusLabel = (status?: string): string => {
  if (!status) return "Mẫu khởi chạy";
  const key = status.toLowerCase();
  return PATIENT_METADATA_STATUS_LABELS[key] || status;
};

const getStatusPillClass = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "sample_completed")
    return {
      bg: "bg-emerald-500/12",
      text: "text-emerald-700",
      border: "border-emerald-200",
    };
  if (s === "sample_waiting_analyze" || s === "sample_run")
    return {
      bg: "bg-amber-500/12",
      text: "text-amber-700",
      border: "border-amber-200",
    };
  if (s === "sample_in_analyze")
    return {
      bg: "bg-blue-500/12",
      text: "text-blue-700",
      border: "border-blue-200",
    };
  if (s === "sample_error")
    return {
      bg: "bg-red-500/12",
      text: "text-red-700",
      border: "border-red-200",
    };
  if (s === "sample_added" || s === "sample_rerun")
    return {
      bg: "bg-amber-500/12",
      text: "text-amber-700",
      border: "border-amber-200",
    };
  return { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-200" };
};

export default function PatientTestResultsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [focusSearch, setFocusSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    data: metadataList,
    isLoading,
    error,
    refetch,
    isFetching,
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    goToPage,
  } = usePaginatedQuery<PatientMetadataResponse>({
    queryKey: ["patient-test-results-metadata", statusFilter],
    queryFn: async (params) => await patientMetadataService.getAll(params),
    defaultPageSize: 20,
  });

  const filtered = useMemo(() => {
    let data = [...metadataList];
    
    // Filter only those with test results
    data = data.filter((m) => m.testResultPath);
    
    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      data = data.filter((m) => {
        return (
          (m.labcode || "").toLowerCase().includes(q) ||
          (m.patientId || "").toLowerCase().includes(q) ||
          (m.patientName || "").toLowerCase().includes(q) ||
          (m.specifyId || "").toLowerCase().includes(q) ||
          (m.sampleName || "").toLowerCase().includes(q)
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      data = data.filter(
        (m) => (m.status || "").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return data.sort((a, b) => {
      // Sort by labcode
      return (b.labcode || "").localeCompare(a.labcode || "");
    });
  }, [metadataList, searchQuery, statusFilter]);

  const handleOpenUrl = async (url?: string) => {
    if (!url) {
      Alert.alert("Không tìm thấy", "Không tìm thấy đường dẫn kết quả xét nghiệm.");
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          "Không thể mở",
          "Thiết bị không mở được đường dẫn:\n" + url,
        );
        return;
      }
      await Linking.openURL(url);
    } catch (error: any) {
      console.error("Error opening URL:", error);
      Alert.alert("Lỗi", "Không thể mở đường dẫn kết quả. Vui lòng thử lại.");
    }
  };

  const handleViewResult = async (metadata: PatientMetadataResponse) => {
    if (!metadata.testResultPath) {
      Alert.alert("Thông báo", "Mẫu này chưa có kết quả xét nghiệm.");
      return;
    }

    // Sử dụng trực tiếp testResultPath (có thể đã là presigned URL hoặc đường dẫn MinIO)
    // Backend endpoint /api/v1/patient-metadata/result/{patientId} không tồn tại
    await handleOpenUrl(metadata.testResultPath);
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
        <Text className="text-red-600 text-center font-bold mb-4">
          {error || "Có lỗi xảy ra khi tải dữ liệu"}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="px-6 py-3 bg-sky-600 rounded-xl"
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
        <View className="flex-row items-center mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#0284C7" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">Kết quả xét nghiệm</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Quản lý kết quả xét nghiệm bệnh nhân
            </Text>
          </View>
        </View>

        {/* Search */}
        <View
          className={`flex-row items-center px-3 py-2 rounded-xl border mb-3 ${
            focusSearch
              ? "bg-white border-sky-400"
              : "bg-sky-50 border-sky-200"
          }`}
        >
          <Search size={18} color="#64748b" />
          <TextInput
            className="flex-1 ml-2 text-slate-900 text-sm"
            placeholder="Tìm kiếm theo mã lab, bệnh nhân, phiếu chỉ định..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocusSearch(true)}
            onBlur={() => setFocusSearch(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="ml-2"
              activeOpacity={0.7}
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2"
        >
          <TouchableOpacity
            onPress={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl border ${
              statusFilter === "all"
                ? "bg-sky-600 border-sky-600"
                : "bg-white border-sky-200"
            }`}
            activeOpacity={0.85}
          >
            <Text
              className={`text-xs font-bold ${
                statusFilter === "all" ? "text-white" : "text-slate-600"
              }`}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {["sample_completed", "sample_in_analyze", "sample_waiting_analyze", "sample_error"].map((status) => {
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl border ${
                  statusFilter === status
                    ? "bg-sky-600 border-sky-600"
                    : "bg-white border-sky-200"
                }`}
                activeOpacity={0.85}
              >
                <Text
                  className={`text-xs font-bold ${
                    statusFilter === status ? "text-white" : "text-slate-600"
                  }`}
                >
                  {getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
      >
        {filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-24 h-24 rounded-full bg-sky-100 items-center justify-center mb-6">
              <FileText size={48} color="#0284C7" />
            </View>
            <Text className="text-slate-900 text-xl font-extrabold mb-2 text-center">
              {searchQuery || statusFilter !== "all" ? "Không tìm thấy" : "Chưa có kết quả"}
            </Text>
            <Text className="text-slate-500 text-sm text-center px-4">
              {searchQuery || statusFilter !== "all"
                ? "Không có kết quả nào khớp với bộ lọc."
                : "Chưa có kết quả xét nghiệm nào."}
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-4">
              <Text className="text-slate-600 text-sm font-bold">
                Tổng cộng: {filtered.length} kết quả
              </Text>
            </View>

            {filtered.map((metadata) => {
              const statusPill = getStatusPillClass(metadata.status);
              return (
                <TouchableOpacity
                  key={metadata.labcode}
                  className="bg-white rounded-xl p-4 mb-3 border border-sky-100"
                  activeOpacity={0.7}
                  onPress={() => handleViewResult(metadata)}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-slate-900 font-extrabold text-base mb-1">
                        {metadata.labcode || "Không có mã"}
                      </Text>
                      {metadata.patientName && (
                        <Text className="text-slate-600 text-sm mb-1">
                          Bệnh nhân: {metadata.patientName}
                        </Text>
                      )}
                      {metadata.patientId && (
                        <Text className="text-slate-500 text-xs mb-1">
                          Mã BN: {metadata.patientId}
                        </Text>
                      )}
                      {metadata.specifyId && (
                        <Text className="text-slate-500 text-xs mb-1">
                          Phiếu chỉ định: {metadata.specifyId}
                        </Text>
                      )}
                      {metadata.sampleName && (
                        <Text className="text-slate-500 text-xs mb-1">
                          Tên mẫu: {metadata.sampleName}
                        </Text>
                      )}
                    </View>
                    {metadata.status && (
                      <View className={`ml-2 px-2 py-1 rounded-lg border ${statusPill.bg} ${statusPill.border}`}>
                        <Text className={`text-xs font-bold ${statusPill.text}`}>
                          {getStatusLabel(metadata.status)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-sky-100">
                    <Text className="text-emerald-600 text-xs font-bold">
                      ✓ Có kết quả
                    </Text>
                    <Text className="text-slate-500 text-xs">
                      Nhấn để xem
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={totalElements}
                pageSize={pageSize}
                onPageChange={goToPage}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
