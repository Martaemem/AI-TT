import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { C, F } from '../theme';
import { Btn, TopBar, st } from '../ui';
import { Nav } from '../types';
import { AlbumInfo, ensureGalleryAccess, importAlbum, listAlbums } from '../gallery';

export default function Import({ nav }: { nav: Nav }) {
  const { data, addItems } = useStore();
  const [state, setState] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [albums, setAlbums] = useState<AlbumInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<Record<string, string>>({});

  const imported = useMemo(() => {
    const m: Record<string, number> = {};
    data.items.forEach((i) => i.album && (m[i.album] = (m[i.album] ?? 0) + 1));
    return m;
  }, [data.items]);

  const load = async () => {
    setState('loading');
    try {
      if (!(await ensureGalleryAccess())) return setState('denied');
      setAlbums(await listAlbums());
      setState('ready');
    } catch {
      setState('denied');
    }
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (a: AlbumInfo) => {
    if (busy) return;
    setBusy(a.id);
    setProgress('');
    try {
      const known = new Set(data.items.map((i) => i.assetId).filter((x): x is string => !!x));
      const items = await importAlbum(a, known, (done, total) => setProgress(`${done} z ${total}`));
      addItems(items);
      setResult((r) => ({ ...r, [a.id]: items.length ? `Dodano ${items.length} do skrzynki „Do posortowania”.` : 'Brak nowych zdjęć – wszystkie już są.' }));
    } catch {
      setResult((r) => ({ ...r, [a.id]: 'Import się nie udał. Spróbuj ponownie.' }));
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <View style={s.info}>
      <Ionicons name="information-circle" size={22} color={C.blueInk} />
      <Text style={[st.small, { flex: 1, color: C.text }]}>
        Zdjęcia nie są kopiowane, tylko wskazywane w galerii, więc nie zajmują dodatkowego miejsca. Ponowny import albumu dodaje tylko nowe zdjęcia.
        Jeśli usuniesz zdjęcie z galerii, zniknie też tutaj.
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Import z galerii" onBack={nav.pop} />
      {state === 'loading' && (
        <View style={s.center}>
          <ActivityIndicator color={C.blue} size="large" />
        </View>
      )}
      {state === 'denied' && (
        <View style={[s.center, { gap: 12, padding: 24 }]}>
          <Text style={[st.small, { textAlign: 'center', color: C.text }]}>
            Aplikacja potrzebuje dostępu do zdjęć, żeby pokazać albumy. Zezwól na dostęp do wszystkich zdjęć.
          </Text>
          <Btn label="Spróbuj ponownie" onPress={load} />
          <Btn label="Otwórz ustawienia telefonu" kind="ghost" onPress={() => Linking.openSettings()} />
        </View>
      )}
      {state === 'ready' && (
        <FlatList
          data={albums}
          keyExtractor={(a) => a.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
          renderItem={({ item: a }) => (
            <View style={[st.card, s.album]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.title}>{a.title}</Text>
                <Text style={st.small}>
                  {a.count} zdjęć{imported[a.title] ? ` · w aplikacji: ${imported[a.title]}` : ''}
                </Text>
                {busy === a.id && <Text style={[st.small, { color: C.blueInk }]}>Importuję… {progress}</Text>}
                {!!result[a.id] && busy !== a.id && <Text style={[st.small, { color: C.text }]}>{result[a.id]}</Text>}
              </View>
              <Pressable onPress={() => run(a)} disabled={!!busy} style={[s.btn, !!busy && busy !== a.id && { opacity: 0.4 }]}>
                {busy === a.id ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="download-outline" size={22} color="#FFFFFF" />}
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={st.small}>Nie znalazłam albumów ze zdjęciami.</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', gap: 8, backgroundColor: C.blueSoft, borderRadius: 12, padding: 12, marginBottom: 4 },
  album: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  title: { fontFamily: F.heavy, fontSize: 18, color: C.text },
  btn: { backgroundColor: C.blue, borderRadius: 999, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
