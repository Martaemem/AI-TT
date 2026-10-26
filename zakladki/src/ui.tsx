import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F } from './theme';
import { Category } from './types';

export function Logo({ size = 1 }: { size?: number }) {
  const s = (n: number) => n * size;
  return (
    <View style={{ width: s(54), height: s(48) }}>
      <View style={[st.dot, { width: s(29), height: s(29), left: 0, top: s(4), backgroundColor: C.blue }]} />
      <View style={[st.dot, { width: s(15), height: s(15), left: s(31), top: s(17), backgroundColor: C.red }]} />
      <View style={[st.dot, { width: s(13), height: s(13), left: s(32), top: s(33), backgroundColor: C.yellow }]} />
      <View style={[st.dot, { width: s(8), height: s(8), left: s(46), top: s(10), backgroundColor: C.green }]} />
    </View>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={st.top}>
      {onBack && (
        <Pressable onPress={onBack} style={st.round} accessibilityRole="button" accessibilityLabel="Wróć">
          <Ionicons name="arrow-back" size={24} color={C.blueInk} />
        </Pressable>
      )}
      <Text style={st.topTitle} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

export function IconBtn({ icon, onPress, label, color = C.blueInk }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; color?: string }) {
  return (
    <Pressable onPress={onPress} style={st.round} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function Btn({
  label,
  icon,
  onPress,
  kind = 'primary',
  style,
  disabled,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger' | 'green';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const bg = kind === 'primary' ? C.blue : kind === 'green' ? C.green : kind === 'danger' ? C.red : C.card;
  const fg = kind === 'ghost' ? C.blueInk : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[st.btn, { backgroundColor: bg }, kind === 'ghost' && st.ghost, disabled && { opacity: 0.6 }, style]}
      accessibilityRole="button"
    >
      {icon && <Ionicons name={icon} size={20} color={fg} />}
      <Text style={[st.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function CatChip({ cat, on, onPress, count }: { cat: Category; on: boolean; onPress?: () => void; count?: number }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[st.chip, { borderColor: cat.color }, on && { backgroundColor: cat.color }]}
      accessibilityRole={onPress ? 'checkbox' : undefined}
      accessibilityState={onPress ? { checked: on } : undefined}
    >
      {!on && <View style={[st.chipDot, { backgroundColor: cat.color }]} />}
      <Text style={[st.chipText, on && { color: '#FFFFFF' }]}>{cat.name}</Text>
      {count !== undefined && <Text style={[st.chipCount, on && { color: '#FFFFFF' }]}>{count}</Text>}
    </Pressable>
  );
}

export const st = StyleSheet.create({
  dot: { position: 'absolute', borderRadius: 999 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  topTitle: { flex: 1, fontFamily: F.heavy, fontSize: 22, color: C.text },
  round: { padding: 9, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  ghost: { borderWidth: 1.5, borderColor: C.line },
  btnText: { fontFamily: F.heavy, fontSize: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { fontFamily: F.bold, fontSize: 15, color: C.text },
  chipCount: { fontFamily: F.heavy, fontSize: 13, color: C.muted },
  label: { fontFamily: F.heavy, fontSize: 14, color: C.muted, letterSpacing: 0.5 },
  input: {
    fontFamily: F.body,
    fontSize: 17,
    color: C.text,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.card,
  },
  small: { fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 21 },
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line },
});
