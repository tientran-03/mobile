import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="orders"
        options={{
          headerShown: true,
          title: 'Quản lý đơn hàng',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="hospitals"
        options={{
          headerShown: true,
          title: 'Quản lý bệnh viện',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          headerShown: true,
          title: 'Quản lý người dùng',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="services"
        options={{
          headerShown: true,
          title: 'Quản lý dịch vụ',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="config"
        options={{
          headerShown: true,
          title: 'Cấu hình hệ thống',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="permissions"
        options={{
          headerShown: true,
          title: 'Phân quyền & vai trò',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="specifies"
        options={{
          headerShown: true,
          title: 'Quản lý phiếu xét nghiệm',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="test-results"
        options={{
          headerShown: true,
          title: 'Kết quả xét nghiệm',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="logs"
        options={{
          headerShown: true,
          title: 'Log hệ thống',
          headerStyle: { backgroundColor: '#0891b2' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}
