import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { apiClient } from './api';

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
}

export interface BatchNotificationResult {
  totalCount: number;
  successCount: number;
  failureCount: number;
  failedUserIds: string[];
}

class NotificationService {
  /**
   * Gửi notification tới 1 user
   */
  async sendToUser(
    receiverId: string,
    receiverRole: string | undefined,
    request: SendNotificationRequest
  ): Promise<NotificationResponse> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}/send/user/${receiverId}${
      receiverRole ? `?receiverRole=${encodeURIComponent(receiverRole)}` : ''
    }`;
    return apiClient.post<NotificationResponse>(endpoint, request);
  }

  /**
   * Gửi notification tới nhiều users
   */
  async sendToUsers(request: SendNotificationRequest): Promise<BatchNotificationResult> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}/send`;
    return apiClient.post<BatchNotificationResult>(endpoint, request);
  }

  /**
   * Gửi notification tới tất cả users có role cụ thể
   */
  async sendByRole(role: string, request: SendNotificationRequest): Promise<BatchNotificationResult> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}/send/role/${encodeURIComponent(role)}`;
    return apiClient.post<BatchNotificationResult>(endpoint, request);
  }
}

export const notificationService = new NotificationService();
