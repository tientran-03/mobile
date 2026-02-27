import React from "react";
import { useFormContext } from "react-hook-form";
import { View, Text } from "react-native";

import { FormInput, FormFieldGroup } from "@/components/form";
import type { SpecifyFormData } from "@/lib/schemas/specify-form-schema";

export default function Step4GeneticResults() {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
        Kết quả xét nghiệm di truyền trước đó
      </Text>

      <FormInput
        name="geneticTestResults"
        label="Kết quả (bản thân)"
        placeholder="Nhập kết quả xét nghiệm di truyền trước đó"
      />

      <FormInput
        name="geneticTestResultsRelationship"
        label="Kết quả (người thân)"
        placeholder="Nhập kết quả xét nghiệm di truyền của người thân"
      />
    </View>
  );
}
