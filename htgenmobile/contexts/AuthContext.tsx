import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/services/api";
import { User } from "@/types";

const isHTGenStaff = (hospitalUser: any): boolean => {
  if (!hospitalUser) {
    return false;
  }
  if (hospitalUser.role !== "ROLE_STAFF") {
    return false;
  }
  
  const hospitalId = hospitalUser.hospitalId;
  if (hospitalId == null || hospitalId === undefined) {
    return true;
  }

  if (hospitalId !== 1 && hospitalId !== "1") {
    return false;
  }
  return true;
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  

  const checkAuth = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        router.replace("/home");
      } else {
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          const hospitalUser = (userResponse.data as any).hospitalUser;
          if (hospitalUser) {
            if (!isHTGenStaff(hospitalUser)) {
              await AsyncStorage.removeItem("user");
              await apiClient.logout();
              setUser(null);
              setIsLoading(false);
              return;
            }
            const userData = mapHospitalUserToUser(hospitalUser);
            await AsyncStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            router.replace("/home");
          }
        } else if (userResponse.error) {
          setAuthError(userResponse.error);
          await AsyncStorage.removeItem("user");
          await apiClient.logout();
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
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
          if (!isHTGenStaff(hospitalUser)) {
            await apiClient.logout();
            setAuthError("Bạn không có quyền truy cập");
            return false;
          }
          const userData = mapHospitalUserToUser(hospitalUser);
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          router.replace("/home");
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
  };
});
