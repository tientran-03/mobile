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
      role: hospitalUser.role || null, // Store user role for permission checks
    };
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthError(null);
      console.log("[AuthContext] Starting login for:", email);
      
      const response = await apiClient.login(email, password);
      console.log("[AuthContext] Login response:", response.success ? "Success" : "Failed", response.error);

      if (!response.success) {
        setAuthError(response.error || "Đăng nhập thất bại");
        return false;
      }

      // Wait a bit to ensure token is saved to AsyncStorage
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("[AuthContext] Getting current user...");
      const userResponse = await apiClient.getCurrentUser();
      console.log("[AuthContext] GetCurrentUser response:", userResponse.success ? "Success" : "Failed", userResponse.error);

      if (userResponse.success && userResponse.data) {
        const hospitalUser = (userResponse.data as any).hospitalUser;
        if (hospitalUser) {
          if (!isHTGenStaff(hospitalUser)) {
            console.log("[AuthContext] User is not HTGen staff");
            await apiClient.logout();
            setAuthError("Bạn không có quyền truy cập");
            return false;
          }
          const userData = mapHospitalUserToUser(hospitalUser);
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          router.replace("/home");
          return true;
        } else {
          console.log("[AuthContext] No hospitalUser in response");
        }
      } else {
        console.error("[AuthContext] Failed to get current user:", userResponse.error);
        setAuthError(userResponse.error || "Không thể lấy thông tin người dùng");
      }

      return false;
    } catch (error: any) {
      console.error("[AuthContext] Error logging in:", error);
      if (error.message?.includes("Failed to fetch") || error.message?.includes("Network")) {
        setAuthError("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và đảm bảo backend server đang chạy.");
      } else {
        setAuthError("Có lỗi xảy ra khi đăng nhập");
      }
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

  const updateUser = useCallback(async (updatedUserData: Partial<User>) => {
    try {
      const currentUser = user;
      if (!currentUser) return;

      const updatedUser: User = {
        ...currentUser,
        ...updatedUserData,
      };

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  }, [user]);

  const clearAuthError = () => {
    setAuthError(null);
  };

  /**
   * Check if user has permission to create prescription slips
   * Based on backend permissions:
   * - ROLE_DOCTOR: allowed
   * - ROLE_CUSTOMER: allowed
   * - ROLE_STAFF: allowed
   * - ROLE_ADMIN: allowed
   * - ROLE_SAMPLE_COLLECTOR: not allowed
   * - ROLE_LAB_TECHNICIAN: not allowed
   */
  const canCreatePrescriptionSlip = useCallback((): boolean => {
    if (!user?.role) return false;
    const role = user.role.toUpperCase();
    const allowedRoles = [
      "ROLE_DOCTOR",
      "ROLE_CUSTOMER",
      "ROLE_STAFF",
      "ROLE_ADMIN",
      "ROLE_ADMIN_HOSPITAL",
    ];
    return allowedRoles.includes(role);
  }, [user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isLoading,
    authError,
    login,
    logout,
    updateUser,
    clearAuthError,
    canCreatePrescriptionSlip,
  };
});
