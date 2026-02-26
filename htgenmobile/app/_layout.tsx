import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

SplashScreen.preventAutoHideAsync();

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          if (
            error?.response?.status === 401 ||
            error?.error?.includes('401') ||
            error?.error?.includes('hết hạn')
          ) {
            return false;
          }
          return failureCount < 3;
        },
        onError: (error: any) => {
          if (
            error?.response?.status === 401 ||
            error?.error?.includes('401') ||
            error?.error?.includes('hết hạn')
          ) {
            console.warn('Global 401 handler: Session expired');
          }
        },
      },
      mutations: {
        onError: (error: any) => {
          if (
            error?.response?.status === 401 ||
            error?.error?.includes('401') ||
            error?.error?.includes('hết hạn')
          ) {
            console.warn('Global 401 handler: Session expired');
          }
        },
      },
    },
  });
};

const queryClient = createQueryClient();
const BackButton = ({ toHome = false }: { toHome?: boolean }) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => (toHome ? router.push('/admin') : router.back())}
      className="ml-2"
      activeOpacity={0.7}
    >
      <ArrowLeft size={24} color="#fff" />
    </TouchableOpacity>
  );
};

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Quay lại' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="customer" options={{ headerShown: false }} />
      <Stack.Screen name="staff" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin/orders"
        options={{
          title: 'Quản lý đơn hàng',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="admin/hospitals"
        options={{
          title: 'Quản lý bệnh viện',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="admin/users"
        options={{
          title: 'Quản lý người dùng',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="admin/services"
        options={{
          title: 'Quản lý dịch vụ',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
