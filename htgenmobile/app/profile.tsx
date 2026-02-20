import { Stack, useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  User as UserIcon,
  ArrowLeft,
  ShieldCheck,
  Phone,
  Mail,
  Building2,
  Calendar,
  BadgeCheck,
} from "lucide-react-native";
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  UIManager,
  LayoutAnimation,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (Platform.OS === "android") {
      (UIManager as any).setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  if (!user) return null;

  const infoItems = useMemo(
    () => [
      { label: "Tên đăng nhập", value: user.email ?? "-", icon: Mail },
      { label: "Họ tên người dùng", value: user.name ?? "-", icon: BadgeCheck },
      { label: "Giới tính", value: user.gender ?? "-", icon: ShieldCheck },
      { label: "Bệnh viện", value: user.hospitalName ?? "-", icon: Building2 },
      { label: "Ngày sinh", value: user.dateOfBirth ?? "-", icon: Calendar },
    ],
    [user],
  );

  const onToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((v) => !v);
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
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
              Tài khoản
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Thông tin hồ sơ của bạn
            </Text>
          </View>

          <View className="px-3 py-1.5 rounded-2xl bg-sky-50 border border-sky-200">
            <Text className="text-xs font-extrabold text-sky-700">Profile</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      >
        <View className="bg-white rounded-2xl border border-sky-100 overflow-hidden">
          <View className="h-24 bg-sky-600" />

          <View className="px-4 pb-4 -mt-10">
            <View className="flex-row items-end justify-between">
              <View className="w-20 h-20 rounded-[40px] bg-white border border-sky-100 items-center justify-center">
                <View className="w-16 h-16 rounded-[32px] bg-sky-50 border border-sky-200 items-center justify-center">
                  <UserIcon size={34} color="#0284C7" />
                </View>
              </View>
            </View>

            <Text
              className="mt-3 text-[16px] font-extrabold text-slate-900"
              numberOfLines={1}
            >
              {user.name ?? "-"}
            </Text>
            <View className="mt-2 flex-row items-center flex-wrap">
              <View className="flex-row items-center mr-3 mb-2">
                <Phone size={14} color="#64748B" />
                <Text className="ml-2 text-xs font-bold text-slate-600">
                  {user.phone ?? "-"}
                </Text>
              </View>

              <View className="flex-row items-center mb-2">
                <Mail size={14} color="#64748B" />
                <Text
                  className="ml-2 text-xs font-bold text-slate-600"
                  numberOfLines={1}
                >
                  {user.email ?? "-"}
                </Text>
              </View>
            </View>

            {!!user.hospitalName && (
              <View className="mt-2 bg-sky-50 border border-sky-200 rounded-2xl px-3 py-2 flex-row items-center">
                <Building2 size={16} color="#0284C7" />
                <Text
                  className="ml-2 text-xs font-extrabold text-sky-700"
                  numberOfLines={1}
                >
                  {user.hospitalName}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="mt-4 bg-white rounded-2xl border border-sky-100 overflow-hidden">
          <TouchableOpacity
            className="flex-row justify-between items-center p-4 border-b border-sky-100"
            onPress={onToggle}
            activeOpacity={0.85}
          >
            <View>
              <Text className="text-[15px] font-extrabold text-slate-900">
                Thông tin cơ bản
              </Text>
              <Text className="mt-0.5 text-xs font-bold text-slate-500">
                Chi tiết tài khoản của bạn
              </Text>
            </View>

            <View
              className={`w-9 h-9 rounded-xl items-center justify-center border ${
                isExpanded
                  ? "bg-sky-600 border-sky-600"
                  : "bg-sky-50 border-sky-200"
              }`}
            >
              {isExpanded ? (
                <ChevronUp
                  size={18}
                  color={isExpanded ? "#FFFFFF" : "#0284C7"}
                />
              ) : (
                <ChevronDown
                  size={18}
                  color={isExpanded ? "#FFFFFF" : "#0284C7"}
                />
              )}
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View className="p-4">
              {infoItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <View
                    key={`${item.label}-${index}`}
                    className={`flex-row items-start rounded-2xl border border-sky-100 p-3.5 ${
                      index !== infoItems.length - 1 ? "mb-3" : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center">
                      <Icon size={18} color="#0284C7" />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-[11px] font-extrabold text-slate-500">
                        {item.label}
                      </Text>
                      <Text
                        className="mt-1 text-[13px] font-extrabold text-slate-900"
                        numberOfLines={2}
                      >
                        {String(item.value ?? "-")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
