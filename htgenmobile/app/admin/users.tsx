import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  Search,
  X,
  SlidersHorizontal,
  User,
  Lock,
  LockOpen,
  Eye,
  Mail,
  Phone,
  Building2,
  Shield,
  AlertCircle,
  ArrowLeft,
  Home,
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import {
  userService,
  UserResponse,
  BlockUserRequest,
} from "@/services/userService";

// Map role to display label
const getRoleLabel = (role?: string): string => {
  if (!role) return "N/A";
  const roleMap: Record<string, string> = {
    ROLE_ADMIN: "Admin",
    ROLE_STAFF: "Nhân viên",
    ROLE_DOCTOR: "Bác sĩ",
    ROLE_CUSTOMER: "Khách hàng",
    ROLE_LAB_TECHNICIAN: "Kỹ thuật viên",
    ROLE_SAMPLE_COLLECTOR: "Người thu mẫu",
  };
  return roleMap[role] || role;
};

// Get status badge
const getStatusBadge = (user: UserResponse) => {
  if (!user.isActive) {
    return {
      label: "Đã khóa",
      bg: "bg-red-50",
      fg: "text-red-700",
      bd: "border-red-200",
    };
  }
  if (!user.enabled) {
    return {
      label: "Chờ kích hoạt",
      bg: "bg-orange-50",
      fg: "text-orange-700",
      bd: "border-orange-200",
    };
  }
  return {
    label: "Hoạt động",
    bg: "bg-emerald-50",
    fg: "text-emerald-700",
    bd: "border-emerald-200",
  };
};

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
        active ? "bg-sky-600 border-sky-600" : "bg-white border-slate-200"
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

