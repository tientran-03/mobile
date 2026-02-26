import { API_ENDPOINTS } from '@/config/api';
import { ApiResponse, apiClient } from './api';

export interface SendNotificationRequest {
  receiverIds?: string[];
  receiverRole?: string;
  topic?: string;
  senderId?: string;
  senderRole?: string;
  senderName?: string;
  title: string;
  body: string;
  imageUrl?: string;
  notificationType?: string;
  data?: Record<string, string>;
}

export interface NotificationResponse {
  id: number;
  receiverId: string;
  receiverRole?: string;
  senderId?: string;
  senderRole?: string;
  senderName?: string;
  title: string;
  body: string;
  imageUrl?: string;
  notificationType?: string;
  status: string;
  fcmMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
  readAt?: string;
  createdAt?: string;
  data?: Record<string, unknown>;
}

export interface NotificationPageResponse {
  content?: NotificationResponse[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

export interface BatchNotificationResult {
  totalCount: number;
  successCount: number;
  failureCount: number;
  failedUserIds: string[];
}

class NotificationService {
  async sendToUser(
    receiverId: string,
    receiverRole: string | undefined,
    request: SendNotificationRequest
  ): Promise<ApiResponse<NotificationResponse>> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}/send/user/${receiverId}${
      receiverRole ? `?receiverRole=${encodeURIComponent(receiverRole)}` : ''
    }`;
    return apiClient.post<NotificationResponse>(endpoint, request);
  }

  async sendToUsers(
    request: SendNotificationRequest
  ): Promise<ApiResponse<BatchNotificationResult>> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}/send`;
    return apiClient.post<BatchNotificationResult>(endpoint, request);
  }

  async sendByRole(
    role: string,
    request: SendNotificationRequest
  ): Promise<ApiResponse<BatchNotificationResult>> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}/send/role/${encodeURIComponent(role)}`;
    return apiClient.post<BatchNotificationResult>(endpoint, request);
  }

  async getReceivedNotifications(
    userId: string,
    page: number,
    size: number
  ): Promise<ApiResponse<NotificationPageResponse>> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS_RECEIVED(userId)}?page=${page}&size=${size}`;
    const res = await apiClient.get<NotificationPageResponse | NotificationResponse[]>(endpoint);
    if (res.success && res.data && Array.isArray(res.data)) {
      return { success: true, data: { content: res.data } };
    }
    return res as ApiResponse<NotificationPageResponse>;
  }

  async getUnreadCount(
    userId: string
  ): Promise<{ success: boolean; data?: number; error?: string }> {
    return apiClient.get<number>(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT(userId));
  }

  async markAsRead(
    userId: string,
    notificationIds: number[]
  ): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.patch<unknown>(API_ENDPOINTS.NOTIFICATIONS_MARK_READ, {
      userId,
      notificationIds,
    });
    return res;
  }
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.patch<unknown>(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ, {
      userId,
    });
    return res;
  }
}

export const notificationService = new NotificationService();
