import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ArrowLeft, Home } from "lucide-react-native";
import React, { useEffect } from "react";
import { TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Helper component for back button
const BackButton = ({ toHome = false }: { toHome?: boolean }) => {
  const router = useRouter();
  return (
    <TouchableOpacity 
      onPress={() => toHome ? router.push("/admin-home") : router.back()} 
      className="ml-2"
      activeOpacity={0.7}
    >
      <ArrowLeft size={24} color="#fff" />
    </TouchableOpacity>
  );
};

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Quay lại" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="admin-home" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin/orders"
        options={{
          title: "Quản lý đơn hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="admin/hospitals"
        options={{
          title: "Quản lý bệnh viện",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="admin/users"
        options={{
          title: "Quản lý người dùng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="admin/services"
        options={{
          title: "Quản lý nội dung",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "Thông tin người dùng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          title: "Danh sách đơn hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="patients"
        options={{
          title: "Danh sách bệnh nhân",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="services"
        options={{
          title: "Danh sách dịch vụ",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="new-order"
        options={{
          title: "Thêm mới đơn hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="create-genome-test"
        options={{
          title: "Tạo mới xét nghiệm",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="create-order"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="quick-order"
        options={{
          title: "Thêm nhanh đơn hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="pending-orders"
        options={{
          title: "Đơn hàng chờ cập nhật",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="additional-samples"
        options={{
          title: "Danh sách mẫu bổ sung",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="new-sample-add"
        options={{
          title: "Thêm mẫu bổ sung",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="prescription-slips"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="update-order"
        options={{
          title: "Cập nhật đơn hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="update-order-wizard"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="order-detail"
        options={{
          title: "Chi tiết đơn hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="create-patient"
        options={{
          title: "Tạo mới bệnh nhân",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="patient-detail"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-patient"
        options={{
          title: "Sửa thông tin bệnh nhân",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="create-prescription-slip"
        options={{
          title: "Tạo mới phiếu chỉ định",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="prescription-slip-detail"
        options={{
          headerShown: false,
        }}
      />
      {/* TODO: Implement edit-prescription-slip screen */}
      {/* <Stack.Screen
        name="edit-prescription-slip"
        options={{
          title: "Sửa phiếu chỉ định",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
        }}
      /> */}
      <Stack.Screen
        name="genome-tests"
        options={{
          title: "Danh sách xét nghiệm",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="genome-test-detail"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-genome-test"
        options={{
          title: "Sửa xét nghiệm",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="customers"
        options={{
          title: "Danh sách khách hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="customer-detail"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-customer"
        options={{
          title: "Tạo mới khách hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      {/* TODO: Implement edit-customer screen */}
      {/* <Stack.Screen
        name="edit-customer"
        options={{
          title: "Sửa thông tin khách hàng",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
        }}
      /> */}
      <Stack.Screen
        name="statistics"
        options={{
          title: "Báo cáo & Thống kê",
          headerStyle: { backgroundColor: "#0891b2" },
          headerTintColor: "#fff",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
