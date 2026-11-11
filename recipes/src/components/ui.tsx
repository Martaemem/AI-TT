import React from 'react';
import { Image, Pressable, StyleSheet, Text as RNText, TextProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { box, categoryColor, colors, fonts } from '../theme';
import { Recipe } from '../types';
import { formatMinutes } from '../units';
import { Art, kindFor, Logo } from './Art';

/** Tekst z czcionką Nunito dobraną do grubości (na Androidzie fontWeight nie działa z własnymi czcionkami). */
export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  let family = flat.fontFamily;
  if (!family) {
    const w = Number(flat.fontWeight === 'bold' ? 700 : flat.fontWeight ?? 600);
    family = w >= 800 ? fonts.bodyHeavy : w >= 700 ? fonts.bodyBold : w >= 600 ? fonts.body : fonts.bodyMedium;
  }
  return <RNText {...rest} style={[flat, { fontFamily: family, fontWeight: 'normal' }]} />;
}

/** Pole tekstowe w stylu aplikacji. */
export const inputStyle = {
  ...box(colors.card, 18),
  borderBottomWidth: 4,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 16,
  fontFamily: fonts.body,
  color: colors.ink,
} as const;

export const emojiFor = (category: string) => ({ Śniadania: '🥞', Obiady: '🍝', Zupy: '🍲', Kolacje: '🥪', Sałatki: '🥗', Przekąski: '🍿', Desery: '🍰', Ciasta: '🎂', Napoje: '🍹' } as Record<string, string>)[category] ?? '🍽️';

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.yellow }]}>
      <Text style={s.chipText}>{label}</Text>
    </Pressable>
  );
}

/** Mała etykieta w obramowaniu, jak „NAGRODY” w Dozzy. */
export function Tag({ label, bg = colors.card }: { label: string; bg?: string }) {
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      <Text style={s.tagText}>{label}</Text>
    </View>
  );
}

export function Button({ title, icon, onPress, outline, disabled, style }: { title: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; outline?: boolean; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.btn, { backgroundColor: outline ? colors.card : colors.yellow }, pressed && { transform: [{ translateY: 2 }] }, disabled && { opacity: 0.5 }, style]}>
      {icon && <Ionicons name={icon} size={20} color={colors.ink} style={{ marginRight: 8 }} />}
      <Text style={s.btnText}>{title}</Text>
    </Pressable>
  );
}

/** Pole wyboru z grubym obrysem. */
export function Check({ on }: { on: boolean }) {
  return (
    <View style={[s.check, on && { backgroundColor: colors.yellow }]}>{on && <Ionicons name="checkmark" size={18} color={colors.ink} />}</View>
  );
}

export function Header({ title, onBack, right, logo }: { title?: string; onBack?: () => void; right?: React.ReactNode; logo?: boolean }) {
  return (
    <View style={s.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={s.round}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
          {logo && <Logo size={44} />}
          <Text style={s.headerTitle}>{title}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>{right}</View>
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={8} style={s.stepBtn}><Ionicons name="remove" size={22} color={colors.ink} /></Pressable>
      <Text style={s.stepVal}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={8} style={s.stepBtn}><Ionicons name="add" size={22} color={colors.ink} /></Pressable>
    </View>
  );
}

/** Karta przepisu: zdjęcie albo pastelowe tło z rysunkową postacią. */
export function RecipeCard({ recipe, onPress, width }: { recipe: Recipe; onPress: () => void; width?: number }) {
  return (
    <Pressable onPress={onPress} style={[s.card, width ? { width } : { width: '100%' }]}>
      <View style={[s.cardArt, { backgroundColor: categoryColor(recipe.category) }]}>
        {recipe.image ? <Image source={{ uri: recipe.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Art kind={kindFor(recipe.category)} size={110} />}
        {recipe.favorite && (
          <View style={s.heart}><Ionicons name="heart" size={18} color={colors.coral} /></View>
        )}
      </View>
      <View style={{ padding: 14 }}>
        <Text style={s.cardTitle} numberOfLines={2}>{recipe.title}</Text>
        <Text style={s.cardMeta} numberOfLines={1}>
          {[recipe.category, formatMinutes(recipe.time), `${recipe.servings} porcji`].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 4, marginRight: 8 },
  chipText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  tag: { alignSelf: 'flex-start', borderWidth: 2.5, borderColor: colors.ink, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  tagText: { color: colors.ink, fontWeight: '800', fontSize: 13, letterSpacing: 1.6, textTransform: 'uppercase' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 28, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 6 },
  btnText: { color: colors.ink, fontSize: 18, fontFamily: fonts.displayBold, lineHeight: 26 },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 2.5, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: colors.ink, backgroundColor: colors.bg },
  headerTitle: { fontSize: 32, fontFamily: fonts.display, color: colors.ink, lineHeight: 42 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', ...box(colors.card, 22), borderBottomWidth: 4, paddingHorizontal: 8, paddingVertical: 4, gap: 6 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.yellow, borderWidth: 2, borderColor: colors.ink },
  stepVal: { fontSize: 22, fontFamily: fonts.display, color: colors.ink, minWidth: 32, textAlign: 'center', lineHeight: 30 },
  card: { ...box(colors.card, 26), overflow: 'hidden', marginRight: 14 },
  cardArt: { height: 150, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2.5, borderBottomColor: colors.ink, overflow: 'hidden' },
  heart: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.ink, lineHeight: 26 },
  cardMeta: { color: colors.muted, marginTop: 2, fontSize: 14, fontWeight: '600' },
});
