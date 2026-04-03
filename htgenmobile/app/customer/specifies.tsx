import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  Search,
  ArrowLeft,
  FileText,
  X,
  ChevronRight,
  Plus,
  ArrowRight,
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

import { ForwardTestModal } from "@/components/modals/ForwardTestModal";
import { useAuth } from "@/contexts/AuthContext";
import { getApiResponseData } from "@/lib/types/api-types";
import { orderService } from "@/services/orderService";
import {
  specifyVoteTestService,
  SpecifyVoteTestResponse,
} from "@/services/specifyVoteTestService";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
};

const getStatusLabel = (status: string): string => {
  const s = (status || "").toLowerCase();
  const statusMap: Record<string, string> = {
    pending: "Chờ xử lý",
    processing: "Đang xử lý",
    completed: "Hoàn thành",
    rejected: "Từ chối",
    cancelled: "Đã hủy",
    initiation: "Khởi tạo",
    initation: "Khởi tạo", // typo in backend
    waiting_receive_sample: "Chờ nhận mẫu",
    sample_received: "Đã nhận mẫu",
  };
  return statusMap[s] || status;
};

const SPECIFY_INITIATION = ["initiation", "initation"];

const getStatusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "completed") {
    return { label: "Hoàn thành", bg: "bg-emerald-50", fg: "text-emerald-700", bd: "border-emerald-200" };
  }
  if (s === "rejected" || s === "cancelled") {
    return { label: "Từ chối/Hủy", bg: "bg-red-50", fg: "text-red-700", bd: "border-red-200" };
  }
  if (s === "processing" || s === "sample_received" || s === "waiting_receive_sample") {
    return { label: "Đang xử lý", bg: "bg-blue-50", fg: "text-blue-700", bd: "border-blue-200" };
  }
  return { label: "Chờ xử lý", bg: "bg-orange-50", fg: "text-orange-700", bd: "border-orange-200" };
};

interface SpecifyData {
  specifyVoteID: string;
  fullSpecifyData?: SpecifyVoteTestResponse;
}

