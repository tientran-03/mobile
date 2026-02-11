import { Check } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '@/constants/colors';

interface OrderFormSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onViewOrders: () => void;
}

export function OrderFormSuccessModal({
  visible,
  onClose,
  onViewOrders,
}: OrderFormSuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Check size={32} color={COLORS.success} strokeWidth={3} />
            </View>
            <Text style={styles.title}>Thành công</Text>
            <Text style={styles.message}>Đơn hàng đã được tạo thành công!</Text>
            <Text style={styles.subMessage}>
              Bạn có thể xem đơn hàng trong danh sách đơn hàng.
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonSecondaryText}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={onViewOrders}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonPrimaryText}>Xem danh sách</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.sub,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.sub,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});
