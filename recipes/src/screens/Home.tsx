import React, { useEffect, useMemo, useState } from 'react';
import { AppState, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store';
import { colors } from '../theme';
import { Chip, Header, RecipeCard } from '../components/ui';
import { Nav } from '../nav';
import { extractUrl } from '../source';

const SOCIAL = /tiktok\.com|instagram\.com|facebook\.com|fb\.watch|youtu\.?be/i;

export default function Home({ nav }: { nav: Nav }) {
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  // Wykrywanie linku do posta w schowku po powrocie do aplikacji
  useEffect(() => {
    const check = async () => {
      try {
        const url = extractUrl(await Clipboard.getStringAsync());
        setClipUrl(url && SOCIAL.test(url) && !data.recipes.some((r) => r.url === url) ? url : null);
      } catch {
        setClipUrl(null);
      }
    };
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => sub.remove();
  }, [data.recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.recipes.filter(
      (r) =>
        (!cat || r.category === cat) &&
        (!q || [r.title, r.category, ...r.tags, ...r.ingredients.map((i) => i.name)].some((x) => x.toLowerCase().includes(q))),
    );
  }, [data.recipes, query, cat]);
  const searching = query.trim() !== '' || cat !== null;
  const favorites = data.recipes.filter((r) => r.favorite);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Header title="Przepisy" right={<Text style={st.counter}>{data.recipes.length} zapisanych</Text>} />

      {clipUrl && (
        <Pressable style={st.clip} onPress={() => nav.push({ name: 'add', url: clipUrl })}>
          <Ionicons name="link" size={22} color={colors.primaryDark} />
          <Text style={st.clipText} numberOfLines={2}>Wykryto link w schowku. Dotknij, aby zaimportować przepis.</Text>
        </Pressable>
      )}

      <View style={st.tip}>
        <Text style={{ fontSize: 28 }}>💡</Text>
        <Text style={st.tipText}>
          <Text style={{ fontWeight: '800', color: colors.text }}>Jak importować? </Text>
          W TikToku lub Instagramie wybierz Udostępnij → Przepisy albo wklej link w aplikacji.
        </Text>
      </View>

      <View style={st.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput placeholder="Szukaj przepisów lub składników…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={{ flex: 1, fontSize: 16, color: colors.text }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Chip label="Wszystkie" active={cat === null} onPress={() => setCat(null)} />
        {data.categories.map((c) => (
          <Chip key={c} label={c} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />
        ))}
      </ScrollView>

      {data.recipes.length === 0 ? (
        <View style={st.empty}>
          <Text style={{ fontSize: 56 }}>🍳</Text>
          <Text style={st.emptyTitle}>Brak przepisów</Text>
          <Text style={st.emptyText}>Dotknij „+”, aby zaimportować przepis z linku albo wpisać go ręcznie.</Text>
        </View>
      ) : searching ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[st.h2, { marginBottom: 12 }]}>Wyniki ({filtered.length})</Text>
          {filtered.map((r) => (
            <View key={r.id} style={{ marginBottom: 14 }}>
              <RecipeCard recipe={r} onPress={() => nav.push({ name: 'detail', id: r.id })} />
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={st.rowHead}>
            <Text style={st.h2}>Ostatnio dodane</Text>
            <Pressable onPress={() => nav.push({ name: 'list', filter: 'all', title: 'Wszystkie przepisy' })}>
              <Text style={st.link}>Wszystkie →</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            data={data.recipes.slice(0, 8)}
            keyExtractor={(r) => r.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => <RecipeCard width={290} recipe={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />}
          />
          {favorites.length > 0 && (
            <>
              <View style={[st.rowHead, { marginTop: 24 }]}>
                <Text style={st.h2}>Ulubione</Text>
                <Pressable onPress={() => nav.push({ name: 'list', filter: 'favorites', title: 'Ulubione' })}>
                  <Text style={st.link}>Wszystkie →</Text>
                </Pressable>
              </View>
              <FlatList
                horizontal
                data={favorites}
                keyExtractor={(r) => r.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                renderItem={({ item }) => <RecipeCard width={290} recipe={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />}
              />
            </>
          )}
        </>
      )}
    </ScrollView>
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
});
