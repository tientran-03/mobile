import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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
  TextInput,
  Alert,
  Image,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { uploadImageToCloudinary } from "@/utils/cloudinary";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUserProfile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      (UIManager as any).setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setDateOfBirth(user.dateOfBirth ?? "");
      setGender(user.gender ?? "");
    }
  }, [user]);

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

  const handleStartEdit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setDateOfBirth(user.dateOfBirth ?? "");
      setGender(user.gender ?? "");
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || isSaving) return;

    if (!name.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập họ tên.");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        displayName: name.trim(),
      };

      const phoneVal = phone.trim();
      if (phoneVal) {
        payload.phone = phoneVal;
      }

      const dobVal = dateOfBirth.trim();
      if (dobVal && dobVal !== "Trống") {
        let formattedDob = dobVal;
        const isoMatch = dobVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          const [, year, month, day] = isoMatch;
          formattedDob = `${day}/${month}/${year}`;
        }
        payload.dob = formattedDob;
      }

      const genderVal = gender.trim();
      if (genderVal && genderVal !== "Trống") {
        const normalized = genderVal.toLowerCase();
        let backendGender: string | undefined;

        // Backend enum: gender { male, female }
        if (normalized === "nam" || normalized === "male") {
          backendGender = "male";
        } else if (
          normalized === "nữ" ||
          normalized === "nu" ||
          normalized === "female"
        ) {
          backendGender = "female";
        }

        if (backendGender) {
          payload.gender = backendGender;
        }
      }

      const success = await updateUserProfile(payload);

      if (success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsEditing(false);
        Alert.alert("Thành công", "Cập nhật hồ sơ thành công.");
      } else {
        Alert.alert(
          "Thất bại",
          "Không thể cập nhật hồ sơ. Vui lòng thử lại sau.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeAvatar = async () => {
    if (!user || isUploadingAvatar) return;

    // Hiện tại upload Cloudinary chỉ hỗ trợ tốt trên mobile (iOS/Android)
    // Web preview với expo có thể bị lỗi file [object Object]
    if (Platform.OS === "web") {
      Alert.alert(
        "Thông báo",
        "Đổi ảnh đại diện hiện chỉ hỗ trợ trên mobile (iOS/Android). Vui lòng chạy trên thiết bị hoặc emulator.",
      );
      return;
    }

    try {
      setIsUploadingAvatar(true);

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập",
          "Ứng dụng cần quyền truy cập thư viện ảnh để chọn avatar.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || !result.assets[0]?.uri) {
        return;
      }

      const uri = result.assets[0].uri;

      // Upload lên Cloudinary
      const uploaded = await uploadImageToCloudinary(uri, {
        folder: "avatars",
      });

      if (!uploaded.secureUrl) {
        Alert.alert("Lỗi", "Không thể tải ảnh lên. Vui lòng thử lại.");
        return;
      }

      const success = await updateUserProfile({
        avatarUrl: uploaded.secureUrl,
      });

      if (success) {
        Alert.alert("Thành công", "Cập nhật ảnh đại diện thành công.");
      } else {
        // Trường hợp backend chặn quyền (permission denied) hoặc lỗi nghiệp vụ
        Alert.alert(
          "Không có quyền",
          "Tài khoản của bạn hiện chưa được phép cập nhật ảnh đại diện. Vui lòng liên hệ quản trị hệ thống nếu cần hỗ trợ.",
        );
      }
    } catch (error) {
      console.error("Error changing avatar:", error);
      Alert.alert(
        "Lỗi",
        "Có lỗi xảy ra khi cập nhật ảnh đại diện. Vui lòng thử lại.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <View className="flex-1 bg-sky-50">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="pt-14 pb-3 px-4 bg-white border-b border-sky-100">
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
                <View className="w-16 h-16 rounded-[32px] bg-sky-50 border border-sky-200 items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      className="w-16 h-16"
                      resizeMode="cover"
                    />
                  ) : (
                    <UserIcon size={34} color="#0284C7" />
                  )}
                </View>
                <TouchableOpacity
                  onPress={handleChangeAvatar}
                  activeOpacity={0.85}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky-600 border border-white items-center justify-center"
                >
                  {isUploadingAvatar ? (
                    <Text className="text-[9px] font-extrabold text-white">
                      ...
                    </Text>
                  ) : (
                    <Text className="text-[9px] font-extrabold text-white">
                      Sửa
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View className="flex-row space-x-2">
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      onPress={handleCancelEdit}
                      className="px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 flex-row items-center"
                      activeOpacity={0.85}
                    >
                      <X size={14} color="#0F172A" />
                      <Text className="ml-1 text-xs font-extrabold text-slate-800">
                        Hủy
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-2xl flex-row items-center border ${
                        isSaving
                          ? "bg-sky-200 border-sky-200"
                          : "bg-sky-600 border-sky-600"
                      }`}
                      activeOpacity={0.85}
                    >
                      <Save size={14} color="#FFFFFF" />
                      <Text className="ml-1 text-xs font-extrabold text-white">
                        {isSaving ? "Đang lưu..." : "Lưu"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={handleStartEdit}
                    className="px-3 py-1.5 rounded-2xl bg-sky-50 border border-sky-200 flex-row items-center"
                    activeOpacity={0.85}
                  >
                    <Text className="text-xs font-extrabold text-sky-700">
                      Chỉnh sửa
                    </Text>
                  </TouchableOpacity>
                )}
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
              {isEditing ? (
                <>
                  <View className="mb-3">
                    <Text className="text-[11px] font-extrabold text-slate-500 mb-1.5">
                      Họ tên người dùng
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Nhập họ tên"
                      className="rounded-2xl border border-sky-200 px-3 py-2.5 text-[13px] text-slate-900 bg-white"
                    />
                  </View>
                  <View className="mb-3">
                    <Text className="text-[11px] font-extrabold text-slate-500 mb-1.5">
                      Số điện thoại
                    </Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Nhập số điện thoại"
                      keyboardType="phone-pad"
                      className="rounded-2xl border border-sky-200 px-3 py-2.5 text-[13px] text-slate-900 bg-white"
                    />
                  </View>
                  <View className="mb-3">
                    <Text className="text-[11px] font-extrabold text-slate-500 mb-1.5">
                      Ngày sinh
                    </Text>
                    <TextInput
                      value={dateOfBirth}
                      onChangeText={setDateOfBirth}
                      placeholder="dd/MM/yyyy"
                      className="rounded-2xl border border-sky-200 px-3 py-2.5 text-[13px] text-slate-900 bg-white"
                    />
                  </View>
                  <View className="mb-1">
                    <Text className="text-[11px] font-extrabold text-slate-500 mb-1.5">
                      Giới tính
                    </Text>
                    <TextInput
                      value={gender}
                      onChangeText={setGender}
                      placeholder="Nam / Nữ / Khác"
                      className="rounded-2xl border border-sky-200 px-3 py-2.5 text-[13px] text-slate-900 bg-white"
                    />
                  </View>
                </>
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
    </View>
  );
}
