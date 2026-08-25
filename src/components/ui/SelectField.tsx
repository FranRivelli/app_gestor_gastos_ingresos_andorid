import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

export interface SelectOption {
  value: string | null;
  label: string;
  color?: string;
}

interface SelectFieldProps {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  error?: string;
}

export function SelectField({ label, value, options, onChange, placeholder = 'Seleccionar', error }: SelectFieldProps) {
  const [abierto, setAbierto] = useState(false);
  const seleccionada = options.find((o) => o.value === value) ?? null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={() => setAbierto(true)}
      >
        <View style={styles.fieldContent}>
          {seleccionada?.color ? <View style={[styles.dot, { backgroundColor: seleccionada.color }]} /> : null}
          <Text style={seleccionada ? styles.valueText : styles.placeholderText}>
            {seleccionada ? seleccionada.label : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAbierto(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={['bottom']}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value ?? '__null__'}
                style={styles.list}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.option}
                    onPress={() => {
                      onChange(item.value);
                      setAbierto(false);
                    }}
                  >
                    {item.color ? <View style={[styles.dot, { backgroundColor: item.color }]} /> : null}
                    <Text style={styles.optionText}>{item.label}</Text>
                    {item.value === value ? (
                      <Ionicons name="checkmark" size={18} color={Colors.accent} style={styles.check} />
                    ) : null}
                  </Pressable>
                )}
              />
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  fieldError: {
    borderColor: Colors.expense,
  },
  fieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  valueText: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  placeholderText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSize.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '70%',
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionText: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
  },
  check: {
    marginLeft: Spacing.sm,
  },
});
