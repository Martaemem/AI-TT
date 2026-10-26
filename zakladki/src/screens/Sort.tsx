import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { C, F } from '../theme';
import { Btn, CatChip, TopBar, st } from '../ui';
import { Item, Nav } from '../types';

/** Szybkie sortowanie: po jednym wpisie bez kategorii, duże zdjęcie, kategorie jednym stuknięciem. */
export default function Sort({ nav }: { nav: Nav }) {
  const { data, saveItem, deleteItem, addCategory } = useStore();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(0);
  const [undo, setUndo] = useState<Item | null>(null);
  const [newCat, setNewCat] = useState('');
  const [adding, setAdding] = useState(false);

  const inbox = useMemo(() => data.items.filter((i) => !i.cats.length), [data.items]);
  const queue = useMemo(() => [...inbox.filter((i) => !skipped.includes(i.id)), ...inbox.filter((i) => skipped.includes(i.id))], [inbox, skipped]);
  const cur = queue[0];

  useEffect(() => {
    setCats([]);
    setNote(cur?.note ?? '');
  }, [cur?.id]);

  if (!cur) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="Sortowanie" onBack={nav.pop} />
        <View style={s.doneBox}>
          <Ionicons name="checkmark-circle" size={64} color={C.green} />
          <Text style={s.doneTitle}>Skrzynka pusta!</Text>
          <Text style={[st.small, { textAlign: 'center' }]}>
            {done ? `Posortowane w tej sesji: ${done}. ` : ''}Wszystko ma swoją kategorię.
          </Text>
          <Btn label="Wróć do listy" onPress={nav.pop} />
        </View>
      </View>
    );
  }

  const img = cur.photos[0] ?? cur.image;
  const toggle = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const next = () => {
    if (!cats.length) {
      setSkipped((s) => [...s.filter((x) => x !== cur.id), cur.id]);
      return;
    }
    saveItem({ ...cur, cats, note: note.trim(), updatedAt: new Date().toISOString() });
    setDone((d) => d + 1);
    setUndo(null);
  };
  const remove = () => {
    setUndo(cur);
    deleteItem(cur.id);
  };
  const createCat = () => {
    if (!newCat.trim()) return;
    const c = addCategory(newCat);
    setCats((cs) => (cs.includes(c.id) ? cs : [...cs, c.id]));
    setNewCat('');
    setAdding(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <TopBar title={`Do posortowania: ${inbox.length}`} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {img ? (
          <Image source={{ uri: img }} style={s.img} resizeMode="contain" resizeMethod="resize" />
        ) : (
          <View style={[s.img, s.noImg]}>
            <Ionicons name="document-text-outline" size={48} color={C.blue} />
          </View>
        )}
        <Text style={s.title}>{cur.title}</Text>
        {!!cur.url && (
          <Pressable onPress={() => Linking.openURL(cur.url!).catch(() => {})}>
            <Text style={s.link} numberOfLines={1}>
              {cur.site ?? cur.url}
            </Text>
          </Pressable>
        )}
        <View style={s.chips}>
          {data.categories.map((c) => (
            <CatChip key={c.id} cat={c} on={cats.includes(c.id)} onPress={() => toggle(c.id)} />
          ))}
          {!adding && (
            <Pressable onPress={() => setAdding(true)} style={s.addCat}>
              <Ionicons name="add" size={18} color={C.blueInk} />
              <Text style={s.addCatText}>Nowa</Text>
            </Pressable>
          )}
        </View>
        {adding && (
          <View style={s.row}>
            <TextInput value={newCat} onChangeText={setNewCat} onSubmitEditing={createCat} autoFocus placeholder="Nazwa kategorii" placeholderTextColor={C.muted} style={[st.input, { flex: 1 }]} />
            <Btn label="Dodaj" onPress={createCat} />
          </View>
        )}
        <TextInput value={note} onChangeText={setNote} placeholder="Notatka (opcjonalnie)" placeholderTextColor={C.muted} multiline style={[st.input, { minHeight: 70 }]} />
        <View style={s.row}>
          <Btn label="Usuń" icon="trash-outline" kind="ghost" onPress={remove} style={{ flex: 1 }} />
          <Btn label={cats.length ? 'Zapisz i dalej' : 'Pomiń'} icon="arrow-forward" kind={cats.length ? 'green' : 'primary'} onPress={next} style={{ flex: 2 }} />
        </View>
        {cur.assetId && <Text style={[st.small, { textAlign: 'center' }]}>„Usuń” usuwa wpis tylko z aplikacji. Zdjęcie zostaje w galerii.</Text>}
        {undo && (
          <Pressable
            onPress={() => {
              saveItem(undo);
              setUndo(null);
            }}
            style={s.undo}
          >
            <Text style={s.undoText}>Usunięto „{undo.title}”. Cofnij</Text>
          </Pressable>
        )}
        {done > 0 && <Text style={[st.small, { textAlign: 'center' }]}>Posortowane w tej sesji: {done}</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  img: { width: '100%', height: 340, borderRadius: 14, backgroundColor: '#11151B' },
  noImg: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.blueSoft },
  title: { fontFamily: F.heavy, fontSize: 19, color: C.text },
  link: { fontFamily: F.bold, fontSize: 15, color: C.blueInk, textDecorationLine: 'underline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addCat: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  addCatText: { fontFamily: F.bold, fontSize: 15, color: C.blueInk },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  undo: { backgroundColor: C.text, borderRadius: 10, padding: 12 },
  undoText: { fontFamily: F.bold, fontSize: 15, color: '#FFFFFF', textAlign: 'center' },
  doneBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  doneTitle: { fontFamily: F.heavy, fontSize: 24, color: C.text },
});
