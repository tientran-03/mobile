import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Clipboard,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  paymentService,
  InitiatePaymentResponse,
  CheckOrderPaymentStatusResponse,
} from '@/services/paymentService';
import { specifyVoteTestService } from '@/services/specifyVoteTestService';

const POLLING_INTERVAL = 3000;

type PaymentStep = 'loading' | 'qr' | 'processing' | 'success' | 'failed' | 'cancelled' | 'timeout';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId: string;
    orderName: string;
    amount: string;
    specifyId?: string;
  }>();

  const { orderId, orderName, amount, specifyId } = params;

  const [step, setStep] = useState<PaymentStep>('loading');
  const [paymentInfo, setPaymentInfo] = useState<InitiatePaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<CheckOrderPaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15 * 60);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isInitializedRef = useRef<boolean>(false);
  const paymentIdRef = useRef<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Đã sao chép', `${label} đã được sao chép vào clipboard`);
  };

  const checkPaymentStatus = useCallback(async () => {
    if (!orderId) return;

    try {
      const result = await paymentService.checkOrderPaymentStatus(orderId);
      if (result.success && result.data) {
        const status = result.data;
        setPaymentStatus(status);

        if (status.paymentStatus === 'COMPLETED') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }

          setStep('processing');

          if (specifyId) {
            try {
              await specifyVoteTestService.updateStatus(specifyId, 'WAITING_RECEIVE_SAMPLE');
            } catch (err) {
              console.error('Error updating specify status:', err);
            }
          }

          setStep('success');
        } else if (status.paymentStatus === 'FAILED') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          setStep('failed');
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  }, [orderId, specifyId]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initPayment = async () => {
      if (!orderId || !amount) {
        setError('Thiếu thông tin thanh toán');
        setStep('failed');
        return;
      }

      try {
        const result = await paymentService.initiatePayment({
          orderId,
          amount: parseFloat(amount),
          description: orderName || undefined,
          returnUrl: 'htgenmobile://payment/success',
          cancelUrl: 'htgenmobile://payment/cancel',
        });

        if (result.success && result.data) {
          const paymentData = result.data;

          paymentIdRef.current = paymentData.paymentId;
          setPaymentInfo(paymentData);
          setStep('qr');
          startTimeRef.current = Date.now();

          pollingRef.current = setInterval(checkPaymentStatus, POLLING_INTERVAL);

          const timeUntilExpiry = paymentData.expiresAt - Date.now();
          timeoutRef.current = setTimeout(
            () => {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
              }
              setStep('timeout');
            },
            Math.max(timeUntilExpiry, 0)
          );

          setCountdown(Math.floor(timeUntilExpiry / 1000));
          countdownRef.current = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                if (countdownRef.current) {
                  clearInterval(countdownRef.current);
                  countdownRef.current = null;
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setError(result.error || 'Không thể khởi tạo thanh toán');
          setStep('failed');
        }
      } catch (err) {
        console.error('Error initializing payment:', err);
        setError('Đã xảy ra lỗi khi khởi tạo thanh toán');
        setStep('failed');
      }
    };

    initPayment();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [orderId, amount, orderName, checkPaymentStatus]);

  const handleCancel = async () => {
    Alert.alert('Hủy thanh toán', 'Bạn có chắc chắn muốn hủy thanh toán?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Có, hủy thanh toán',
        style: 'destructive',
        onPress: async () => {
          if (paymentIdRef.current) {
            try {
              await paymentService.cancelPayment(paymentIdRef.current);
            } catch (err) {
              console.error('Error cancelling payment:', err);
            }
          }

          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);

          setStep('cancelled');
        },
      },
    ]);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleDone = () => {
    router.replace('/orders');
  };

  if (step === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0891b2" />
          <Text className="mt-4 text-slate-600">Đang khởi tạo thanh toán...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'qr' && paymentInfo) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="bg-cyan-600 px-4 py-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={handleCancel} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View className="flex-1 ml-2">
              <Text className="text-white text-lg font-semibold">Thanh toán đơn hàng</Text>
              <Text className="text-cyan-100 text-sm">{paymentInfo.orderId}</Text>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Amount */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-slate-500 text-center text-sm">Số tiền cần thanh toán</Text>
            <Text className="text-cyan-600 text-center text-2xl font-bold mt-1">
              {formatCurrency(paymentInfo.amount)}
            </Text>
          </View>

          {/* QR Code */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm items-center">
            <View className="border-2 border-slate-200 rounded-xl p-3">
              <Image
                source={{ uri: paymentInfo.qrCodeUrl }}
                style={{ width: 220, height: 220 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Bank Info */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-slate-700 font-semibold mb-3">Thông tin chuyển khoản</Text>

            <View className="space-y-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">Ngân hàng:</Text>
                <Text className="font-medium text-slate-700">{paymentInfo.bankName}</Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">Số tài khoản:</Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(paymentInfo.accountNumber, 'Số tài khoản')}
                  className="flex-row items-center"
                >
                  <Text className="font-medium text-slate-700 font-mono mr-2">
                    {paymentInfo.accountNumber}
                  </Text>
                  <Copy size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">Chủ tài khoản:</Text>
                <Text className="font-medium text-slate-700">{paymentInfo.accountName}</Text>
              </View>

              <View className="flex-row justify-between items-start">
                <Text className="text-slate-500 text-sm">Nội dung CK:</Text>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(paymentInfo.transactionContent, 'Nội dung chuyển khoản')
                  }
                  className="flex-row items-center flex-1 ml-3 justify-end"
                >
                  <Text className="font-medium text-cyan-600 text-right mr-2">
                    {paymentInfo.transactionContent}
                  </Text>
                  <Copy size={16} color="#0891b2" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Countdown */}
          <View className="bg-amber-50 rounded-xl p-3 mb-4 flex-row items-center justify-center">
            <Clock size={18} color="#d97706" />
            <Text className="text-amber-700 ml-2">
              Thời gian còn lại: <Text className="font-bold">{formatTime(countdown)}</Text>
            </Text>
          </View>

          {/* Instructions */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <Text className="text-blue-800 font-semibold mb-2">Hướng dẫn thanh toán</Text>
            <View className="space-y-1">
              <Text className="text-blue-700 text-sm">1. Mở app ngân hàng và quét mã QR</Text>
              <Text className="text-blue-700 text-sm">
                2. Kiểm tra thông tin và xác nhận chuyển khoản
              </Text>
              <Text className="text-blue-700 text-sm">
                3. Đợi hệ thống xác nhận thanh toán (tự động)
              </Text>
            </View>
          </View>

          {/* Status indicator */}
          <View className="flex-row items-center justify-center mb-4">
            <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            <Text className="text-slate-500 text-sm">Đang chờ thanh toán...</Text>
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            onPress={handleCancel}
            className="bg-white border border-slate-300 rounded-xl py-3 px-6 flex-row items-center justify-center"
          >
            <ArrowLeft size={18} color="#475569" />
            <Text className="text-slate-700 font-medium ml-2">Hủy thanh toán</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'processing') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#0891b2" />
          <Text className="mt-4 text-slate-600 text-center">
            Đang xử lý thanh toán...{'\n'}Vui lòng đợi trong giây lát
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'success') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-green-100 rounded-full p-6 mb-6">
            <CheckCircle size={64} color="#16a34a" />
          </View>
          <Text className="text-2xl font-bold text-slate-800 mb-2">Thanh toán thành công!</Text>
          <Text className="text-slate-600 text-center mb-2">{orderName}</Text>
          {paymentStatus && (
            <Text className="text-cyan-600 font-bold text-xl mb-8">
              {formatCurrency(paymentStatus.paymentAmount || 0)}
            </Text>
          )}
          <TouchableOpacity onPress={handleDone} className="bg-cyan-600 rounded-xl py-3 px-8">
            <Text className="text-white font-semibold text-lg">Hoàn tất</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'failed') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-red-100 rounded-full p-6 mb-6">
            <XCircle size={64} color="#dc2626" />
          </View>
          <Text className="text-2xl font-bold text-slate-800 mb-2">Thanh toán thất bại</Text>
          <Text className="text-slate-600 text-center mb-8">
            {error || 'Đã xảy ra lỗi trong quá trình thanh toán'}
          </Text>
          <TouchableOpacity onPress={handleGoBack} className="bg-slate-600 rounded-xl py-3 px-8">
            <Text className="text-white font-semibold text-lg">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'cancelled') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-slate-100 rounded-full p-6 mb-6">
            <XCircle size={64} color="#64748b" />
          </View>
          <Text className="text-2xl font-bold text-slate-800 mb-2">Đã hủy thanh toán</Text>
          <Text className="text-slate-600 text-center mb-8">
            Thanh toán đã bị hủy bởi người dùng
          </Text>
          <TouchableOpacity onPress={handleGoBack} className="bg-slate-600 rounded-xl py-3 px-8">
            <Text className="text-white font-semibold text-lg">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'timeout') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-amber-100 rounded-full p-6 mb-6">
            <AlertCircle size={64} color="#d97706" />
          </View>
          <Text className="text-2xl font-bold text-slate-800 mb-2">Hết thời gian thanh toán</Text>
          <Text className="text-slate-600 text-center mb-8">
            Phiên thanh toán đã hết hạn.{'\n'}Vui lòng thử lại.
          </Text>
          <TouchableOpacity onPress={handleGoBack} className="bg-slate-600 rounded-xl py-3 px-8">
            <Text className="text-white font-semibold text-lg">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}
