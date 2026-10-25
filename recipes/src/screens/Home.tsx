import React, { useEffect, useMemo, useState } from 'react';
import { AppState, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store';
import { box, colors, fonts } from '../theme';
import { Chip, Header, RecipeCard, Text, inputStyle } from '../components/ui';
import { Art } from '../components/Art';
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
    <View style={{ flex: 1 }}>
      <Header logo title="bsmak" right={<View style={st.counter}><Text style={st.counterText}>{data.recipes.length} przepisów</Text></View>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28, paddingTop: 18 }} keyboardShouldPersistTaps="handled">
        {clipUrl && (
          <Pressable style={[st.clip, box(colors.yellow, 22)]} onPress={() => nav.push({ name: 'add', url: clipUrl })}>
            <Ionicons name="link" size={24} color={colors.ink} />
            <Text style={st.clipText} numberOfLines={2}>Wykryto link w schowku. Dotknij, aby zaimportować przepis.</Text>
          </Pressable>
        )}

        <View style={[st.tip, box(colors.mint, 26)]}>
          <Art kind="pot" size={78} />
          <View style={{ flex: 1 }}>
            <Text style={st.tipTitle}>Jak importować?</Text>
            <Text style={st.tipText}>W TikToku lub Instagramie wybierz Udostępnij → BSmak albo wklej link w aplikacji.</Text>
          </View>
        </View>

        <View style={st.searchWrap}>
          <Ionicons name="search" size={22} color={colors.ink} />
          <TextInput placeholder="Szukaj przepisów lub składników…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={st.searchInput} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          <Chip label="Wszystkie" active={cat === null} onPress={() => setCat(null)} />
          {data.categories.map((c) => (
            <Chip key={c} label={c} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />
          ))}
        </ScrollView>

        {data.recipes.length === 0 ? (
          <View style={st.empty}>
            <Art kind="basket" size={130} />
            <Text style={st.emptyTitle}>Jeszcze pusto</Text>
            <Text style={st.emptyText}>Dotknij „+”, aby zaimportować przepis z linku albo wpisać go ręcznie.</Text>
          </View>
        ) : searching ? (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={[st.h2, { marginBottom: 14 }]}>Wyniki ({filtered.length})</Text>
            {filtered.map((r) => (
              <View key={r.id} style={{ marginBottom: 6 }}>
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
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6 }}
              renderItem={({ item }) => <RecipeCard width={280} recipe={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />}
            />
            {favorites.length > 0 && (
              <>
                <View style={[st.rowHead, { marginTop: 22 }]}>
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
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6 }}
                  renderItem={({ item }) => <RecipeCard width={280} recipe={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  counter: { backgroundColor: colors.yellow, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 4, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 4 },
  counterText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  clip: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 16, padding: 14 },
  clipText: { flex: 1, color: colors.ink, fontWeight: '700' },
  tip: { flexDirection: 'row', gap: 12, marginHorizontal: 20, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  tipTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, lineHeight: 28 },
  tipText: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 18, ...box(colors.card, 20), borderBottomWidth: 4, paddingHorizontal: 14 },
  searchInput: { ...inputStyle, flex: 1, borderWidth: 0, borderBottomWidth: 0, paddingHorizontal: 0 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 12 },
  h2: { fontSize: 26, fontFamily: fonts.display, color: colors.ink, lineHeight: 34 },
  link: { color: colors.ink, fontSize: 16, fontWeight: '800', textDecorationLine: 'underline' },
  empty: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 26, fontFamily: fonts.display, color: colors.ink, marginTop: 8, lineHeight: 34 },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 4, fontSize: 16 },
});
