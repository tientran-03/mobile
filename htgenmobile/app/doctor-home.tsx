import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Image, ImageBackground, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route?: string;
  badge?: number;
}

export default function DoctorHomeScreen() {
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();

  // Guard: Chỉ DOCTOR mới được vào màn hình này
  useEffect(() => {
    // Chỉ redirect khi đã load xong và user có role nhưng không phải DOCTOR
    if (!isLoading && user && user.role) {
      if (user.role !== "ROLE_DOCTOR") {
        // Nếu không phải DOCTOR thì redirect về home tương ứng
        if (user.role === "ROLE_ADMIN") {
          router.replace("/admin-home");
        } else if (user.role === "ROLE_STAFF") {
          router.replace("/home");
        } else {
          router.replace("/");
        }
      }
    } else if (!isLoading && !user) {
      // Nếu không có user thì về login
      router.replace("/");
    }
  }, [user, isLoading, router]);

  // Hiển thị loading khi đang check auth
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0891b2" />
      </SafeAreaView>
    );
  }

  // Nếu đang loading hoặc chưa có user thì hiển thị loading
  if (isLoading || !user) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0891b2" />
      </SafeAreaView>
    );
  }

  // Nếu không phải DOCTOR thì không render (đang redirect)
  if (user.role !== "ROLE_DOCTOR") {
    return null;
  }

  // Menu items cho DOCTOR - theo danh sách chức năng doctor trên web
  const menuItems: MenuItem[] = [
    {
      id: "1",
      title: "Quản lý\nđơn hàng",
      icon: (
        <Image
          source={require("@/assets/images/6.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/orders",
    },
    {
      id: "2",
      title: "Tạo đơn\nhàng mới",
      icon: (
        <Image
          source={require("@/assets/images/1.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/create-order",
    },
    {
      id: "3",
      title: "Quản lý\nphiếu xét nghiệm",
      icon: (
        <Image
          source={require("@/assets/images/4.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/prescription-slips",
    },
    {
      id: "4",
      title: "Tạo phiếu\nchỉ định",
      icon: (
        <Image
          source={require("@/assets/images/1.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/create-prescription-slip",
    },
    {
      id: "5",
      title: "Quản lý\nbarcode",
      icon: (
        <Image
          source={require("@/assets/images/2.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/barcodes",
    },
    {
      id: "6",
      title: "Quản lý\ndịch vụ",
      icon: (
        <Image
          source={require("@/assets/images/4.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/services",
    },
    {
      id: "7",
      title: "Quản lý\nmẫu xét nghiệm",
      icon: (
        <Image
          source={require("@/assets/images/5.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/patient-metadatas",
    },
    {
      id: "8",
      title: "Phụ lục\nbệnh nhân",
      icon: (
        <Image
          source={require("@/assets/images/3.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/patient-appendices",
    },
    {
      id: "9",
      title: "Kết quả\nxét nghiệm",
      icon: (
        <Image
          source={require("@/assets/images/4.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/patient-test-results",
    },
    {
      id: "10",
      title: "Danh sách\nbệnh nhân",
      icon: (
        <Image
          source={require("@/assets/images/3.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/patients",
    },
    {
      id: "11",
      title: "Mẫu bổ sung",
      icon: (
        <Image
          source={require("@/assets/images/1.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/new-sample-add",
    },
    {
      id: "12",
      title: "Báo cáo\nthống kê",
      icon: (
        <Image
          source={require("@/assets/images/5.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/statistics",
    },
    {
      id: "13",
      title: "Chú giải gen",
      icon: (
        <Image
          source={require("@/assets/images/4.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/annotations",
    },
    {
      id: "14",
      title: "Thông tin\nngười dùng",
      icon: (
        <Image
          source={require("@/assets/images/7.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "/profile",
    },
    {
      id: "15",
      title: "Đăng xuất",
      icon: (
        <Image
          source={require("@/assets/images/9.png")}
          className="w-16 h-16"
          resizeMode="contain"
        />
      ),
      route: "logout",
    },
  ];

  const handleMenuPress = useCallback(
    (item: MenuItem) => {
      if (item.route === "logout") {
        logout();
      } else if (item.route) {
        router.push(item.route as any);
      }
    },
    [router, logout],
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header with background image */}
      <ImageBackground
        source={require("@/assets/images/bg.png")}
        className="pt-12 pb-6 px-6"
        style={{ 
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        resizeMode="cover"
      >
        <View className="w-64 h-16 flex-row items-center justify-between">
          <View />
          {/* Doctor Badge */}
          <View className="bg-blue-500 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">DOCTOR</Text>
          </View>
        </View>
      </ImageBackground>
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap -mx-2">
          {menuItems.map((item) => (
            <View key={item.id} className="w-1/3 px-2 mb-4">
              <TouchableOpacity
                className="bg-white rounded-xl p-4 items-center border border-gray-100"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                activeOpacity={0.7}
                onPress={() => handleMenuPress(item)}
              >
                <View className="relative">
                  <View className="w-16 h-16 rounded-2xl items-center justify-center mb-2">
                    {item.icon}
                  </View>

                  {!!item.badge && (
                    <View className="absolute -top-1 -right-1 min-w-[24px] h-[24px] rounded-full bg-orange-500 items-center justify-center px-1.5 border-2 border-white">
                      <Text className="text-white text-[10px] font-bold">
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  className="text-[12px] h-8 font-bold text-sky-700 text-center leading-tight"
                  style={{ lineHeight: 14 }}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
