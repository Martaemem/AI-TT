import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_EMOJI, colors } from '../theme';
import { Recipe } from '../types';
import { formatMinutes } from '../units';

export const emojiFor = (category: string) => CATEGORY_EMOJI[category] ?? '🍽️';

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.primary }]}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Button({ title, icon, onPress, outline, disabled, style }: { title: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; outline?: boolean; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, outline ? s.btnOutline : { backgroundColor: colors.primary }, disabled && { opacity: 0.5 }, style]}>
      {icon && <Ionicons name={icon} size={20} color={outline ? colors.primary : '#fff'} style={{ marginRight: 8 }} />}
      <Text style={[s.btnText, outline && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
      ) : (
        <Text style={s.headerTitle}>{title}</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>{right}</View>
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={8}><Text style={s.stepBtn}>–</Text></Pressable>
      <Text style={s.stepVal}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={8}><Text style={s.stepBtn}>+</Text></Pressable>
    </View>
  );
}

export function RecipeCard({ recipe, onPress, width }: { recipe: Recipe; onPress: () => void; width?: number }) {
  return (
    <Pressable onPress={onPress} style={[s.card, width ? { width } : { width: '100%' }]}>
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.cardPlaceholder]}>
          <Text style={{ fontSize: 56 }}>{emojiFor(recipe.category)}</Text>
        </View>
      )}
      <View style={s.cardShade} />
      {recipe.favorite && <Ionicons name="heart" size={20} color="#fff" style={s.cardHeart} />}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{recipe.title}</Text>
        <Text style={s.cardMeta} numberOfLines={1}>
          {[recipe.category, formatMinutes(recipe.time), `${recipe.servings} porcji`].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primarySoft, marginRight: 8 },
  chipText: { color: colors.primaryDark, fontWeight: '600', fontSize: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 16 },
  btnOutline: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2EFEC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, gap: 18 },
  stepBtn: { fontSize: 26, fontWeight: '700', color: colors.text, paddingHorizontal: 4 },
  stepVal: { fontSize: 20, fontWeight: '800', color: colors.text, minWidth: 26, textAlign: 'center' },
  card: { height: 220, borderRadius: 22, overflow: 'hidden', backgroundColor: '#6b5a50', marginRight: 14 },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#C98F6B' },
  cardShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.28)' },
  cardHeart: { position: 'absolute', top: 14, right: 14 },
  cardBody: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  cardMeta: { color: '#fff', opacity: 0.9, marginTop: 4, fontSize: 14 },
});