export default function CustomerSpecifiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [focusSearch, setFocusSearch] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardingSpecify, setForwardingSpecify] = useState<SpecifyData | null>(null);

  const hospitalId = user?.hospitalId != null ? String(user.hospitalId) : "";

  const {
    data: specifiesResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["customer-specifies", hospitalId, user?.id],
    queryFn: async () => {
      if (hospitalId) {
        return specifyVoteTestService.getByHospitalId(hospitalId);
      }
      if (!user?.id) return { success: false, data: [] };
      const ordersRes = await orderService.getByCustomerId(user.id, {});
      const orders = getApiResponseData(ordersRes) || [];
      const seen = new Set<string>();
      const fromOrders: SpecifyVoteTestResponse[] = [];
      for (const order of orders as any[]) {
        const spec = order.specifyId;
        if (spec?.specifyVoteID && !seen.has(spec.specifyVoteID)) {
          seen.add(spec.specifyVoteID);
          fromOrders.push(spec);
        }
      }
      return { success: true, data: fromOrders };
    },
    enabled: !!user?.id,
    retry: false,
  });

  const specifies = useMemo(() => {
    return getApiResponseData<SpecifyVoteTestResponse>(specifiesResponse) || [];
  }, [specifiesResponse]);

  const doctors = useMemo(() => {
    const set = new Set<string>();
    specifies.forEach((s) => {
      const name = s.doctor?.doctorName;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [specifies]);

  const filteredSpecifies = useMemo(() => {
    return specifies.filter((specify) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(specify.specifyVoteID || "").toLowerCase().includes(q) ||
        String(specify.patient?.patientName || "").toLowerCase().includes(q) ||
        String(specify.patient?.patientPhone || "").toLowerCase().includes(q) ||
        String(specify.doctor?.doctorName || "").toLowerCase().includes(q) ||
        String(specify.genomeTest?.testName || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        specify.specifyStatus?.toLowerCase() === statusFilter.toLowerCase();

      const matchesDoctor =
        doctorFilter === "all" ||
        specify.doctor?.doctorName === doctorFilter;

      const createdAt = specify.createdAt ? new Date(specify.createdAt) : null;
      const matchesDateFrom = !dateFrom || (createdAt && createdAt >= new Date(dateFrom + "T00:00:00"));
      const matchesDateTo = !dateTo || (createdAt && createdAt <= new Date(dateTo + "T23:59:59"));

      return matchesSearch && matchesStatus && matchesDoctor && matchesDateFrom && matchesDateTo;
    });
  }, [specifies, searchQuery, statusFilter, doctorFilter, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải dữ liệu...</Text>
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
          <Text className="text-xs text-slate-500 text-center mb-4">
            Vui lòng kiểm tra kết nối mạng và thử lại.
          </Text>
          <TouchableOpacity
            className="bg-sky-600 py-3 rounded-2xl items-center"
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
              Quản lý phiếu xét nghiệm
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filteredSpecifies.length} phiếu
            </Text>
          </View>
        </View>

        <View
          className={`mt-3 flex-row items-center rounded-2xl px-3 bg-sky-50 border ${
            focusSearch ? "border-sky-400" : "border-sky-100"
          }`}
          style={{ ...(Platform.OS === "android" ? { elevation: 0 } : {}) }}
        >
          <Search size={18} color="#64748B" />
          <TextInput
            className="flex-1 h-11 ml-2 text-[14px] text-slate-900 font-semibold"
            placeholder="Tìm theo mã, tên BN, SĐT, xét nghiệm..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocusSearch(true)}
            onBlur={() => setFocusSearch(false)}
            returnKeyType="search"
          />
          {searchQuery.trim() ? (
            <TouchableOpacity
              className="w-9 h-9 rounded-xl items-center justify-center"
              onPress={() => setSearchQuery("")}
              activeOpacity={0.75}
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
            {["all", "initation", "pending", "processing", "completed"].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full border ${
                  statusFilter === status
                    ? "bg-sky-600 border-sky-600"
                    : "bg-white border-sky-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    statusFilter === status ? "text-white" : "text-slate-600"
                  }`}
                >
                  {status === "all" ? "Tất cả" : getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {doctors.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 -mx-1">
            <View className="flex-row gap-2 px-1">
              <TouchableOpacity
                onPress={() => setDoctorFilter("all")}
                className={`px-3 py-1.5 rounded-full border ${
                  doctorFilter === "all" ? "bg-sky-600 border-sky-600" : "bg-white border-sky-200"
                }`}
              >
                <Text className={`text-xs font-bold ${doctorFilter === "all" ? "text-white" : "text-slate-600"}`}>
                  Tất cả BS
                </Text>
              </TouchableOpacity>
              {doctors.slice(0, 6).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDoctorFilter(d)}
                  className={`px-3 py-1.5 rounded-full border ${
                    doctorFilter === d ? "bg-sky-600 border-sky-600" : "bg-white border-sky-200"
                  }`}
                >
                  <Text className={`text-xs font-bold ${doctorFilter === d ? "text-white" : "text-slate-600"}`} numberOfLines={1}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <View className="mt-2 flex-row items-center gap-2">
          <TextInput
            className="flex-1 h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"
            placeholder="Từ ngày (yyyy-mm-dd)"
            placeholderTextColor="#94A3B8"
            value={dateFrom}
            onChangeText={setDateFrom}
          />
          <TextInput
            className="flex-1 h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"
            placeholder="Đến ngày (yyyy-mm-dd)"
            placeholderTextColor="#94A3B8"
            value={dateTo}
            onChangeText={setDateTo}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.push("/customer/specify-new")}
            className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600"
            activeOpacity={0.85}
          >
            <Plus size={18} color="#fff" />
            <Text className="text-white font-bold text-sm">Thêm phiếu</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} tintColor="#0284C7" />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredSpecifies.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-sky-100">
            <FileText size={48} color="#cbd5e1" />
            <Text className="text-sm font-bold text-slate-500 mt-3 text-center">
              Không tìm thấy phiếu xét nghiệm nào
            </Text>
          </View>
        ) : (
          filteredSpecifies.map((specify) => {
            const statusBadge = getStatusBadge(specify.specifyStatus || "");
            return (
              <TouchableOpacity
                key={specify.specifyVoteID}
                onPress={() =>
                  router.push({
                    pathname: "/customer/specify-detail",
                    params: { specifyId: specify.specifyVoteID },
                  })
                }
                className="bg-white rounded-2xl p-4 mb-3 border border-sky-100"
                activeOpacity={0.85}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-slate-900 mb-1">
                      {specify.patient?.patientName || "N/A"}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Mã phiếu: {specify.specifyVoteID}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-1 rounded-lg border ${statusBadge.bg} ${statusBadge.bd}`}
                  >
                    <Text className={`text-[10px] font-bold ${statusBadge.fg}`}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                <View className="mt-2 pt-2 border-t border-sky-50">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-xs text-slate-500">Xét nghiệm:</Text>
                    <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                      {specify.genomeTest?.testName || "N/A"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-xs text-slate-500">Bệnh viện:</Text>
                    <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={1}>
                      {specify.hospital?.hospitalName || "N/A"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-slate-500">Ngày tạo:</Text>
                    <Text className="text-xs font-bold text-slate-700">
                      {formatDate(specify.createdAt)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between mt-3">
                  {SPECIFY_INITIATION.includes((specify.specifyStatus || "").toLowerCase()) && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setForwardingSpecify({
                          specifyVoteID: specify.specifyVoteID,
                          fullSpecifyData: specify,
                        });
                        setForwardModalOpen(true);
                      }}
                      className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 border border-emerald-200"
                      activeOpacity={0.8}
                    >
                      <ArrowRight size={14} color="#059669" />
                      <Text className="text-xs font-bold text-emerald-700">Chuyển tiếp</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/customer/specify-detail",
                        params: { specifyId: specify.specifyVoteID },
                      })
                    }
                    className="flex-row items-center gap-1"
                  >
                    <Text className="text-xs font-bold text-sky-600">Xem chi tiết</Text>
                    <ChevronRight size={16} color="#0284C7" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <ForwardTestModal
        visible={forwardModalOpen}
        onClose={() => {
          setForwardModalOpen(false);
          setForwardingSpecify(null);
        }}
        specifyData={forwardingSpecify}
        onSuccess={() => refetch()}
        onNavigateToPayment={(params) => {
          setForwardModalOpen(false);
          setForwardingSpecify(null);
          refetch();
          router.push({
            pathname: "/customer/payment",
            params: {
              orderId: params.orderId,
              orderName: params.orderName,
              amount: String(params.amount),
              specifyId: params.specifyId,
            },
          });
        }}
      />
    </SafeAreaView>
  );
}
