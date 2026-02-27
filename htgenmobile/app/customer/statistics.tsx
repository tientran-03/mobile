import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  FlaskConical,
  ReceiptText,
  XCircle,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { getApiResponseData, getApiResponseSingle } from '@/lib/types/api-types';
import {
  customerStatisticsService,
  type CustomerPaymentHistoryResponse,
  type CustomerStatisticsResponse,
} from '@/services/customerStatisticsService';

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('vi-VN').format(amount);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <View className={`bg-white rounded-2xl border border-sky-100 shadow-sm ${className}`}>
      {children}
    </View>
  );
};

const SectionHeader = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <View className="flex-row items-center justify-between mb-3">
    <Text className="text-slate-900 text-base font-extrabold">{title}</Text>
    {right}
  </View>
);

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    className={`px-3 py-2 rounded-xl border ${
      active ? 'bg-sky-600 border-sky-600' : 'bg-white border-sky-200'
    }`}
  >
    <Text className={`text-xs font-extrabold ${active ? 'text-white' : 'text-slate-600'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

const PaymentStatusBadge = ({ status }: { status: string | null }) => {
  const config: Record<string, { label: string; className: string; text: string }> = {
    COMPLETED: {
      label: 'Hoàn thành',
      className: 'bg-green-50 border-green-200',
      text: 'text-green-700',
    },
    PENDING: {
      label: 'Đang chờ',
      className: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-700',
    },
    FAILED: { label: 'Thất bại', className: 'bg-red-50 border-red-200', text: 'text-red-700' },
    UNPAID: { label: 'Chưa TT', className: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
  };
  const c =
    status && config[status]
      ? config[status]
      : {
          label: status || 'N/A',
          className: 'bg-slate-50 border-slate-200',
          text: 'text-slate-700',
        };

  return (
    <View className={`px-2.5 py-1 rounded-full border ${c.className}`}>
      <Text className={`text-[11px] font-extrabold ${c.text}`}>{c.label}</Text>
    </View>
  );
};

const PaymentTypeBadge = ({ type }: { type: string | null }) => {
  const config: Record<string, { label: string; className: string; text: string }> = {
    CASH: { label: 'Tiền mặt', className: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    ONLINE_PAYMENT: {
      label: 'Chuyển khoản',
      className: 'bg-purple-50 border-purple-200',
      text: 'text-purple-700',
    },
  };
  const c =
    type && config[type]
      ? config[type]
      : { label: type || 'N/A', className: 'bg-slate-50 border-slate-200', text: 'text-slate-700' };

  return (
    <View className={`px-2.5 py-1 rounded-full border ${c.className}`}>
      <Text className={`text-[11px] font-extrabold ${c.text}`}>{c.label}</Text>
    </View>
  );
};

const MONTH_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Th${i + 1}`,
  })),
];

