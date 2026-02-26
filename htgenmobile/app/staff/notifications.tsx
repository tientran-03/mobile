import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Bell, Package, FileText, Clock, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationResponse } from '@/services/notificationService';
import { COLORS } from '@/constants/colors';

type FilterType = 'all' | 'unread';

const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
};

const getNotificationIcon = (type?: string) => {
  const iconProps = { size: 24 };
  switch (type?.toUpperCase()) {
    case 'ORDER':
      return <Package {...iconProps} color={COLORS.primary} />;
    case 'PAYMENT':
      return <FileText {...iconProps} color={COLORS.success} />;
    case 'TEST_RESULT':
      return <FileText {...iconProps} color={COLORS.info} />;
    case 'APPOINTMENT':
      return <Clock {...iconProps} color={COLORS.warning} />;
    case 'SYSTEM':
      return <AlertCircle {...iconProps} color={COLORS.sub} />;
    default:
      return <Bell {...iconProps} color={COLORS.primary} />;
  }
};

const getNotificationColor = (type?: string, isRead: boolean = false) => {
  if (isRead) {
    return {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-slate-100',
      title: 'text-slate-700',
      body: 'text-slate-600',
    };
  }

  switch (type?.toUpperCase()) {
    case 'ORDER':
      return {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        iconBg: 'bg-sky-100',
        title: 'text-slate-900',
        body: 'text-slate-700',
      };
    case 'PAYMENT':
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        title: 'text-slate-900',
        body: 'text-slate-700',
      };
    case 'TEST_RESULT':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        title: 'text-slate-900',
        body: 'text-slate-700',
      };
    case 'APPOINTMENT':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        title: 'text-slate-900',
        body: 'text-slate-700',
      };
    default:
      return {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        iconBg: 'bg-sky-100',
        title: 'text-slate-900',
        body: 'text-slate-700',
      };
  }
};

interface NotificationItemProps {
  notification: NotificationResponse;
  onPress: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const isRead = !!notification.readAt;
  const colors = getNotificationColor(notification.notificationType, isRead);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`mb-3 rounded-2xl border ${colors.bg} ${colors.border} p-4`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row items-start">
        <View className={`mr-3 h-12 w-12 items-center justify-center rounded-2xl ${colors.iconBg}`}>
          {getNotificationIcon(notification.notificationType)}
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text
              className={`flex-1 text-[15px] leading-5 ${isRead ? 'font-semibold' : 'font-extrabold'} ${colors.title}`}
              numberOfLines={2}
            >
              {notification.title}
            </Text>
            {!isRead && (
              <View className="ml-2 h-2.5 w-2.5 rounded-full bg-sky-600 mt-1" />
            )}
          </View>
          <Text className={`text-[13px] leading-5 ${colors.body} mb-2`} numberOfLines={3}>
            {notification.body}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-[11px] text-slate-400">
                {formatTimeAgo(notification.createdAt)}
              </Text>
              {notification.senderName && (
                <Text className="ml-2 text-[11px] text-slate-400">
                  • {notification.senderName}
                </Text>
              )}
            </View>
            {notification.notificationType && (
              <View className="px-2 py-0.5 rounded-lg bg-slate-100">
                <Text className="text-[10px] font-bold text-slate-600 uppercase">
                  {notification.notificationType}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({
    fetchOnMount: true,
    refreshInterval: 30000,
    pageSize: 50,
  });

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.readAt);
    }
    return notifications;
  }, [notifications, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationResponse) => {
    if (!notification.readAt) {
      await markAsRead([notification.id]);
    }

    if (notification.notificationType === 'ORDER' && notification.data) {
      const orderId = (notification.data as any)?.orderId;
      if (orderId) {
        router.push({
          pathname: '/staff/order-detail',
          params: { orderId },
        });
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen
          options={{
            title: 'Thông báo',
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: '#fff',
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="mt-4 text-slate-500 font-semibold">Đang tải thông báo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen
          options={{
            title: 'Thông báo',
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: '#fff',
          }}
        />
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={64} color={COLORS.danger} />
          <Text className="mt-4 text-center text-lg font-bold text-slate-900">
            Có lỗi xảy ra
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-500">{error}</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="mt-6 rounded-2xl bg-sky-600 px-8 py-3.5"
          >
            <Text className="font-bold text-white text-[15px]">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          title: 'Thông báo',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                className="mr-2 rounded-xl bg-white/20 px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-xs font-bold text-white">Đọc tất cả</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      {/* Filter Tabs */}
      <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-2">
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setFilter('all')}
            className={`flex-1 rounded-xl py-2.5 px-4 ${
              filter === 'all' ? 'bg-sky-600' : 'bg-slate-100'
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center text-sm font-bold ${
                filter === 'all' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Tất cả ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('unread')}
            className={`flex-1 rounded-xl py-2.5 px-4 ${
              filter === 'unread' ? 'bg-sky-600' : 'bg-slate-100'
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center text-sm font-bold ${
                filter === 'unread' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Chưa đọc ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unread Banner */}
      {unreadCount > 0 && filter === 'all' && (
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          activeOpacity={0.8}
          className="mx-4 mt-3 rounded-2xl bg-sky-600 px-4 py-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-white/20 mr-3">
                <Bell size={16} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-extrabold text-white">
                  Bạn có {unreadCount} thông báo chưa đọc
                </Text>
                <Text className="text-xs text-sky-100 mt-0.5">
                  Nhấn để đánh dấu tất cả đã đọc
                </Text>
              </View>
            </View>
            <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 size={18} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        className="flex-1 px-4 pt-4 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 px-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Bell size={40} color="#94A3B8" />
            </View>
            <Text className="mt-4 text-center text-lg font-extrabold text-slate-700">
              {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo'}
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500 leading-5">
              {filter === 'unread'
                ? 'Tất cả thông báo đã được đọc'
                : 'Bạn sẽ nhận được thông báo khi có cập nhật mới'}
            </Text>
          </View>
        ) : (
          <>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onPress={() => handleNotificationPress(notification)}
              />
            ))}
            {filteredNotifications.length > 10 && (
              <View className="mt-4 items-center">
                <Text className="text-xs text-slate-400">
                  Đã hiển thị {filteredNotifications.length} thông báo
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
