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
  const [limited, setLimited] = useState(false);
  const [added, setAdded] = useState(0);
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
      const access = await ensureGalleryAccess();
      if (access === 'none') return setState('denied');
      setLimited(access === 'limited');
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
      const { items, seen } = await importAlbum(a, known, (done, total) => setProgress(`${done} z ${total}`));
      addItems(items);
      setAdded((n) => n + items.length);
      setResult((r) => ({
        ...r,
        [a.id]: items.length
          ? `Dodano ${items.length} zdjęć do skrzynki „Do posortowania”.`
          : seen === 0
            ? 'Aplikacja nie widzi żadnego zdjęcia w tym albumie. Daj jej dostęp do wszystkich zdjęć (przycisk na górze).'
            : 'Brak nowych zdjęć – wszystkie już są w aplikacji.',
      }));
    } catch {
      setResult((r) => ({ ...r, [a.id]: 'Import się nie udał. Spróbuj ponownie.' }));
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <View style={{ gap: 10, marginBottom: 4 }}>
      {limited && (
        <View style={s.warn}>
          <Text style={[st.small, { color: C.text }]}>
            Telefon dał aplikacji dostęp tylko do wybranych zdjęć, więc import ich nie widzi. Otwórz ustawienia → Uprawnienia → Zdjęcia i filmy → „Zezwalaj na
            wszystkie”, a potem wróć tutaj.
          </Text>
          <Btn label="Otwórz ustawienia telefonu" icon="settings-outline" onPress={() => Linking.openSettings()} />
        </View>
      )}
      {added > 0 && (
        <Pressable style={s.done} onPress={() => nav.replace({ name: 'sort' })} accessibilityRole="button">
          <Ionicons name="file-tray-full-outline" size={24} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={s.doneTitle}>Dodano {added} zdjęć</Text>
            <Text style={s.doneSub}>Stuknij, żeby od razu je posortować</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </Pressable>
      )}
      <View style={s.info}>
        <Ionicons name="information-circle" size={22} color={C.blueInk} />
        <Text style={[st.small, { flex: 1, color: C.text }]}>
          Stuknij niebieską strzałkę przy albumie. Zdjęcia trafią do „Do posortowania” (zielony pasek na głównym ekranie) i do „Zdjęcia z galerii” w menu. Nie
          są kopiowane, więc nie zajmują miejsca. Ponowny import dodaje tylko nowe zdjęcia.
        </Text>
      </View>
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
  info: { flexDirection: 'row', gap: 8, backgroundColor: C.blueSoft, borderRadius: 12, padding: 12 },
  warn: { gap: 10, backgroundColor: C.yellowSoft, borderRadius: 12, padding: 12 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.green, borderRadius: 14, padding: 14 },
  doneTitle: { fontFamily: F.heavy, fontSize: 18, color: '#FFFFFF' },
  doneSub: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },
  album: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  title: { fontFamily: F.heavy, fontSize: 18, color: C.text },
  btn: { backgroundColor: C.blue, borderRadius: 999, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
