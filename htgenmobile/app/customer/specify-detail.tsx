import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  User,
  Stethoscope,
  Building2,
  FlaskConical,
  Heart,
  FileText,
  Pencil,
  ArrowRight,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ForwardTestModal } from "@/components/modals/ForwardTestModal";
import { getApiResponseSingle } from "@/lib/types/api-types";
import {
  specifyVoteTestService,
  SpecifyVoteTestResponse,
} from "@/services/specifyVoteTestService";

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return dateString;
  }
};

const getStatusLabel = (status: string): string => {
  const s = (status || "").toLowerCase();
  const statusMap: Record<string, string> = {
    pending: "Chờ xử lý",
    processing: "Đang xử lý",
    completed: "Hoàn thành",
    rejected: "Từ chối",
    cancelled: "Đã hủy",
    initiation: "Khởi tạo",
    initation: "Khởi tạo",
    waiting_receive_sample: "Chờ nhận mẫu",
    sample_received: "Đã nhận mẫu",
  };
  return statusMap[s] || status;
};

const getServiceTypeLabel = (type?: string) => {
  if (type === "disease") return "Bệnh lý di truyền";
  if (type === "embryo") return "Phôi thai";
  if (type === "reproduction") return "Sinh sản";
  return type || "-";
};

const SPECIFY_INITIATION = ["initiation", "initation"];

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <View className="bg-white rounded-2xl border border-sky-100 overflow-hidden mb-4">
    <View className="flex-row items-center px-4 py-3 bg-sky-50/50 border-b border-sky-100">
      <View className="w-8 h-8 rounded-lg bg-sky-100 items-center justify-center">
        <Icon size={16} color="#0284C7" />
      </View>
      <Text className="ml-3 text-slate-900 text-sm font-extrabold">{title}</Text>
    </View>
    <View className="p-4">{children}</View>
  </View>
);

const InfoRow = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <View className="flex-row py-2.5 border-b border-slate-100 last:border-0">
      <Text className="w-28 text-xs text-slate-500 font-medium">{label}</Text>
      <Text className="flex-1 text-sm font-semibold text-slate-800" numberOfLines={3}>{value}</Text>
    </View>
  ) : null;

