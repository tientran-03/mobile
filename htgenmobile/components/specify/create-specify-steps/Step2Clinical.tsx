import React from "react";
import { useFormContext } from "react-hook-form";
import { View, Text } from "react-native";

import { FormInput, FormFieldGroup } from "@/components/form";
import type { SpecifyFormData } from "@/lib/schemas/specify-form-schema";

export default function Step2Clinical() {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
        Thông tin lâm sàng
      </Text>

      <FormFieldGroup>
        <FormInput
          name="patientHeight"
          label="Chiều cao (cm)"
          placeholder="Nhập chiều cao"
          keyboardType="numeric"
        />
        <FormInput
          name="patientWeight"
          label="Cân nặng (kg)"
          placeholder="Nhập cân nặng"
          keyboardType="numeric"
        />
      </FormFieldGroup>

      <FormFieldGroup>
        <FormInput
          name="patientHistory"
          label="Tiền sử bệnh nhân"
          placeholder="Nhập tiền sử"
        />
        <FormInput
          name="familyHistory"
          label="Tiền sử gia đình"
          placeholder="Nhập tiền sử gia đình"
        />
      </FormFieldGroup>

      <FormFieldGroup>
        <FormInput
          name="chronicDisease"
          label="Bệnh lý mãn tính"
          placeholder="Nhập bệnh lý mãn tính"
        />
        <FormInput
          name="acuteDisease"
          label="Bệnh lý cấp tính"
          placeholder="Nhập bệnh lý cấp tính"
        />
      </FormFieldGroup>

      <FormInput
        name="toxicExposure"
        label="Tiếp xúc độc hại"
        placeholder="Nhập thông tin"
      />
    </View>
  );
}
