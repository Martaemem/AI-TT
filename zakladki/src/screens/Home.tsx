import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { C, F } from '../theme';
import { IconBtn, Logo, st } from '../ui';
import { Category, Item, Nav } from '../types';

const hasImg = (i: Item) => !!(i.photos[0] ?? i.image);

/** Widoki specjalne obok kategorii: wszystko, skrzynka bez kategorii, zdjęcia zaimportowane z galerii. */
export function matchesView(i: Item, cat: string): boolean {
  if (cat === 'all') return true;
  if (cat === 'none') return !i.cats.length;
  if (cat === 'gallery') return !!i.assetId;
  return i.cats.includes(cat);
}

export function viewInfo(cat: string, categories: Category[]): { name: string; color: string } {
  if (cat === 'all') return { name: 'Wszystko', color: C.text };
  if (cat === 'none') return { name: 'Do posortowania', color: C.green };
  if (cat === 'gallery') return { name: 'Zdjęcia z galerii', color: C.blue };
  const c = categories.find((x) => x.id === cat);
  return c ? { name: c.name, color: c.color } : { name: 'Wszystko', color: C.text };
}

export default function Home({ nav, cat, setCat }: { nav: Nav; cat: string; setCat: (c: string) => void }) {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [grid, setGrid] = useState(false);
  const inbox = useMemo(() => data.items.filter((i) => !i.cats.length).length, [data.items]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return data.items
      .filter((i) => matchesView(i, cat))
      .filter((i) => !ql || `${i.title} ${i.note} ${i.url ?? ''} ${i.site ?? ''}`.toLowerCase().includes(ql))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.items, cat, q]);

  const catById = (id: string) => data.categories.find((c) => c.id === id);
  const view = viewInfo(cat, data.categories);

  // Przeglądarka pokazuje wszystkie zdjęcia z bieżącej listy, zaczynając od stukniętego
  const openViewer = (item: Item) => {
    const withImg = rows.filter(hasImg);
    nav.push({ name: 'viewer', ids: withImg.map((i) => i.id), index: Math.max(0, withImg.findIndex((i) => i.id === item.id)) });
  };
  const photoCount = useMemo(() => rows.filter(hasImg).length, [rows]);

  // Zdjęcia z galerii od razu w kafelkach
  useEffect(() => {
    if (cat === 'gallery') setGrid(true);
  }, [cat]);

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <View style={s.head}>
        <Logo />
        <View style={{ flex: 1 }}>
          <Text style={s.h1}>Inspirownik</Text>
          <Text style={st.small}>
            {data.items.length} {data.items.length === 1 ? 'zapisana rzecz' : 'zapisanych rzeczy'}
          </Text>
        </View>
        <IconBtn icon={grid ? 'list-outline' : 'grid-outline'} label={grid ? 'Widok listy' : 'Widok kafelków'} onPress={() => setGrid((g) => !g)} />
        <IconBtn icon="menu" label="Więcej" onPress={() => nav.push({ name: 'more' })} />
      </View>
      {inbox > 0 && (
        <Pressable style={s.inbox} onPress={() => nav.push({ name: 'sort' })} accessibilityRole="button">
          <Ionicons name="file-tray-full-outline" size={24} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={s.inboxTitle}>Do posortowania: {inbox}</Text>
            <Text style={s.inboxSub}>Stuknij, żeby szybko nadać kategorie</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </Pressable>
      )}
      <View style={s.searchBox}>
        <Ionicons name="search" size={20} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Szukaj w tytułach i notatkach…" placeholderTextColor={C.muted} style={s.search} />
        {!!q && (
          <Pressable onPress={() => setQ('')} accessibilityLabel="Wyczyść">
            <Ionicons name="close-circle" size={20} color={C.muted} />
          </Pressable>
        )}
      </View>
      {/* Wyraźnie widać, co jest teraz otwarte; zmiana przez przycisk lub menu ☰ */}
      <View style={[s.viewBar, { borderColor: view.color }]}>
        <View style={[s.viewDot, { backgroundColor: view.color }]} />
        <Pressable style={{ flex: 1 }} onPress={() => nav.push({ name: 'more' })} accessibilityRole="button" accessibilityLabel="Zmień kategorię">
          <Text style={s.viewLabel}>{cat === 'all' ? 'POKAZUJĘ' : 'OTWARTA KATEGORIA'}</Text>
          <Text style={s.viewName} numberOfLines={1}>
            {view.name} · {rows.length}
          </Text>
        </Pressable>
        {cat === 'all' ? (
          <Pressable onPress={() => nav.push({ name: 'more' })} style={s.viewBtn} accessibilityRole="button">
            <Ionicons name="albums-outline" size={18} color={C.blueInk} />
            <Text style={s.viewBtnText}>Kategorie</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setCat('all')} style={s.viewBtn} accessibilityRole="button">
            <Ionicons name="close" size={18} color={C.blueInk} />
            <Text style={s.viewBtnText}>Wszystko</Text>
          </Pressable>
        )}
      </View>
      {photoCount > 0 && (
        <Pressable style={s.browse} onPress={() => openViewer(rows.filter(hasImg)[0])} accessibilityRole="button">
          <Ionicons name="play-circle-outline" size={22} color={C.blueInk} />
          <Text style={s.browseText}>Przeglądaj zdjęcia jak w galerii · {photoCount}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <FlatList
      key={grid ? 'grid' : 'list'}
      data={rows}
      keyExtractor={(i) => i.id}
      numColumns={grid ? 3 : 1}
      columnWrapperStyle={grid ? { gap: 6 } : undefined}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: 16, gap: grid ? 6 : 12, paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={grid ? 24 : 10}
      windowSize={7}
      renderItem={({ item }) =>
        grid ? (
          <Tile item={item} onPress={() => (hasImg(item) ? openViewer(item) : nav.push({ name: 'detail', id: item.id }))} />
        ) : (
          <Row
            item={item}
            onPress={() => nav.push({ name: 'detail', id: item.id })}
            onThumb={hasImg(item) ? () => openViewer(item) : undefined}
            catById={catById}
          />
        )
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="bookmark-outline" size={40} color={C.blue} />
          <Text style={s.emptyTitle}>{data.items.length ? 'Nic tu nie ma' : 'Zapisz pierwszą stronę'}</Text>
          <Text style={[st.small, { textAlign: 'center' }]}>
            {data.items.length
              ? 'Zmień kategorię albo wyszukiwane słowo.'
              : 'Stuknij żółty plus albo w przeglądarce wybierz „Udostępnij” → Inspirownik.'}
          </Text>
        </View>
      }
    />
  );
}

