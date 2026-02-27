import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { OrderResponse, orderService } from '@/services/orderService';

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route?: string;
  badge?: number;
}

const isPendingStatus = (status: string): boolean => {
  const s = status.toLowerCase();
  return s === 'initiation' || s === 'accepted' || s === 'in_progress' || s === 'forward_analysis';
};

export default function StaffHomeScreen() {
  const router = useRouter();
  const { logout, canCreatePrescriptionSlip, user, isLoading } = useAuth();

  const { unreadCount } = useNotifications({
    fetchOnMount: true,
    refreshInterval: 30000,
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    retry: false,
  });

  const initiationOrdersCount = useMemo(() => {
    if (!ordersResponse?.success || !ordersResponse.data) return 0;
    const orders = ordersResponse.data as OrderResponse[];
    return orders.filter(o => String(o.orderStatus).toLowerCase() === 'initiation').length;
  }, [ordersResponse]);

  useEffect(() => {
    if (!isLoading && user?.role) {
      if (user.role === 'ROLE_CUSTOMER') {
        router.replace('/customer');
      } else if (user.role === 'ROLE_ADMIN') {
        router.replace('/admin');
      }
    }
  }, [user?.role, isLoading, router]);

  const menuItems = useMemo(() => {
    const canCreate = canCreatePrescriptionSlip();
    const allMenuItems: MenuItem[] = [
      { id: '1', title: 'Thêm nhanh\nđơn hàng', icon: <Image source={require('@/assets/images/1.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/quick-order' },
      { id: '2', title: 'Thêm mới\nđơn hàng', icon: <Image source={require('@/assets/images/1.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/create-order' },
      { id: '3', title: 'Danh sách\nbệnh nhân', icon: <Image source={require('@/assets/images/3.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/patients' },
      { id: '5', title: 'Danh sách\ndịch vụ', icon: <Image source={require('@/assets/images/4.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/services' },
      { id: '6', title: 'Báo cáo\nthống kê', icon: <Image source={require('@/assets/images/5.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/statistics' },
      { id: '7', title: 'Danh sách\nđơn hàng', icon: <Image source={require('@/assets/images/6.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/orders', badge: initiationOrdersCount > 0 ? initiationOrdersCount : undefined },
      { id: '8', title: 'Thông tin\nngười dùng', icon: <Image source={require('@/assets/images/7.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/profile' },
      { id: '11', title: 'Thông báo', icon: <Image source={require('@/assets/images/6.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/notifications', badge: unreadCount > 0 ? unreadCount : undefined },
      { id: '9', title: 'Phiếu chỉ\nđịnh', icon: <Image source={require('@/assets/images/6.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/prescription-slips' },
      { id: '10', title: 'Phiếu chỉ\nđịnh đã có k...', icon: <Image source={require('@/assets/images/8.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/prescription-slips' },
      { id: '12', title: 'Đơn hàng đang\nphân tích', icon: <Image source={require('@/assets/images/6.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/orders' },
      { id: '13', title: 'Quản lý mẫu\nxét nghiệm', icon: <Image source={require('@/assets/images/3.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/patient-metadatas' },
      { id: '14', title: 'Mẫu xét nghiệm\nbổ sung', icon: <Image source={require('@/assets/images/3.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/additional-samples' },
      { id: '15', title: 'Danh sách\nkhách hàng', icon: <Image source={require('@/assets/images/7.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/customers' },
      { id: '17', title: 'Danh sách\nxét nghiệm', icon: <Image source={require('@/assets/images/4.png')} className="w-16 h-16" resizeMode="contain" />, route: '/staff/genome-tests' },
      { id: '16', title: 'Đăng xuất', icon: <Image source={require('@/assets/images/9.png')} className="w-16 h-16" resizeMode="contain" />, route: 'logout' },
    ];
    return allMenuItems.filter(item => {
      if ((item.id === '9' || item.id === '10') && !canCreate) return false;
      return true;
    });
  }, [canCreatePrescriptionSlip, initiationOrdersCount, unreadCount]);

  const handleMenuPress = useCallback(
    (item: MenuItem) => {
      if (item.route === 'logout') logout();
      else if (item.route) router.push(item.route as any);
    },
    [router, logout]
  );

  if (isLoading || !user || user.role === 'ROLE_CUSTOMER' || user.role === 'ROLE_ADMIN') {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0891b2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require('@/assets/images/bg.png')}
        className="pt-12 pb-6 px-6"
        style={Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
          android: { elevation: 3 },
          web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
        })}
        resizeMode="cover"
      >
        <View className="w-64 h-16 flex-row items-center justify-between">
          <View />
          <View className="bg-sky-600 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">NHÂN VIÊN</Text>
          </View>
        </View>
      </ImageBackground>
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap -mx-2">
          {menuItems.map(item => (
            <View key={item.id} className="w-1/3 px-2 mb-4">
              <TouchableOpacity
                className="bg-white rounded-xl p-4 items-center border border-gray-100"
                style={Platform.select({
                  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
                  android: { elevation: 1 },
                  web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
                })}
                activeOpacity={0.7}
                onPress={() => handleMenuPress(item)}
              >
                <View className="relative">
                  <View className="w-16 h-16 rounded-2xl items-center justify-center mb-2">{item.icon}</View>
                  {!!item.badge && (
                    <View className="absolute -top-1 -right-1 min-w-[24px] h-[24px] rounded-full bg-orange-500 items-center justify-center px-1.5 border-2 border-white">
                      <Text className="text-white text-[10px] font-bold">{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text className="text-[12px] h-8 font-bold text-sky-700 text-center leading-tight" style={{ lineHeight: 14 }}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
