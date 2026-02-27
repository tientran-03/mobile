import React from "react";
import { useFormContext } from "react-hook-form";
import { View, Text } from "react-native";

import { FormInput, FormFieldGroup } from "@/components/form";
import { ServiceType } from "@/lib/schemas/order-form-schema";
import type { SpecifyFormData } from "@/lib/schemas/specify-form-schema";

export default function Step5ServiceType() {
  const { watch } = useFormContext<SpecifyFormData>();
  const serviceType = watch("serviceType");

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
        Thông tin nhóm xét nghiệm
      </Text>

      {serviceType === ServiceType.REPRODUCTION && (
        <>
          <FormFieldGroup>
            <FormInput
              name="fetusesNumber"
              label="Số thai"
              placeholder="Nhập số"
              keyboardType="numeric"
            />
            <FormInput
              name="fetusesWeek"
              label="Tuần thai"
              placeholder="0"
              keyboardType="numeric"
            />
          </FormFieldGroup>
          <FormFieldGroup>
            <FormInput
              name="fetusesDay"
              label="Ngày thai"
              placeholder="0"
              keyboardType="numeric"
            />
            <FormInput
              name="ultrasoundDay"
              label="Ngày siêu âm"
              placeholder="yyyy-mm-dd"
            />
          </FormFieldGroup>
          <FormFieldGroup>
            <FormInput
              name="headRumpLength"
              label="CRL (mm)"
              placeholder="Nhập CRL"
              keyboardType="numeric"
            />
            <FormInput
              name="neckLength"
              label="NT (mm)"
              placeholder="Nhập NT"
              keyboardType="numeric"
            />
          </FormFieldGroup>
          <FormInput
            name="combinedTestResult"
            label="Kết quả xét nghiệm kết hợp"
            placeholder="Nhập kết quả"
          />
          <FormInput
            name="ultrasoundResult"
            label="Kết quả siêu âm"
            placeholder="Nhập kết quả"
          />
        </>
      )}

      {serviceType === ServiceType.EMBRYO && (
        <>
          <FormFieldGroup>
            <FormInput
              name="biospy"
              label="Sinh thiết"
              placeholder="Nhập thông tin"
            />
            <FormInput
              name="biospyDate"
              label="Ngày sinh thiết"
              placeholder="yyyy-mm-dd"
            />
          </FormFieldGroup>
          <FormFieldGroup>
            <FormInput
              name="cellContainingSolution"
              label="Dung dịch chứa tế bào"
              placeholder="Nhập thông tin"
            />
            <FormInput
              name="embryoCreate"
              label="Số phôi tạo"
              placeholder="Nhập số"
              keyboardType="numeric"
            />
          </FormFieldGroup>
          <FormInput
            name="embryoStatus"
            label="Tình trạng phôi"
            placeholder="Nhập tình trạng"
          />
          <FormInput
            name="morphologicalAssessment"
            label="Đánh giá hình thái"
            placeholder="Nhập đánh giá"
          />
        </>
      )}

      {serviceType === ServiceType.DISEASE && (
        <>
          <FormFieldGroup>
            <FormInput
              name="treatmentTimeDay"
              label="Thời gian điều trị (ngày)"
              placeholder="Nhập số ngày"
              keyboardType="numeric"
            />
            <FormInput
              name="drugResistance"
              label="Kháng thuốc"
              placeholder="Nhập thông tin"
            />
          </FormFieldGroup>
          <FormInput
            name="symptom"
            label="Triệu chứng"
            placeholder="Nhập triệu chứng"
          />
          <FormInput
            name="diagnose"
            label="Chẩn đoán"
            placeholder="Nhập chẩn đoán"
          />
        </>
      )}

      {!serviceType && (
        <Text className="text-sm text-slate-500">
          Chọn loại dịch vụ ở bước trước để hiển thị thông tin chi tiết
        </Text>
      )}
    </View>
  );
}
