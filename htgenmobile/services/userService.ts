import { API_ENDPOINTS } from "@/config/api";
import { apiClient } from "./api";

export interface UserResponse {
  userId: string;
  name: string;
  gender?: string;
  dob?: string;
  email: string;
  phone?: string;
  hospitalName?: string;
  role: string;
  avatarUrl?: string;
  isActive?: boolean;
  blockReason?: string;
  enabled?: boolean;
  otpVerified?: boolean;
}

export interface BlockUserRequest {
  userId: string;
  reason: string;
}

export interface UnblockUserRequest {
  userId: string;
}

export const userService = {
  /**
   * Get all users
   */
  getAll: async (): Promise<UserResponse[]> => {
    const response = await apiClient.get<UserResponse[]>(API_ENDPOINTS.USERS);
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.error || "Failed to fetch users");
  },

  /**
   * Block a user
   */
  block: async (userId: string, reason: string): Promise<boolean> => {
    const response = await apiClient.post<boolean>(API_ENDPOINTS.USER_BLOCK, {
      userId,
      reason,
    });
    if (response.success) {
      return true;
    }
    throw new Error(response.error || "Failed to block user");
  },

  /**
   * Unblock a user
   */
  unblock: async (userId: string): Promise<boolean> => {
    const response = await apiClient.post<boolean>(API_ENDPOINTS.USER_UNBLOCK, {
      userId,
    });
    if (response.success) {
      return true;
    }
    throw new Error(response.error || "Failed to unblock user");
  },

  /**
   * Count users by role
   */
  countByRole: async (role: string): Promise<number> => {
    const response = await apiClient.get<number>(
      API_ENDPOINTS.USER_COUNT_BY_ROLE(role)
    );
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    throw new Error(response.error || "Failed to count users");
  },
};
