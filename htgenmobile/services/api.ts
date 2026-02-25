import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '@/config/api';

const TOKEN_KEY = '@htgen:token';

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
      console.error('Error getting token:', error);
      return null;
    }
  }

  private async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  private async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = await this.getToken();

    const headers: HeadersInit & { Authorization?: string } = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(
        `[API] ${options.method || 'GET'} ${endpoint} - Token: ${token.substring(0, 20)}...`
      );
    } else {
      console.log(`[API] ${options.method || 'GET'} ${endpoint} - No token`);
    }

    const fullUrl = `${this.baseURL}${endpoint}`;
    console.log(`[API] Full URL: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      console.log(`[API] Response status: ${response.status} for ${endpoint}`);

      if (response.status === 401) {
        console.warn(`[API] Unauthorized (401) for ${endpoint}`);
        console.warn(
          `[API] Request had token:`,
          token ? `Yes (${token.substring(0, 20)}...)` : 'No'
        );
        if (token) {
          console.warn(
            `[API] Authorization header:`,
            headers['Authorization']?.substring(0, 30) + '...'
          );
        }
        await this.removeToken();
        return {
          success: false,
          error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        };
      }

      if (response.status === 204) {
        return {
          success: true,
        };
      }

      let data;
      const contentLength = response.headers.get('content-length');
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
        const isPatientClinical404 =
          response.status === 404 && endpoint.includes('/patient-clinicals/patient/');

        if (!isPatientClinical404) {
          console.error('API error response:', {
            status: response.status,
            statusText: response.statusText,
            data: JSON.stringify(data, null, 2),
          });
        }

        let errorMessage =
          data?.error || data?.message || `Server error: ${response.status} ${response.statusText}`;
        if (data?.data && Array.isArray(data.data)) {
          const validationErrors = data.data
            .map((err: any) => {
              if (typeof err === 'object') {
                return err.message || err.field
                  ? `${err.field}: ${err.message}`
                  : JSON.stringify(err);
              }
              return String(err);
            })
            .join('; ');
          if (validationErrors) {
            errorMessage = `${errorMessage}: ${validationErrors}`;
          }
          if (!isPatientClinical404) {
            console.error('Validation errors:', data.data);
          }
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
      console.error('API request error:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async login(email: string, password: string): Promise<ApiResponse<any>> {
    const response = await this.post('/api/auth/login', { email, password });

    console.log('[Login] Full response:', JSON.stringify(response, null, 2));

    if (response.success && response.data) {
      const data = response.data as any;
      console.log('[Login] Response data:', JSON.stringify(data, null, 2));

      const token = data.sessionId || data.token || data.accessToken || data.jwt;

      if (token) {
        console.log('[Login] Token extracted successfully:', {
          token: token.substring(0, 20) + '...',
          tokenType: Object.keys(data).find(k => data[k] === token),
          tokenLength: token.length,
        });
        await this.setToken(token);
        const savedToken = await this.getToken();
        console.log('[Login] Token saved verification:', savedToken ? ' Saved' : ' Not saved');
        if (savedToken) {
          console.log('[Login] Saved token preview:', savedToken.substring(0, 20) + '...');
        }
      } else {
        console.error(
          '[Login] No token found in login response. Available keys:',
          Object.keys(data)
        );
        console.error('[Login] Full data object:', data);
      }
    } else {
      console.error('[Login] Login failed:', response.error || 'Unknown error');
    }

    return response;
  }

  async logout(): Promise<void> {
    await this.post('/api/auth/logout');
    await this.removeToken();
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/api/auth/me');
  }
}

export const apiClient = new ApiClient();
