import React from 'react';
import { View, Text, Switch } from 'react-native';
import { useFormContext } from 'react-hook-form';

import { FormTextarea } from '@/components/form';
import type { OrderFormData } from '@/lib/schemas/order-form-schema';

export default function Step7OrderNote() {
  const { watch, setValue } = useFormContext<OrderFormData>();
  const sendEmailToPatient = watch('sendEmailToPatient') || false;
  const sendZaloToPatient = watch('sendZaloToPatient') || false;
  const patientEmail = watch('patientEmail');
  const patientPhone = watch('patientPhone');

  return (
    <View className="space-y-4">
      <View className="bg-white rounded-2xl border border-slate-100 p-4">
        <Text className="text-[15px] font-extrabold text-slate-900 mb-4">Ghi chú đơn hàng</Text>

        <FormTextarea
          name="orderNote"
          label="Ghi chú"
          placeholder="Nhập ghi chú cho đơn hàng (nếu có)"
          minHeight={120}
          maxLength={500}
        />

        <View className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <Text className="text-[11px] text-slate-500 font-medium">
            Ghi chú sẽ được hiển thị trong chi tiết đơn hàng và có thể được cập nhật sau.
          </Text>
        </View>
      </View>

      <View className="bg-white rounded-2xl border border-slate-100 p-4">
        <Text className="text-[15px] font-extrabold text-slate-900 mb-4">
          Gửi thông báo cho bệnh nhân
        </Text>

        <View className="flex-row items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
          <View className="flex-1 mr-3" pointerEvents="none">
            <Text className="text-[14px] font-bold text-slate-900">
              📧 Gửi email đơn hàng và phiếu xét nghiệm
            </Text>
            <Text className="mt-1 text-[12px] text-slate-500">
              {sendEmailToPatient
                ? patientEmail
                  ? `Email sẽ được gửi đến ${patientEmail}`
                  : 'Vui lòng nhập email bệnh nhân ở bước 3'
                : 'Không gửi email thông báo'}
            </Text>
          </View>
          <Switch
            value={sendEmailToPatient}
            onValueChange={value => {
              console.log('[Step7OrderNote] Toggling sendEmailToPatient:', value);
              setValue('sendEmailToPatient', value, { shouldDirty: true });
            }}
            trackColor={{ false: '#cbd5e1', true: '#0891b2' }}
            thumbColor="#fff"
          />
        </View>

        <View className="flex-row items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <View className="flex-1 mr-3" pointerEvents="none">
            <Text className="text-[14px] font-bold text-slate-900">
              💙 Gửi thông báo qua Zalo
            </Text>
            <Text className="mt-1 text-[12px] text-slate-500">
              {sendZaloToPatient
                ? patientPhone
                  ? `Thông báo sẽ được gửi qua Zalo số ${patientPhone}`
                  : 'Vui lòng nhập số điện thoại bệnh nhân ở bước 3'
                : 'Không gửi thông báo Zalo'}
            </Text>
          </View>
          <Switch
            value={sendZaloToPatient}
            onValueChange={value => {
              console.log('[Step7OrderNote] Toggling sendZaloToPatient:', value);
              setValue('sendZaloToPatient', value, { shouldDirty: true });
            }}
            trackColor={{ false: '#cbd5e1', true: '#0891b2' }}
            thumbColor="#fff"
          />
        </View>

        {sendEmailToPatient && !patientEmail && (
          <View className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <Text className="text-[11px] text-amber-700 font-medium">
              ⚠️ Vui lòng quay lại bước 3 và nhập email bệnh nhân để gửi email thông báo.
            </Text>
          </View>
        )}

        {sendZaloToPatient && !patientPhone && (
          <View className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <Text className="text-[11px] text-amber-700 font-medium">
              ⚠️ Vui lòng quay lại bước 3 và nhập số điện thoại bệnh nhân để gửi Zalo.
            </Text>
          </View>
        )}

        {(sendEmailToPatient || sendZaloToPatient) && (
          <View className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <Text className="text-[11px] text-blue-700 font-medium">
              ℹ️ Thông báo sẽ được gửi sau khi đơn hàng được tạo thành công.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
