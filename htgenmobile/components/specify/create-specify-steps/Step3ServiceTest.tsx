import React, { useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { View, Text, TouchableOpacity } from "react-native";

import { FormDatePicker, FormInput, FormSelect } from "@/components/form";
import { ServiceType } from "@/lib/schemas/order-form-schema";
import type { SpecifyFormData } from "@/lib/schemas/specify-form-schema";
import type { DoctorResponse } from "@/services/doctorService";
import type { GenomeTestResponse } from "@/services/genomeTestService";
import type { ServiceEntityResponse } from "@/services/serviceEntityService";

interface Step3ServiceTestProps {
  services: ServiceEntityResponse[];
  genomeTests: GenomeTestResponse[];
  doctors: DoctorResponse[];
  hospitalName?: string;
}

const serviceTypeMap: Record<string, string> = {
  reproduction: "Sinh sản",
  embryo: "Phôi thai",
  disease: "Bệnh lý di truyền",
};

export default function Step3ServiceTest({
  services,
  genomeTests,
  doctors,
  hospitalName,
}: Step3ServiceTestProps) {
  const { watch, setValue } = useFormContext<SpecifyFormData>();
  const serviceId = watch("serviceId");
  const serviceType = watch("serviceType");

  useEffect(() => {
    if (serviceId && services.length > 0) {
      const svc = services.find((s) => s.serviceId === serviceId);
      if (svc) {
        const name = (svc.name || "").toLowerCase();
        if (name.includes("sinh sản") || name.includes("reproduction"))
          setValue("serviceType", "reproduction");
        else if (name.includes("phôi") || name.includes("embryo"))
          setValue("serviceType", "embryo");
        else if (name.includes("bệnh lý") || name.includes("disease"))
          setValue("serviceType", "disease");
      }
    }
  }, [serviceId, services, setValue]);

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
        Loại dịch vụ & Xét nghiệm
      </Text>

      <FormSelect
        name="serviceId"
        label="Loại dịch vụ"
        required
        options={services}
        getLabel={(s) => s.name || s.serviceId}
        getValue={(s) => s.serviceId}
        placeholder="Chọn loại dịch vụ"
        modalTitle="Chọn loại dịch vụ"
        searchable
      />

      <FormSelect
        name="genomeTestId"
        label="Xét nghiệm"
        required
        options={genomeTests}
        getLabel={(g) => g.testName || g.testId}
        getValue={(g) => g.testId}
        placeholder="Chọn xét nghiệm"
        modalTitle="Chọn xét nghiệm"
        searchable
      />

      <FormSelect
        name="doctorId"
        label="Bác sĩ chỉ định"
        options={doctors}
        getLabel={(d) => d.doctorName || d.doctorId}
        getValue={(d) => d.doctorId}
        placeholder="Chọn bác sĩ"
        modalTitle="Chọn bác sĩ"
        searchable
      />

      {hospitalName && (
        <View className="mb-4">
          <Text className="text-[13px] font-extrabold text-slate-700 mb-2">
            Bệnh viện
          </Text>
          <Text className="text-[14px] text-slate-600">{hospitalName}</Text>
        </View>
      )}

      <FormInput
        name="samplingSite"
        label="Nơi lấy mẫu"
        placeholder="Nhập nơi lấy mẫu"
      />

      <FormDatePicker
        name="sampleCollectDate"
        label="Ngày lấy mẫu"
        placeholder="Chọn ngày"
      />

      <FormInput
        name="embryoNumber"
        label="Số phôi (nếu có)"
        placeholder="Nhập số"
        keyboardType="numeric"
      />
    </View>
  );
}
