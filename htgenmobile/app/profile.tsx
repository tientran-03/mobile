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
  Edit,
  Save,
  X,
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
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/contexts/AuthContext";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import { profileSchema, ProfileFormData, GENDER_OPTIONS } from "@/lib/schemas/profile-schema";
import { userService } from "@/services/userService";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      phone: "",
      address: "",
      dob: "",
      gender: undefined,
    },
  });

  useEffect(() => {
    if (Platform.OS === "android") {
      (UIManager as any).setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Map gender from Vietnamese to backend enum
      let genderValue: "male" | "female" | undefined = undefined;
      if (user.gender && user.gender !== "Trống") {
        if (user.gender === "Nam" || user.gender.toLowerCase() === "male") {
          genderValue = "male";
        } else if (user.gender === "Nữ" || user.gender.toLowerCase() === "female") {
          genderValue = "female";
        }
      }

      form.reset({
        displayName: user.name || "",
        phone: user.phone || "",
        address: "",
        dob: user.dateOfBirth && user.dateOfBirth !== "Trống" ? user.dateOfBirth : "",
        gender: genderValue,
      });
    }
  }, [user, form]);

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

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
      return;
    }

    setIsLoading(true);
    try {
      const response = await userService.updateProfile({
        userId: user.id,
        displayName: data.displayName,
        phone: data.phone || undefined,
        address: data.address || undefined,
        dob: data.dob || undefined,
        gender: data.gender as "male" | "female" | undefined,
      });

      if (response.success && response.data) {
        const updatedUser = response.data;
        // Update auth context
        // Map gender from backend enum (male/female) to Vietnamese display
        let genderDisplay = user.gender;
        if (updatedUser.gender === "male") {
          genderDisplay = "Nam";
        } else if (updatedUser.gender === "female") {
          genderDisplay = "Nữ";
        }

        updateUser({
          name: updatedUser.displayName || user.name,
          phone: updatedUser.phone || user.phone,
          dateOfBirth: updatedUser.dob || user.dateOfBirth,
          gender: genderDisplay,
        });
        Alert.alert("Thành công", "Cập nhật thông tin thành công!");
        setIsEditing(false);
      } else {
        Alert.alert("Lỗi", response.error || response.message || "Không thể cập nhật thông tin");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Lỗi", error?.message || "Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setIsLoading(false);
    }
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
          <View className="flex-row justify-between items-center p-4 border-b border-sky-100">
            <TouchableOpacity
              className="flex-1 flex-row justify-between items-center"
              onPress={onToggle}
              activeOpacity={0.85}
            >
              <View>
                <Text className="text-[15px] font-extrabold text-slate-900">
                  {isEditing ? "Chỉnh sửa thông tin" : "Thông tin cơ bản"}
                </Text>
                <Text className="mt-0.5 text-xs font-bold text-slate-500">
                  {isEditing ? "Cập nhật thông tin của bạn" : "Chi tiết tài khoản của bạn"}
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

            {!isEditing && (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="ml-3 px-3 py-2 rounded-xl bg-sky-600 flex-row items-center"
                activeOpacity={0.8}
              >
                <Edit size={16} color="#fff" />
                <Text className="ml-1 text-white text-xs font-extrabold">Sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          {isExpanded && (
            <View className="p-4">
              {isEditing ? (
                <FormProvider {...form}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <FormInput
                      name="displayName"
                      label="Tên hiển thị"
                      placeholder="Nhập tên hiển thị"
                      required
                    />

                    <FormInput
                      name="phone"
                      label="Số điện thoại"
                      placeholder="Nhập số điện thoại"
                      keyboardType="phone-pad"
                    />

                    <FormInput
                      name="dob"
                      label="Ngày sinh (dd/MM/yyyy)"
                      placeholder="VD: 01/01/1990"
                    />

                    <FormSelect
                      name="gender"
                      label="Giới tính"
                      options={GENDER_OPTIONS}
                      getLabel={(opt) => opt.label}
                      getValue={(opt) => opt.value}
                      placeholder="Chọn giới tính"
                    />

                    <FormInput
                      name="address"
                      label="Địa chỉ"
                      placeholder="Nhập địa chỉ"
                      multiline
                      numberOfLines={3}
                    />

                    <View className="flex-row gap-3 mt-4">
                      <TouchableOpacity
                        onPress={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 flex-row items-center justify-center"
                        activeOpacity={0.8}
                      >
                        <X size={18} color="#64748B" />
                        <Text className="ml-2 text-slate-700 font-extrabold">Hủy</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={form.handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 rounded-xl bg-sky-600 flex-row items-center justify-center"
                        activeOpacity={0.8}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Save size={18} color="#fff" />
                            <Text className="ml-2 text-white font-extrabold">Lưu</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </FormProvider>
              ) : (
                infoItems.map((item, index) => {
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
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
