import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  FileText,
  CreditCard,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  Linking,
} from "react-native";

import { COLORS } from "@/constants/colors";
import { getOrderStatusLabel } from "@/lib/constants/order-status";
import { OrderResponse, orderService } from "@/services/orderService";
import { patientService, PatientResponse } from "@/services/patientService";
import { patientClinicalService, PatientClinicalResponse } from "@/services/patientClinicalService";
import { doctorService, DoctorResponse } from "@/services/doctorService";
import { genomeTestService, GenomeTestResponse } from "@/services/genomeTestService";

const isPendingUpdateStatus = (status?: string): boolean => {
  const s = (status || "").toLowerCase();
  return (
    s === "initiation" ||
    s === "accepted" ||
    s === "in_progress" ||
    s === "forward_analysis"
  );
};

const formatCurrency = (amount?: number): string => {
  if (!amount) return "0";
  return new Intl.NumberFormat("vi-VN").format(amount);
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
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

const getPaymentStatusLabel = (status?: string): string => {
  if (!status) return "Chưa xác định";
  const s = status.toUpperCase();
  const statusMap: Record<string, string> = {
    PENDING: "Chờ thanh toán",
    COMPLETED: "Đã thanh toán",
    FAILED: "Thanh toán thất bại",
    UNPAID: "Chưa thanh toán",
  };
  return statusMap[s] || status;
};

const getPaymentTypeLabel = (type?: string): string => {
  if (!type) return "Chưa xác định";
  const t = type.toUpperCase();
  const typeMap: Record<string, string> = {
    CASH: "Tiền mặt",
    ONLINE_PAYMENT: "Thanh toán online",
  };
  return typeMap[t] || type;
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleDownloadOrder = async (order: OrderResponse) => {
    try {
      const summaryLines = [
        `Đơn hàng #${order.orderId}`,
        order.orderName ? `Tên đơn: ${order.orderName}` : "",
        order.customerName ? `Khách hàng: ${order.customerName}` : "",
        order.paymentAmount !== undefined
          ? `Số tiền: ${formatCurrency(order.paymentAmount)} VNĐ`
          : "",
        order.orderStatus ? `Trạng thái: ${getOrderStatusLabel(order.orderStatus)}` : "",
      ].filter(Boolean);

      const message = summaryLines.join("\n");
      await Share.share({ message });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải / chia sẻ đơn hàng. Vui lòng thử lại.");
    }
  };

  const handleViewInvoice = async (order: OrderResponse) => {
    if (!order.invoiceLink) {
      Alert.alert("Thông báo", "Đơn hàng này chưa có hóa đơn.");
      return;
    }
    try {
      const supported = await Linking.canOpenURL(order.invoiceLink);
      if (!supported) {
        Alert.alert(
          "Lỗi",
          "Không thể mở hóa đơn trên thiết bị này. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
        );
        return;
      }
      await Linking.openURL(order.invoiceLink);
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi mở hóa đơn. Vui lòng thử lại sau.");
    }
  };

  const handleStartPayment = (order: OrderResponse) => {
    if (!order.paymentAmount || order.paymentAmount <= 0) {
      Alert.alert(
        "Không thể thanh toán",
        "Đơn hàng này chưa có thông tin số tiền cần thanh toán.",
      );
      return;
    }

    // Chỉ cho thanh toán nếu chưa hoàn tất
    if (order.paymentStatus && order.paymentStatus.toUpperCase() === "COMPLETED") {
      Alert.alert("Thông báo", "Đơn hàng này đã được thanh toán.");
      return;
    }

    router.push({
      pathname: "/payment",
      params: {
        orderId: order.orderId,
        orderName: order.orderName,
        amount: String(order.paymentAmount),
        specifyId: order.specifyId?.specifyVoteID,
      },
    } as any);
  };

  const {
    data: orderResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: !!orderId,
  });

  const patientId = orderResponse?.success ? orderResponse.data?.specifyId?.patientId : undefined;
  const doctorId = orderResponse?.success ? orderResponse.data?.specifyId?.doctorId : undefined;
  const genomeTestId = orderResponse?.success ? orderResponse.data?.specifyId?.genomeTestId : undefined;

  const { data: patientResponse } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => patientService.getById(patientId!),
    enabled: !!patientId,
  });

  const { data: patientClinicalResponse } = useQuery({
    queryKey: ["patient-clinical", patientId],
    queryFn: () => patientClinicalService.getByPatientId(patientId!),
    enabled: !!patientId,
  });

  const { data: doctorResponse } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => doctorService.getById(doctorId!),
    enabled: !!doctorId,
  });

  const { data: genomeTestResponse } = useQuery({
    queryKey: ["genome-test", genomeTestId],
    queryFn: () => genomeTestService.getById(genomeTestId!),
    enabled: !!genomeTestId,
  });

  const patient: PatientResponse | undefined = patientResponse?.success ? patientResponse.data : undefined;
  const patientClinical: PatientClinicalResponse | undefined = patientClinicalResponse?.success ? patientClinicalResponse.data : undefined;
  const doctor: DoctorResponse | undefined = doctorResponse?.success ? doctorResponse.data : undefined;
  const genomeTest: GenomeTestResponse | undefined = genomeTestResponse?.success ? genomeTestResponse.data : undefined;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await orderService.delete(orderId!);
      if (!response.success) {
        throw new Error(response.error || "Không thể xóa đơn hàng");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      Alert.alert("✅ Thành công", "Đơn hàng đã được xóa thành công!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      console.error("[OrderDetail] Delete error:", error);
      let errorMessage =
        error?.message ||
        error?.error ||
        "Không thể xóa đơn hàng. Vui lòng thử lại.";

      if (errorMessage.includes("not found")) {
        errorMessage = "Đơn hàng không tồn tại hoặc đã bị xóa.";
      } else if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (
        errorMessage.includes("403") ||
        errorMessage.includes("Forbidden")
      ) {
        errorMessage = "Bạn không có quyền xóa đơn hàng này.";
      } else if (
        errorMessage.includes("500") ||
        errorMessage.includes("Internal Server Error")
      ) {
        errorMessage =
          "Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
      }

      Alert.alert("Lỗi xóa đơn hàng", errorMessage);
    },
  });

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (error || !orderResponse?.success || !orderResponse.data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không thể tải thông tin đơn hàng</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const order: OrderResponse = orderResponse.data;

  const formatDateOnly = (dateString?: string | number): string => {
    if (!dateString) return "";
    try {
      const date = typeof dateString === 'number' ? new Date(dateString) : new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return String(dateString);
    }
  };

  const getGenderLabel = (gender?: string): string => {
    if (!gender) return "Chưa xác định";
    const g = gender.toLowerCase();
    if (g === "male" || g === "nam") return "Nam";
    if (g === "female" || g === "nữ") return "Nữ";
    if (g === "other" || g === "khác") return "Khác";
    return gender;
  };

  const getServiceTypeLabel = (serviceType?: string): string => {
    if (!serviceType) return "Chưa xác định";
    const st = serviceType.toLowerCase();
    if (st === "embryo") return "Phôi";
    if (st === "disease") return "Bệnh";
    if (st === "reproduction") return "Sinh sản";
    return serviceType;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              {/* Payment action when order has amount and is not paid */}
              {order.paymentAmount !== undefined &&
                order.paymentAmount > 0 &&
                (!order.paymentStatus ||
                  order.paymentStatus.toUpperCase() !== "COMPLETED") && (
                  <TouchableOpacity
                    onPress={() => handleStartPayment(order)}
                    style={styles.actionBtn}
                  >
                    <CreditCard size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                )}

              {/* Download / share order summary */}
              <TouchableOpacity
                onPress={() => handleDownloadOrder(order)}
                style={styles.actionBtn}
              >
                <Download size={20} color={COLORS.primary} />
              </TouchableOpacity>

              {/* View invoice only when paid and invoice link exists */}
              {order.paymentStatus &&
                order.paymentStatus.toUpperCase() === "COMPLETED" &&
                !!order.invoiceLink && (
                  <TouchableOpacity
                    onPress={() => handleViewInvoice(order)}
                    style={styles.actionBtn}
                  >
                    <FileText size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                )}

              {/* Delete order */}
              <TouchableOpacity
                onPress={handleDelete}
                style={[
                  styles.actionBtn,
                  deleteMutation.isPending && styles.actionBtnDisabled,
                ]}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color={COLORS.danger} />
                ) : (
                  <Trash2 size={20} color={COLORS.danger} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.orderId}>Mã đơn: {order.orderId}</Text>
          <Text style={styles.orderName}>{order.orderName}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {getOrderStatusLabel(order.orderStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đơn hàng:</Text>
            <Text style={styles.infoValue}>{order.orderId}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên đơn hàng:</Text>
            <Text style={styles.infoValue}>{order.orderName}</Text>
          </View>

          {order.customerName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Khách hàng:</Text>
              <Text style={styles.infoValue}>{order.customerName}</Text>
            </View>
          )}

          {order.sampleCollectorName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nhân viên thu mẫu:</Text>
              <Text style={styles.infoValue}>{order.sampleCollectorName}</Text>
            </View>
          )}

          {order.staffAnalystName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nhân viên phân tích:</Text>
              <Text style={styles.infoValue}>{order.staffAnalystName}</Text>
            </View>
          )}

          {order.barcodeId && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã Barcode:</Text>
              <Text style={styles.infoValue}>{order.barcodeId}</Text>
            </View>
          )}

          {order.orderNote && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ghi chú:</Text>
              <Text style={styles.infoValue}>{order.orderNote}</Text>
            </View>
          )}

          {order.createdAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày tạo:</Text>
              <Text style={styles.infoValue}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
          )}
        </View>

        {(order.paymentStatus || order.paymentType || order.paymentAmount || order.invoiceLink) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>

            {order.paymentStatus && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trạng thái thanh toán:</Text>
                <Text style={styles.infoValue}>
                  {getPaymentStatusLabel(order.paymentStatus)}
                </Text>
              </View>
            )}

            {order.paymentType && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hình thức thanh toán:</Text>
                <Text style={styles.infoValue}>
                  {getPaymentTypeLabel(order.paymentType)}
                </Text>
              </View>
            )}

            {order.paymentAmount !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số tiền:</Text>
                <Text style={[styles.infoValue, styles.amountText]}>
                  {formatCurrency(order.paymentAmount)} VNĐ
                </Text>
              </View>
            )}
            
            {order.invoiceLink && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hóa đơn:</Text>
                <Text style={styles.infoValue}>Đã phát hành</Text>
              </View>
            )}
          </View>
        )}

        {/* Thông tin người làm xét nghiệm */}
        {patient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin người làm xét nghiệm</Text>
            
            {patient.patientName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên:</Text>
                <Text style={styles.infoValue}>{patient.patientName}</Text>
              </View>
            )}

            {patient.patientPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số điện thoại:</Text>
                <Text style={styles.infoValue}>{patient.patientPhone}</Text>
              </View>
            )}

            {patient.gender && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Giới tính:</Text>
                <Text style={styles.infoValue}>{getGenderLabel(patient.gender)}</Text>
              </View>
            )}

            {patient.patientDob && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày sinh:</Text>
                <Text style={styles.infoValue}>
                  {formatDateOnly(patient.patientDob)}
                </Text>
              </View>
            )}

            {patient.patientEmail && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{patient.patientEmail}</Text>
              </View>
            )}

            {patient.patientAddress && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ:</Text>
                <Text style={styles.infoValue}>{patient.patientAddress}</Text>
              </View>
            )}

            {patient.patientJob && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nghề nghiệp:</Text>
                <Text style={styles.infoValue}>{patient.patientJob}</Text>
              </View>
            )}

            {patient.patientContactName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Người liên hệ:</Text>
                <Text style={styles.infoValue}>{patient.patientContactName}</Text>
              </View>
            )}

            {patient.patientContactPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SĐT người liên hệ:</Text>
                <Text style={styles.infoValue}>{patient.patientContactPhone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Thông tin xét nghiệm */}
        {genomeTest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin xét nghiệm</Text>
            
            {genomeTest.testId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã xét nghiệm:</Text>
                <Text style={styles.infoValue}>{genomeTest.testId}</Text>
              </View>
            )}

            {genomeTest.testName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên xét nghiệm:</Text>
                <Text style={styles.infoValue}>{genomeTest.testName}</Text>
              </View>
            )}

            {genomeTest.testDescription && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mô tả:</Text>
                <Text style={styles.infoValue}>{genomeTest.testDescription}</Text>
              </View>
            )}

            {genomeTest.testSample && Array.isArray(genomeTest.testSample) && genomeTest.testSample.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mẫu xét nghiệm:</Text>
                <Text style={styles.infoValue}>{genomeTest.testSample.join(", ")}</Text>
              </View>
            )}

            {genomeTest.price && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Giá:</Text>
                <Text style={[styles.infoValue, styles.amountText]}>
                  {formatCurrency(genomeTest.price)} VNĐ
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Thông tin lâm sàng */}
        {patientClinical && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin lâm sàng</Text>
            
            {patientClinical.patientHeight && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Chiều cao (cm):</Text>
                <Text style={styles.infoValue}>{patientClinical.patientHeight}</Text>
              </View>
            )}

            {patientClinical.patientWeight && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cân nặng (kg):</Text>
                <Text style={styles.infoValue}>{patientClinical.patientWeight}</Text>
              </View>
            )}

            {patientClinical.patientHistory && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiền sử bệnh nhân:</Text>
                <Text style={styles.infoValue}>{patientClinical.patientHistory}</Text>
              </View>
            )}

            {patientClinical.familyHistory && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiền sử gia đình:</Text>
                <Text style={styles.infoValue}>{patientClinical.familyHistory}</Text>
              </View>
            )}

            {patientClinical.toxicExposure && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiếp xúc độc tố:</Text>
                <Text style={styles.infoValue}>{patientClinical.toxicExposure}</Text>
              </View>
            )}

            {patientClinical.medicalHistory && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiền sử y tế:</Text>
                <Text style={styles.infoValue}>{patientClinical.medicalHistory}</Text>
              </View>
            )}

            {patientClinical.chronicDisease && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bệnh mãn tính:</Text>
                <Text style={styles.infoValue}>{patientClinical.chronicDisease}</Text>
              </View>
            )}

            {patientClinical.acuteDisease && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bệnh cấp tính:</Text>
                <Text style={styles.infoValue}>{patientClinical.acuteDisease}</Text>
              </View>
            )}

            {patientClinical.medicalUsing && Array.isArray(patientClinical.medicalUsing) && patientClinical.medicalUsing.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thuốc đang sử dụng:</Text>
                <Text style={styles.infoValue}>{patientClinical.medicalUsing.join(", ")}</Text>
              </View>
            )}
          </View>
        )}

        {/* Nhóm xét nghiệm */}
        {order.specifyId?.serviceType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nhóm xét nghiệm</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nhóm xét nghiệm:</Text>
              <Text style={styles.infoValue}>
                {getServiceTypeLabel(order.specifyId.serviceType)}
              </Text>
            </View>

            {order.specifyId.serviceID && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã dịch vụ:</Text>
                <Text style={styles.infoValue}>{order.specifyId.serviceID}</Text>
              </View>
            )}
          </View>
        )}

        {/* Thanh toán & mẫu xét nghiệm - bổ sung thêm thông tin */}
        {(order.specifyId?.samplingSite || order.specifyId?.sampleCollectDate || order.specifyId?.embryoNumber || order.specifyVoteImagePath) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mẫu xét nghiệm</Text>

            {order.specifyId?.samplingSite && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa điểm lấy mẫu:</Text>
                <Text style={styles.infoValue}>{order.specifyId.samplingSite}</Text>
              </View>
            )}

            {order.specifyId?.sampleCollectDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày lấy mẫu:</Text>
                <Text style={styles.infoValue}>
                  {formatDateOnly(order.specifyId.sampleCollectDate)}
                </Text>
              </View>
            )}

            {order.specifyId?.embryoNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số phôi:</Text>
                <Text style={styles.infoValue}>{order.specifyId.embryoNumber}</Text>
              </View>
            )}

            {order.specifyVoteImagePath && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Đường dẫn ảnh phiếu chỉ định:</Text>
                <Text style={[styles.infoValue, styles.linkText]}>
                  {order.specifyVoteImagePath}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Kết quả xét nghiệm di truyền */}
        {(order.specifyId?.geneticTestResults || order.specifyId?.geneticTestResultsRelationship) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kết quả xét nghiệm di truyền</Text>
            
            {order.specifyId.geneticTestResults && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kết quả xét nghiệm di truyền:</Text>
                <Text style={styles.infoValue}>{order.specifyId.geneticTestResults}</Text>
              </View>
            )}

            {order.specifyId.geneticTestResultsRelationship && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mối quan hệ:</Text>
                <Text style={styles.infoValue}>
                  {order.specifyId.geneticTestResultsRelationship}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bổ sung thông tin bác sĩ vào phần thông tin đơn hàng */}
        {doctor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin bác sĩ</Text>
            
            {doctor.doctorName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên bác sĩ:</Text>
                <Text style={styles.infoValue}>{doctor.doctorName}</Text>
              </View>
            )}

            {doctor.doctorPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số điện thoại:</Text>
                <Text style={styles.infoValue}>{doctor.doctorPhone}</Text>
              </View>
            )}

            {doctor.doctorEmail && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{doctor.doctorEmail}</Text>
              </View>
            )}
          </View>
        )}

        {order.patientMetadata && order.patientMetadata.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Thông tin mẫu (
              {order.patientMetadataCount || order.patientMetadata.length})
            </Text>
            {order.patientMetadata.map((pm, index) => (
              <View key={pm.labcode || index} style={styles.metadataCard}>
                <Text style={styles.metadataLabel}>Mã Lab: {pm.labcode}</Text>
                {pm.sampleName && (
                  <Text style={styles.metadataText}>
                    Tên mẫu: {pm.sampleName}
                  </Text>
                )}
                {pm.patientId && (
                  <Text style={styles.metadataText}>
                    Mã bệnh nhân: {pm.patientId}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        {order.jobCount !== undefined && order.jobCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Công việc ({order.jobCount})
            </Text>
            {order.jobIds && order.jobIds.length > 0 && (
              <View style={styles.jobList}>
                {order.jobIds.map((jobId) => (
                  <Text key={jobId} style={styles.jobId}>
                    {jobId}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        {order.specifyId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phiếu chỉ định</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã phiếu:</Text>
              <Text style={styles.infoValue}>
                {order.specifyId.specifyVoteID}
              </Text>
            </View>
            {order.specifyId.patientId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã bệnh nhân:</Text>
                <Text style={styles.infoValue}>
                  {order.specifyId.patientId}
                </Text>
              </View>
            )}
            {order.specifyId.genomeTestId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã xét nghiệm:</Text>
                <Text style={styles.infoValue}>
                  {order.specifyId.genomeTestId}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <AlertTriangle size={32} color={COLORS.danger} />
              </View>
              <Text style={styles.modalTitle}>Xác nhận xóa</Text>
              <Text style={styles.modalMessage}>
                Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể
                hoàn tác.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonDeleteText}>Xóa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View
                style={[styles.modalIconContainer, styles.modalIconSuccess]}
              >
                <Text style={styles.modalSuccessIcon}>✓</Text>
              </View>
              <Text style={styles.modalTitle}>Thành công</Text>
              <Text style={styles.modalMessage}>
                Đơn hàng đã được xóa thành công!
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.back();
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, styles.modalIconError]}>
                <AlertTriangle size={32} color={COLORS.danger} />
              </View>
              <Text style={styles.modalTitle}>Lỗi xóa đơn hàng</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.sub,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  updateBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  orderId: {
    fontSize: 13,
    color: COLORS.sub,
    fontWeight: "600",
    marginBottom: 4,
  },
  orderName: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.sub,
    fontWeight: "600",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  amountText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  metadataCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 13,
    color: COLORS.sub,
    marginTop: 4,
  },
  jobList: {
    gap: 8,
  },
  jobId: {
    fontSize: 13,
    color: COLORS.sub,
    padding: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    padding: 24,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalIconSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  modalIconError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  modalSuccessIcon: {
    fontSize: 40,
    color: COLORS.success,
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.sub,
    textAlign: "center",
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.sub,
  },
  modalButtonDelete: {
    backgroundColor: COLORS.danger,
  },
  modalButtonDeleteText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
