import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';
import { API_ENDPOINTS } from '@/config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
}

export interface RegisterTokenRequest {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  userId?: string;
}

class PushNotificationService {
  private token: string | null = null;
  private deviceId: string | null = null;

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('[PushNotification] Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotification] Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.expoConfig?.projectId ||
                       Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('[PushNotification] No projectId found. Push notifications may not work properly.');
        console.log('[PushNotification] Available Constants:', {
          expoConfig: Constants.expoConfig?.extra,
          easConfig: Constants.easConfig,
        });
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          this.token = tokenData.data;
          this.deviceId = Device.modelName || Device.deviceName || 'unknown';
          console.log('[PushNotification] Token registered (without projectId):', this.token);
          return this.token;
        } catch (errorWithoutProjectId) {
          console.error('[PushNotification] Failed to get token without projectId:', errorWithoutProjectId);
          return null;
        }
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.token = tokenData.data;
      this.deviceId = Device.modelName || Device.deviceName || 'unknown';

      console.log('[PushNotification] Token registered:', this.token);
      return this.token;
    } catch (error) {
      console.error('[PushNotification] Error registering for push notifications:', error);
      return null;
    }
  }

  async registerTokenWithBackend(userId?: string): Promise<boolean> {
    if (!this.token || !this.deviceId) {
      console.warn('[PushNotification] No token available to register');
      return false;
    }

    try {
      const request: RegisterTokenRequest = {
        token: this.token,
        deviceId: this.deviceId,
        platform: Platform.OS as 'ios' | 'android' | 'web',
        userId,
      };

      const endpoint = API_ENDPOINTS.NOTIFICATION_REGISTER_TOKEN;
      await apiClient.post(endpoint, request);
      console.log('[PushNotification] Token registered with backend');
      return true;
    } catch (error) {
      console.error('[PushNotification] Error registering token with backend:', error);
      return false;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    seconds: number = 0
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: seconds > 0 ? { seconds } : null,
    });

    return identifier;
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const pushNotificationService = new PushNotificationService();