function Tile({ item, onPress }: { item: Item; onPress: () => void }) {
  const thumb = item.photos[0] ?? item.image;
  return (
    <Pressable onPress={onPress} style={s.tile} accessibilityLabel={item.title}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={s.tileImg} resizeMethod="resize" />
      ) : (
        <View style={[s.tileImg, s.thumbEmpty, { padding: 6 }]}>
          <Text style={s.tileText} numberOfLines={4}>
            {item.title}
          </Text>
        </View>
      )}
      {!item.cats.length && <View style={s.tileInbox} />}
    </Pressable>
  );
}

function Row({
  item,
  onPress,
  onThumb,
  catById,
}: {
  item: Item;
  onPress: () => void;
  onThumb?: () => void;
  catById: (id: string) => { name: string; color: string } | undefined;
}) {
  const thumb = item.photos[0] ?? item.image;
  return (
    <Pressable onPress={onPress} style={[st.card, s.row]}>
      {thumb ? (
        <Pressable onPress={onThumb ?? onPress} accessibilityLabel="Pokaż zdjęcie na pełnym ekranie">
          <Image source={{ uri: thumb }} style={s.thumb} resizeMethod="resize" />
        </Pressable>
      ) : (
        <View style={[s.thumb, s.thumbEmpty]}>
          <Ionicons name={item.url ? 'globe-outline' : 'document-text-outline'} size={28} color={C.blue} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.site && (
          <Text style={s.site} numberOfLines={1}>
            {item.site}
          </Text>
        )}
        {!!item.note && (
          <Text style={st.small} numberOfLines={2}>
            {item.note}
          </Text>
        )}
        <View style={s.cats}>
          {item.cats.map((id) => {
            const c = catById(id);
            return c ? (
              <View key={id} style={[s.miniCat, { backgroundColor: c.color }]}>
                <Text style={s.miniCatText} numberOfLines={1}>
                  {c.name}
                </Text>
              </View>
            ) : null;
          })}
          {item.photos.length > 0 && (
            <View style={s.photoCount}>
              <Ionicons name="image-outline" size={14} color={C.muted} />
              <Text style={s.photoCountText}>{item.photos.length}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h1: { fontFamily: F.heavy, fontSize: 28, color: C.text, lineHeight: 34 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12 },
  search: { flex: 1, fontFamily: F.body, fontSize: 17, color: C.text, paddingVertical: 10 },
  browse: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.blueSoft, borderRadius: 12, paddingVertical: 11 },
  browseText: { fontFamily: F.heavy, fontSize: 15, color: C.blueInk },
  viewBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 2, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  viewDot: { width: 14, height: 14, borderRadius: 7 },
  viewLabel: { fontFamily: F.heavy, fontSize: 11, color: C.muted, letterSpacing: 0.6 },
  viewName: { fontFamily: F.heavy, fontSize: 18, color: C.text },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  viewBtnText: { fontFamily: F.heavy, fontSize: 14, color: C.blueInk },
  row: { flexDirection: 'row', gap: 12, padding: 12 },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: C.blueSoft },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.heavy, fontSize: 17, lineHeight: 22, color: C.text },
  site: { fontFamily: F.bold, fontSize: 14, color: C.blueInk },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  miniCat: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, maxWidth: 200 },
  miniCatText: { fontFamily: F.heavy, fontSize: 12, color: '#FFFFFF' },
  photoCount: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  photoCountText: { fontFamily: F.bold, fontSize: 13, color: C.muted },
  inbox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.green, borderRadius: 14, padding: 14 },
  inboxTitle: { fontFamily: F.heavy, fontSize: 18, color: '#FFFFFF' },
  inboxSub: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },
  tile: { flex: 1 / 3, aspectRatio: 1 },
  tileImg: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: C.blueSoft },
  tileText: { fontFamily: F.bold, fontSize: 12, color: C.text },
  tileInbox: { position: 'absolute', top: 5, right: 5, width: 12, height: 12, borderRadius: 6, backgroundColor: C.yellow, borderWidth: 2, borderColor: '#FFFFFF' },
  empty: { alignItems: 'center', gap: 8, padding: 28, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  emptyTitle: { fontFamily: F.heavy, fontSize: 19, color: C.text },
});