export default function SpecifyDetailScreen() {
  const router = useRouter();
  const { specifyId } = useLocalSearchParams<{ specifyId: string }>();
  const [forwardModalOpen, setForwardModalOpen] = useState(false);

  const { data: specifyResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["specify", specifyId],
    queryFn: () => specifyVoteTestService.getById(specifyId!),
    enabled: !!specifyId,
    retry: false,
  });

  const specify = getApiResponseSingle<SpecifyVoteTestResponse>(specifyResponse);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50">
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="mt-3 text-slate-500 text-sm font-bold">Đang tải...</Text>
      </View>
    );
  }

  if (error || !specify) {
    return (
      <View className="flex-1 justify-center items-center bg-sky-50 p-5">
        <View className="bg-white rounded-2xl p-4 border border-sky-100 w-full max-w-[420px]">
          <Text className="text-base font-extrabold text-slate-900 text-center mb-2">
            Không tìm thấy phiếu xét nghiệm
          </Text>
          <TouchableOpacity
            className="bg-sky-600 py-3 rounded-2xl items-center mt-4"
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text className="text-white text-sm font-extrabold">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const patient = specify.patient;
  const doctor = specify.doctor;
  const hospital = specify.hospital;
  const genomeTest = specify.genomeTest;
  const clinical = specify.patientClinical;

  const canForward = SPECIFY_INITIATION.includes((specify.specifyStatus || "").toLowerCase());

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-white border-b border-sky-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#0284C7" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-extrabold">Chi tiết phiếu xét nghiệm</Text>
            <Text className="mt-0.5 text-xs text-slate-500">Mã: {specify.specifyVoteID}</Text>
          </View>
          <View className="px-3 py-1.5 rounded-lg bg-sky-100">
            <Text className="text-xs font-bold text-sky-700">
              {getStatusLabel(specify.specifyStatus || "")}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-3 mt-4">
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/customer/specify-edit", params: { specifyId: specify.specifyVoteID } })}
            className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-sky-600"
            activeOpacity={0.85}
          >
            <Pencil size={18} color="#fff" />
            <Text className="text-sm font-bold text-white">Cập nhật</Text>
          </TouchableOpacity>
          {canForward && (
            <TouchableOpacity
              onPress={() => setForwardModalOpen(true)}
              className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-emerald-100 border border-emerald-200"
              activeOpacity={0.85}
            >
              <ArrowRight size={18} color="#059669" />
              <Text className="text-sm font-bold text-emerald-700">Chuyển tiếp</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Thông tin bệnh nhân" icon={User}>
          <InfoRow label="Họ tên" value={patient?.patientName} />
          <InfoRow label="Ngày sinh" value={patient?.patientDob ? formatDate(patient.patientDob) : undefined} />
          <InfoRow label="Số điện thoại" value={patient?.patientPhone} />
          <InfoRow label="Email" value={patient?.patientEmail} />
          <InfoRow label="Địa chỉ" value={patient?.patientAddress} />
        </Section>

        <Section title="Thông tin phiếu xét nghiệm" icon={FileText}>
          <InfoRow label="Loại dịch vụ" value={getServiceTypeLabel(specify.serviceType)} />
          <InfoRow label="Ngày lấy mẫu" value={specify.sampleCollectDate ? formatDate(specify.sampleCollectDate) : undefined} />
          <InfoRow label="Nơi lấy mẫu" value={specify.samplingSite} />
          {specify.embryoNumber != null && (
            <InfoRow label="Số phôi" value={String(specify.embryoNumber)} />
          )}
        </Section>

        <Section title="Thông tin xét nghiệm" icon={FlaskConical}>
          <InfoRow label="Tên xét nghiệm" value={genomeTest?.testName} />
          <InfoRow label="Mô tả" value={genomeTest?.testDescription} />
        </Section>

        <Section title="Bác sĩ chỉ định" icon={Stethoscope}>
          <InfoRow label="Bác sĩ" value={doctor?.doctorName} />
        </Section>

        <Section title="Bệnh viện" icon={Building2}>
          <InfoRow label="Bệnh viện" value={hospital?.hospitalName} />
        </Section>

        {clinical && (
          <Section title="Thông tin lâm sàng" icon={Heart}>
            <InfoRow label="Chiều cao (cm)" value={clinical.patientHeight?.toString()} />
            <InfoRow label="Cân nặng (kg)" value={clinical.patientWeight?.toString()} />
            <InfoRow label="Tiền sử bản thân" value={clinical.patientHistory} />
            <InfoRow label="Tiền sử gia đình" value={clinical.familyHistory} />
            <InfoRow label="Bệnh mãn tính" value={clinical.chronicDisease} />
            <InfoRow label="Bệnh lý cấp tính" value={clinical.acuteDisease} />
          </Section>
        )}

        {(specify.geneticTestResults || specify.geneticTestResultsRelationship) && (
          <Section title="Kết quả xét nghiệm di truyền trước đó" icon={FlaskConical}>
            {specify.geneticTestResults && (
              <View className="mb-3">
                <Text className="text-xs text-slate-500 font-medium mb-1">Kết quả (bản thân)</Text>
                <Text className="text-sm text-slate-800 leading-5">{specify.geneticTestResults}</Text>
              </View>
            )}
            {specify.geneticTestResultsRelationship && (
              <View>
                <Text className="text-xs text-slate-500 font-medium mb-1">Kết quả (người thân)</Text>
                <Text className="text-sm text-slate-800 leading-5">{specify.geneticTestResultsRelationship}</Text>
              </View>
            )}
          </Section>
        )}

        {specify.serviceType === "reproduction" && specify.reproductionService && (
          <Section title="Thông tin sinh sản" icon={FlaskConical}>
            <InfoRow label="Số thai" value={specify.reproductionService.fetusesNumber?.toString()} />
            <InfoRow label="Tuần/ngày thai" value={
              specify.reproductionService.fetusesWeek || specify.reproductionService.fetusesDay
                ? `${specify.reproductionService.fetusesWeek || 0} tuần ${specify.reproductionService.fetusesDay || 0} ngày`
                : undefined
            } />
            <InfoRow label="Ngày siêu âm" value={specify.reproductionService.ultrasoundDay ? formatDate(specify.reproductionService.ultrasoundDay) : undefined} />
            <InfoRow label="CRL (mm)" value={specify.reproductionService.headRumpLength?.toString()} />
            <InfoRow label="NT (mm)" value={specify.reproductionService.neckLength?.toString()} />
            {specify.reproductionService.combinedTestResult && (
              <View className="mt-3 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-500 font-medium mb-1">Kết quả xét nghiệm kết hợp</Text>
                <Text className="text-sm text-slate-800 leading-5">{specify.reproductionService.combinedTestResult}</Text>
              </View>
            )}
            {specify.reproductionService.ultrasoundResult && (
              <View className="mt-3 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-500 font-medium mb-1">Kết quả siêu âm</Text>
                <Text className="text-sm text-slate-800 leading-5">{specify.reproductionService.ultrasoundResult}</Text>
              </View>
            )}
          </Section>
        )}

        {specify.serviceType === "embryo" && specify.embryoService && (
          <Section title="Thông tin phôi thai" icon={FlaskConical}>
            <InfoRow label="Sinh thiết" value={specify.embryoService.biospy} />
            <InfoRow label="Ngày sinh thiết" value={specify.embryoService.biospyDate ? formatDate(specify.embryoService.biospyDate) : undefined} />
            <InfoRow label="Dung dịch chứa tế bào" value={specify.embryoService.cellContainingSolution} />
            <InfoRow label="Số phôi tạo" value={specify.embryoService.embryoCreate?.toString()} />
            <InfoRow label="Tình trạng phôi" value={specify.embryoService.embryoStatus} />
            {specify.embryoService.morphologicalAssessment && (
              <View className="mt-3 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-500 font-medium mb-1">Đánh giá hình thái</Text>
                <Text className="text-sm text-slate-800 leading-5">{specify.embryoService.morphologicalAssessment}</Text>
              </View>
            )}
          </Section>
        )}

        {specify.serviceType === "disease" && specify.diseaseService && (
          <Section title="Thông tin bệnh lý" icon={FlaskConical}>
            <InfoRow label="Thời gian điều trị" value={specify.diseaseService.treatmentTimeDay ? `${specify.diseaseService.treatmentTimeDay} ngày` : undefined} />
            <InfoRow label="Kháng thuốc" value={specify.diseaseService.drugResistance} />
            {specify.diseaseService.symptom && (
              <View className="mt-3 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-500 font-medium mb-1">Triệu chứng</Text>
                <Text className="text-sm text-slate-800 leading-5">{specify.diseaseService.symptom}</Text>
              </View>
            )}
            {specify.diseaseService.diagnose && (
              <View className="mt-3 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-500 font-medium mb-1">Chẩn đoán</Text>
                <Text className="text-sm text-slate-800 leading-5">{specify.diseaseService.diagnose}</Text>
              </View>
            )}
          </Section>
        )}

        {specify.specifyNote && (
          <Section title="Ghi chú" icon={FileText}>
            <Text className="text-sm text-slate-800 leading-5">{specify.specifyNote}</Text>
          </Section>
        )}
      </ScrollView>

      <ForwardTestModal
        visible={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        specifyData={specify ? { specifyVoteID: specify.specifyVoteID, fullSpecifyData: specify } : null}
        onSuccess={() => refetch()}
        onNavigateToPayment={(params) => {
          setForwardModalOpen(false);
          refetch();
          router.push({
            pathname: "/customer/payment",
            params: {
              orderId: params.orderId,
              orderName: params.orderName,
              amount: String(params.amount),
              specifyId: params.specifyId,
            },
          });
        }}
      />
    </SafeAreaView>
  );
}
