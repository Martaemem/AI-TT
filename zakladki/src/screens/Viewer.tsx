import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { C, F } from '../theme';
import { Item, Nav } from '../types';
import { openInGallery } from '../gallery';

const imgOf = (i: Item) => i.photos[0] ?? i.image;

/** Przeglądanie jak w galerii: zdjęcia na pełnym ekranie, przesuwane palcem w bok. */
export default function Viewer({ nav, ids, index }: { nav: Nav; ids: string[]; index: number }) {
  const { data } = useStore();
  const { width } = useWindowDimensions();
  const [h, setH] = useState(0);
  const items = useMemo(() => {
    const byId = new Map(data.items.map((i) => [i.id, i]));
    return ids.map((id) => byId.get(id)).filter((i): i is Item => !!i && !!imgOf(i));
  }, [ids, data.items]);
  const [pos, setPos] = useState(Math.min(index, Math.max(items.length - 1, 0)));
  const [ui, setUi] = useState(true);
  const [msg, setMsg] = useState('');
  const list = useRef<FlatList<Item>>(null);

  const cur = items[pos];
  const cats = cur ? data.categories.filter((c) => cur.cats.includes(c.id)) : [];

  return (
    <View style={s.root} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {h > 0 && (
        <FlatList
          ref={list}
          data={items}
          keyExtractor={(i) => i.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={pos}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          windowSize={5}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          onMomentumScrollEnd={(e) => {
            setPos(Math.round(e.nativeEvent.contentOffset.x / width));
            setMsg('');
          }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setUi((u) => !u)} style={{ width, height: h }}>
              <Image source={{ uri: imgOf(item) }} style={{ width, height: h }} resizeMode="contain" />
            </Pressable>
          )}
        />
      )}

      {ui && (
        <View style={s.top} pointerEvents="box-none">
          <Pressable onPress={nav.pop} style={s.round} accessibilityLabel="Wróć">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={s.counter}>
            {items.length ? pos + 1 : 0} / {items.length}
          </Text>
        </View>
      )}

      {ui && cur && (
        <View style={s.bottom}>
          <Text style={s.title} numberOfLines={2}>
            {cur.title}
          </Text>
          {cats.length > 0 && (
            <View style={s.cats}>
              {cats.map((c) => (
                <View key={c.id} style={[s.cat, { backgroundColor: c.color }]}>
                  <Text style={s.catText} numberOfLines={1}>
                    {c.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {!!cur.note && (
            <Text style={s.note} numberOfLines={3}>
              {cur.note}
            </Text>
          )}
          <View style={s.actions}>
            <Pressable style={s.btn} onPress={() => nav.push({ name: 'detail', id: cur.id })}>
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              <Text style={s.btnText}>Szczegóły</Text>
            </Pressable>
            {!!cur.assetId && (
              <Pressable
                style={[s.btn, { backgroundColor: C.blue }]}
                onPress={async () => {
                  const ok = await openInGallery(cur.assetId!);
                  if (!ok) setMsg('Nie udało się otworzyć galerii. Zdjęcie mogło zostać usunięte z telefonu.');
                }}
              >
                <Ionicons name="images-outline" size={20} color="#FFFFFF" />
                <Text style={s.btnText}>W galerii</Text>
              </Pressable>
            )}
            {!!cur.url && (
              <Pressable style={s.btn} onPress={() => Linking.openURL(cur.url!).catch(() => {})}>
                <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                <Text style={s.btnText}>Strona</Text>
              </Pressable>
            )}
          </View>
          {!!msg && <Text style={s.msg}>{msg}</Text>}
        </View>
      )}

      {!items.length && (
        <View style={s.empty}>
          <Text style={s.title}>Brak zdjęć do pokazania.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  round: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: 10 },
  counter: { fontFamily: F.heavy, fontSize: 16, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 8, backgroundColor: 'rgba(0,0,0,0.65)' },
  title: { fontFamily: F.heavy, fontSize: 18, color: '#FFFFFF' },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cat: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 220 },
  catText: { fontFamily: F.heavy, fontSize: 13, color: '#FFFFFF' },
  note: { fontFamily: F.body, fontSize: 15, color: '#FFFFFF', lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { fontFamily: F.heavy, fontSize: 15, color: '#FFFFFF' },
  msg: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },
  empty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
