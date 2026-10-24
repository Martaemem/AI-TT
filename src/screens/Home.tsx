import React, { useEffect, useMemo, useState } from 'react';
import { AppState, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store';
import { colors, CATEGORIES } from '../theme';
import { Chip, Header, TipCard } from '../components/ui';
import { Nav } from '../nav';
import { extractTikTokUrl } from '../ai';

export default function Home({ nav }: { nav: Nav }) {
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  // Wykrywanie linku TikTok w schowku po powrocie do aplikacji
  useEffect(() => {
    const check = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        const url = extractTikTokUrl(text);
        setClipUrl(url && !data.tips.some((t) => t.url === url) ? url : null);
      } catch {
        setClipUrl(null);
      }
    };
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => sub.remove();
  }, [data.tips]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.tips.filter(
      (t) =>
        (!cat || t.category === cat) &&
        (!q || [t.title, t.tool, t.summary, ...t.tags].some((x) => x.toLowerCase().includes(q))),
    );
  }, [data.tips, query, cat]);

  const searching = query.trim() !== '' || cat !== null;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Header title="Porady AI" right={<Text style={st.counter}>{data.tips.length} zapisanych</Text>} />

      {clipUrl && (
        <Pressable style={st.clip} onPress={() => nav.push({ name: 'add', url: clipUrl })}>
          <Ionicons name="link" size={22} color={colors.primaryDark} />
          <Text style={st.clipText} numberOfLines={2}>Wykryto link TikTok w schowku. Dotknij, aby zaimportować poradę.</Text>
        </Pressable>
      )}

      <View style={st.tip}>
        <Text style={{ fontSize: 28 }}>💡</Text>
        <Text style={st.tipText}>
          <Text style={{ fontWeight: '800', color: colors.text }}>Jak dodać? </Text>
          Skopiuj link z TikToka i wklej go w aplikacji. AI uporządkuje poradę w kroki i prompty.
        </Text>
      </View>

      <View style={st.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput placeholder="Szukaj porad, narzędzi, tagów…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={{ flex: 1, fontSize: 16, color: colors.text }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Chip label="Wszystkie" active={cat === null} onPress={() => setCat(null)} />
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />
        ))}
      </ScrollView>

      {data.tips.length === 0 ? (
        <View style={st.empty}>
          <Text style={{ fontSize: 56 }}>🤖</Text>
          <Text style={st.emptyTitle}>Brak porad</Text>
          <Text style={st.emptyText}>Dotknij „+” i wklej link do filmu TikTok z poradą o AI.</Text>
        </View>
      ) : (
        <>
          <View style={st.rowHead}>
            <Text style={st.h2}>{searching ? `Wyniki (${filtered.length})` : 'Ostatnio dodane'}</Text>
            {!searching && (
              <Pressable onPress={() => nav.push({ name: 'list', collectionId: 'all', title: 'Wszystkie porady' })}>
                <Text style={st.link}>Wszystkie →</Text>
              </Pressable>
            )}
          </View>
          {searching ? (
            <View style={{ paddingHorizontal: 20 }}>
              {filtered.map((t) => (
                <View key={t.id} style={{ marginBottom: 14 }}>
                  <TipCard tip={t} onPress={() => nav.push({ name: 'detail', id: t.id })} />
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              horizontal
              data={filtered.slice(0, 8)}
              keyExtractor={(t) => t.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={({ item }) => <TipCard width={290} tip={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />}
            />
          )}

          {!searching && (
            <>
              <Text style={[st.h2, { marginTop: 28, marginHorizontal: 20 }]}>Twoje zbiory</Text>
              <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
                <CollectionRow emoji="❤️" name="Ulubione" count={data.tips.filter((t) => t.favorite).length} onPress={() => nav.push({ name: 'list', collectionId: 'favorites', title: 'Ulubione' })} />
                {data.collections.map((c) => (
                  <CollectionRow key={c.id} emoji={c.emoji} name={c.name} count={data.tips.filter((t) => t.collectionIds.includes(c.id)).length} onPress={() => nav.push({ name: 'list', collectionId: c.id, title: c.name })} />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function CollectionRow({ emoji, name, count, onPress }: { emoji: string; name: string; count: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.coll}>
      <Text style={{ fontSize: 26, marginRight: 14 }}>{emoji}</Text>
      <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>{name}</Text>
      <Text style={{ color: colors.muted, marginRight: 8 }}>{count}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  counter: { color: colors.primaryDark, fontWeight: '700', backgroundColor: colors.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  clip: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
  clipText: { flex: 1, color: colors.text, fontWeight: '600' },
  tip: { flexDirection: 'row', gap: 12, marginHorizontal: 20, padding: 16, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center' },
  tipText: { flex: 1, color: colors.muted, fontSize: 15, lineHeight: 21 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.card },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, marginTop: 8 },
  h2: { fontSize: 24, fontWeight: '800', color: colors.text },
  link: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12 },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 6, fontSize: 15 },
  coll: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 10 },
});
