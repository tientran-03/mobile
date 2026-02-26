import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  Search,
  ArrowLeft,
  X,
  SlidersHorizontal,
  Building2,
  Users,
  User,
  UserCircle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react-native";
import React, { useMemo, useState, useEffect } from "react";
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PaginationControls } from "@/components/PaginationControls";
import { useAuth } from "@/contexts/AuthContext";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import {
  hospitalService,
  HospitalResponse,
  HospitalRequest,
} from "@/services/hospitalService";
import {
  hospitalStaffService,
  HospitalStaffResponse,
} from "@/services/hospitalStaffService";
import { doctorService, DoctorResponse } from "@/services/doctorService";
import { useQuery } from "@tanstack/react-query";
import { UserSquare, UserCircle2 } from "lucide-react-native";

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full border ${
        active
          ? "bg-sky-600 border-sky-600"
          : "bg-white border-slate-200"
      }`}
      activeOpacity={0.7}
    >
      <Text
        className={`text-xs font-bold ${
          active ? "text-white" : "text-slate-700"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminHospitalsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterHospitalId, setFilterHospitalId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalResponse | null>(null);
  const [formHospitalName, setFormHospitalName] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalType, setDetailModalType] = useState<"doctors" | "staff" | "patients" | "customers" | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalResponse | null>(null);

  // Guard: Chỉ ADMIN mới được vào màn hình này
  useEffect(() => {
    if (!authLoading && user && user.role !== "ROLE_ADMIN") {
      if (user.role === "ROLE_STAFF") {
        router.replace("/home");
      } else {
        router.replace("/");
      }
    }
  }, [user, authLoading, router]);

  // Fetch hospitals with pagination
  const {
    data: hospitalsData,
    isLoading,
    error,
    refetch,
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    goToPage,
  } = usePaginatedQuery<HospitalResponse>({
    queryKey: ["hospitals", searchQuery],
    queryFn: async (params) => {
      if (searchQuery.trim()) {
        return await hospitalService.search(searchQuery.trim(), params);
      }
      return await hospitalService.getAll(params);
    },
    defaultPageSize: 20,
    enabled: user?.role === "ROLE_ADMIN",
  });

  // Extract hospitals array from response
  const hospitals = useMemo(() => {
    if (__DEV__) {
      console.log("🏥 Hospitals Data from usePaginatedQuery:", {
        hospitalsData,
        type: typeof hospitalsData,
        isArray: Array.isArray(hospitalsData),
        length: hospitalsData?.length,
        firstItem: hospitalsData?.[0],
      });
    }
    const result = hospitalsData || [];
    if (__DEV__) {
      console.log("🏥 Returning hospitals array, length:", result.length);
    }
    return result;
  }, [hospitalsData]);

  // Filter hospitals
  const filteredHospitals = useMemo(() => {
    let result = [...hospitals];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (h) =>
          String(h.hospitalId).toLowerCase().includes(query) ||
          h.hospitalName?.toLowerCase().includes(query)
      );
    }

    // Hospital ID filter
    if (filterHospitalId.trim()) {
      const query = filterHospitalId.toLowerCase().trim();
      result = result.filter((h) =>
        String(h.hospitalId).toLowerCase().includes(query)
      );
    }

    return result;
  }, [hospitals, searchQuery, filterHospitalId]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterHospitalId.trim()) count++;
    return count;
  }, [filterHospitalId]);

  const handleClearFilters = () => {
    setFilterHospitalId("");
    setSearchQuery("");
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: HospitalRequest) => hospitalService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert("Thành công", "Đã tạo tổ chức mới");
    },
    onError: (error: any) => {
      Alert.alert("Lỗi", error.message || "Không thể tạo tổ chức");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: HospitalRequest }) =>
      hospitalService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      setShowEditModal(false);
      setEditingHospital(null);
      resetForm();
      Alert.alert("Thành công", "Đã cập nhật tổ chức");
    },
    onError: (error: any) => {
      Alert.alert("Lỗi", error.message || "Không thể cập nhật tổ chức");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => hospitalService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      Alert.alert("Thành công", "Đã xóa tổ chức");
    },
    onError: (error: any) => {
      Alert.alert("Lỗi", error.message || "Không thể xóa tổ chức");
    },
  });

  const resetForm = () => {
    setFormHospitalName("");
  };

  const handleCreate = () => {
    if (!formHospitalName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên tổ chức");
      return;
    }
    createMutation.mutate({
      hospitalName: formHospitalName.trim(),
    });
  };

  const handleEdit = (hospital: HospitalResponse) => {
    setEditingHospital(hospital);
    setFormHospitalName(hospital.hospitalName);
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingHospital || !formHospitalName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên tổ chức");
      return;
    }
    updateMutation.mutate({
      id: editingHospital.hospitalId,
      data: {
        hospitalName: formHospitalName.trim(),
      },
    });
  };

  const handleDelete = (hospital: HospitalResponse) => {
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa tổ chức "${hospital.hospitalName}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => deleteMutation.mutate(hospital.hospitalId),
        },
      ]
    );
  };

  const handleShowDetail = (hospital: HospitalResponse, type: "doctors" | "staff" | "patients" | "customers") => {
    setSelectedHospital(hospital);
    setDetailModalType(type);
    setShowDetailModal(true);
  };

  if (authLoading || isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">
          Đang tải dữ liệu...
        </Text>
      </View>
    );
  }

  if (!user || user.role !== "ROLE_ADMIN") {
    return null;
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
    <SafeAreaView
      className="flex-1 bg-sky-50"
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" />
      <Stack.Screen
        options={{
          title: "Quản lý tổ chức",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push("/admin-home")} 
              className="ml-2"
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Header với search và filter */}
      <View className="pb-3 px-4 bg-white border-b border-sky-100">
        <View className="flex-row items-center mb-3">
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">
              Quản lý tổ chức
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filteredHospitals.length} tổ chức
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setEditingHospital(null);
              setShowCreateModal(true);
            }}
            className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center mr-2"
            activeOpacity={0.85}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowFilters((v) => !v)}
            className={`w-10 h-10 rounded-xl border items-center justify-center relative ${
              showFilters
                ? "bg-sky-600 border-sky-600"
                : "bg-sky-50 border-sky-200"
            }`}
            activeOpacity={0.85}
          >
            <SlidersHorizontal
              size={18}
              color={showFilters ? "#FFFFFF" : "#0284C7"}
            />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-white items-center justify-center">
                <Text className="text-[10px] font-bold text-white">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center rounded-2xl px-3 bg-sky-50 border border-sky-100">
          <Search size={18} color="#64748B" />
          <TextInput
            className="flex-1 h-11 ml-2 text-[14px] text-slate-900 font-semibold"
            placeholder="Tìm theo mã hoặc tên tổ chức..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {!!searchQuery.trim() && (
            <TouchableOpacity
              className="w-9 h-9 rounded-xl items-center justify-center"
              onPress={() => setSearchQuery("")}
              activeOpacity={0.75}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter panel */}
        {showFilters && (
          <View className="mt-3 pt-3 border-t border-sky-100">
            <Text className="text-xs font-bold text-slate-600 mb-2">
              Mã tổ chức
            </Text>
            <TextInput
              className="h-10 rounded-xl px-3 bg-white border border-sky-200 text-sm text-slate-900 font-semibold"
              placeholder="Nhập mã tổ chức"
              placeholderTextColor="#94A3B8"
              value={filterHospitalId}
              onChangeText={setFilterHospitalId}
            />

            {activeFilterCount > 0 && (
              <TouchableOpacity
                className="mt-3 py-2 rounded-xl bg-slate-100 items-center"
                onPress={handleClearFilters}
                activeOpacity={0.75}
              >
                <Text className="text-xs font-bold text-slate-700">
                  Xóa bộ lọc
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Hospital list */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#0284C7"
          />
        }
      >
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20 px-5">
            <ActivityIndicator size="large" color="#0284C7" />
            <Text className="mt-4 text-sm text-slate-500">Đang tải dữ liệu...</Text>
          </View>
        ) : filteredHospitals.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 px-5">
            <Building2 size={48} color="#94A3B8" />
            <Text className="mt-4 text-base font-bold text-slate-700 text-center">
              {searchQuery.trim() || filterHospitalId.trim()
                ? "Không tìm thấy tổ chức phù hợp"
                : "Chưa có tổ chức nào"}
            </Text>
            <Text className="mt-2 text-xs text-slate-500 text-center">
              {searchQuery.trim() || filterHospitalId.trim()
                ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                : "Danh sách tổ chức sẽ hiển thị tại đây"}
            </Text>
            {__DEV__ && (
              <Text className="mt-4 text-xs text-red-500 text-center">
                Debug: hospitals={hospitals.length}, filtered={filteredHospitals.length}
              </Text>
            )}
          </View>
        ) : (
          <View className="p-4">
            {filteredHospitals.map((hospital) => (
              <HospitalCard
                key={hospital.hospitalId}
                hospital={hospital}
                onShowDetail={handleShowDetail}
                onEdit={() => handleEdit(hospital)}
                onDelete={() => handleDelete(hospital)}
                isPending={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
              />
            ))}
          </View>
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

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-[400px]">
            <Text className="text-lg font-extrabold text-slate-900 mb-2">
              Thêm tổ chức mới
            </Text>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-2">
                Tên tổ chức *
              </Text>
              <TextInput
                className="h-11 rounded-xl px-3 bg-slate-50 border border-slate-200 text-sm text-slate-900 font-semibold"
                placeholder="Nhập tên tổ chức"
                placeholderTextColor="#94A3B8"
                value={formHospitalName}
                onChangeText={setFormHospitalName}
              />
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-slate-100 items-center"
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                activeOpacity={0.85}
                disabled={createMutation.isPending}
              >
                <Text className="text-slate-700 text-sm font-extrabold">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-emerald-600 items-center"
                onPress={handleCreate}
                activeOpacity={0.85}
                disabled={createMutation.isPending || !formHospitalName.trim()}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-sm font-extrabold">
                    Tạo
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal - Show Doctors/Staff/Patients/Customers */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setDetailModalType(null);
          setSelectedHospital(null);
        }}
      >
        <View className="flex-1 bg-black/50">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => {
              setShowDetailModal(false);
              setDetailModalType(null);
              setSelectedHospital(null);
            }}
          />
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="px-4 py-3 border-b border-sky-100 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-slate-900">
                  {selectedHospital?.hospitalName || "Chi tiết"}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {detailModalType === "doctors" && "Danh sách bác sĩ"}
                  {detailModalType === "staff" && "Danh sách nhân viên"}
                  {detailModalType === "patients" && "Danh sách bệnh nhân"}
                  {detailModalType === "customers" && "Danh sách khách hàng"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setDetailModalType(null);
                  setSelectedHospital(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <DetailModalContent
              hospital={selectedHospital}
              type={detailModalType}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingHospital(null);
          resetForm();
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-[400px]">
            <Text className="text-lg font-extrabold text-slate-900 mb-2">
              Chỉnh sửa tổ chức
            </Text>
            <Text className="text-sm text-slate-600 mb-4">
              Mã: {editingHospital?.hospitalId}
            </Text>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-2">
                Tên tổ chức *
              </Text>
              <TextInput
                className="h-11 rounded-xl px-3 bg-slate-50 border border-slate-200 text-sm text-slate-900 font-semibold"
                placeholder="Nhập tên tổ chức"
                placeholderTextColor="#94A3B8"
                value={formHospitalName}
                onChangeText={setFormHospitalName}
              />
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-slate-100 items-center"
                onPress={() => {
                  setShowEditModal(false);
                  setEditingHospital(null);
                  resetForm();
                }}
                activeOpacity={0.85}
                disabled={updateMutation.isPending}
              >
                <Text className="text-slate-700 text-sm font-extrabold">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-blue-600 items-center"
                onPress={handleUpdate}
                activeOpacity={0.85}
                disabled={updateMutation.isPending || !formHospitalName.trim()}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-sm font-extrabold">
                    Cập nhật
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Hospital Card Component - Similar to Web
function HospitalCard({
  hospital,
  onShowDetail,
  onEdit,
  onDelete,
  isPending,
}: {
  hospital: HospitalResponse;
  onShowDetail: (hospital: HospitalResponse, type: "doctors" | "staff" | "patients" | "customers") => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const isHospitalOne = hospital.hospitalId === 1;

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-sky-100">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Building2 size={18} color="#0284C7" />
            <Text className="ml-2 text-xs font-bold text-sky-600">
              Mã BV: {hospital.hospitalId}
            </Text>
          </View>
          <Text className="mt-1 text-base font-extrabold text-slate-900">
            {hospital.hospitalName || "Chưa có tên"}
          </Text>
        </View>
      </View>

      {/* Action buttons - Similar to Web */}
      <View className="flex-row gap-2 flex-wrap">
        {isHospitalOne ? (
          // Hospital ID = 1: Show Doctors, Staff, Patients
          <>
            <TouchableOpacity
              className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl bg-blue-50 border border-blue-200 items-center"
              onPress={() => onShowDetail(hospital, "doctors")}
              activeOpacity={0.7}
              disabled={isPending}
            >
              <User size={16} color="#2563EB" />
              <Text className="mt-1 text-xs font-bold text-blue-700">
                Bác sĩ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl bg-green-50 border border-green-200 items-center"
              onPress={() => onShowDetail(hospital, "staff")}
              activeOpacity={0.7}
              disabled={isPending}
            >
              <Users size={16} color="#16A34A" />
              <Text className="mt-1 text-xs font-bold text-green-700">
                Nhân viên
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl bg-purple-50 border border-purple-200 items-center"
              onPress={() => onShowDetail(hospital, "patients")}
              activeOpacity={0.7}
              disabled={isPending}
            >
              <UserSquare size={16} color="#9333EA" />
              <Text className="mt-1 text-xs font-bold text-purple-700">
                Bệnh nhân
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // Hospital ID != 1: Show Customers, Doctors
          <>
            <TouchableOpacity
              className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl bg-orange-50 border border-orange-200 items-center"
              onPress={() => onShowDetail(hospital, "customers")}
              activeOpacity={0.7}
              disabled={isPending}
            >
              <Building2 size={16} color="#F97316" />
              <Text className="mt-1 text-xs font-bold text-orange-700">
                Khách hàng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 min-w-[100px] py-2.5 px-3 rounded-xl bg-blue-50 border border-blue-200 items-center"
              onPress={() => onShowDetail(hospital, "doctors")}
              activeOpacity={0.7}
              disabled={isPending}
            >
              <User size={16} color="#2563EB" />
              <Text className="mt-1 text-xs font-bold text-blue-700">
                Bác sĩ
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          className="py-2.5 px-3 rounded-xl bg-blue-50 border border-blue-200 items-center"
          onPress={onEdit}
          activeOpacity={0.7}
          disabled={isPending}
        >
          <Edit size={16} color="#2563EB" />
          <Text className="mt-1 text-xs font-bold text-blue-700">Sửa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="py-2.5 px-3 rounded-xl bg-red-50 border border-red-200 items-center"
          onPress={onDelete}
          activeOpacity={0.7}
          disabled={isPending}
        >
          <Trash2 size={16} color="#DC2626" />
          <Text className="mt-1 text-xs font-bold text-red-700">Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Detail Modal Content Component
function DetailModalContent({
  hospital,
  type,
}: {
  hospital: HospitalResponse | null;
  type: "doctors" | "staff" | "patients" | "customers" | null;
}) {
  const hospitalId = hospital?.hospitalId ? String(hospital.hospitalId) : null;

  // Fetch doctors - return plain array
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery<DoctorResponse[]>({
    queryKey: ["hospital-doctors", hospitalId],
    queryFn: () => doctorService.getByHospitalId(hospitalId!),
    enabled: type === "doctors" && !!hospitalId,
  });

  // Fetch staff
  const { data: staffResponse, isLoading: staffLoading } = useQuery({
    queryKey: ["hospital-staff", hospitalId],
    queryFn: () => hospitalStaffService.getByHospitalId(hospitalId!),
    enabled: type === "staff" && !!hospitalId,
  });

  // Doctors array from query (ensure always an array)
  const doctors: DoctorResponse[] = Array.isArray(doctorsData) ? doctorsData : [];
  const staff = staffResponse?.success ? (staffResponse.data || []) : [];
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("vi-VN");
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "-";
    const g = gender.toUpperCase();
    if (g.includes("MALE") || g === "M") return "Nam";
    if (g.includes("FEMALE") || g === "F") return "Nữ";
    return gender;
  };

  if (!hospital || !type) {
    return (
      <View className="p-4 items-center">
        <Text className="text-sm text-slate-500">Không có dữ liệu</Text>
      </View>
    );
  }

  const isLoading = (type === "doctors" && doctorsLoading) || (type === "staff" && staffLoading);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-4">
        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#0284C7" />
            <Text className="mt-3 text-sm text-slate-500">Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <>
            {type === "doctors" && (
              <>
                {doctors.length === 0 ? (
                  <View className="py-8 items-center">
                    <User size={48} color="#CBD5E1" />
                    <Text className="mt-3 text-sm text-slate-500">Chưa có bác sĩ nào</Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {doctors.map((doctor) => (
                      <View
                        key={doctor.doctorId}
                        className="p-3 bg-blue-50 rounded-xl border border-blue-100"
                      >
                        <Text className="text-sm font-bold text-slate-900">
                          {doctor.doctorName || "Chưa có tên"}
                        </Text>
                        <Text className="text-xs text-slate-600 mt-1">
                          Mã: {doctor.doctorId}
                        </Text>
                        {doctor.doctorEmail && (
                          <Text className="text-xs text-slate-500 mt-1">
                            Email: {doctor.doctorEmail}
                          </Text>
                        )}
                        {doctor.doctorPhone && (
                          <Text className="text-xs text-slate-500 mt-1">
                            SĐT: {doctor.doctorPhone}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {type === "staff" && (
              <>
                {staff.length === 0 ? (
                  <View className="py-8 items-center">
                    <UserCircle2 size={48} color="#CBD5E1" />
                    <Text className="mt-3 text-sm text-slate-500">Chưa có nhân viên nào</Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {staff.map((s) => (
                      <TouchableOpacity
                        key={s.staffId}
                        className="p-3 bg-green-50 rounded-xl border border-green-100"
                        activeOpacity={0.8}
                        onPress={() =>
                          setExpandedStaffId((prev) => (prev === s.staffId ? null : s.staffId))
                        }
                      >
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1 pr-2">
                            <Text className="text-sm font-bold text-slate-900">
                              {s.staffName || "Chưa có tên"}
                            </Text>
                            <Text className="text-xs text-slate-600 mt-1">
                              {s.staffPosition || "Chưa có chức vụ"}
                            </Text>
                            {s.staffEmail && (
                              <Text className="text-xs text-slate-500 mt-1">
                                Email: {s.staffEmail}
                              </Text>
                            )}
                            {s.staffPhone && (
                              <Text className="text-xs text-slate-500 mt-1">
                                SĐT: {s.staffPhone}
                              </Text>
                            )}
                          </View>
                          <Text className="text-xs text-slate-500">
                            {expandedStaffId === s.staffId ? "Thu gọn" : "Xem"}
                          </Text>
                        </View>

                        {expandedStaffId === s.staffId && (
                          <View className="mt-3 pt-2 border-t border-emerald-100">
                            <Text className="text-xs text-slate-600">
                              <Text className="font-semibold">Mã nhân viên: </Text>
                              {s.staffId}
                            </Text>
                            <Text className="text-xs text-slate-600 mt-1">
                              <Text className="font-semibold">Giới tính: </Text>
                              {getGenderLabel(s.staffGender)}
                            </Text>
                            <Text className="text-xs text-slate-600 mt-1">
                              <Text className="font-semibold">Ngày sinh: </Text>
                              {formatDate(s.staffDob)}
                            </Text>
                            {s.staffAddress && (
                              <Text className="text-xs text-slate-600 mt-1">
                                <Text className="font-semibold">Địa chỉ: </Text>
                                {s.staffAddress}
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {(type === "patients" || type === "customers") && (
              <View className="py-8 items-center">
                <Text className="text-sm text-slate-500">
                  Tính năng đang phát triển
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
