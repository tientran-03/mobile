import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  Search,
  Shield,
  Users,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Lock,
} from "lucide-react-native";
import React, { useMemo, useState, useEffect, useCallback } from "react";
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

import { useAuth } from "@/contexts/AuthContext";
import { roleService, RoleResponse } from "@/services/roleService";
import { permissionService, PermissionResponse } from "@/services/permissionService";
import { rolePermissionService, PermissionAccess } from "@/services/rolePermissionService";
import { userService } from "@/services/userService";

// Map role to display label
const getRoleLabel = (roleName: string): string => {
  const roleMap: Record<string, string> = {
    ROLE_ADMIN: "Quản trị viên",
    ROLE_STAFF: "Nhân viên",
    ROLE_DOCTOR: "Bác sĩ",
    ROLE_CUSTOMER: "Khách hàng",
    ROLE_LAB_TECHNICIAN: "Kỹ thuật viên",
    ROLE_SAMPLE_COLLECTOR: "Người thu mẫu",
  };
  return roleMap[roleName] || roleName;
};

export default function AdminPermissionsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

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

  // Fetch roles
  const {
    data: roles = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.getAll(),
    enabled: user?.role === "ROLE_ADMIN",
  });

  // Fetch user counts for each role
  useEffect(() => {
    if (roles.length > 0) {
      const fetchUserCounts = async () => {
        const counts: Record<string, number> = {};
        await Promise.all(
          roles.map(async (role) => {
            try {
              const count = await userService.countByRole(role.name);
              counts[role.id] = count;
            } catch (err) {
              counts[role.id] = 0;
            }
          })
        );
        setUserCounts(counts);
      };
      fetchUserCounts();
    }
  }, [roles]);

  // Filtered roles
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const query = searchQuery.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        getRoleLabel(role.name).toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query)
    );
  }, [roles, searchQuery]);

  const handleViewPermissions = (role: RoleResponse) => {
    setSelectedRole(role);
    setShowPermissionModal(true);
  };

  if (authLoading || isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải...</Text>
      </View>
    );
  }

  if (!user || user.role !== "ROLE_ADMIN") {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
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
            <Text className="text-slate-900 text-lg font-extrabold">Phân quyền & Vai trò</Text>
            <Text className="mt-0.5 text-xs text-slate-500">Quản lý quyền truy cập hệ thống</Text>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-sky-50 rounded-xl px-3 py-2 border border-sky-200">
          <Search size={18} color="#64748B" />
          <TextInput
            className="flex-1 ml-2 text-sm text-slate-900"
            placeholder="Tìm kiếm vai trò..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="ml-2">
              <XCircle size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => refetch()}
            tintColor="#0284C7"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <Text className="text-red-700 text-sm font-bold">
              Lỗi: {error instanceof Error ? error.message : "Không thể tải dữ liệu"}
            </Text>
          </View>
        )}

        {filteredRoles.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-sky-100">
            <Shield size={48} color="#94A3B8" />
            <Text className="mt-4 text-slate-500 text-sm font-bold text-center">
              {searchQuery ? "Không tìm thấy vai trò nào" : "Chưa có vai trò nào"}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredRoles.map((role) => {
              const permissionCount = role.permissions?.length || 0;
              const userCount = userCounts[role.id] || 0;

              return (
                <View
                  key={role.id}
                  className="bg-white rounded-2xl p-4 border border-sky-100"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Shield size={20} color="#0284C7" />
                        <Text className="ml-2 text-slate-900 text-base font-extrabold">
                          {getRoleLabel(role.name)}
                        </Text>
                      </View>
                      {role.description && (
                        <Text className="text-slate-500 text-xs mt-1" numberOfLines={2}>
                          {role.description}
                        </Text>
                      )}
                      <Text className="text-slate-400 text-[10px] mt-1 font-bold">
                        {role.name}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-4 mb-3">
                    <View className="flex-row items-center">
                      <Lock size={14} color="#64748B" />
                      <Text className="ml-1 text-slate-600 text-xs font-bold">
                        {permissionCount} quyền
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Users size={14} color="#64748B" />
                      <Text className="ml-1 text-slate-600 text-xs font-bold">
                        {userCount} người dùng
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleViewPermissions(role)}
                    className="bg-sky-600 rounded-xl py-3 items-center"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <Eye size={16} color="#FFFFFF" />
                      <Text className="text-white text-sm font-extrabold ml-2">
                        Xem & Chỉnh sửa quyền
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Permission Modal */}
      {selectedRole && (
        <PermissionModal
          visible={showPermissionModal}
          role={selectedRole}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedRole(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Permission Modal Component
function PermissionModal({
  visible,
  role,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  role: RoleResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [permissionAccess, setPermissionAccess] = useState<PermissionAccess[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all permissions and current role permissions
  useEffect(() => {
    if (visible) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch all available permissions
          const permissions = await permissionService.getAll();
          setAllPermissions(permissions);

          // Fetch current role permissions
          const rolePermissions = await rolePermissionService.getPermissionsByRoleId(role.id);

          // Create a map of existing permissions
          const existingMap = new Map(
            rolePermissions.map((rp) => [rp.permissionId, rp])
          );

          // Merge with all permissions
          const mergedAccess: PermissionAccess[] = permissions.map((perm) => {
            const existing = existingMap.get(perm.id);
            return {
              permissionId: perm.id,
              permissionName: perm.permissionName,
              groupName: perm.groupName,
              levelName: perm.levelName,
              createAllowed: existing?.createAllowed || false,
              readAllowed: existing?.readAllowed || false,
              updateAllowed: existing?.updateAllowed || false,
              deleteAllowed: existing?.deleteAllowed || false,
            };
          });

          setPermissionAccess(mergedAccess);
        } catch (err: any) {
          setError(err.message || "Không thể tải dữ liệu");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [visible, role]);

  // Group permissions by groupName
  const permissionGroups = useMemo(() => {
    const groups = new Map<string, PermissionAccess[]>();
    permissionAccess.forEach((p) => {
      const group = groups.get(p.groupName) || [];
      group.push(p);
      groups.set(p.groupName, group);
    });
    return Array.from(groups.entries()).map(([groupName, permissions]) => ({
      groupName,
      permissions,
    }));
  }, [permissionAccess]);

  // Toggle permission access
  const toggleAccess = useCallback(
    (
      permissionId: string,
      field: "createAllowed" | "readAllowed" | "updateAllowed" | "deleteAllowed"
    ) => {
      setPermissionAccess((prev) =>
        prev.map((p) =>
          p.permissionId === permissionId ? { ...p, [field]: !p[field] } : p
        )
      );
    },
    []
  );

  // Save permissions
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Delete all existing permissions for this role
      await rolePermissionService.deleteAllForRole(role.id);

      // Assign new permissions
      const permissionsToAssign = permissionAccess.filter(
        (p) =>
          p.createAllowed || p.readAllowed || p.updateAllowed || p.deleteAllowed
      );

      for (const perm of permissionsToAssign) {
        await rolePermissionService.assignPermissionToRole({
          roleId: role.id,
          permissionId: perm.permissionId,
          createAllowed: perm.createAllowed,
          readAllowed: perm.readAllowed,
          updateAllowed: perm.updateAllowed,
          deleteAllowed: perm.deleteAllowed,
        });
      }

      Alert.alert("Thành công", "Đã cập nhật phân quyền");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Không thể lưu phân quyền");
      Alert.alert("Lỗi", err.message || "Không thể lưu phân quyền");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          <View className="px-6 py-4 border-b border-sky-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-slate-900 text-lg font-extrabold">Phân quyền</Text>
                <Text className="text-slate-500 text-xs mt-1">
                  {getRoleLabel(role.name)}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <XCircle size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            {loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#0284C7" />
                <Text className="mt-3 text-slate-500 text-sm">Đang tải...</Text>
              </View>
            ) : error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4">
                <Text className="text-red-700 text-sm font-bold">{error}</Text>
              </View>
            ) : (
              <>
                {permissionGroups.map((group) => (
                  <View key={group.groupName} className="mb-6">
                    <Text className="text-slate-900 text-sm font-extrabold mb-3">
                      {group.groupName}
                    </Text>
                    {group.permissions.map((perm) => (
                      <View
                        key={perm.permissionId}
                        className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200"
                      >
                        <Text className="text-slate-900 text-xs font-bold mb-2">
                          {perm.permissionName}
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          <TouchableOpacity
                            onPress={() => toggleAccess(perm.permissionId, "createAllowed")}
                            className={`px-3 py-1.5 rounded-lg border ${
                              perm.createAllowed
                                ? "bg-green-50 border-green-300"
                                : "bg-white border-slate-300"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                perm.createAllowed ? "text-green-700" : "text-slate-500"
                              }`}
                            >
                              Tạo
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => toggleAccess(perm.permissionId, "readAllowed")}
                            className={`px-3 py-1.5 rounded-lg border ${
                              perm.readAllowed
                                ? "bg-blue-50 border-blue-300"
                                : "bg-white border-slate-300"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                perm.readAllowed ? "text-blue-700" : "text-slate-500"
                              }`}
                            >
                              Đọc
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => toggleAccess(perm.permissionId, "updateAllowed")}
                            className={`px-3 py-1.5 rounded-lg border ${
                              perm.updateAllowed
                                ? "bg-orange-50 border-orange-300"
                                : "bg-white border-slate-300"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                perm.updateAllowed ? "text-orange-700" : "text-slate-500"
                              }`}
                            >
                              Sửa
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => toggleAccess(perm.permissionId, "deleteAllowed")}
                            className={`px-3 py-1.5 rounded-lg border ${
                              perm.deleteAllowed
                                ? "bg-red-50 border-red-300"
                                : "bg-white border-slate-300"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                perm.deleteAllowed ? "text-red-700" : "text-slate-500"
                              }`}
                            >
                              Xóa
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  className="bg-sky-600 rounded-xl py-3 items-center mt-4"
                  style={{ opacity: saving ? 0.5 : 1 }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-extrabold">Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
