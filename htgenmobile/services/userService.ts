import { API_ENDPOINTS } from "@/config/api";
import { apiClient } from "./api";

export interface UpdateProfileRequest {
  userId: string;
  displayName?: string;
  phone?: string;
  address?: string;
  dob?: string; // Format: dd/MM/yyyy (will be parsed to LocalDate by backend)
  gender?: "male" | "female"; // Backend enum: male, female (lowercase)
  avatarUrl?: string;
}

export interface HospitalUser {
  userId: string;
  email: string;
  displayName?: string;
  phone?: string;
  address?: string;
  dob?: string;
  gender?: string;
  avatarUrl?: string;
  hospitalName?: string;
  role?: string;
  hospitalId?: number | string;
  username?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const userService = {
  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<HospitalUser>> => {
    try {
      const response = await apiClient.put<HospitalUser>(
        API_ENDPOINTS.USER_PROFILE,
        data
      );
      return response;
    } catch (error: any) {
      console.error("[UserService] Error updating profile:", error);
      return {
        success: false,
        error: error?.message || "Không thể cập nhật thông tin",
      };
    }
  },
};
