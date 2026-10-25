import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store';
import { colors } from '../theme';
import { Chip, Header } from '../components/ui';
import { Nav } from '../nav';

type Kind = 'info' | 'term' | 'prompt' | 'quote';
type Item = { key: string; kind: Kind; text: string; sub?: string; tipId: string; tipTitle: string; category: string; tags: string[] };

const KIND_LABEL: Record<Kind, string> = { info: 'Informacja', term: 'Hasło', prompt: 'Prompt', quote: 'Z transkrypcji' };
const FILTERS: { id: Kind | 'all'; label: string }[] = [
  { id: 'all', label: 'Wszystko' },
  { id: 'info', label: 'Informacje' },
  { id: 'term', label: 'Hasła' },
  { id: 'prompt', label: 'Prompty' },
];

/** Baza wiedzy: wszystkie ważne informacje, hasła i prompty z porad w jednym miejscu, z wyszukiwarką. */
export default function Knowledge({ nav }: { nav: Nav }) {
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [copied, setCopied] = useState('');

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const t of data.tips) {
      const base = { tipId: t.id, tipTitle: t.title, category: t.category, tags: t.tags };
      const info = t.keyPoints?.length ? t.keyPoints : (t.terms?.length ? [] : t.steps.map((s) => s.text));
      info.forEach((text, i) => out.push({ ...base, key: `${t.id}i${i}`, kind: 'info', text }));
      (t.terms ?? []).forEach((x, i) => out.push({ ...base, key: `${t.id}t${i}`, kind: 'term', text: x.name, sub: x.desc }));
      [...new Set([...t.prompts, ...t.steps.map((s) => s.prompt).filter((p): p is string => !!p)])].forEach((text, i) =>
        out.push({ ...base, key: `${t.id}p${i}`, kind: 'prompt', text }),
      );
    }
    return out;
  }, [data.tips]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    const matches = items.filter(
      (it) =>
        (!cat || it.category === cat) &&
        (kind === 'all' || it.kind === kind) &&
        (!q || [it.text, it.sub ?? '', it.tipTitle, it.category, ...it.tags].some((x) => x.toLowerCase().includes(q))),
    );
    if (!q || (kind !== 'all' && kind !== 'info')) return matches;
    // gdy fraza występuje tylko w transkrypcji, pokaż fragment z kontekstem
    const seen = new Set(matches.map((m) => m.tipId));
    const quotes: Item[] = [];
    for (const t of data.tips) {
      if (seen.has(t.id) || (cat && t.category !== cat)) continue;
      const at = t.sourceText.toLowerCase().indexOf(q);
      if (at < 0) continue;
      const text = `…${t.sourceText.slice(Math.max(0, at - 60), at + 160).replace(/\s+/g, ' ')}…`;
      quotes.push({ key: `${t.id}q`, kind: 'quote', text, tipId: t.id, tipTitle: t.title, category: t.category, tags: t.tags });
    }
    return [...matches, ...quotes];
  }, [items, q, cat, kind, data.tips]);

  const copy = async (it: Item) => {
    await Clipboard.setStringAsync(it.text);
    setCopied(it.key);
    setTimeout(() => setCopied(''), 1200);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Header title="Wiedza" />
      <View style={st.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput placeholder="Szukaj np. POV, prompt, ChatGPT…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={{ flex: 1, fontSize: 16, color: colors.text }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {FILTERS.map((f) => <Chip key={f.id} label={f.label} active={kind === f.id} onPress={() => setKind(f.id)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        <Chip label="Wszystkie kategorie" active={cat === null} onPress={() => setCat(null)} />
        {data.categories.map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />)}
      </ScrollView>

      {shown.length === 0 && (
        <Text style={st.empty}>{items.length === 0 ? 'Tu pojawią się ważne informacje z dodanych porad.' : 'Nic nie znaleziono.'}</Text>
      )}
      {shown.map((it) => (
        <View key={it.key} style={st.card}>
          <Text style={st.kind}>{KIND_LABEL[it.kind].toUpperCase()} · {it.category}</Text>
          <Text selectable style={[st.text, it.kind === 'term' && { fontWeight: '800' }, it.kind === 'prompt' && { fontFamily: 'monospace', fontSize: 15 }]}>{it.text}</Text>
          {!!it.sub && <Text style={st.sub}>{it.sub}</Text>}
          <View style={st.row}>
            <Pressable onPress={() => nav.push({ name: 'detail', id: it.tipId })} style={{ flex: 1 }}>
              <Text style={st.from} numberOfLines={1}>{it.tipTitle} →</Text>
            </Pressable>
            <Pressable onPress={() => copy(it)} style={st.copy}>
              <Ionicons name={copied === it.key ? 'checkmark' : 'copy-outline'} size={16} color={colors.primaryDark} />
              <Text style={st.copyLabel}>{copied === it.key ? 'Skopiowano' : 'Kopiuj'}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.card },
  chips: { paddingHorizontal: 20, paddingTop: 12 },
  empty: { color: colors.muted, textAlign: 'center', margin: 40, fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginHorizontal: 20, marginTop: 12 },
  kind: { color: '#F59E0B', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  text: { color: colors.text, fontSize: 17, lineHeight: 24, marginTop: 6 },
  sub: { color: colors.muted, fontSize: 15, marginTop: 4, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  from: { color: colors.muted, fontSize: 14 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyLabel: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
