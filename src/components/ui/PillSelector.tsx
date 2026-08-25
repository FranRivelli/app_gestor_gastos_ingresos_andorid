import { StyleSheet, Text, View, Pressable } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface PillOption<T extends string> {
  value: T;
  label: string;
}

interface PillSelectorProps<T extends string> {
  label?: string;
  value: T;
  options: PillOption<T>[];
  onChange: (value: T) => void;
}

export function PillSelector<T extends string>({ label, value, options, onChange }: PillSelectorProps<T>) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((option) => {
          const activo = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.pill, activo && styles.pillActive]}
            >
              <Text style={[styles.pillText, activo && styles.pillTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.background,
  },
});