function ProgressRow({
  label,
  count,
  total,
  dotClass,
  barClass,
}: {
  label: string;
  count: number;
  total: number;
  dotClass: string;
  barClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
          <Text className="text-sm font-bold text-slate-700">{label}</Text>
          <Text className="text-xs text-slate-400 font-bold">({count})</Text>
        </View>
        <Text className="text-sm font-extrabold text-slate-800">{pct}%</Text>
      </View>
      <View className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <View className={`h-full ${barClass}`} style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}

export default function CustomerStatisticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const hospitalId = user?.hospitalId != null ? Number(user.hospitalId) : undefined;

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    data: statsRes,
    isLoading: loadingStats,
    refetch: refetchStats,
    isFetching: fetchingStats,
  } = useQuery({
    queryKey: ['customer-statistics', selectedYear, hospitalId],
    queryFn: () => customerStatisticsService.getStatistics(selectedYear, hospitalId),
    enabled: true,
  });

  const monthNum = selectedMonth === 'all' ? undefined : parseInt(selectedMonth, 10);
  const {
    data: paymentsRes,
    isLoading: loadingPayments,
    refetch: refetchPayments,
    isFetching: fetchingPayments,
  } = useQuery({
    queryKey: ['customer-payment-history', selectedYear, monthNum, currentPage, hospitalId],
    queryFn: () =>
      customerStatisticsService.getPaymentHistory({
        year: selectedYear,
        month: monthNum,
        page: currentPage - 1,
        size: pageSize,
        hospitalId,
      }),
    enabled: true,
  });

  const statistics = useMemo(
    () => getApiResponseSingle<CustomerStatisticsResponse>(statsRes),
    [statsRes]
  );
  const paymentHistory = useMemo(
    () => getApiResponseData<CustomerPaymentHistoryResponse>(paymentsRes) || [],
    [paymentsRes]
  );

  const yearOptions = useMemo(() => {
    const years = statistics?.availableYears || [];
    const current = new Date().getFullYear();
    const set = new Set([current, ...years]);
    return Array.from(set).sort((a, b) => b - a);
  }, [statistics?.availableYears]);

  const statsCards = useMemo(() => {
    const oc = statistics?.orderStatusCount;
    const base = {
      total: String(oc?.totalCount ?? 0),
      pending: String(oc?.pendingCount ?? 0),
      completed: String(oc?.completedCount ?? 0),
      rejected: String(oc?.rejectedCount ?? 0),
    };
    return [
      { name: 'Tổng đơn', value: base.total, icon: FileText, tone: 'bg-sky-600' },
      { name: 'Đang xử lý', value: base.pending, icon: Clock, tone: 'bg-amber-500' },
      { name: 'Hoàn thành', value: base.completed, icon: CheckCircle2, tone: 'bg-emerald-600' },
      { name: 'Từ chối/Hủy', value: base.rejected, icon: XCircle, tone: 'bg-rose-600' },
    ];
  }, [statistics?.orderStatusCount]);

  const serviceUsages = statistics?.serviceUsages ?? [];
  const hasMorePayments = paymentHistory.length >= pageSize;

  const handleRefresh = () => {
    refetchStats();
    refetchPayments();
  };

  const isLoading = loadingStats || loadingPayments;
  const isFetching = fetchingStats || fetchingPayments;

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const total = statistics?.orderStatusCount?.totalCount ?? 0;
  const completed = statistics?.orderStatusCount?.completedCount ?? 0;
  const pending = statistics?.orderStatusCount?.pendingCount ?? 0;
  const rejected = statistics?.orderStatusCount?.rejectedCount ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pb-3 pt-2 bg-white border-b border-sky-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
            activeOpacity={0.85}
          >
            <ArrowLeft size={20} color="#0284C7" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">Thống kê đơn hàng</Text>
            <Text className="mt-0.5 text-xs text-slate-500 font-semibold">
              Tổng quan đơn hàng & thanh toán theo bệnh viện
            </Text>
          </View>
        </View>

        {/* Year chips */}
        <View className="mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-slate-700 font-extrabold">Chọn năm</Text>
            <View className="px-2 py-1 rounded-full bg-sky-50 border border-sky-200">
              <Text className="text-[11px] font-extrabold text-sky-700">
                BV: {hospitalId ?? 'N/A'}
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {yearOptions.map(y => (
                <Chip
                  key={y}
                  label={String(y)}
                  active={selectedYear === y}
                  onPress={() => setSelectedYear(y)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={handleRefresh} tintColor="#0284C7" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats cards */}
        <SectionHeader title="Tổng quan" />
        <View className="flex-row flex-wrap gap-3 mb-5">
          {statsCards.map(stat => {
            const Icon = stat.icon;
            return (
              <View key={stat.name} className="w-[48.5%]">
                <Card className="p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-xs text-slate-500 font-extrabold">{stat.name}</Text>
                      <Text className="text-2xl font-extrabold text-slate-900 mt-1">
                        {stat.value}
                      </Text>
                    </View>
                    <View className={`${stat.tone} p-3 rounded-2xl`}>
                      <Icon size={20} color="#fff" />
                    </View>
                  </View>
                </Card>
              </View>
            );
          })}
        </View>

        {/* Most used service */}
        <SectionHeader title="Dịch vụ dùng nhiều nhất" />
        <Card className="p-4 mb-5">
          {statistics?.mostUsedService?.orderCount ? (
            <View className="flex-row items-center justify-between p-4 bg-sky-50 rounded-2xl border border-sky-100">
              <View className="flex-1 pr-3">
                <Text className="font-extrabold text-slate-900" numberOfLines={1}>
                  {statistics.mostUsedService.serviceName}
                </Text>
                <Text className="text-xs text-slate-500 mt-1 font-semibold">
                  Mã: {statistics.mostUsedService.serviceId || 'N/A'}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-2xl font-extrabold text-sky-700">
                  {statistics.mostUsedService.orderCount}
                </Text>
                <Text className="text-xs text-sky-600 font-bold">đơn hàng</Text>
              </View>
            </View>
          ) : (
            <View className="py-10 items-center">
              <FlaskConical size={36} color="#94A3B8" />
              <Text className="text-slate-500 mt-2 font-semibold">Chưa có dữ liệu dịch vụ</Text>
            </View>
          )}
        </Card>

        {/* Service usages */}
        {serviceUsages.length > 0 && (
          <>
            <SectionHeader title="Theo dịch vụ" />
            <Card className="p-2 mb-5">
              {serviceUsages.map((svc, idx) => (
                <View
                  key={svc.serviceId ?? idx}
                  className="flex-row items-center justify-between px-3 py-3 border-b border-sky-100 last:border-0"
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-100 items-center justify-center mr-3">
                      <Text className="text-xs font-extrabold text-sky-700">{idx + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
                        {svc.serviceName}
                      </Text>
                      {!!svc.serviceId && (
                        <Text className="text-xs text-slate-500 font-semibold">
                          Mã: {svc.serviceId}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200">
                    <Text className="text-sm font-extrabold text-sky-700">{svc.orderCount}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Order ratio */}
        {total > 0 && (
          <>
            <SectionHeader title={`Tỷ lệ đơn hàng năm ${selectedYear}`} />
            <Card className="p-4 mb-5">
              <View className="gap-4">
                <ProgressRow
                  label="Hoàn thành"
                  count={completed}
                  total={total}
                  dotClass="bg-emerald-600"
                  barClass="bg-emerald-600"
                />
                <ProgressRow
                  label="Đang xử lý"
                  count={pending}
                  total={total}
                  dotClass="bg-amber-500"
                  barClass="bg-amber-500"
                />
                <ProgressRow
                  label="Từ chối/Hủy"
                  count={rejected}
                  total={total}
                  dotClass="bg-rose-600"
                  barClass="bg-rose-600"
                />
              </View>
            </Card>
          </>
        )}

        {/* Payment history */}
        <SectionHeader
          title="Lịch sử thanh toán"
          right={
            <View className="flex-row items-center gap-2">
              <ReceiptText size={16} color="#0284C7" />
              <Text className="text-xs font-extrabold text-sky-700">Năm {selectedYear}</Text>
            </View>
          }
        />

        {/* Month chips (sticky-ish look by placing above list) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row gap-2">
            {MONTH_OPTIONS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={selectedMonth === opt.value}
                onPress={() => {
                  setSelectedMonth(opt.value);
                  setCurrentPage(1);
                }}
              />
            ))}
          </View>
        </ScrollView>

        <Card className="overflow-hidden mb-2">
          {paymentHistory.length === 0 ? (
            <View className="py-12 items-center">
              <FileText size={40} color="#94A3B8" />
              <Text className="text-slate-500 mt-2 font-semibold">Chưa có lịch sử thanh toán</Text>
            </View>
          ) : (
            <>
              {paymentHistory.map(p => (
                <View key={p.paymentId} className="px-4 py-4 border-b border-sky-100 last:border-0">
                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 items-center justify-center">
                      <CreditCard size={18} color="#0284C7" />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-xs text-slate-500 font-extrabold">Mã đơn</Text>
                          <Text className="font-mono text-sm font-extrabold text-slate-900">
                            {p.orderId || 'N/A'}
                          </Text>
                          <Text
                            className="text-sm text-slate-600 mt-1 font-semibold"
                            numberOfLines={2}
                          >
                            {p.orderName || 'N/A'}
                          </Text>
                        </View>

                        <View className="items-end">
                          <Text className="text-sm text-slate-500 font-extrabold">Số tiền</Text>
                          <Text className="text-base font-extrabold text-sky-700">
                            {formatCurrency(p.paymentAmount)}{' '}
                            <Text className="text-xs text-slate-500 font-bold">VNĐ</Text>
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row flex-wrap gap-2 mt-3">
                        <PaymentStatusBadge status={p.paymentStatus} />
                        <PaymentTypeBadge type={p.paymentType} />
                      </View>

                      <Text className="text-xs text-slate-500 mt-2 font-semibold">
                        {formatDate(p.transactionDate)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {(currentPage > 1 || hasMorePayments) && (
                <View className="flex-row items-center justify-between px-4 py-3 border-t border-sky-100 bg-white">
                  <Text className="text-sm text-slate-500 font-bold">Trang {currentPage}</Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`w-10 h-10 rounded-2xl items-center justify-center border ${
                        currentPage === 1
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-sky-50 border-sky-200'
                      }`}
                    >
                      <ChevronLeft size={18} color={currentPage === 1 ? '#94A3B8' : '#0284C7'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setCurrentPage(p => p + 1)}
                      disabled={!hasMorePayments}
                      className={`w-10 h-10 rounded-2xl items-center justify-center border ${
                        !hasMorePayments
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-sky-50 border-sky-200'
                      }`}
                    >
                      <ChevronRight size={18} color={!hasMorePayments ? '#94A3B8' : '#0284C7'} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
