import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, TOOL_EMOJI } from '../theme';
import { Tip } from '../types';

export const toolEmoji = (tool: string) => TOOL_EMOJI[tool] ?? '🤖';

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.primary }]}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Button({ title, icon, onPress, outline, disabled, style }: { title: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; outline?: boolean; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, outline ? s.btnOutline : { backgroundColor: colors.primary }, disabled && { opacity: 0.5 }, style]}
    >
      {icon && <Ionicons name={icon} size={20} color={outline ? colors.primary : '#fff'} style={{ marginRight: 8 }} />}
      <Text style={[s.btnText, outline && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <View style={s.copyBox}>
      <Text selectable style={s.copyText}>{text}</Text>
      <Pressable
        style={s.copyBtn}
        onPress={async () => {
          await Clipboard.setStringAsync(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.primaryDark} />
        <Text style={s.copyLabel}>{copied ? 'Skopiowano' : 'Kopiuj prompt'}</Text>
      </Pressable>
    </View>
  );
}

export function TipCard({ tip, onPress, width }: { tip: Tip; onPress: () => void; width?: number }) {
  return (
    <Pressable onPress={onPress} style={[s.card, width ? { width } : { width: '100%' }]}>
      {tip.thumbnail ? (
        <Image source={{ uri: tip.thumbnail }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.cardPlaceholder]}>
          <Text style={{ fontSize: 56 }}>{toolEmoji(tip.tool)}</Text>
        </View>
      )}
      <View style={s.cardShade} />
      {tip.favorite && <Ionicons name="heart" size={20} color="#fff" style={s.cardHeart} />}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{tip.title}</Text>
        <Text style={s.cardMeta} numberOfLines={1}>
          {tip.tool} · {tip.steps.length} kroków{tip.done ? ' · ✓ zrobione' : ''}
        </Text>
      </View>
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

export const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primarySoft, marginRight: 8 },
  chipText: { color: colors.primaryDark, fontWeight: '600', fontSize: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 16 },
  btnOutline: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  copyBox: { backgroundColor: '#F6EEE7', borderRadius: 14, padding: 14, marginTop: 10 },
  copyText: { color: colors.text, fontSize: 15, lineHeight: 22, fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 10, gap: 6 },
  copyLabel: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  card: { height: 220, borderRadius: 22, overflow: 'hidden', backgroundColor: '#6b5a50', marginRight: 14 },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#8a6f5f' },
  cardShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.28)' },
  cardHeart: { position: 'absolute', top: 14, right: 14 },
  cardBody: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  cardMeta: { color: '#fff', opacity: 0.9, marginTop: 4, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: colors.text },
});
