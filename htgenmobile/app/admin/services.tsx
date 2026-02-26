import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  Search,
  X,
  SlidersHorizontal,
  Package,
  Plus,
  Edit,
  Trash2,
  Check,
  X as XIcon,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FlaskConical,
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
  serviceEntityService,
  ServiceEntityResponse,
  ServiceEntityRequest,
} from "@/services/serviceEntityService";
import { SelectionModal } from "@/components/modals";
import { genomeTestService, GenomeTestResponse } from "@/services/genomeTestService";

// Valid service type enum values
const SERVICE_TYPES = [
  { value: "embryo", label: "Embryo" },
  { value: "disease", label: "Disease" },
  { value: "reproduction", label: "Reproduction" },
] as const;

const getServiceTypeLabel = (value: string): string => {
  const type = SERVICE_TYPES.find((t) => t.value === value);
  return type?.label || value;
};

// Component để hiển thị service item với genomeTests
function ServiceItem({
  service,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  isPending,
}: {
  service: ServiceEntityResponse;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const { data: genomeTestsResponse, isLoading: loadingTests } = useQuery({
    queryKey: ["genome-tests-by-service", service.serviceId],
    queryFn: async () => {
      const response = await genomeTestService.getByServiceId(service.serviceId);
      return response;
    },
    enabled: isExpanded && !!service.serviceId,
  });

  const genomeTests = useMemo(() => {
    if (!genomeTestsResponse?.success || !genomeTestsResponse.data) return [];
    return Array.isArray(genomeTestsResponse.data) ? genomeTestsResponse.data : [];
  }, [genomeTestsResponse]);

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-sky-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Package size={18} color="#0284C7" />
            <Text className="ml-2 text-xs font-bold text-sky-600">
              Mã: {service.serviceId}
            </Text>
          </View>
          <Text className="mt-1 text-base font-extrabold text-slate-900">
            {getServiceTypeLabel(service.name) || "Chưa có tên"}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={onToggleExpand}
          className="ml-2 p-2 rounded-xl bg-sky-50 border border-sky-200"
          activeOpacity={0.7}
        >
          {isExpanded ? (
            <ChevronUp size={18} color="#0284C7" />
          ) : (
            <ChevronDown size={18} color="#0284C7" />
          )}
        </TouchableOpacity>
      </View>

      {/* Genome Tests List */}
      {isExpanded && (
        <View className="mt-3 pt-3 border-t border-sky-100">
          {loadingTests ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#0284C7" />
              <Text className="mt-2 text-xs text-slate-500">Đang tải...</Text>
            </View>
          ) : genomeTests.length === 0 ? (
            <View className="py-4 items-center">
              <FlaskConical size={24} color="#94A3B8" />
              <Text className="mt-2 text-xs text-slate-500 text-center">
                Chưa có xét nghiệm nào
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              <Text className="text-xs font-bold text-slate-600 mb-2">
                Xét nghiệm ({genomeTests.length})
              </Text>
              {genomeTests.map((test: GenomeTestResponse) => (
                <TouchableOpacity
                  key={test.testId}
                  className="bg-sky-50 rounded-xl p-3 border border-sky-100"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-sky-700 mb-1">
                        {test.testId}
                      </Text>
                      <Text className="text-sm font-extrabold text-slate-900" numberOfLines={2}>
                        {test.testName}
                      </Text>
                      {test.testDescription && (
                        <Text className="mt-1 text-xs text-slate-600" numberOfLines={2}>
                          {test.testDescription}
                        </Text>
                      )}
                      {test.price && (
                        <Text className="mt-1 text-xs font-bold text-emerald-700">
                          {new Intl.NumberFormat("vi-VN").format(test.price)} VNĐ
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-2 mt-3 pt-3 border-t border-sky-100">
        <TouchableOpacity
          className={`flex-1 py-2.5 px-3 rounded-xl border items-center ${
            isPending
              ? "bg-slate-100 border-slate-200 opacity-50"
              : "bg-blue-50 border-blue-200"
          }`}
          onPress={onEdit}
          activeOpacity={0.7}
          disabled={isPending}
        >
          <Edit
            size={16}
            color={isPending ? "#94A3B8" : "#2563EB"}
          />
          <Text
            className={`mt-1 text-xs font-bold ${
              isPending ? "text-slate-500" : "text-blue-700"
            }`}
          >
            Sửa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-2.5 px-3 rounded-xl border items-center ${
            isPending
              ? "bg-slate-100 border-slate-200 opacity-50"
              : "bg-red-50 border-red-200"
          }`}
          onPress={onDelete}
          activeOpacity={0.7}
          disabled={isPending}
        >
          <Trash2
            size={16}
            color={isPending ? "#94A3B8" : "#DC2626"}
          />
          <Text
            className={`mt-1 text-xs font-bold ${
              isPending ? "text-slate-500" : "text-red-700"
            }`}
          >
            Xóa
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminServicesScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterServiceId, setFilterServiceId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showServiceTypePicker, setShowServiceTypePicker] = useState(false);
  const [pickerFor, setPickerFor] = useState<"create" | "edit">("create");
  const [editingService, setEditingService] = useState<ServiceEntityResponse | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  
  // Form states
  const [formServiceId, setFormServiceId] = useState("");
  const [formName, setFormName] = useState("");

  // Guard: Chỉ ADMIN mới được vào màn hình này
  useEffect(() => {
    if (!authLoading && user && user.role !== "ROLE_ADMIN") {
      if (user.role === "ROLE_STAFF") {
        router.replace("/staff");
      } else {
        router.replace("/");
      }
    }
  }, [user, authLoading, router]);

  // Fetch services with pagination
  const {
    data: servicesData,
    isLoading,
    error,
    refetch,
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    goToPage,
  } = usePaginatedQuery<ServiceEntityResponse>({
    queryKey: ["admin-services", searchQuery],
    queryFn: async (params) => await serviceEntityService.getAll(params),
    defaultPageSize: 20,
    enabled: user?.role === "ROLE_ADMIN",
  });

  // Extract services array from response
  const services = useMemo(() => {
    return servicesData || [];
  }, [servicesData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ServiceEntityRequest) => {
      console.log("🔄 Create mutation called with:", data);
      return serviceEntityService.create(data);
    },
    onSuccess: (data) => {
      console.log("✅ Create mutation success:", data);
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert("Thành công", "Đã tạo dịch vụ mới");
    },
    onError: (error: any) => {
      console.error("❌ Create mutation error:", error);
      console.error("❌ Error details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        response: error?.response,
      });
      
      let errorMessage = error?.message || error?.toString() || "Không thể tạo dịch vụ";
      
      // Provide more helpful error messages
      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        errorMessage = "Mã dịch vụ đã tồn tại. Vui lòng sử dụng mã khác.";
      } else if (errorMessage.includes("validation") || errorMessage.includes("invalid")) {
        errorMessage = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
      }
      
      Alert.alert("Lỗi", errorMessage);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServiceEntityRequest }) => {
      console.log("Update mutation called:", { id, data });
      return serviceEntityService.update(id, data);
    },
    onSuccess: () => {
      console.log("Update success");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowEditModal(false);
      setEditingService(null);
      resetForm();
      Alert.alert("Thành công", "Đã cập nhật dịch vụ");
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      const errorMessage = error?.message || error?.toString() || "Không thể cập nhật dịch vụ";
      Alert.alert("Lỗi", errorMessage);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      console.log("🗑️ Delete mutation called:", id);
      return serviceEntityService.delete(id);
    },
    onSuccess: () => {
      console.log("✅ Delete success");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      Alert.alert("Thành công", "Đã xóa dịch vụ thành công");
    },
    onError: (error: any) => {
      console.error("❌ Delete error:", error);
      console.error("❌ Delete error details:", {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
      });
      
      let errorMessage = error?.message || error?.toString() || "Không thể xóa dịch vụ";
      
      // Provide more helpful error messages
      if (
        errorMessage.includes("foreign key") || 
        errorMessage.includes("constraint") ||
        errorMessage.includes("đang được sử dụng") ||
        errorMessage.includes("genome tests") ||
        errorMessage.includes("specify vote tests")
      ) {
        errorMessage = "Không thể xóa dịch vụ này vì đang được sử dụng trong hệ thống:\n\n• Genome tests\n• Specify vote tests\n• Đơn hàng\n\nVui lòng xóa các dữ liệu liên quan trước khi xóa dịch vụ.";
      } else if (errorMessage.includes("not found")) {
        errorMessage = "Dịch vụ không tồn tại hoặc đã bị xóa";
      }
      
      Alert.alert("Không thể xóa dịch vụ", errorMessage);
    },
  });

  // Filter services
  const filteredServices = useMemo(() => {
    // Ensure services is always an array
    const servicesArray = Array.isArray(services) ? services : [];
    let result = [...servicesArray];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.serviceId?.toLowerCase().includes(query) ||
          s.name?.toLowerCase().includes(query)
      );
    }

    // Service ID filter
    if (filterServiceId.trim()) {
      const query = filterServiceId.toLowerCase().trim();
      result = result.filter((s) =>
        s.serviceId?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [services, searchQuery, filterServiceId]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterServiceId.trim()) count++;
    return count;
  }, [filterServiceId]);

  const resetForm = () => {
    setFormServiceId("");
    setFormName("");
  };

  const handleServiceTypeSelect = (value: string) => {
    console.log("🎯 Service type selected:", value);
    setFormName(value);
    setShowServiceTypePicker(false);
    console.log("✅ Form name updated to:", value);
  };

  const handleCreate = () => {
    console.log("📝 handleCreate called");
    console.log("📝 Form data:", {
      serviceId: formServiceId,
      name: formName,
      serviceIdTrimmed: formServiceId.trim(),
      nameTrimmed: formName.trim(),
    });
    
    if (!formServiceId.trim() || !formName.trim()) {
      console.warn("⚠️ Validation failed: Missing fields");
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    
    // Validate service type
    const validTypes = SERVICE_TYPES.map((t) => t.value);
    const trimmedName = formName.trim();
    if (!validTypes.includes(trimmedName as any)) {
      console.warn("⚠️ Validation failed: Invalid service type", trimmedName);
      Alert.alert(
        "Lỗi",
        `Tên dịch vụ phải là một trong các giá trị: ${validTypes.join(", ")}`
      );
      return;
    }
    
    const requestData = {
      serviceId: formServiceId.trim(),
      name: trimmedName,
    };
    
    console.log("✅ Validation passed, calling mutation with:", requestData);
    createMutation.mutate(requestData);
  };

  const handleEdit = (service: ServiceEntityResponse) => {
    setEditingService(service);
    setFormServiceId(service.serviceId);
    setFormName(service.name);
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingService || !formName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    // Validate service type
    const validTypes = SERVICE_TYPES.map((t) => t.value);
    if (!validTypes.includes(formName.trim() as any)) {
      Alert.alert(
        "Lỗi",
        `Tên dịch vụ phải là một trong các giá trị: ${validTypes.join(", ")}`
      );
      return;
    }
    updateMutation.mutate({
      id: editingService.serviceId,
      data: {
        serviceId: editingService.serviceId,
        name: formName.trim(),
      },
    });
  };

  const handleDelete = (service: ServiceEntityResponse) => {
    console.log("🗑️ handleDelete called for service:", service);
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa dịch vụ "${service.name}"?`,
      [
        { 
          text: "Hủy", 
          style: "cancel",
          onPress: () => console.log("❌ Delete cancelled by user"),
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            console.log("✅ Delete confirmed, calling mutation with serviceId:", service.serviceId);
            deleteMutation.mutate(service.serviceId);
          },
        },
      ]
    );
  };

  const handleClearFilters = () => {
    setFilterServiceId("");
    setSearchQuery("");
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
          title: "Quản lý dịch vụ",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push("/admin")} 
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
              Quản lý dịch vụ
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filteredServices.length} dịch vụ
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
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
            placeholder="Tìm theo mã hoặc tên dịch vụ..."
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
              Mã dịch vụ
            </Text>
            <TextInput
              className="h-10 rounded-xl px-3 bg-white border border-sky-200 text-sm text-slate-900 font-semibold"
              placeholder="Nhập mã dịch vụ"
              placeholderTextColor="#94A3B8"
              value={filterServiceId}
              onChangeText={setFilterServiceId}
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

      {/* Service list */}
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
        {filteredServices.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 px-5">
            <Package size={48} color="#94A3B8" />
            <Text className="mt-4 text-base font-bold text-slate-700 text-center">
              {searchQuery.trim() || filterServiceId.trim()
                ? "Không tìm thấy dịch vụ phù hợp"
                : "Chưa có dịch vụ nào"}
            </Text>
            <Text className="mt-2 text-xs text-slate-500 text-center">
              {searchQuery.trim() || filterServiceId.trim()
                ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                : "Nhấn nút + để thêm dịch vụ mới"}
            </Text>
          </View>
        ) : (
          <View className="p-4">
            {filteredServices.map((service, index) => {
              const isExpanded = expandedServiceId === service.serviceId;
              
              return (
                <ServiceItem
                  key={service.serviceId}
                  service={service}
                  isExpanded={isExpanded}
                  onToggleExpand={() => {
                    setExpandedServiceId(isExpanded ? null : service.serviceId);
                  }}
                  onEdit={() => handleEdit(service)}
                  onDelete={() => handleDelete(service)}
                  isPending={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    deleteMutation.isPending
                  }
                />
              );
            })}
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
        visible={showCreateModal && !showServiceTypePicker}
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
              Thêm dịch vụ mới
            </Text>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-2">
                Mã dịch vụ *
              </Text>
              <TextInput
                className="h-11 rounded-xl px-3 bg-slate-50 border border-slate-200 text-sm text-slate-900 font-semibold"
                placeholder="Nhập mã dịch vụ"
                placeholderTextColor="#94A3B8"
                value={formServiceId}
                onChangeText={setFormServiceId}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-2">
                Tên dịch vụ *
              </Text>
              <TouchableOpacity
                className="h-11 rounded-xl px-3 bg-slate-50 border border-slate-200 flex-row items-center justify-between"
                onPress={() => {
                  console.log("📋 Opening service type picker for create");
                  setPickerFor("create");
                  setShowServiceTypePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-semibold ${
                    formName ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {formName ? getServiceTypeLabel(formName) : "Chọn loại dịch vụ"}
                </Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>
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
                disabled={
                  createMutation.isPending ||
                  !formServiceId.trim() ||
                  !formName.trim()
                }
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

      {/* Edit Modal */}
      <Modal
        visible={showEditModal && !showServiceTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingService(null);
          resetForm();
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-[400px]">
            <Text className="text-lg font-extrabold text-slate-900 mb-2">
              Chỉnh sửa dịch vụ
            </Text>
            <Text className="text-sm text-slate-600 mb-4">
              Mã: {editingService?.serviceId}
            </Text>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-2">
                Tên dịch vụ *
              </Text>
              <TouchableOpacity
                className="h-11 rounded-xl px-3 bg-slate-50 border border-slate-200 flex-row items-center justify-between"
                onPress={() => {
                  console.log("📋 Opening service type picker for edit");
                  setPickerFor("edit");
                  setShowServiceTypePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-semibold ${
                    formName ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {formName ? getServiceTypeLabel(formName) : "Chọn loại dịch vụ"}
                </Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-slate-100 items-center"
                onPress={() => {
                  setShowEditModal(false);
                  setEditingService(null);
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
                disabled={updateMutation.isPending || !formName.trim()}
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

      {/* Service Type Picker Modal */}
      <SelectionModal
        visible={showServiceTypePicker}
        title="Chọn loại dịch vụ"
        options={SERVICE_TYPES.map((t) => ({
          value: t.value,
          label: t.label,
        }))}
        selectedValue={formName}
        onSelect={(value) => {
          console.log("🎯 SelectionModal onSelect called with:", value);
          handleServiceTypeSelect(value);
        }}
        onClose={() => {
          console.log("❌ SelectionModal onClose called");
          setShowServiceTypePicker(false);
        }}
        placeholderSearch="Tìm kiếm loại dịch vụ..."
      />
    </SafeAreaView>
  );
}
