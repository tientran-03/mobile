import { useQuery } from "@tanstack/react-query";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { hospitalService, HospitalResponse } from "@/services/hospitalService";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterHospitalId, setFilterHospitalId] = useState("");

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

  // Fetch hospitals
  const {
    data: hospitals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => hospitalService.getAll(),
    enabled: user?.role === "ROLE_ADMIN",
  });

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
          title: "Quản lý bệnh viện",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
        }}
      />

      {/* Header với search và filter */}
      <View className="pb-3 px-4 bg-white border-b border-sky-100">
        <View className="flex-row items-center mb-3">
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">
              Quản lý bệnh viện
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {filteredHospitals.length} bệnh viện
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
            placeholder="Tìm theo mã hoặc tên bệnh viện..."
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
              Mã bệnh viện
            </Text>
            <TextInput
              className="h-10 rounded-xl px-3 bg-white border border-sky-200 text-sm text-slate-900 font-semibold"
              placeholder="Nhập mã bệnh viện"
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
        {filteredHospitals.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 px-5">
            <Building2 size={48} color="#94A3B8" />
            <Text className="mt-4 text-base font-bold text-slate-700 text-center">
              {searchQuery.trim() || filterHospitalId.trim()
                ? "Không tìm thấy bệnh viện phù hợp"
                : "Chưa có bệnh viện nào"}
            </Text>
            <Text className="mt-2 text-xs text-slate-500 text-center">
              {searchQuery.trim() || filterHospitalId.trim()
                ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                : "Danh sách bệnh viện sẽ hiển thị tại đây"}
            </Text>
          </View>
        ) : (
          <View className="p-4">
            {filteredHospitals.map((hospital, index) => (
              <View
                key={hospital.hospitalId}
                className={`bg-white rounded-2xl p-4 mb-3 border border-sky-100 ${
                  index === 0 ? "" : ""
                }`}
              >
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

                {/* Action buttons */}
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-sky-100">
                  {hospital.hospitalId === 1 ? (
                    <>
                      {/* Hospital ID = 1: Show Doctors, Staff, Patients */}
                      <TouchableOpacity
                        className="flex-1 py-2.5 px-3 rounded-xl bg-blue-50 border border-blue-200 items-center"
                        activeOpacity={0.7}
                      >
                        <User size={16} color="#2563EB" />
                        <Text className="mt-1 text-xs font-bold text-blue-700">
                          Bác sĩ
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-1 py-2.5 px-3 rounded-xl bg-green-50 border border-green-200 items-center"
                        activeOpacity={0.7}
                      >
                        <Users size={16} color="#16A34A" />
                        <Text className="mt-1 text-xs font-bold text-green-700">
                          Nhân viên
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-1 py-2.5 px-3 rounded-xl bg-purple-50 border border-purple-200 items-center"
                        activeOpacity={0.7}
                      >
                        <UserCircle size={16} color="#9333EA" />
                        <Text className="mt-1 text-xs font-bold text-purple-700">
                          Bệnh nhân
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {/* Hospital ID != 1: Show Customers, Doctors */}
                      <TouchableOpacity
                        className="flex-1 py-2.5 px-3 rounded-xl bg-orange-50 border border-orange-200 items-center"
                        activeOpacity={0.7}
                      >
                        <Building2 size={16} color="#EA580C" />
                        <Text className="mt-1 text-xs font-bold text-orange-700">
                          Khách hàng
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-1 py-2.5 px-3 rounded-xl bg-blue-50 border border-blue-200 items-center"
                        activeOpacity={0.7}
                      >
                        <User size={16} color="#2563EB" />
                        <Text className="mt-1 text-xs font-bold text-blue-700">
                          Bác sĩ
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
