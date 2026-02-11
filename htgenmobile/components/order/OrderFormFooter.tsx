import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

interface OrderFormFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  submitText?: string;
}

export function OrderFormFooter({
  onCancel,
  onSubmit,
  isPending,
  submitText = 'Tạo đơn hàng',
}: OrderFormFooterProps) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>Huỷ</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.submitButton]}
        onPress={onSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{submitText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: { fontSize: 15, fontWeight: '800', color: COLORS.sub },
  submitButton: { backgroundColor: COLORS.primary },
  submitButtonText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
