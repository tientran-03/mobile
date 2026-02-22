import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Alert, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { FormInput, FormSelect, FormTextarea } from "@/components/form";
import { useAuth } from "@/contexts/AuthContext";
import { getApiResponseData } from "@/lib/types/api-types";
import { SERVICE_TYPE_MAPPER } from "@/lib/schemas/order-schemas";
import { genomeTestService } from "@/services/genomeTestService";
import { patientService } from "@/services/patientService";
import { ServiceResponse, serviceService } from "@/services/serviceService";
import {
  SpecifyVoteTestRequest,
  specifyVoteTestService,
} from "@/services/specifyVoteTestService";
import { doctorService } from "@/services/doctorService";

const prescriptionSlipSchema = z.object({
  serviceId: z.string().min(1, "Vui lòng chọn loại dịch vụ"),
  patientId: z.string().min(1, "Vui lòng chọn bệnh nhân"),
  genomeTestId: z.string().min(1, "Vui lòng chọn xét nghiệm"),
  doctorId: z.string().optional(),
  embryoNumber: z.coerce.number().optional(),
  samplingSite: z.string().optional(),
  sampleCollectDate: z.string().optional(),
  specifyNote: z.string().optional(),
  sendEmailPatient: z.boolean().optional(),
});

type PrescriptionSlipFormData = z.infer<typeof prescriptionSlipSchema>;

const defaultValues: PrescriptionSlipFormData = {
  serviceId: "",
  patientId: "",
  genomeTestId: "",
  doctorId: "",
  embryoNumber: undefined,
  samplingSite: "",
  sampleCollectDate: "",
  specifyNote: "",
  sendEmailPatient: false,
};

export default function CreatePrescriptionSlipScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const methods = useForm({
    resolver: zodResolver(prescriptionSlipSchema),
    mode: "onTouched",
    defaultValues,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ["services"],
    queryFn: () => serviceService.getAll(),
  });

  const { data: patientsResponse } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientService.getAll(),
  });

  const { data: genomeTestsResponse } = useQuery({
    queryKey: ["genome-tests"],
    queryFn: () => genomeTestService.getAll(),
  });

  const { data: doctorsResponse } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorService.getAll(),
  });

  const services = getApiResponseData<ServiceResponse>(servicesResponse) || [];
  const patients = getApiResponseData(patientsResponse) || [];
  const genomeTests = getApiResponseData(genomeTestsResponse) || [];
  const doctors = getApiResponseData(doctorsResponse) || [];

  const serviceOptions = services.map((s) => ({
    value: s.serviceId,
    label: SERVICE_TYPE_MAPPER[s.name] || s.name,
  }));

  const patientOptions = patients.map((p: any) => ({
    value: p.patientId,
    label: `${p.patientName || p.name || ""} - ${p.patientPhone || p.phone || ""}`,
  }));

  const selectedServiceId = methods.watch("serviceId");
  const filteredGenomeTests = genomeTests.filter((test: any) => {
    if (!selectedServiceId) return true;
    return test.service?.serviceId === selectedServiceId;
  });

  const genomeTestOptions = filteredGenomeTests.map((test: any) => ({
    value: test.testId,
    label: test.testName || test.testId,
  }));

  const doctorOptions = doctors.map((d: any) => ({
    value: d.doctorId,
    label: d.doctorName || d.doctorId,
  }));

  const createMutation = useMutation({
    mutationFn: async (data: PrescriptionSlipFormData) => {
      const submitData: SpecifyVoteTestRequest = {
        serviceId: data.serviceId,
        patientId: data.patientId,
        genomeTestId: data.genomeTestId,
        hospitalId: user?.hospitalId ? String(user.hospitalId) : undefined,
        doctorId: data.doctorId || undefined,
        embryoNumber: data.embryoNumber,
        samplingSite: data.samplingSite?.trim() || undefined,
        sampleCollectDate: data.sampleCollectDate
          ? new Date(data.sampleCollectDate).toISOString()
          : undefined,
        specifyNote: data.specifyNote?.trim() || undefined,
        sendEmailPatient: data.sendEmailPatient || false,
      };
      const response = await specifyVoteTestService.create(submitData);
      if (!response.success) {
        throw new Error(response.message || "Không thể tạo phiếu chỉ định");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specify-vote-tests"] });
      Alert.alert("Thành công", "Phiếu chỉ định đã được tạo thành công", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert("Lỗi tạo phiếu chỉ định", error?.message || "Không thể tạo phiếu chỉ định. Vui lòng thử lại.");
    },
  });

  const handleSubmit = async () => {
    const isValid = await methods.trigger();
    if (!isValid) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const formData = methods.getValues();
    createMutation.mutate(formData);
  };

  return (
    <FormProvider {...methods}>
      <SafeAreaView className="flex-1 bg-sky-50" edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <View className="pb-3 px-4 bg-white border-b border-sky-100">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3"
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color="#0284C7" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-slate-900 text-lg font-extrabold">Tạo mới phiếu chỉ định</Text>
              <Text className="mt-0.5 text-xs text-slate-500">Nhập thông tin phiếu chỉ định</Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-2xl border border-sky-100 p-4">
            <FormSelect
              name="serviceId"
              label="Loại dịch vụ"
              required
              options={serviceOptions}
              getLabel={(o) => o.label}
              getValue={(o) => o.value}
              placeholder="Chọn loại dịch vụ"
              modalTitle="Chọn loại dịch vụ"
            />

            <FormSelect
              name="patientId"
              label="Bệnh nhân"
              required
              options={patientOptions}
              getLabel={(o) => o.label}
              getValue={(o) => o.value}
              placeholder="Chọn bệnh nhân"
              modalTitle="Chọn bệnh nhân"
            />

            <FormSelect
              name="genomeTestId"
              label="Xét nghiệm"
              required
              options={genomeTestOptions}
              getLabel={(o) => o.label}
              getValue={(o) => o.value}
              placeholder="Chọn xét nghiệm"
              modalTitle="Chọn xét nghiệm"
              disabled={!selectedServiceId}
              helperText={!selectedServiceId ? "Vui lòng chọn loại dịch vụ trước" : undefined}
            />

            <FormSelect
              name="doctorId"
              label="Bác sĩ chỉ định"
              options={doctorOptions}
              getLabel={(o) => o.label}
              getValue={(o) => o.value}
              placeholder="Chọn bác sĩ (tùy chọn)"
              modalTitle="Chọn bác sĩ"
            />

            <FormInput
              name="embryoNumber"
              label="Số phôi"
              placeholder="Nhập số phôi (tùy chọn)"
              keyboardType="numeric"
            />

            <FormInput
              name="samplingSite"
              label="Địa điểm lấy mẫu"
              placeholder="Nhập địa điểm lấy mẫu (tùy chọn)"
            />

            <FormInput
              name="sampleCollectDate"
              label="Ngày thu mẫu"
              placeholder="YYYY-MM-DD"
              helperText="Định dạng: YYYY-MM-DD"
            />

            <FormTextarea
              name="specifyNote"
              label="Ghi chú"
              placeholder="Nhập ghi chú (tùy chọn)"
              minHeight={80}
            />
          </View>
        </ScrollView>

        <View className="p-4 bg-white border-t border-sky-100">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            className={`p-4 rounded-2xl flex-row items-center justify-center ${
              createMutation.isPending ? "bg-slate-300" : "bg-sky-600"
            }`}
            activeOpacity={0.85}
          >
            <Text className="text-white text-base font-extrabold">
              {createMutation.isPending ? "Đang tạo..." : "Tạo mới"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </FormProvider>
  );
}
