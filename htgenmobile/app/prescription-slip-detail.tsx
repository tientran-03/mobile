import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Trash2, User, Calendar, FlaskConical, Stethoscope, Building2, MapPin, Mail, Phone, FileText, Clock } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getApiResponseData } from "@/lib/types/api-types";
import { SERVICE_TYPE_MAPPER } from "@/lib/schemas/order-schemas";
import {
  SpecifyVoteTestResponse,
  specifyVoteTestService,
} from "@/services/specifyVoteTestService";

const getStatusLabel = (status?: string): string => {
  if (!status) return "Khởi tạo";
  const s = status.toLowerCase();
  const statusMap: Record<string, string> = {
    initation: "Khởi tạo",
    payment_failed: "Thanh toán thất bại",
    waiting_receive_sample: "Chờ nhận mẫu",
    forward_analysis: "Chuyển phân tích",
    sample_collecting: "Đang thu mẫu",
    sample_retrieved: "Đã tiếp nhận mẫu",
    analyze_in_progress: "Đang phân tích",
    rerun_testing: "Chạy lại",
    awaiting_results_approval: "Chờ duyệt kết quả",
    results_approved: "Kết quả đã duyệt",
    canceled: "Hủy",
    rejected: "Từ chối",
    sample_addition: "Thêm mẫu",
    sample_error: "Mẫu lỗi",
    completed: "Hoàn thành",
  };
  return statusMap[s] || status;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const formatDateOnly = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

const getGenderLabel = (gender?: string): string => {
  if (!gender) return "";
  const g = gender.toLowerCase();
  if (g === "male" || g === "nam") return "Nam";
  if (g === "female" || g === "nữ") return "Nữ";
  return gender;
};

export default function PrescriptionSlipDetailScreen() {
  const router = useRouter();
  const { specifyVoteID } = useLocalSearchParams<{ specifyVoteID: string }>();
  const queryClient = useQueryClient();

  const {
    data: slipResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["specify-vote-test", specifyVoteID],
    queryFn: () => specifyVoteTestService.getById(specifyVoteID!),
    enabled: !!specifyVoteID,
  });

  const deleteMutation = useMutation({
    mutationFn: () => specifyVoteTestService.delete(specifyVoteID!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specify-vote-tests"] });
      Alert.alert("Thành công", "Phiếu chỉ định đã được xóa thành công", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert("Lỗi", error?.message || "Không thể xóa phiếu chỉ định. Vui lòng thử lại.");
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa phiếu chỉ định này? Hành động này không thể hoàn tác.",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error || !slipResponse?.success) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50 p-5">
        <View className="bg-white rounded-2xl p-4 border border-sky-100 w-full max-w-[420px]">
          <Text className="text-base font-extrabold text-slate-900 text-center mb-2">
            Không tải được dữ liệu
          </Text>
          <Text className="text-xs text-slate-500 text-center mb-4">
            {error?.message || "Không tìm thấy phiếu chỉ định"}
          </Text>
          <TouchableOpacity
            className="bg-sky-600 py-3 rounded-2xl items-center"
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text className="text-white text-sm font-extrabold">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const slip: SpecifyVoteTestResponse = slipResponse.data as SpecifyVoteTestResponse;

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View className="pb-3 px-4 bg-white border-b border-sky-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color="#0284C7" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-slate-900 text-lg font-extrabold">Chi tiết phiếu chỉ định</Text>
              <Text className="mt-0.5 text-xs text-slate-500">{slip.specifyVoteID}</Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            {/* TODO: Implement edit-prescription-slip screen */}
            {/* <TouchableOpacity
              onPress={() => {
                if (specifyVoteID) {
                  router.push({
                    pathname: "/edit-prescription-slip",
                    params: { specifyVoteID },
                  });
                }
              }}
              className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center"
              activeOpacity={0.8}
            >
              <Edit size={18} color="#0284C7" />
            </TouchableOpacity> */}
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 items-center justify-center"
              activeOpacity={0.8}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thông tin cơ bản */}
        <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
          <Text className="text-slate-900 text-base font-extrabold mb-4">Thông tin cơ bản</Text>

          <View className="gap-3">
            <View className="flex-row items-start">
              <FileText size={18} color="#64748B" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-slate-500 font-bold">Mã phiếu</Text>
                <Text className="mt-1 text-sm font-extrabold text-slate-900">{slip.specifyVoteID}</Text>
              </View>
            </View>

            {slip.serviceType && (
              <View className="flex-row items-start">
                <FlaskConical size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Loại dịch vụ</Text>
                  <Text className="mt-1 text-sm font-extrabold text-slate-900">
                    {SERVICE_TYPE_MAPPER[slip.serviceType] || slip.serviceType}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row items-start">
              <Calendar size={18} color="#64748B" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="text-xs text-slate-500 font-bold">Trạng thái</Text>
                <Text className="mt-1 text-sm font-extrabold text-slate-900">
                  {getStatusLabel(slip.specifyStatus)}
                </Text>
              </View>
            </View>

            {slip.createdAt && (
              <View className="flex-row items-start">
                <Clock size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Ngày tạo</Text>
                  <Text className="mt-1 text-sm text-slate-900">{formatDate(slip.createdAt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Thông tin bệnh nhân */}
        {slip.patient && (
          <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
            <Text className="text-slate-900 text-base font-extrabold mb-4">Thông tin bệnh nhân</Text>

            <View className="gap-3">
              <View className="flex-row items-start">
                <User size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Họ tên</Text>
                  <Text className="mt-1 text-sm font-extrabold text-slate-900">
                    {slip.patient.patientName || "N/A"}
                  </Text>
                </View>
              </View>

              {slip.patient.patientPhone && (
                <View className="flex-row items-start">
                  <Phone size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Số điện thoại</Text>
                    <Text className="mt-1 text-sm text-slate-900">{slip.patient.patientPhone}</Text>
                  </View>
                </View>
              )}

              {slip.patient.patientDob && (
                <View className="flex-row items-start">
                  <Calendar size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Ngày sinh</Text>
                    <Text className="mt-1 text-sm text-slate-900">
                      {formatDateOnly(slip.patient.patientDob)}
                    </Text>
                  </View>
                </View>
              )}

              {slip.patient.gender && (
                <View className="flex-row items-start">
                  <User size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Giới tính</Text>
                    <Text className="mt-1 text-sm text-slate-900">
                      {getGenderLabel(slip.patient.gender)}
                    </Text>
                  </View>
                </View>
              )}

              {slip.patient.patientEmail && (
                <View className="flex-row items-start">
                  <Mail size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Email</Text>
                    <Text className="mt-1 text-sm text-slate-900">{slip.patient.patientEmail}</Text>
                  </View>
                </View>
              )}

              {slip.patient.patientJob && (
                <View className="flex-row items-start">
                  <User size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Nghề nghiệp</Text>
                    <Text className="mt-1 text-sm text-slate-900">{slip.patient.patientJob}</Text>
                  </View>
                </View>
              )}

              {slip.patient.patientAddress && (
                <View className="flex-row items-start">
                  <MapPin size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Địa chỉ</Text>
                    <Text className="mt-1 text-sm text-slate-900">{slip.patient.patientAddress}</Text>
                  </View>
                </View>
              )}

              {slip.patient.patientContactName && (
                <View className="flex-row items-start">
                  <User size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Người liên hệ</Text>
                    <Text className="mt-1 text-sm text-slate-900">{slip.patient.patientContactName}</Text>
                    {slip.patient.patientContactPhone && (
                      <Text className="mt-1 text-xs text-slate-600">
                        {slip.patient.patientContactPhone}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Thông tin xét nghiệm */}
        {slip.genomeTest && (
          <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
            <Text className="text-slate-900 text-base font-extrabold mb-4">Thông tin xét nghiệm</Text>

            <View className="gap-3">
              <View className="flex-row items-start">
                <FlaskConical size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Tên xét nghiệm</Text>
                  <Text className="mt-1 text-sm font-extrabold text-slate-900">
                    {slip.genomeTest.testName || "N/A"}
                  </Text>
                </View>
              </View>

              {slip.genomeTest.testDescription && (
                <View className="flex-row items-start">
                  <FileText size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Mô tả</Text>
                    <Text className="mt-1 text-sm text-slate-900">
                      {slip.genomeTest.testDescription}
                    </Text>
                  </View>
                </View>
              )}

              {slip.genomeTest.testSample && slip.genomeTest.testSample.length > 0 && (
                <View className="flex-row items-start">
                  <FlaskConical size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Loại mẫu</Text>
                    <Text className="mt-1 text-sm text-slate-900">
                      {slip.genomeTest.testSample.join(", ")}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Thông tin chỉ định */}
        <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
          <Text className="text-slate-900 text-base font-extrabold mb-4">Thông tin chỉ định</Text>

          <View className="gap-3">
            {slip.hospital && (
              <View className="flex-row items-start">
                <Building2 size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Bệnh viện</Text>
                  <Text className="mt-1 text-sm font-extrabold text-slate-900">
                    {slip.hospital.hospitalName}
                  </Text>
                </View>
              </View>
            )}

            {slip.doctor && (
              <View className="flex-row items-start">
                <Stethoscope size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Bác sĩ chỉ định</Text>
                  <Text className="mt-1 text-sm font-extrabold text-slate-900">
                    {slip.doctor.doctorName}
                  </Text>
                </View>
              </View>
            )}

            {slip.embryoNumber !== undefined && slip.embryoNumber !== null && (
              <View className="flex-row items-start">
                <FlaskConical size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Số phôi</Text>
                  <Text className="mt-1 text-sm text-slate-900">{slip.embryoNumber}</Text>
                </View>
              </View>
            )}

            {slip.samplingSite && (
              <View className="flex-row items-start">
                <MapPin size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Địa điểm lấy mẫu</Text>
                  <Text className="mt-1 text-sm text-slate-900">{slip.samplingSite}</Text>
                </View>
              </View>
            )}

            {slip.sampleCollectDate && (
              <View className="flex-row items-start">
                <Calendar size={18} color="#64748B" className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-slate-500 font-bold">Ngày thu mẫu</Text>
                  <Text className="mt-1 text-sm text-slate-900">
                    {formatDateOnly(slip.sampleCollectDate)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Kết quả xét nghiệm */}
        {(slip.geneticTestResults || slip.geneticTestResultsRelationship) && (
          <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
            <Text className="text-slate-900 text-base font-extrabold mb-4">Kết quả xét nghiệm</Text>

            <View className="gap-3">
              {slip.geneticTestResults && (
                <View className="flex-row items-start">
                  <FileText size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Kết quả xét nghiệm di truyền</Text>
                    <Text className="mt-1 text-sm text-slate-900">{slip.geneticTestResults}</Text>
                  </View>
                </View>
              )}

              {slip.geneticTestResultsRelationship && (
                <View className="flex-row items-start">
                  <FileText size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Mối quan hệ kết quả</Text>
                    <Text className="mt-1 text-sm text-slate-900">
                      {slip.geneticTestResultsRelationship}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Ghi chú và thông tin khác */}
        {(slip.specifyNote || slip.rejectReason || slip.sendEmailPatient !== undefined) && (
          <View className="bg-white rounded-2xl border border-sky-100 p-4 mb-4">
            <Text className="text-slate-900 text-base font-extrabold mb-4">Thông tin khác</Text>

            <View className="gap-3">
              {slip.specifyNote && (
                <View className="flex-row items-start">
                  <FileText size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Ghi chú</Text>
                    <Text className="mt-1 text-sm text-slate-900">{slip.specifyNote}</Text>
                  </View>
                </View>
              )}

              {slip.rejectReason && (
                <View className="flex-row items-start">
                  <FileText size={18} color="#EF4444" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-red-500 font-bold">Lý do từ chối</Text>
                    <Text className="mt-1 text-sm text-red-700">{slip.rejectReason}</Text>
                  </View>
                </View>
              )}

              {slip.sendEmailPatient !== undefined && (
                <View className="flex-row items-start">
                  <Mail size={18} color="#64748B" className="mt-0.5" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-slate-500 font-bold">Gửi email cho bệnh nhân</Text>
                    <Text className="mt-1 text-sm text-slate-900">
                      {slip.sendEmailPatient ? "Có" : "Không"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
