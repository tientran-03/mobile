import React, { useState, useMemo, useRef } from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Keyboard,
} from "react-native";

import { FormInput, FormSelect } from "@/components/form";
import { GENDER_OPTIONS } from "@/lib/schemas/patient-schemas";
import type { SpecifyFormData } from "@/lib/schemas/specify-form-schema";
import type { PatientResponse } from "@/services/patientService";

const formatDateToInput = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  } catch {}
  return "";
};

interface Step1PatientProps {
  patients: PatientResponse[];
  onPatientSelect?: (patientId: string) => void | Promise<void>;
}

const genderOptions = GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }));

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function Step1Patient({ patients, onPatientSelect }: Step1PatientProps) {
  const { control, watch, setValue } = useFormContext<SpecifyFormData>();
  const patientPhone = watch("patientPhone", "");
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const filteredPatients = useMemo(() => {
    const q = (patientPhone || "").trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.patientPhone || "").toLowerCase().includes(q) ||
        (p.patientName || "").toLowerCase().includes(q) ||
        (p.patientPhone || "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  }, [patients, patientPhone]);

  const handlePhoneChange = (value: string) => {
    setValue("patientPhone", value);
    setValue("selectedPatientId", "");
    setValue("patientName", "");
    setValue("patientDob", "");
    setValue("patientGender", undefined);
    setValue("patientEmail", "");
    setValue("patientJob", "");
    setValue("patientContactName", "");
    setValue("patientContactPhone", "");
    setValue("patientAddress", "");
    setShowDropdown(true);
  };

  const handleSelectPatient = async (patient: PatientResponse) => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setValue("selectedPatientId", patient.patientId);
    setValue("patientName", patient.patientName || "");
    setValue("patientPhone", patient.patientPhone || "");
    setValue("patientDob", formatDateToInput(patient.patientDob));
    setValue("patientGender", (patient.gender?.toLowerCase() as "male" | "female" | "other") || undefined);
    setValue("patientEmail", patient.patientEmail || "");
    setValue("patientJob", (patient as any).patientJob || "");
    setValue("patientContactName", (patient as any).patientContactName || "");
    setValue("patientContactPhone", (patient as any).patientContactPhone || "");
    setValue("patientAddress", patient.patientAddress || "");
    setValue("isNewPatient", false);
    setShowDropdown(false);
    Keyboard.dismiss();
    await onPatientSelect?.(patient.patientId);
  };

  const handleAddNew = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setValue("selectedPatientId", "");
    setValue("isNewPatient", true);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setShowDropdown(false), 300);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setShowDropdown(true);
  };

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
        Thông tin bệnh nhân
      </Text>

      <View className="mb-4">
        <Text className="text-[13px] font-extrabold text-slate-700 mb-2">
          Số điện thoại <Text className="text-red-500">*</Text>
        </Text>
        <Controller
          control={control}
          name="patientPhone"
          render={({ field: { onChange, value } }) => (
            <View>
              <TextInput
                value={value || ""}
                onChangeText={(v) => {
                  onChange(v);
                  handlePhoneChange(v);
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Nhập SĐT để tìm hoặc thêm mới"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5 text-[14px] text-slate-900"
              />
              {showDropdown && (
                <View
                  className="mt-2 rounded-2xl border border-slate-200 bg-white overflow-hidden"
                  style={{ maxHeight: SCREEN_HEIGHT * 0.85, zIndex: 1000 }}
                >
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: SCREEN_HEIGHT * 0.8 }}
                  >
                    {filteredPatients.length > 0 ? (
                      <>
                        {filteredPatients.map((patient) => (
                          <TouchableOpacity
                            key={patient.patientId}
                            onPress={() => handleSelectPatient(patient)}
                            className="px-4 py-3.5 border-b border-slate-50 active:bg-sky-50"
                            activeOpacity={0.7}
                          >
                            <Text className="text-[14px] font-semibold text-slate-900">
                              {patient.patientName || "Chưa có tên"}
                            </Text>
                            <Text className="text-[12px] text-slate-500 mt-0.5">
                              {patient.patientPhone || ""}
                              {patient.patientEmail ? ` • ${patient.patientEmail}` : ""}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          onPress={handleAddNew}
                          className="px-4 py-3.5 bg-sky-50 border-t border-sky-100"
                          activeOpacity={0.7}
                        >
                          <Text className="text-[14px] font-bold text-sky-700">
                            + Thêm bệnh nhân mới (SĐT: {patientPhone || "—"})
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={handleAddNew}
                        className="px-4 py-3.5"
                        activeOpacity={0.7}
                      >
                        <Text className="text-[14px] font-semibold text-slate-700">
                          Không tìm thấy. Thêm bệnh nhân mới (SĐT: {patientPhone || "—"})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        />
      </View>

      <FormInput
        name="patientName"
        label="Họ tên"
        required
        placeholder="Nhập họ và tên"
      />
      <FormInput
        name="patientDob"
        label="Ngày sinh"
        placeholder="yyyy-mm-dd"
      />
      <FormSelect
        name="patientGender"
        label="Giới tính"
        options={genderOptions}
        getLabel={(o) => o.label}
        getValue={(o) => o.value}
        placeholder="Chọn giới tính"
      />
      <FormInput
        name="patientEmail"
        label="Email"
        placeholder="Nhập email"
        keyboardType="email-address"
      />
      <FormInput
        name="patientAddress"
        label="Địa chỉ"
        placeholder="Nhập địa chỉ"
      />
    </View>
  );
}
