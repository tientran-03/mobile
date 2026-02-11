import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  FlaskConical,
  Hospital,
  MapPin,
  Package,
  Phone,
  Stethoscope,
  User,
  Trash2,
  Edit,
  Wallet,
  Building2,
  TestTube,
  ClipboardList,
  Hash,
  Mail,
  Briefcase,
  Users,
  Heart,
  Activity,
  AlertTriangle,
  Pill,
  BadgeCheck,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmModal, SuccessModal } from "@/components/modals";
import { COLORS } from "@/constants/colors";
import { OrderResponse, orderService } from "@/services/orderService";

// Helper function to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Status badge component
const StatusBadge = ({
  status,
  type = "order",
}: {
  status?: string;
  type?: "order" | "payment";
}) => {
  const getStatusConfig = () => {
    if (!status) return { label: "-", bgColor: COLORS.muted, textColor: "#fff" };

    const s = status.toUpperCase();
    if (type === "payment") {
      switch (s) {
        case "COMPLETED":
          return { label: "Đã thanh toán", bgColor: COLORS.success, textColor: "#fff" };
        case "PENDING":
          return { label: "Chờ thanh toán", bgColor: COLORS.warning, textColor: "#fff" };
        case "FAILED":
          return { label: "Thất bại", bgColor: COLORS.danger, textColor: "#fff" };
        case "UNPAID":
          return { label: "Chưa thanh toán", bgColor: COLORS.muted, textColor: "#fff" };
        default:
          return { label: status, bgColor: COLORS.muted, textColor: "#fff" };
      }
    }

    // Order status
    switch (s) {
      case "INITIATION":
        return { label: "Khởi tạo", bgColor: COLORS.info, textColor: "#fff" };
      case "FORWARD_ANALYSIS":
        return { label: "Chuyển tiếp phân tích", bgColor: COLORS.primary, textColor: "#fff" };
      case "ACCEPTED":
        return { label: "Chấp nhận", bgColor: COLORS.success, textColor: "#fff" };
      case "REJECTED":
        return { label: "Từ chối", bgColor: COLORS.danger, textColor: "#fff" };
      case "IN_PROGRESS":
        return { label: "Đang xử lý", bgColor: COLORS.warning, textColor: "#fff" };
      case "SAMPLE_ERROR":
        return { label: "Mẫu lỗi", bgColor: COLORS.danger, textColor: "#fff" };
      case "COMPLETED":
        return { label: "Hoàn thành", bgColor: COLORS.success, textColor: "#fff" };
      default:
        return { label: status, bgColor: COLORS.muted, textColor: "#fff" };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.badgeText, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
};

// Payment type label
const getPaymentTypeLabel = (type?: string) => {
  if (!type) return "-";
  switch (type.toUpperCase()) {
    case "CASH":
      return "Tiền mặt";
    case "ONLINE_PAYMENT":
      return "Chuyển khoản";
    default:
      return type;
  }
};

// Section component
const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

// Info row component
const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
}) => {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoRow}>
      {icon && <View style={styles.infoIcon}>{icon}</View>}
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch order details
  const {
    data: orderResponse,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: !!orderId,
    retry: false,
  });

  const order = orderResponse?.success ? (orderResponse.data as OrderResponse) : null;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => orderService.delete(orderId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSuccessMessage("Xóa đơn hàng thành công!");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      Alert.alert("Lỗi", error?.message || "Không thể xóa đơn hàng");
    },
  });

  const handleDelete = () => {
    setShowDeleteModal(false);
    deleteMutation.mutate();
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.replace("/orders");
  };

  const handlePayment = () => {
    if (order && order.paymentAmount) {
      router.push({
        pathname: "/payment",
        params: {
          orderId: order.orderId,
          amount: order.paymentAmount.toString(),
          orderName: order.orderName,
        },
      });
    }
  };

  // Extract data from order
  const specify = order?.specifyId;
  const patient = (specify as any)?.patient;
  const doctor = (specify as any)?.doctor;
  const hospital = (specify as any)?.hospital;
  const genomeTest = (specify as any)?.genomeTest;
  const clinical = (specify as any)?.patientClinical;
  const patientMetadata = order?.patientMetadata;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <View style={styles.errorContainer}>
          <FileText size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={18} color={COLORS.primary} />
            <Text style={styles.backButtonText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <Text style={styles.headerSubtitle}>#{order.orderId}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() =>
              router.push({
                pathname: "/update-order",
                params: { orderId: order.orderId },
              })
            }
          >
            <Edit size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Trạng thái đơn hàng</Text>
              <StatusBadge status={order.orderStatus} type="order" />
            </View>
            <View style={styles.statusDivider} />
            <View>
              <Text style={styles.statusLabel}>Thanh toán</Text>
              <StatusBadge status={order.paymentStatus} type="payment" />
            </View>
          </View>
        </View>

        {/* Order Information */}
        <Section
          title="Thông tin đơn hàng"
          icon={<Package size={20} color={COLORS.primary} />}
        >
          <InfoRow
            label="Mã đơn hàng"
            value={order.orderId}
            icon={<Hash size={16} color={COLORS.muted} />}
          />
          <InfoRow
            label="Tên đơn hàng"
            value={order.orderName}
            icon={<FileText size={16} color={COLORS.muted} />}
          />
          <InfoRow
            label="Ngày tạo"
            value={formatDateTime(order.createdAt)}
            icon={<Calendar size={16} color={COLORS.muted} />}
          />
          <InfoRow
            label="Mã vạch"
            value={order.barcodeId}
            icon={<Hash size={16} color={COLORS.muted} />}
          />
          {order.orderNote && (
            <InfoRow
              label="Ghi chú"
              value={order.orderNote}
              icon={<ClipboardList size={16} color={COLORS.muted} />}
            />
          )}
        </Section>

        {/* Payment Information */}
        <Section
          title="Thông tin thanh toán"
          icon={<CreditCard size={20} color={COLORS.primary} />}
        >
          <InfoRow
            label="Phương thức"
            value={getPaymentTypeLabel(order.paymentType)}
            icon={<Wallet size={16} color={COLORS.muted} />}
          />
          <InfoRow
            label="Số tiền"
            value={formatCurrency(order.paymentAmount)}
            icon={<CreditCard size={16} color={COLORS.muted} />}
          />

          {/* Payment button for pending online payments */}
          {order.paymentType?.toUpperCase() === "ONLINE_PAYMENT" &&
            order.paymentStatus?.toUpperCase() !== "COMPLETED" &&
            order.paymentAmount && (
              <TouchableOpacity style={styles.paymentButton} onPress={handlePayment}>
                <CreditCard size={18} color="#fff" />
                <Text style={styles.paymentButtonText}>Thanh toán ngay</Text>
              </TouchableOpacity>
            )}
        </Section>

        {/* Staff Information */}
        <Section
          title="Nhân viên phụ trách"
          icon={<Users size={20} color={COLORS.primary} />}
        >
          <InfoRow
            label="Khách hàng"
            value={order.customerName || order.customerId}
            icon={<User size={16} color={COLORS.muted} />}
          />
          <InfoRow
            label="Người thu mẫu"
            value={order.sampleCollectorName || order.sampleCollectorId}
            icon={<TestTube size={16} color={COLORS.muted} />}
          />
          <InfoRow
            label="Nhân viên phân tích"
            value={order.staffAnalystName || order.staffAnalystId}
            icon={<FlaskConical size={16} color={COLORS.muted} />}
          />
        </Section>

        {/* Patient Information */}
        {patient && (
          <Section
            title="Thông tin bệnh nhân"
            icon={<User size={20} color={COLORS.primary} />}
          >
            <InfoRow
              label="Mã bệnh nhân"
              value={patient.patientId}
              icon={<Hash size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Họ tên"
              value={patient.patientName}
              icon={<User size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Ngày sinh"
              value={formatDate(patient.patientDob)}
              icon={<Calendar size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Giới tính"
              value={patient.gender === "MALE" ? "Nam" : patient.gender === "FEMALE" ? "Nữ" : patient.gender}
              icon={<User size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Số điện thoại"
              value={patient.patientPhone}
              icon={<Phone size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Email"
              value={patient.patientEmail}
              icon={<Mail size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Địa chỉ"
              value={patient.patientAddress}
              icon={<MapPin size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Nghề nghiệp"
              value={patient.patientJob}
              icon={<Briefcase size={16} color={COLORS.muted} />}
            />
          </Section>
        )}

        {/* Doctor Information */}
        {doctor && (
          <Section
            title="Thông tin bác sĩ"
            icon={<Stethoscope size={20} color={COLORS.primary} />}
          >
            <InfoRow
              label="Họ tên"
              value={doctor.doctorName}
              icon={<User size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Số điện thoại"
              value={doctor.doctorPhone}
              icon={<Phone size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Email"
              value={doctor.doctorEmail}
              icon={<Mail size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Chuyên khoa"
              value={doctor.doctorSpecialized}
              icon={<Stethoscope size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Học vị"
              value={doctor.doctorDegree}
              icon={<BadgeCheck size={16} color={COLORS.muted} />}
            />
          </Section>
        )}

        {/* Hospital Information */}
        {hospital && (
          <Section
            title="Thông tin bệnh viện"
            icon={<Hospital size={20} color={COLORS.primary} />}
          >
            <InfoRow
              label="Tên bệnh viện"
              value={hospital.hospitalName}
              icon={<Building2 size={16} color={COLORS.muted} />}
            />
          </Section>
        )}

        {/* Genome Test Information */}
        {genomeTest && (
          <Section
            title="Thông tin xét nghiệm"
            icon={<FlaskConical size={20} color={COLORS.primary} />}
          >
            <InfoRow
              label="Mã xét nghiệm"
              value={genomeTest.testId}
              icon={<Hash size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Tên xét nghiệm"
              value={genomeTest.testName}
              icon={<FlaskConical size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Mô tả"
              value={genomeTest.testDescription}
              icon={<FileText size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Loại mẫu"
              value={genomeTest.testSample}
              icon={<TestTube size={16} color={COLORS.muted} />}
            />
          </Section>
        )}

        {/* Specify Information */}
        {specify && (
          <Section
            title="Thông tin phiếu chỉ định"
            icon={<ClipboardList size={20} color={COLORS.primary} />}
          >
            <InfoRow
              label="Mã phiếu"
              value={specify.specifyVoteID}
              icon={<Hash size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Loại dịch vụ"
              value={specify.serviceType}
              icon={<Package size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Vị trí lấy mẫu"
              value={specify.samplingSite}
              icon={<MapPin size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Ngày lấy mẫu"
              value={formatDate(specify.sampleCollectDate)}
              icon={<Calendar size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Số phôi"
              value={specify.embryoNumber}
              icon={<Heart size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Trạng thái"
              value={specify.specifyStatus}
              icon={<Activity size={16} color={COLORS.muted} />}
            />
            {specify.specifyNote && (
              <InfoRow
                label="Ghi chú"
                value={specify.specifyNote}
                icon={<ClipboardList size={16} color={COLORS.muted} />}
              />
            )}
          </Section>
        )}

        {/* Clinical Information */}
        {clinical && (
          <Section
            title="Thông tin lâm sàng"
            icon={<Activity size={20} color={COLORS.primary} />}
          >
            <InfoRow
              label="Chiều cao"
              value={clinical.patientHeight ? `${clinical.patientHeight} cm` : null}
              icon={<Activity size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Cân nặng"
              value={clinical.patientWeight ? `${clinical.patientWeight} kg` : null}
              icon={<Activity size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Tiền sử bệnh"
              value={clinical.patientHistory}
              icon={<FileText size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Tiền sử gia đình"
              value={clinical.familyHistory}
              icon={<Users size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Bệnh mãn tính"
              value={clinical.chronicDisease}
              icon={<AlertTriangle size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Bệnh cấp tính"
              value={clinical.acuteDisease}
              icon={<AlertTriangle size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Thuốc đang dùng"
              value={clinical.medicalUsing}
              icon={<Pill size={16} color={COLORS.muted} />}
            />
            <InfoRow
              label="Tiếp xúc độc hại"
              value={clinical.toxicExposure}
              icon={<AlertTriangle size={16} color={COLORS.muted} />}
            />
          </Section>
        )}

        {/* Patient Metadata */}
        {patientMetadata && patientMetadata.length > 0 && (
          <Section
            title={`Thông tin mẫu (${patientMetadata.length})`}
            icon={<TestTube size={20} color={COLORS.primary} />}
          >
            {patientMetadata.map((meta, index) => (
              <View key={index} style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Mẫu #{index + 1}</Text>
                <InfoRow
                  label="Labcode"
                  value={meta.labcode}
                  icon={<Hash size={16} color={COLORS.muted} />}
                />
                {meta.sampleName && (
                  <InfoRow
                    label="Tên mẫu"
                    value={meta.sampleName}
                    icon={<TestTube size={16} color={COLORS.muted} />}
                  />
                )}
                {meta.status && (
                  <InfoRow
                    label="Trạng thái"
                    value={meta.status}
                    icon={<Activity size={16} color={COLORS.muted} />}
                  />
                )}
              </View>
            ))}
          </Section>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() =>
              router.push({
                pathname: "/update-order",
                params: { orderId: order.orderId },
              })
            }
          >
            <Edit size={18} color={COLORS.primary} />
            <Text style={styles.editButtonText}>Chỉnh sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => setShowDeleteModal(true)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <Trash2 size={18} color={COLORS.danger} />
                <Text style={styles.deleteButtonText}>Xóa đơn</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa đơn hàng #${order.orderId} không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        destructive
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={handleSuccessClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  statusDivider: {
    width: 1,
    height: 50,
    backgroundColor: COLORS.border,
    marginHorizontal: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionContent: {
    padding: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 12,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  metadataItem: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.danger,
  },
  bottomPadding: {
    height: 40,
  },
});
