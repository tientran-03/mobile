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
  Alert,
} from "react-native";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";

import { PaginationControls } from "@/components/PaginationControls";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { patientMetadataService, PatientMetadataResponse } from "@/services/patientMetadataService";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
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
  if (s === "sample_in_analyze" || s === "sample_waiting_analyze" || s === "sample_run")
    return {
      bg: "bg-sky-500/12",
      text: "text-sky-700",
      border: "border-sky-200",
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

export default function PatientMetadatasScreen() {
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
    queryKey: ["patient-metadatas", statusFilter],
    queryFn: async (params) => await patientMetadataService.getAll(params),
    defaultPageSize: 20,
  });

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
          (m.patientName || "").toLowerCase().includes(q) ||
          (m.specifyId || "").toLowerCase().includes(q)
        );
      });
    }

    // Status filter (sample_*)
    if (statusFilter !== "all") {
      data = data.filter(
        (m) => (m.status || "").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return data.sort((a, b) => {
      // Sort by labcode or date if available
      return (b.labcode || "").localeCompare(a.labcode || "");
    });
  }, [metadataList, searchQuery, statusFilter]);

  const handleOpenUrl = async (url?: string) => {
    if (!url) {
      Alert.alert("Không tìm thấy", "Không tìm thấy đường dẫn báo cáo.");
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
      Alert.alert("Lỗi", "Không thể mở đường dẫn báo cáo. Vui lòng thử lại.");
    }
  };

  const handleViewFastQC = async (metadata: PatientMetadataResponse, which: 1 | 2) => {
    if (!metadata.patientId) {
      Alert.alert("Thiếu thông tin", "Mẫu này chưa có mã bệnh nhân, không thể xem FastQC.");
      return;
    }
    try {
      const resp =
        which === 1
          ? await patientMetadataService.getFastq1UrlByPatientId(metadata.patientId)
          : await patientMetadataService.getFastq2UrlByPatientId(metadata.patientId);

      if (!resp.success || !resp.data) {
        Alert.alert(
          "Không tìm thấy",
          resp.error || "Không tìm thấy báo cáo FastQC tương ứng.",
        );
        return;
      }

      await handleOpenUrl(resp.data);
    } catch (error: any) {
      console.error("Error viewing FastQC:", error);
      Alert.alert("Lỗi", "Không thể lấy báo cáo FastQC. Vui lòng thử lại.");
    }
  };

  const handleApprove = async (metadata: PatientMetadataResponse) => {
    const status = (metadata.status || "").toLowerCase();
    if (status !== "sample_in_analyze") {
      Alert.alert(
        "Không hợp lệ",
        "Chỉ có thể duyệt kết quả cho mẫu đang trong quá trình phân tích.",
      );
      return;
    }
    Alert.alert(
      "Duyệt kết quả",
      `Bạn có chắc chắn muốn duyệt kết quả cho mẫu ${metadata.labcode}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          style: "default",
          onPress: async () => {
            try {
              const resp = await patientMetadataService.updateStatus(
                metadata.labcode,
                "sample_completed",
              );
              if (!resp.success) {
                Alert.alert("Lỗi", resp.error || "Không thể duyệt kết quả.");
                return;
              }
              Alert.alert("Thành công", "Đã duyệt kết quả mẫu.");
              refetch();
            } catch (error: any) {
              console.error("Approve error:", error);
              Alert.alert("Lỗi", "Không thể duyệt kết quả. Vui lòng thử lại.");
            }
          },
        },
      ],
    );
  };

  const handleReportError = async (metadata: PatientMetadataResponse) => {
    const status = (metadata.status || "").toLowerCase();
    if (status === "sample_error") {
      Alert.alert("Thông báo", "Mẫu này đã ở trạng thái lỗi.");
      return;
    }
    Alert.alert(
      "Báo cáo mẫu lỗi",
      `Bạn có chắc chắn muốn đánh dấu mẫu ${metadata.labcode} là lỗi?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          style: "destructive",
          onPress: async () => {
            try {
              const resp = await patientMetadataService.updateStatus(
                metadata.labcode,
                "sample_error",
              );
              if (!resp.success) {
                Alert.alert("Lỗi", resp.error || "Không thể báo lỗi mẫu.");
                return;
              }
              Alert.alert("Thành công", "Đã báo lỗi cho mẫu.");
              refetch();
            } catch (error: any) {
              console.error("Report error:", error);
              Alert.alert("Lỗi", "Không thể báo lỗi mẫu. Vui lòng thử lại.");
            }
          },
        },
      ],
    );
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
            <Text className="text-slate-900 text-lg font-extrabold">
              Quản lý dữ liệu bệnh nhân
            </Text>
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

        {/* Status Filter - sync with web statuses */}
        <View className="mt-3 flex-row flex-wrap gap-2">
          {[
            { value: "all", label: "Tất cả" },
            { value: "sample_run", label: "Mẫu khởi chạy" },
            { value: "sample_waiting_analyze", label: "Mẫu chờ phân tích" },
            { value: "sample_in_analyze", label: "Mẫu đang phân tích" },
            { value: "sample_completed", label: "Mẫu hoàn thành" },
            { value: "sample_error", label: "Mẫu lỗi" },
            { value: "sample_added", label: "Mẫu bổ sung" },
            { value: "sample_rerun", label: "Mẫu chạy lại" },
          ].map((status) => (
            <TouchableOpacity
              key={status.value}
              onPress={() => setStatusFilter(status.value)}
              className={`px-3 py-1.5 rounded-xl border ${
                statusFilter === status.value
                  ? "bg-sky-600 border-sky-600"
                  : "bg-white border-slate-200"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-xs font-extrabold ${
                  statusFilter === status.value ? "text-white" : "text-slate-700"
                }`}
              >
                {status.label}
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
              <View
                key={metadata.labcode}
                className="bg-white rounded-2xl border border-sky-100 p-4 mb-3"
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
                    Bệnh nhân:{" "}
                    {metadata.patientName
                      ? `${metadata.patientName} (${metadata.patientId || "-"})`
                      : metadata.patientId || "-"}
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

                {/* Action buttons: FastQC 1/2, Duyệt kết quả, Báo lỗi */}
                <View className="flex-row flex-wrap gap-2 mt-3 pt-2 border-t border-sky-100">
                  {metadata.patientId && (
                    <>
                      <TouchableOpacity
                        className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200"
                        activeOpacity={0.8}
                        onPress={() => handleViewFastQC(metadata, 1)}
                      >
                        <Text className="text-xs font-extrabold text-sky-700">
                          Xem FastQC 1
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200"
                        activeOpacity={0.8}
                        onPress={() => handleViewFastQC(metadata, 2)}
                      >
                        <Text className="text-xs font-extrabold text-sky-700">
                          Xem FastQC 2
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {(metadata.status || "").toLowerCase() === "sample_in_analyze" && (
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200"
                      activeOpacity={0.8}
                      onPress={() => handleApprove(metadata)}
                    >
                      <Text className="text-xs font-extrabold text-emerald-700">
                        Duyệt kết quả
                      </Text>
                    </TouchableOpacity>
                  )}

                  {(metadata.status || "").toLowerCase() !== "sample_error" && (
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200"
                      activeOpacity={0.8}
                      onPress={() => handleReportError(metadata)}
                    >
                      <Text className="text-xs font-extrabold text-red-700">
                        Báo mẫu lỗi
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          pageSize={pageSize}
          totalElements={totalElements}
          isLoading={isLoading}
        />
      )}
    </SafeAreaView>
  );
}
