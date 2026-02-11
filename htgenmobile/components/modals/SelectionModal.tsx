import { Check, ChevronDown, Search, Trash2, X } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

export interface SelectionOption {
  value: string;
  label: string;
}

interface SelectionModalProps {
  visible: boolean;
  title: string;
  options: SelectionOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  placeholderSearch?: string;
  onClear?: () => void;
}

export function SelectionModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  placeholderSearch = 'Tìm kiếm...',
  onClear,
}: SelectionModalProps) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((x) => x.label.toLowerCase().includes(query));
  }, [q, options]);

  // Reset search when modal opens
  React.useEffect(() => {
    if (visible) {
      setQ('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {options.length} mục • {filtered.length} hiển thị
              </Text>
            </View>

            {onClear && !!selectedValue && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  onClear();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Trash2 size={18} color={COLORS.sub} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Search size={18} color={COLORS.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={placeholderSearch}
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
            />
            {!!q && (
              <TouchableOpacity onPress={() => setQ('')} style={styles.searchClear} activeOpacity={0.8}>
                <X size={18} color={COLORS.sub} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Không tìm thấy</Text>
                <Text style={styles.emptySub}>Thử từ khóa khác nhé.</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <View style={styles.checkPill}>
                        <Check size={16} color="#fff" />
                      </View>
                    ) : (
                      <ChevronDown
                        size={18}
                        color={COLORS.muted}
                        style={{ transform: [{ rotate: '-90deg' }] }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 14 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  clearBtn: {
    padding: 8,
    marginRight: 4,
  },
  closeBtn: {
    padding: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 4,
  },
  searchClear: {
    padding: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.muted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  itemSelected: {
    backgroundColor: COLORS.primarySoft,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  itemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
