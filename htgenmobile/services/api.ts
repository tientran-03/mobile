import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "@/config/api";

const TOKEN_KEY = "@htgen:token";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  private async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error("Error setting token:", error);
    }
  }

  private async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();

    const headers: HeadersInit & {Authorization?: string} = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        console.warn("Unauthorized - clearing token");
        await this.removeToken();
        return {
          success: false,
          error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        };
      }

      if (response.status === 204) {
        return {
          success: true,
        };
      }

      let data;
      const contentLength = response.headers.get("content-length");
      const hasBody = contentLength === null || parseInt(contentLength, 10) > 0;

      if (hasBody) {
        try {
          data = await response.json();
        } catch {
          return {
            success: false,
            error: `Server error: ${response.status} ${response.statusText}`,
          };
        }
      }

      if (!response.ok) {
        console.error("API error response:", {
          status: response.status,
          statusText: response.statusText,
          data: JSON.stringify(data, null, 2),
        });
        
        // Extract validation errors if available
        let errorMessage = data?.error || data?.message || `Server error: ${response.status} ${response.statusText}`;
        if (data?.data && Array.isArray(data.data)) {
          const validationErrors = data.data.map((err: any) => {
            if (typeof err === 'object') {
              return err.message || err.field ? `${err.field}: ${err.message}` : JSON.stringify(err);
            }
            return String(err);
          }).join('; ');
          if (validationErrors) {
            errorMessage = `${errorMessage}: ${validationErrors}`;
          }
          console.error("Validation errors:", data.data);
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        message: data?.message,
        data: data?.data,
      };
    } catch (error: any) {
      console.error("API request error:", error);
      return {
        success: false,
        error: error.message || "Network error occurred",
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async login(email: string, password: string): Promise<ApiResponse<any>> {
    const response = await this.post("/api/auth/login", { email, password });

    if (response.success && response.data) {
      const data = response.data as any;
      // Support multiple possible token field names from backend
      const token = data.sessionId || data.token || data.accessToken || data.jwt;

      if (token) {
        console.log("Token extracted successfully:", { tokenType: Object.keys(data).find(k => data[k] === token) });
        await this.setToken(token);
      } else {
        console.error("No token found in login response:", data);
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    await this.post("/api/auth/logout");
    await this.removeToken();
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get("/api/auth/me");
  }
}

export const apiClient = new ApiClient();
