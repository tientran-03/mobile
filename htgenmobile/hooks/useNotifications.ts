import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, NotificationResponse } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

export interface UseNotificationsConfig {
  fetchOnMount?: boolean;
  refreshInterval?: number;
  pageSize?: number;
}

export interface UseNotificationsReturn {
  notifications: NotificationResponse[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationIds: number[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(config: UseNotificationsConfig = {}): UseNotificationsReturn {
  const { fetchOnMount = true, refreshInterval = 30000, pageSize = 20 } = config;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['notifications', 'received', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      const response = await notificationService.getReceivedNotifications(userId, 0, pageSize);
      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to fetch notifications');
      }
      return response.data;
    },
    enabled: !!userId && fetchOnMount,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  const {
    data: unreadCountData,
    isLoading: isLoadingUnreadCount,
    refetch: refetchUnreadCount,
  } = useQuery({
    queryKey: ['notifications', 'unread-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const response = await notificationService.getUnreadCount(userId);
      if (!response.success) {
        return 0;
      }
      return response.data || 0;
    },
    enabled: !!userId && fetchOnMount,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: number[]) => {
      if (!userId) throw new Error('User not authenticated');
      return await notificationService.markAsRead(userId, notificationIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'received', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      return await notificationService.markAllAsRead(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'received', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] });
    },
  });

  const fetchNotifications = useCallback(
    async (page: number = 0) => {
      await refetchNotifications();
    },
    [refetchNotifications]
  );

  const fetchUnreadCount = useCallback(async () => {
    await refetchUnreadCount();
  }, [refetchUnreadCount]);

  const markAsRead = useCallback(
    async (notificationIds: number[]) => {
      await markAsReadMutation.mutateAsync(notificationIds);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const refresh = useCallback(async () => {
    await Promise.all([refetchNotifications(), refetchUnreadCount()]);
  }, [refetchNotifications, refetchUnreadCount]);

  return {
    notifications: notificationsData?.content || [],
    unreadCount: unreadCountData || 0,
    isLoading: isLoadingNotifications || isLoadingUnreadCount,
    error: notificationsError ? (notificationsError as Error).message : null,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
