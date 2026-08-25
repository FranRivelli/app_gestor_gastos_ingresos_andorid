import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface BannerProps {
  message: string;
  variant?: 'error' | 'success';
}

export function Banner({ message, variant = 'error' }: BannerProps) {
  const isError = variant === 'error';
  return (
    <View style={[styles.container, isError ? styles.error : styles.success]}>
      <Text style={[styles.text, { color: isError ? Colors.expense : Colors.income }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  error: {
    backgroundColor: '#3A2228',
    borderColor: Colors.expense,
  },
  success: {
    backgroundColor: '#1F3A2C',
    borderColor: Colors.income,
  },
  text: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
