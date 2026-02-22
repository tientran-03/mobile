import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/services/api";
import { userService, UpdateUserProfilePayload } from "@/services/userService";
import { User } from "@/types";

// Kiểm tra role có được phép dùng app mobile không (STAFF hoặc ADMIN)
const canUseMobileApp = (hospitalUser: any): boolean => {
  if (!hospitalUser) {
    return false;
  }
  const role = hospitalUser.role;
  // Cho phép cả STAFF và ADMIN
  return role === "ROLE_STAFF" || role === "ROLE_ADMIN";
};

// Hàm điều hướng theo role
const navigateByRole = (role: string | undefined, router: any) => {
  if (role === "ROLE_ADMIN") {
    router.replace("/admin-home");
  } else {
    router.replace("/home");
  }
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  

  const checkAuth = useCallback(async () => {
    try {
      // Luôn gọi API để lấy role mới nhất từ backend (đảm bảo role luôn đúng)
      const userResponse = await apiClient.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        const hospitalUser = (userResponse.data as any).hospitalUser;
        if (hospitalUser) {
          if (!canUseMobileApp(hospitalUser)) {
            await AsyncStorage.removeItem("user");
            await apiClient.logout();
            setUser(null);
            setIsLoading(false);
            return;
          }
          const userData = mapHospitalUserToUser(hospitalUser);
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          // Navigate ngay sau khi set user
          if (userData.role === "ROLE_ADMIN") {
            router.replace("/admin-home");
          } else {
            router.replace("/home");
          }
        }
      } else {
        // Không có session, xóa dữ liệu cũ
        await AsyncStorage.removeItem("user");
        setUser(null);
        setAuthError(userResponse.error || null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      // Nếu có lỗi, thử dùng dữ liệu trong AsyncStorage
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        navigateByRole(parsedUser.role, router);
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const mapHospitalUserToUser = (hospitalUser: any): User => {
    return {
      id: hospitalUser.userId || "",
      accountCode: hospitalUser.userId || "",
      email: hospitalUser.email || "",
      name: hospitalUser.displayName || hospitalUser.username || "",
      phone: hospitalUser.phone || "",
      gender: hospitalUser.gender || "Trống",
      department: hospitalUser.hospitalId || "Trống",
      hospitalName: hospitalUser.hospitalName || "Trống",
      dateOfBirth: hospitalUser.dob || "Trống",
      hospitalId: hospitalUser.hospitalId || null,
      avatarUrl: hospitalUser.avatarUrl || undefined,
      role: hospitalUser.role || undefined,
    };
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthError(null);
      const response = await apiClient.login(email, password);

      if (!response.success) {
        setAuthError(response.error || "Đăng nhập thất bại");
        return false;
      }

      const userResponse = await apiClient.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        const hospitalUser = (userResponse.data as any).hospitalUser;
        if (hospitalUser) {
          if (!canUseMobileApp(hospitalUser)) {
            await apiClient.logout();
            setAuthError("Bạn không có quyền truy cập ứng dụng mobile (chỉ STAFF và ADMIN được phép).");
            return false;
          }
          const userData = mapHospitalUserToUser(hospitalUser);
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          // Set user vào state và navigate ngay lập tức
          setUser(userData);
          // Navigate ngay sau khi set user
          if (userData.role === "ROLE_ADMIN") {
            router.replace("/admin-home");
          } else {
            router.replace("/home");
          }
          return true;
        }
      } else {
        setAuthError(userResponse.error || "Không thể lấy thông tin người dùng");
      }

      return false;
    } catch (error) {
      console.error("Error logging in:", error);
      setAuthError("Có lỗi xảy ra khi đăng nhập");
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      await AsyncStorage.removeItem("user");
      setUser(null);
      setAuthError(null);
      router.replace("/");
    } catch (error) {
      console.error("Error logging out:", error);
      await AsyncStorage.removeItem("user");
      setUser(null);
      setAuthError(null);
      router.replace("/");
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const updateUserProfile = async (
    payload: Partial<Omit<UpdateUserProfilePayload, "userId">>,
  ): Promise<boolean> => {
    try {
      setAuthError(null);

      if (!user?.id) {
        setAuthError("Không tìm thấy thông tin người dùng hiện tại");
        return false;
      }

      const response = await userService.updateProfile({
        userId: user.id,
        ...payload,
      });

      if (!response.success) {
        setAuthError(response.error || "Cập nhật hồ sơ thất bại");
        return false;
      }

      // backend trả về HospitalUser trong data
      const hospitalUser = response.data as any;
      if (hospitalUser) {
        if (!canUseMobileApp(hospitalUser)) {
          await AsyncStorage.removeItem("user");
          await apiClient.logout();
          setUser(null);
          setAuthError("Bạn không có quyền truy cập");
          return false;
        }
        const userData = mapHospitalUserToUser(hospitalUser);

        // Nếu FE vừa gửi dob thì luôn ưu tiên hiển thị theo dob đó
        if (payload.dob) {
          userData.dateOfBirth = payload.dob;
        }

        await AsyncStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        return true;
      }

      setAuthError("Không thể lấy thông tin người dùng sau khi cập nhật");
      return false;
    } catch (error) {
      console.error("Error updating user profile:", error);
      setAuthError("Có lỗi xảy ra khi cập nhật hồ sơ");
      return false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isLoading,
    authError,
    login,
    logout,
    clearAuthError,
    updateUserProfile,
  };
});
