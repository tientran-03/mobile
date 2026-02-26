import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
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

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Quay lại' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="customer" options={{ headerShown: false }} />
      <Stack.Screen name="staff" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
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