export default function AdminUsersScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [blockReason, setBlockReason] = useState("");

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

  // Fetch users
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getAll(),
    enabled: user?.role === "ROLE_ADMIN",
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      userService.block(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowBlockModal(false);
      setSelectedUser(null);
      setBlockReason("");
      Alert.alert("Thành công", "Đã khóa tài khoản người dùng");
    },
    onError: (error: any) => {
      Alert.alert("Lỗi", error.message || "Không thể khóa tài khoản");
    },
  });

  // Unblock user mutation
  const unblockMutation = useMutation({
    mutationFn: (userId: string) => {
      console.log("🔓 Attempting to unblock user:", userId);
      return userService.unblock(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowDetailModal(false);
      Alert.alert("Thành công", "Đã mở khóa tài khoản người dùng");
    },
    onError: (error: any) => {
      console.error("❌ Unblock error:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể mở khóa tài khoản. Vui lòng thử lại."
      );
    },
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.phone?.toLowerCase().includes(query) ||
          u.role?.toLowerCase().includes(query) ||
          u.hospitalName?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    // Status filter
    if (filterStatus === "active") {
      result = result.filter((u) => u.isActive === true && u.enabled === true);
    } else if (filterStatus === "inactive") {
      result = result.filter((u) => u.isActive === false);
    } else if (filterStatus === "pending") {
      result = result.filter((u) => u.enabled === false);
    }

    return result;
  }, [users, searchQuery, filterRole, filterStatus]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterRole !== "all") count++;
    if (filterStatus !== "all") count++;
    return count;
  }, [filterRole, filterStatus]);

  const handleBlockUser = () => {
    if (!selectedUser) return;
    if (!blockReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do khóa tài khoản");
      return;
    }
    blockMutation.mutate({
      userId: selectedUser.userId,
      reason: blockReason.trim(),
    });
  };

  const handleUnblockUser = (userId: string) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn mở khóa tài khoản này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Mở khóa",
          style: "destructive",
          onPress: () => unblockMutation.mutate(userId),
        },
      ]
    );
  };

  const handleClearFilters = () => {
    setFilterRole("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

  // Available roles for filter
  const availableRoles = [
    { value: "all", label: "Tất cả" },
    { value: "ROLE_ADMIN", label: "Admin" },
    { value: "ROLE_STAFF", label: "Nhân viên" },
    { value: "ROLE_DOCTOR", label: "Bác sĩ" },
    { value: "ROLE_CUSTOMER", label: "Khách hàng" },
    { value: "ROLE_LAB_TECHNICIAN", label: "Kỹ thuật viên" },
    { value: "ROLE_SAMPLE_COLLECTOR", label: "Người thu mẫu" },
  ];

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
          title: "Quản lý người dùng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push("/admin-home")} 
              className="ml-2"
              activeOpacity={0.7}
            >
              <Home size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Header với search và filter */}
      <View className="pb-3 px-4 bg-white border-b border-sky-100">
        <View className="flex-row items-center mb-3">
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">
              Quản lý người dùng
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filteredUsers.length} người dùng
            </Text>
          </View>

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
            placeholder="Tìm theo tên, email, SĐT, vai trò..."
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
            <Text className="text-xs font-bold text-slate-600 mb-2">Vai trò</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              <View className="flex-row gap-2">
                {availableRoles.map((role) => (
                  <FilterPill
                    key={role.value}
                    label={role.label}
                    active={filterRole === role.value}
                    onPress={() => setFilterRole(role.value)}
                  />
                ))}
              </View>
            </ScrollView>

            <Text className="text-xs font-bold text-slate-600 mb-2">Trạng thái</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              <View className="flex-row gap-2">
                <FilterPill
                  label="Tất cả"
                  active={filterStatus === "all"}
                  onPress={() => setFilterStatus("all")}
                />
                <FilterPill
                  label="Hoạt động"
                  active={filterStatus === "active"}
                  onPress={() => setFilterStatus("active")}
                />
                <FilterPill
                  label="Đã khóa"
                  active={filterStatus === "inactive"}
                  onPress={() => setFilterStatus("inactive")}
                />
                <FilterPill
                  label="Chờ kích hoạt"
                  active={filterStatus === "pending"}
                  onPress={() => setFilterStatus("pending")}
                />
              </View>
            </ScrollView>

            {activeFilterCount > 0 && (
              <TouchableOpacity
                className="py-2 rounded-xl bg-slate-100 items-center"
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

      {/* User list */}
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
        {filteredUsers.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 px-5">
            <User size={48} color="#94A3B8" />
            <Text className="mt-4 text-base font-bold text-slate-700 text-center">
              {searchQuery.trim() || filterRole !== "all" || filterStatus !== "all"
                ? "Không tìm thấy người dùng phù hợp"
                : "Chưa có người dùng nào"}
            </Text>
            <Text className="mt-2 text-xs text-slate-500 text-center">
              {searchQuery.trim() || filterRole !== "all" || filterStatus !== "all"
                ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                : "Danh sách người dùng sẽ hiển thị tại đây"}
            </Text>
          </View>
        ) : (
          <View className="p-4">
            {filteredUsers.map((userItem, index) => {
              const statusBadge = getStatusBadge(userItem);
              return (
                <View
                  key={userItem.userId}
                  className={`bg-white rounded-2xl p-4 mb-3 border border-sky-100 ${
                    index === 0 ? "" : ""
                  }`}
                >
                  {/* User header */}
                  <View className="flex-row items-start mb-3">
                    {userItem.avatarUrl ? (
                      <Image
                        source={{ uri: userItem.avatarUrl }}
                        className="w-12 h-12 rounded-xl"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-xl bg-sky-100 border border-sky-200 items-center justify-center">
                        <Text className="text-base font-bold text-sky-700">
                          {userItem.name?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}

                    <View className="flex-1 ml-3">
                      <Text className="text-base font-extrabold text-slate-900">
                        {userItem.name || "N/A"}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Shield size={12} color="#64748B" />
                        <Text className="ml-1 text-xs text-slate-500">
                          {getRoleLabel(userItem.role)}
                        </Text>
                      </View>
                    </View>

                    <View
                      className={`px-2.5 py-1 rounded-lg border ${statusBadge.bg} ${statusBadge.bd}`}
                    >
                      <Text className={`text-[10px] font-bold ${statusBadge.fg}`}>
                        {statusBadge.label}
                      </Text>
                    </View>
                  </View>

                  {/* User info */}
                  <View className="mb-3 space-y-2">
                    <View className="flex-row items-center">
                      <Mail size={14} color="#64748B" />
                      <Text className="ml-2 text-xs text-slate-600 flex-1">
                        {userItem.email || "N/A"}
                      </Text>
                    </View>
                    {userItem.phone && (
                      <View className="flex-row items-center">
                        <Phone size={14} color="#64748B" />
                        <Text className="ml-2 text-xs text-slate-600">
                          {userItem.phone}
                        </Text>
                      </View>
                    )}
                    {userItem.hospitalName && (
                      <View className="flex-row items-center">
                        <Building2 size={14} color="#64748B" />
                        <Text className="ml-2 text-xs text-slate-600">
                          {userItem.hospitalName}
                        </Text>
                      </View>
                    )}
                    {userItem.blockReason && (
                      <View className="flex-row items-start">
                        <AlertCircle size={14} color="#EF4444" />
                        <Text className="ml-2 text-xs text-red-600 flex-1">
                          Lý do: {userItem.blockReason}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View className="flex-row gap-2 pt-3 border-t border-sky-100">
                    <TouchableOpacity
                      className="flex-1 py-2.5 px-3 rounded-xl bg-sky-50 border border-sky-200 items-center"
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedUser(userItem);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye size={16} color="#0284C7" />
                      <Text className="mt-1 text-xs font-bold text-sky-700">
                        Chi tiết
                      </Text>
                    </TouchableOpacity>

                    {userItem.isActive ? (
                      <TouchableOpacity
                        className="flex-1 py-2.5 px-3 rounded-xl bg-red-50 border border-red-200 items-center"
                        onPress={() => {
                          setSelectedUser(userItem);
                          setShowBlockModal(true);
                        }}
                        activeOpacity={0.7}
                        disabled={
                          blockMutation.isPending || unblockMutation.isPending
                        }
                      >
                        <Lock size={16} color="#DC2626" />
                        <Text className="mt-1 text-xs font-bold text-red-700">
                          Khóa
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 items-center"
                        onPress={() => handleUnblockUser(userItem.userId)}
                        activeOpacity={0.7}
                        disabled={
                          blockMutation.isPending || unblockMutation.isPending
                        }
                      >
                        <LockOpen size={16} color="#16A34A" />
                        <Text className="mt-1 text-xs font-bold text-emerald-700">
                          Mở khóa
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* User detail modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedUser(null);
        }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-extrabold text-slate-900">Chi tiết người dùng</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedUser(null);
                }}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  {/* Avatar and Name */}
                  <View className="items-center mb-4">
                    {selectedUser.avatarUrl ? (
                      <Image
                        source={{ uri: selectedUser.avatarUrl }}
                        className="w-20 h-20 rounded-2xl border-2 border-sky-200"
                      />
                    ) : (
                      <View className="w-20 h-20 rounded-2xl bg-sky-100 border-2 border-sky-200 items-center justify-center">
                        <Text className="text-2xl font-bold text-sky-700">
                          {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}
                    <Text className="text-xl font-extrabold text-slate-900 mt-3">
                      {selectedUser.name || "N/A"}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Shield size={14} color="#64748B" />
                      <Text className="text-sm text-slate-500">
                        {getRoleLabel(selectedUser.role)}
                      </Text>
                    </View>
                    <View
                      className={`px-3 py-1.5 rounded-lg border mt-2 ${getStatusBadge(selectedUser).bg} ${getStatusBadge(selectedUser).bd}`}
                    >
                      <Text className={`text-xs font-bold ${getStatusBadge(selectedUser).fg}`}>
                        {getStatusBadge(selectedUser).label}
                      </Text>
                    </View>
                  </View>

                  {/* Basic Information */}
                  <View className="bg-sky-50 rounded-2xl p-4 border border-sky-200">
                    <Text className="text-sm font-extrabold text-slate-900 mb-3">Thông tin cơ bản</Text>
                    <View className="gap-3">
                      <View>
                        <Text className="text-xs font-bold text-slate-500 mb-1">User ID</Text>
                        <Text className="text-sm font-bold text-slate-900">{selectedUser.userId}</Text>
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-slate-500 mb-1">Email</Text>
                        <View className="flex-row items-center gap-2">
                          <Mail size={14} color="#64748B" />
                          <Text className="text-sm text-slate-700 flex-1">
                            {selectedUser.email || "N/A"}
                          </Text>
                        </View>
                      </View>
                      {selectedUser.phone && (
                        <View>
                          <Text className="text-xs font-bold text-slate-500 mb-1">Số điện thoại</Text>
                          <View className="flex-row items-center gap-2">
                            <Phone size={14} color="#64748B" />
                            <Text className="text-sm text-slate-700">{selectedUser.phone}</Text>
                          </View>
                        </View>
                      )}
                      <View>
                        <Text className="text-xs font-bold text-slate-500 mb-1">Vai trò</Text>
                        <View className="flex-row items-center gap-2">
                          <Shield size={14} color="#64748B" />
                          <Text className="text-sm text-slate-700">
                            {getRoleLabel(selectedUser.role)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Hospital Information */}
                  {selectedUser.hospitalName && (
                    <View className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                      <Text className="text-sm font-extrabold text-slate-900 mb-3">Bệnh viện/Cơ sở</Text>
                      <View className="flex-row items-center gap-2">
                        <Building2 size={16} color="#16A34A" />
                        <Text className="text-sm font-bold text-slate-900 flex-1">
                          {selectedUser.hospitalName}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Status Information */}
                  <View className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <Text className="text-sm font-extrabold text-slate-900 mb-3">Trạng thái tài khoản</Text>
                    <View className="gap-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-slate-600">Kích hoạt:</Text>
                        <View
                          className={`px-2 py-1 rounded ${
                            selectedUser.enabled
                              ? "bg-emerald-50 border border-emerald-200"
                              : "bg-orange-50 border border-orange-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              selectedUser.enabled ? "text-emerald-700" : "text-orange-700"
                            }`}
                          >
                            {selectedUser.enabled ? "Đã kích hoạt" : "Chưa kích hoạt"}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-slate-600">Hoạt động:</Text>
                        <View
                          className={`px-2 py-1 rounded ${
                            selectedUser.isActive
                              ? "bg-emerald-50 border border-emerald-200"
                              : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              selectedUser.isActive ? "text-emerald-700" : "text-red-700"
                            }`}
                          >
                            {selectedUser.isActive ? "Đang hoạt động" : "Đã khóa"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Block Reason */}
                  {selectedUser.blockReason && (
                    <View className="bg-red-50 rounded-2xl p-4 border border-red-200">
                      <Text className="text-sm font-extrabold text-slate-900 mb-2">Lý do khóa</Text>
                      <View className="flex-row items-start gap-2">
                        <AlertCircle size={16} color="#DC2626" />
                        <Text className="text-sm text-red-700 flex-1">
                          {selectedUser.blockReason}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Actions */}
                  <View className="flex-row gap-3 pt-2">
                    {selectedUser.isActive ? (
                      <TouchableOpacity
                        className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 items-center"
                        onPress={() => {
                          setShowDetailModal(false);
                          setSelectedUser(selectedUser);
                          setShowBlockModal(true);
                        }}
                        activeOpacity={0.85}
                      >
                        <Lock size={18} color="#DC2626" />
                        <Text className="mt-1 text-xs font-bold text-red-700">Khóa tài khoản</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        className="flex-1 py-3 rounded-xl bg-emerald-50 border border-emerald-200 items-center"
                        onPress={() => {
                          setShowDetailModal(false);
                          handleUnblockUser(selectedUser.userId);
                        }}
                        activeOpacity={0.85}
                        disabled={unblockMutation.isPending}
                      >
                        {unblockMutation.isPending ? (
                          <ActivityIndicator size="small" color="#16A34A" />
                        ) : (
                          <>
                            <LockOpen size={18} color="#16A34A" />
                            <Text className="mt-1 text-xs font-bold text-emerald-700">Mở khóa</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Block user modal */}
      <Modal
        visible={showBlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowBlockModal(false);
          setSelectedUser(null);
          setBlockReason("");
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-[400px]">
            <Text className="text-lg font-extrabold text-slate-900 mb-2">
              Khóa tài khoản
            </Text>
            <Text className="text-sm text-slate-600 mb-4">
              Người dùng: {selectedUser?.name || selectedUser?.email}
            </Text>

            <Text className="text-xs font-bold text-slate-700 mb-2">
              Lý do khóa *
            </Text>
            <TextInput
              className="h-24 rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 text-sm text-slate-900 font-semibold"
              placeholder="Nhập lý do khóa tài khoản..."
              placeholderTextColor="#94A3B8"
              value={blockReason}
              onChangeText={setBlockReason}
              multiline
              textAlignVertical="top"
            />

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-slate-100 items-center"
                onPress={() => {
                  setShowBlockModal(false);
                  setSelectedUser(null);
                  setBlockReason("");
                }}
                activeOpacity={0.85}
                disabled={blockMutation.isPending}
              >
                <Text className="text-slate-700 text-sm font-extrabold">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-2xl bg-red-600 items-center"
                onPress={handleBlockUser}
                activeOpacity={0.85}
                disabled={blockMutation.isPending || !blockReason.trim()}
              >
                {blockMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-sm font-extrabold">
                    Khóa
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
