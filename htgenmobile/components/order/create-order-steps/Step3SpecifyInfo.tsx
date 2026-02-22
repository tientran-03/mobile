import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Text, View } from 'react-native';

import {
  FormDatePicker,
  FormFieldGroup,
  FormInput,
  FormReadOnly,
  FormSelect,
} from '@/components/form';
import type { GenomeTestResponse } from '@/services/genomeTestService';
import type { SpecifyVoteTestResponse } from '@/services/specifyVoteTestService';

interface Step3Props {
  specifyList: SpecifyVoteTestResponse[];
  genomeTests: GenomeTestResponse[];
  isEditMode?: boolean;
}

const genderOptions = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

export default function Step3SpecifyInfo({
  specifyList,
  genomeTests,
  isEditMode = false,
}: Step3Props) {
  const { watch, setValue } = useFormContext();
  const specifyId = watch('specifyId');

  const allowEdit = !isEditMode;

  const _handleSpecifyChange = (newSpecifyId: string) => {
    if (!newSpecifyId) return;

    const selectedSpecify = specifyList.find(s => s.specifyVoteID === newSpecifyId);
    if (!selectedSpecify) return;

    const patient = selectedSpecify.patient;
    if (patient) {
      setValue('patientPhone', patient.patientPhone || '');
      setValue('patientName', patient.patientName || '');
      setValue('patientDob', patient.patientDob ? String(patient.patientDob).split('T')[0] : '');
      setValue('patientGender', patient.gender || '');
      setValue('patientEmail', patient.patientEmail || '');
      setValue('patientJob', patient.patientJob || '');
      setValue('patientContactName', patient.patientContactName || '');
      setValue('patientContactPhone', patient.patientContactPhone || '');
      setValue('patientAddress', patient.patientAddress || '');
    }

    if (selectedSpecify.genomeTest) {
      setValue('genomeTestId', selectedSpecify.genomeTestId || '');
      setValue('testName', selectedSpecify.genomeTest.testName || '');
      setValue('testContent', selectedSpecify.genomeTest.testDescription || '');
      setValue('testSample', selectedSpecify.genomeTest.testSample?.join(', ') || '');
    }

    setValue('samplingSite', selectedSpecify.samplingSite || '');
    setValue(
      'sampleCollectDate',
      selectedSpecify.sampleCollectDate
        ? new Date(selectedSpecify.sampleCollectDate).toISOString().slice(0, 16)
        : ''
    );
    setValue('embryoNumber', selectedSpecify.embryoNumber?.toString() || '');

    setValue('geneticTestResults', selectedSpecify.geneticTestResults || '');
    setValue(
      'geneticTestResultsRelationship',
      selectedSpecify.geneticTestResultsRelationship || ''
    );
  };

  // Nếu user đã có specifyId sẵn (ví dụ load từ API), tự fill lần đầu
  useEffect(() => {
    if (specifyId) _handleSpecifyChange(specifyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specifyId]);

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
        Thông tin phiếu xét nghiệm
      </Text>

      <FormSelect
        name="specifyId"
        label="Mã phiếu xét nghiệm"
        options={specifyList}
        getLabel={s => s.specifyVoteID}
        getValue={s => s.specifyVoteID}
        placeholder="Lựa chọn phiếu"
        modalTitle="Chọn phiếu xét nghiệm"
        searchable
        disabled={isEditMode}
        onChange={(val: string) => _handleSpecifyChange(val)}
      />

      <View className="mt-4 pt-4 border-t border-slate-100">
        <Text className="text-[13px] font-bold text-slate-600 mb-3">
          Thông tin người làm xét nghiệm
        </Text>

        <FormFieldGroup>
          <FormInput
            name="patientPhone"
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            editable={allowEdit}
          />
          <FormInput
            name="patientName"
            label="Họ tên"
            placeholder="Nhập họ và tên"
            editable={allowEdit}
          />
        </FormFieldGroup>

        <FormFieldGroup>
          <FormDatePicker
            name="patientDob"
            label="Ngày sinh"
            placeholder="Chọn ngày"
            disabled={!allowEdit}
          />
          <FormSelect
            name="patientGender"
            label="Giới tính"
            options={genderOptions}
            getLabel={o => o.label}
            getValue={o => o.value}
            placeholder="Chọn"
            modalTitle="Chọn giới tính"
            disabled={!allowEdit}
          />
        </FormFieldGroup>

        <FormInput
          name="patientEmail"
          label="Email"
          placeholder="Nhập email"
          keyboardType="email-address"
          editable={allowEdit}
        />

        <FormInput
          name="patientJob"
          label="Nghề nghiệp"
          placeholder="Nhập nghề nghiệp"
          editable={allowEdit}
        />

        <FormFieldGroup>
          <FormInput
            name="patientContactName"
            label="Người liên hệ"
            placeholder="Nhập người liên hệ"
            editable={allowEdit}
          />
          <FormInput
            name="patientContactPhone"
            label="SĐT người liên hệ"
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            editable={allowEdit}
          />
        </FormFieldGroup>

        <FormInput
          name="patientAddress"
          label="Địa chỉ"
          placeholder="Nhập địa chỉ"
          editable={allowEdit}
        />
      </View>

      <View className="mt-4 pt-4 border-t border-slate-100">
        <Text className="text-[13px] font-bold text-slate-600 mb-3">Thông tin xét nghiệm</Text>

        <FormSelect
          name="genomeTestId"
          label="Mã xét nghiệm"
          options={genomeTests}
          getLabel={t => `${t.testId} - ${t.testName}`}
          getValue={t => t.testId}
          placeholder="Lựa chọn"
          modalTitle="Chọn xét nghiệm"
          searchable
          disabled={isEditMode}
        />

        <FormInput
          name="testName"
          label="Tên xét nghiệm"
          placeholder="Nhập tên xét nghiệm"
          editable={allowEdit}
        />

        <FormReadOnly
          label="Mẫu xét nghiệm"
          value={watch('testSample')}
          placeholder="Chưa có thông tin"
        />

        <FormInput
          name="testContent"
          label="Nội dung xét nghiệm"
          placeholder="Nhập nội dung"
          editable={allowEdit}
        />

        <FormInput
          name="samplingSite"
          label="Địa điểm thu mẫu"
          placeholder="Nhập địa điểm"
          editable={allowEdit}
        />

        <FormFieldGroup>
          <FormDatePicker
            name="sampleCollectDate"
            label="Ngày thu mẫu"
            placeholder="Chọn ngày"
            disabled={!allowEdit}
          />
          <FormInput
            name="embryoNumber"
            label="Số lượng phôi"
            placeholder="Nhập số"
            keyboardType="numeric"
            editable={allowEdit}
          />
        </FormFieldGroup>
      </View>
    </View>
  );
}
