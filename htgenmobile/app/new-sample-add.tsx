import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  FileEdit,
  FileText,
  FlaskConical,
  Hash,
  Search,
  Trash2,
  User,
  X
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";
import { OrderResponse, orderService } from "@/services/orderService";
import { PatientResponse, patientService } from "@/services/patientService";
import { sampleAddService } from "@/services/sampleAddService";

interface FormData {
  sampleName: string;
  orderId: string;
  patientId: string;
  specifyId: string;
  note: string;
}

type DropdownOption = {
  label: string;
  value: string;
};

export default function NewSampleAddScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    sampleName: "",
    orderId: "",
    patientId: "",
    specifyId: "",
    note: "",
  });

  const [focusKey, setFocusKey] = useState<
    "sampleName" | "specifyId" | "note" | null
  >(null);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: ordersResponse } = useQuery({
    queryKey: ["orders"],
    queryFn: () => orderService.getAll(),
    retry: false,
  });

  const { data: patientsResponse } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientService.getAll(),
    retry: false,
  });

  const orders = ordersResponse?.success
    ? ((ordersResponse.data as OrderResponse[]) || [])
    : [];
  const patients = patientsResponse?.success
    ? ((patientsResponse.data as PatientResponse[]) || [])
    : [];

  const orderOptions: DropdownOption[] = useMemo(
    () =>
      orders.map((o) => ({
        value: o.orderId,
        label: `${o.orderName} (${o.orderId})`,
      })),
    [orders]
  );

  const patientOptions: DropdownOption[] = useMemo(
    () =>
      patients.map((p) => ({
        value: p.patientId,
        label: `${p.name} (${p.patientId})`,
      })),
    [patients]
  );

  const createSampleAddMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await sampleAddService.create(data);
      if (!response.success) {
        throw new Error(response.error || "Không thể tạo mẫu bổ sung");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-adds"] });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      let message =
        error?.message || error?.error || "Không thể tạo mẫu bổ sung. Vui lòng thử lại.";

      if (message.includes("already exists")) {
        message = "Tên mẫu đã tồn tại. Vui lòng chọn tên khác.";
      } else if (message.includes("not found")) {
        if (message.includes("Order")) {
          message = "Đơn hàng không tồn tại. Vui lòng chọn lại đơn hàng.";
        } else if (message.includes("Patient")) {
          message = "Bệnh nhân không tồn tại. Vui lòng chọn lại bệnh nhân.";
        }
      } else if (message.includes("500") || message.includes("Internal Server Error")) {
        message = "Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
      }

      setErrorMessage(message);
      setShowErrorModal(true);
    },
  });

  const handleSubmit = () => {
    if (!formData.sampleName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên mẫu");
      return;
    }

    const payload: any = {
      sampleName: formData.sampleName.trim(),
    };

    if (formData.orderId?.trim()) payload.orderId = formData.orderId.trim();
    if (formData.patientId?.trim()) payload.patientId = formData.patientId.trim();
    if (formData.specifyId?.trim()) payload.specifyId = formData.specifyId.trim();
    if (formData.note?.trim()) payload.note = formData.note.trim();

    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === "string" && value.trim() === "") return false;
        return true;
      })
    );

    createSampleAddMutation.mutate(cleanPayload);
  };

  const getSelectedLabel = (options: DropdownOption[], value: string, placeholder: string) => {
    const found = options.find((x) => x.value === value);
    return found?.label ?? placeholder;
  };

  const DropdownSheet = ({
    visible,
    onClose,
    title,
    options,
    selectedValue,
    onSelect,
    onClear,
    placeholderSearch = "Tìm kiếm...",
  }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: DropdownOption[];
    selectedValue: string;
    onSelect: (value: string) => void;
    onClear?: () => void;
    placeholderSearch?: string;
  }) => {
    const [q, setQ] = useState("");

    const filtered = useMemo(() => {
      const query = q.trim().toLowerCase();
      if (!query) return options;
      return options.filter((x) => x.label.toLowerCase().includes(query));
    }, [q, options]);

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{title}</Text>
                <Text style={styles.sheetSub}>
                  {options.length} mục • {filtered.length} hiển thị
                </Text>
              </View>

              {onClear && !!selectedValue && (
                <TouchableOpacity
                  style={styles.sheetClearBtn}
                  onPress={() => {
                    onClear();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Trash2 size={18} color={COLORS.sub} />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose} activeOpacity={0.8}>
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <Search size={18} color={COLORS.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={placeholderSearch}
                placeholderTextColor={COLORS.muted}
                style={styles.searchInput}
              />
              {!!q && (
                <TouchableOpacity onPress={() => setQ("")} style={styles.searchClear} activeOpacity={0.8}>
                  <X size={18} color={COLORS.sub} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>Không tìm thấy</Text>
                  <Text style={styles.emptySub}>Thử từ khóa khác nhé.</Text>
                </View>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                      onPress={() => {
                        onSelect(item.value);
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sheetItemText, isSelected && styles.sheetItemTextSelected]}>
                        {item.label}
                      </Text>
                      {isSelected ? (
                        <View style={styles.checkPill}>
                          <Check size={16} color="#fff" />
                        </View>
                      ) : (
                        <ChevronDown size={18} color={COLORS.muted} style={{ transform: [{ rotate: "-90deg" }] }} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={{ height: 14 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const FieldCard = ({
    icon,
    label,
    required,
    children,
    hint,
  }: {
    icon: React.ReactNode;
    label: React.ReactNode;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldIcon}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>
            {label} {required ? <Text style={styles.required}>*</Text> : null}
          </Text>
          {!!hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIcon}>
              <FileEdit size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Thông tin mẫu bổ sung</Text>
              <Text style={styles.heroText}>
                Tên mẫu là bắt buộc. Bạn có thể gắn đơn hàng / bệnh nhân để quản lý dễ hơn.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.form}>
          <FieldCard
            icon={<FlaskConical size={18} color={COLORS.primary} />}
            label="Tên mẫu"
            required
            hint="Ví dụ: Mẫu máu lần 2 / Mẫu mô bổ sung..."
          >
            <TextInput
              style={[
                styles.input,
                focusKey === "sampleName" && styles.inputFocused,
              ]}
              placeholder="Nhập tên mẫu"
              placeholderTextColor={COLORS.muted}
              value={formData.sampleName}
              onFocus={() => setFocusKey("sampleName")}
              onBlur={() => setFocusKey(null)}
              onChangeText={(text) => setFormData({ ...formData, sampleName: text })}
              returnKeyType="next"
            />
          </FieldCard>

          <FieldCard icon={<FileText size={18} color={COLORS.primary} />} label="Đơn hàng" hint="Tùy chọn">
            <TouchableOpacity
              style={[styles.dropdown, !!formData.orderId && styles.dropdownHasValue]}
              onPress={() => setShowOrderModal(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.dropdownText, !formData.orderId && styles.dropdownPlaceholder]}>
                {getSelectedLabel(orderOptions, formData.orderId, "Chọn đơn hàng")}
              </Text>
              <ChevronDown size={20} color={COLORS.sub} />
            </TouchableOpacity>
          </FieldCard>

          <FieldCard icon={<User size={18} color={COLORS.primary} />} label="Bệnh nhân" hint="Tùy chọn">
            <TouchableOpacity
              style={[styles.dropdown, !!formData.patientId && styles.dropdownHasValue]}
              onPress={() => setShowPatientModal(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.dropdownText, !formData.patientId && styles.dropdownPlaceholder]}>
                {getSelectedLabel(patientOptions, formData.patientId, "Chọn bệnh nhân")}
              </Text>
              <ChevronDown size={20} color={COLORS.sub} />
            </TouchableOpacity>
          </FieldCard>

          <FieldCard icon={<Hash size={18} color={COLORS.primary} />} label="Mã chỉ định (Specify ID)" hint="Tùy chọn">
            <TextInput
              style={[
                styles.input,
                focusKey === "specifyId" && styles.inputFocused,
              ]}
              placeholder="Nhập mã chỉ định"
              placeholderTextColor={COLORS.muted}
              value={formData.specifyId}
              onFocus={() => setFocusKey("specifyId")}
              onBlur={() => setFocusKey(null)}
              onChangeText={(text) => setFormData({ ...formData, specifyId: text })}
            />
          </FieldCard>

          <FieldCard icon={<FileEdit size={18} color={COLORS.primary} />} label="Ghi chú" hint="Tùy chọn">
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                focusKey === "note" && styles.inputFocused,
              ]}
              placeholder="Nhập ghi chú..."
              placeholderTextColor={COLORS.muted}
              value={formData.note}
              onFocus={() => setFocusKey("note")}
              onBlur={() => setFocusKey(null)}
              onChangeText={(text) => setFormData({ ...formData, note: text })}
              multiline
              numberOfLines={4}
            />
          </FieldCard>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <LinearGradient
          colors={["rgba(255,255,255,0.00)", "rgba(255,255,255,1)"]}
          style={styles.footerFade}
        />
        <View style={styles.footerInner}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSubmit}
            disabled={createSampleAddMutation.isPending}
            activeOpacity={0.85}
          >
            {createSampleAddMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Tạo mẫu</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <DropdownSheet
        visible={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="Chọn đơn hàng"
        options={orderOptions}
        selectedValue={formData.orderId}
        onSelect={(value) => setFormData({ ...formData, orderId: value })}
        onClear={() => setFormData({ ...formData, orderId: "" })}
        placeholderSearch="Tìm đơn hàng theo tên / mã..."
      />

      <DropdownSheet
        visible={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        title="Chọn bệnh nhân"
        options={patientOptions}
        selectedValue={formData.patientId}
        onSelect={(value) => setFormData({ ...formData, patientId: value })}
        onClear={() => setFormData({ ...formData, patientId: "" })}
        placeholderSearch="Tìm bệnh nhân theo tên / mã..."
      />

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
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, styles.modalIconSuccess]}>
                <Check size={28} color={COLORS.success} />
              </View>
              <Text style={styles.modalTitle}>Thành công</Text>
              <Text style={styles.modalMessage}>Mẫu bổ sung đã được tạo thành công!</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.back();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnPrimaryText}>OK</Text>
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, styles.modalIconError]}>
                <X size={26} color={COLORS.danger} />
              </View>
              <Text style={styles.modalTitle}>Lỗi</Text>
              <Text style={styles.modalMessage}>{errorMessage}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => setShowErrorModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnPrimaryText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  headerGradient: {
    paddingTop: 16,
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    justifyContent: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },

  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 0 },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 2,
  },
  heroText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.sub,
    lineHeight: 18,
  },

  form: { gap: 14 },

  fieldCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  required: { color: COLORS.danger },
  hint: { marginTop: 2, fontSize: 12, color: COLORS.muted, fontWeight: "600" },

  input: {
    backgroundColor: "#FBFCFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, android: 12, default: 12 }),
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "700",
    minHeight: 50,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 14,
  },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FBFCFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 50,
  },
  dropdownHasValue: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dropdownText: { flex: 1, fontSize: 14.5, color: COLORS.text, fontWeight: "800" },
  dropdownPlaceholder: { color: COLORS.muted, fontWeight: "700" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 10,
    backgroundColor: "transparent",
  },
  footerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
  },
  footerInner: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { fontSize: 15, fontWeight: "900", color: COLORS.sub },
  saveButton: { backgroundColor: COLORS.primary },
  saveButtonText: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 0.3 },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 10,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  sheetSub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: COLORS.muted },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetClearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    paddingVertical: 0,
  },
  searchClear: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F7",
  },

  sheetList: { marginTop: 10 },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  sheetItemSelected: { backgroundColor: "rgba(8,145,178,0.08)" },
  sheetItemText: { flex: 1, fontSize: 14, fontWeight: "800", color: COLORS.text },
  sheetItemTextSelected: { color: COLORS.primary },
  checkPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyBox: { padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  emptySub: { marginTop: 6, fontSize: 12, fontWeight: "700", color: COLORS.muted },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 14,
  },
  modalHeader: { padding: 22, alignItems: "center" },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalIconSuccess: { backgroundColor: "rgba(34,197,94,0.12)" },
  modalIconError: { backgroundColor: "rgba(239,68,68,0.12)" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text, marginBottom: 8 },
  modalMessage: { fontSize: 14, fontWeight: "700", color: COLORS.sub, textAlign: "center", lineHeight: 20 },
  modalActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 14,
  },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  modalBtnPrimary: { backgroundColor: COLORS.primary },
  modalBtnPrimaryText: { fontSize: 15, fontWeight: "900", color: "#fff" },
});
