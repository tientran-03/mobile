import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Building2,
  Package,
  BarChart3,
  Calendar,
} from "lucide-react-native";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { statisticsService } from "@/services/statisticsService";

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

type StatisticsTab = "revenue" | "services" | "hospitals";

export default function AdminStatisticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<StatisticsTab>("revenue");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: revenueStats, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ["admin-statistics-revenue", selectedYear],
    queryFn: () => statisticsService.getRevenueStatistics(selectedYear),
    enabled: user?.role === "ROLE_ADMIN" && activeTab === "revenue",
  });

  const { data: serviceStats, isLoading: serviceLoading, refetch: refetchServices } = useQuery({
    queryKey: ["admin-statistics-services"],
    queryFn: () => statisticsService.getServiceStatistics(),
    enabled: user?.role === "ROLE_ADMIN" && activeTab === "services",
  });

  const { data: hospitalStats, isLoading: hospitalLoading, refetch: refetchHospitals } = useQuery({
    queryKey: ["admin-statistics-hospitals"],
    queryFn: () => statisticsService.getHospitalStatistics(),
    enabled: user?.role === "ROLE_ADMIN" && activeTab === "hospitals",
  });

  if (user?.role !== "ROLE_ADMIN") {
    return null;
  }

  const isLoading = revenueLoading || serviceLoading || hospitalLoading;

  const handleRefetch = () => {
    if (activeTab === "revenue") refetchRevenue();
    else if (activeTab === "services") refetchServices();
    else if (activeTab === "hospitals") refetchHospitals();
  };

  // Generate year options (current year and 4 previous years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" />
      <Stack.Screen
        options={{
          title: "Thống kê chi tiết",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-2">
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Tabs */}
      <View className="bg-white px-4 py-3 border-b border-sky-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setActiveTab("revenue")}
              className={`px-4 py-2 rounded-xl border ${
                activeTab === "revenue"
                  ? "bg-sky-600 border-sky-600"
                  : "bg-white border-sky-200"
              }`}
              activeOpacity={0.85}
            >
              <View className="flex-row items-center gap-2">
                <DollarSign size={16} color={activeTab === "revenue" ? "#fff" : "#64748b"} />
                <Text
                  className={`text-xs font-bold ${
                    activeTab === "revenue" ? "text-white" : "text-slate-600"
                  }`}
                >
                  Doanh thu
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("services")}
              className={`px-4 py-2 rounded-xl border ${
                activeTab === "services"
                  ? "bg-sky-600 border-sky-600"
                  : "bg-white border-sky-200"
              }`}
              activeOpacity={0.85}
            >
              <View className="flex-row items-center gap-2">
                <Package size={16} color={activeTab === "services" ? "#fff" : "#64748b"} />
                <Text
                  className={`text-xs font-bold ${
                    activeTab === "services" ? "text-white" : "text-slate-600"
                  }`}
                >
                  Dịch vụ
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("hospitals")}
              className={`px-4 py-2 rounded-xl border ${
                activeTab === "hospitals"
                  ? "bg-sky-600 border-sky-600"
                  : "bg-white border-sky-200"
              }`}
              activeOpacity={0.85}
            >
              <View className="flex-row items-center gap-2">
                <Building2 size={16} color={activeTab === "hospitals" ? "#fff" : "#64748b"} />
                <Text
                  className={`text-xs font-bold ${
                    activeTab === "hospitals" ? "text-white" : "text-slate-600"
                  }`}
                >
                  Bệnh viện
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Year Selector for Revenue */}
      {activeTab === "revenue" && (
        <View className="bg-white px-4 py-3 border-b border-sky-100">
          <View className="flex-row items-center gap-2">
            <Calendar size={16} color="#64748b" />
            <Text className="text-xs font-bold text-slate-700">Năm:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {yearOptions.map((year) => (
                  <TouchableOpacity
                    key={year}
                    onPress={() => setSelectedYear(year)}
                    className={`px-3 py-1.5 rounded-full border ${
                      selectedYear === year
                        ? "bg-sky-600 border-sky-600"
                        : "bg-white border-sky-200"
                    }`}
                    activeOpacity={0.85}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selectedYear === year ? "text-white" : "text-slate-600"
                      }`}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefetch} />}
      >
        <View className="p-4">
          {isLoading ? (
            <View className="bg-white rounded-2xl p-8 items-center border border-sky-100">
              <ActivityIndicator size="large" color="#0284C7" />
              <Text className="text-sm font-bold text-slate-500 mt-3">Đang tải dữ liệu...</Text>
            </View>
          ) : (
            <>
              {activeTab === "revenue" && (
                <RevenueTab
                  data={revenueStats?.success ? revenueStats.data : null}
                  selectedYear={selectedYear}
                />
              )}
              {activeTab === "services" && (
                <ServicesTab data={serviceStats?.success ? serviceStats.data : null} />
              )}
              {activeTab === "hospitals" && (
                <HospitalsTab data={hospitalStats?.success ? hospitalStats.data : null} />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Revenue Tab Component
function RevenueTab({ data, selectedYear }: { data: any; selectedYear: number }) {
  if (!data) {
    return (
      <View className="bg-white rounded-2xl p-8 items-center border border-sky-100">
        <BarChart3 size={48} color="#cbd5e1" />
        <Text className="text-sm font-bold text-slate-500 mt-3 text-center">
          Không có dữ liệu thống kê
        </Text>
      </View>
    );
  }

  const monthlyRevenues = data.monthlyRevenues || [];
  const totalRevenue = data.totalRevenue || 0;
  const totalOrders = data.totalOrders || 0;
  const orderStatusCounts = data.orderStatusCounts || [];

  return (
    <View className="gap-4">
      {/* Summary Cards */}
      <View className="flex-row gap-3">
        <View className="flex-1 bg-white rounded-2xl p-4 border border-sky-100">
          <View className="flex-row items-center gap-2 mb-2">
            <DollarSign size={20} color="#0891b2" />
            <Text className="text-xs font-bold text-slate-500">Tổng doanh thu</Text>
          </View>
          <Text className="text-lg font-extrabold text-slate-900">
            {formatCurrency(totalRevenue)}
          </Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 border border-sky-100">
          <View className="flex-row items-center gap-2 mb-2">
            <Package size={20} color="#0891b2" />
            <Text className="text-xs font-bold text-slate-500">Tổng đơn hàng</Text>
          </View>
          <Text className="text-lg font-extrabold text-slate-900">{totalOrders}</Text>
        </View>
      </View>

      {/* Monthly Revenue */}
      <View className="bg-white rounded-2xl p-4 border border-sky-100">
        <Text className="text-sm font-extrabold text-slate-900 mb-3">Doanh thu theo tháng</Text>
        <View className="gap-2">
          {monthlyRevenues.length === 0 ? (
            <Text className="text-xs text-slate-500 text-center py-4">
              Không có dữ liệu tháng
            </Text>
          ) : (
            monthlyRevenues.map((item: any) => (
              <View
                key={item.month}
                className="flex-row items-center justify-between p-3 bg-sky-50 rounded-xl border border-sky-100"
              >
                <Text className="text-sm font-bold text-slate-700">Tháng {item.month}</Text>
                <View className="items-end">
                  <Text className="text-sm font-extrabold text-slate-900">
                    {formatCurrency(item.revenue)}
                  </Text>
                  <Text className="text-xs text-slate-500">{item.orderCount} đơn</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Order Status Counts */}
      {orderStatusCounts.length > 0 && (
        <View className="bg-white rounded-2xl p-4 border border-sky-100">
          <Text className="text-sm font-extrabold text-slate-900 mb-3">Thống kê trạng thái đơn</Text>
          <View className="gap-2">
            {orderStatusCounts.map((item: any) => (
              <View
                key={item.status}
                className="flex-row items-center justify-between p-3 bg-sky-50 rounded-xl border border-sky-100"
              >
                <Text className="text-sm font-bold text-slate-700">{item.status}</Text>
                <Text className="text-sm font-extrabold text-slate-900">{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Services Tab Component
function ServicesTab({ data }: { data: any }) {
  if (!data) {
    return (
      <View className="bg-white rounded-2xl p-8 items-center border border-sky-100">
        <Package size={48} color="#cbd5e1" />
        <Text className="text-sm font-bold text-slate-500 mt-3 text-center">
          Không có dữ liệu thống kê
        </Text>
      </View>
    );
  }

  const serviceOrderCounts = data.serviceOrderCounts || [];
  const serviceRevenues = data.serviceRevenues || [];

  return (
    <View className="gap-4">
      {/* Service Order Counts */}
      <View className="bg-white rounded-2xl p-4 border border-sky-100">
        <Text className="text-sm font-extrabold text-slate-900 mb-3">Số đơn hàng theo dịch vụ</Text>
        <View className="gap-2">
          {serviceOrderCounts.length === 0 ? (
            <Text className="text-xs text-slate-500 text-center py-4">Không có dữ liệu</Text>
          ) : (
            serviceOrderCounts.map((item: any, index: number) => (
              <View
                key={index}
                className="flex-row items-center justify-between p-3 bg-sky-50 rounded-xl border border-sky-100"
              >
                <Text className="text-sm font-bold text-slate-700 flex-1">{item.serviceName}</Text>
                <Text className="text-sm font-extrabold text-slate-900">{item.orderCount}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Service Revenues */}
      <View className="bg-white rounded-2xl p-4 border border-sky-100">
        <Text className="text-sm font-extrabold text-slate-900 mb-3">Doanh thu theo dịch vụ</Text>
        <View className="gap-2">
          {serviceRevenues.length === 0 ? (
            <Text className="text-xs text-slate-500 text-center py-4">Không có dữ liệu</Text>
          ) : (
            serviceRevenues.map((item: any, index: number) => (
              <View
                key={index}
                className="flex-row items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100"
              >
                <Text className="text-sm font-bold text-slate-700 flex-1">{item.serviceName}</Text>
                <Text className="text-sm font-extrabold text-slate-900">
                  {formatCurrency(item.totalRevenue)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

// Hospitals Tab Component
function HospitalsTab({ data }: { data: any }) {
  if (!data) {
    return (
      <View className="bg-white rounded-2xl p-8 items-center border border-sky-100">
        <Building2 size={48} color="#cbd5e1" />
        <Text className="text-sm font-bold text-slate-500 mt-3 text-center">
          Không có dữ liệu thống kê
        </Text>
      </View>
    );
  }

  const topHospitals = data.topHospitalsByRevenue || [];
  const hospitalSummaries = data.hospitalPaymentSummaries || [];

  return (
    <View className="gap-4">
      {/* Top Hospitals by Revenue */}
      <View className="bg-white rounded-2xl p-4 border border-sky-100">
        <Text className="text-sm font-extrabold text-slate-900 mb-3">
          Top bệnh viện theo doanh thu
        </Text>
        <View className="gap-2">
          {topHospitals.length === 0 ? (
            <Text className="text-xs text-slate-500 text-center py-4">Không có dữ liệu</Text>
          ) : (
            topHospitals.map((item: any, index: number) => (
              <View
                key={item.hospitalId}
                className="flex-row items-center justify-between p-3 bg-sky-50 rounded-xl border border-sky-100"
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-6 h-6 rounded-full bg-sky-600 items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">{index + 1}</Text>
                  </View>
                  <Text className="text-sm font-bold text-slate-700 flex-1">
                    {item.hospitalName}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-extrabold text-slate-900">
                    {formatCurrency(item.totalRevenue)}
                  </Text>
                  <Text className="text-xs text-slate-500">{item.orderCount} đơn</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Hospital Payment Summaries */}
      <View className="bg-white rounded-2xl p-4 border border-sky-100">
        <Text className="text-sm font-extrabold text-slate-900 mb-3">
          Tổng hợp thanh toán bệnh viện
        </Text>
        <View className="gap-2">
          {hospitalSummaries.length === 0 ? (
            <Text className="text-xs text-slate-500 text-center py-4">Không có dữ liệu</Text>
          ) : (
            hospitalSummaries.map((item: any) => (
              <View
                key={item.hospitalId}
                className="p-3 bg-emerald-50 rounded-xl border border-emerald-100"
              >
                <Text className="text-sm font-extrabold text-slate-900 mb-2">
                  {item.hospitalName}
                </Text>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-slate-600">Tổng doanh thu:</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {formatCurrency(item.totalRevenue)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-slate-600">Tổng đơn hàng:</Text>
                  <Text className="text-xs font-bold text-slate-900">{item.totalOrders}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-slate-600">Đã thanh toán:</Text>
                  <Text className="text-xs font-bold text-emerald-700">{item.paidOrders}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-slate-600">Chưa thanh toán:</Text>
                  <Text className="text-xs font-bold text-orange-700">{item.unpaidOrders}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}
