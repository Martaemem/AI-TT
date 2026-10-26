import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { normalize, useStore } from '../store';
import { C, F } from '../theme';
import { Btn, TopBar, st } from '../ui';
import { Nav } from '../types';

export default function More({ nav }: { nav: Nav }) {
  const { data, addCategory, renameCategory, deleteCategory, replaceAll } = useStore();
  const [names, setNames] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState('');
  const [msg, setMsg] = useState('');

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    data.items.forEach((i) => i.cats.forEach((c) => (m[c] = (m[c] ?? 0) + 1)));
    return m;
  }, [data.items]);
  const inbox = data.items.filter((i) => !i.cats.length).length;

  const exportBackup = async () => {
    setMsg('');
    try {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      const f = new File(Paths.cache, `inspirownik-kopia-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`);
      if (f.exists) f.delete();
      f.create();
      f.write(JSON.stringify({ app: 'Inspirownik', version: 1, savedAt: d.toISOString(), ...data }));
      if (!(await Sharing.isAvailableAsync())) {
        setMsg('Ten telefon nie pozwala udostępnić pliku.');
        return;
      }
      await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Zapisz kopię Inspirownika' });
    } catch {
      setMsg('Nie udało się przygotować kopii. Spróbuj ponownie.');
    }
  };

  const importBackup = async () => {
    setMsg('');
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const parsed = normalize(JSON.parse(await new File(res.assets[0].uri).text()));
      if (!parsed) {
        setMsg('To nie jest plik kopii Inspirownika.');
        return;
      }
      Alert.alert(
        'Wczytać kopię?',
        `Kopia ma ${parsed.items.length} wpisów i ${parsed.categories.length} kategorii. Zastąpi wszystko, co jest teraz w aplikacji (${data.items.length} wpisów).`,
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Wczytaj',
            style: 'destructive',
            onPress: () => {
              replaceAll(parsed);
              setMsg(`Wczytano ${parsed.items.length} wpisów.`);
            },
          },
        ],
      );
    } catch {
      setMsg('Nie udało się odczytać pliku.');
    }
  };

  const removeCat = (id: string, name: string) =>
    Alert.alert(`Usunąć kategorię „${name}”?`, 'Wpisy zostaną, stracą tylko tę kategorię.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => deleteCategory(id) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Więcej" onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={s.section}>
          <Text style={s.h2}>Porządkowanie</Text>
          <Pressable style={[st.card, s.action]} onPress={() => nav.push({ name: 'import' })}>
            <Ionicons name="images-outline" size={26} color={C.blue} />
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Import z galerii</Text>
              <Text style={st.small}>Dodaj całe albumy, np. zrzuty ekranu albo zdjęcia z Pinteresta.</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.muted} />
          </Pressable>
          <Pressable style={[st.card, s.action]} onPress={() => nav.push({ name: 'sort' })}>
            <Ionicons name="file-tray-full-outline" size={26} color={C.green} />
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>Sortuj skrzynkę</Text>
              <Text style={st.small}>{inbox ? `Do posortowania: ${inbox}` : 'Skrzynka jest pusta.'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.muted} />
          </Pressable>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Kategorie</Text>
          {data.categories.map((c) => (
            <View key={c.id} style={[st.card, s.cat]}>
              <View style={[s.dot, { backgroundColor: c.color }]} />
              <TextInput
                value={names[c.id] ?? c.name}
                onChangeText={(t) => setNames((n) => ({ ...n, [c.id]: t }))}
                onEndEditing={() => names[c.id] !== undefined && renameCategory(c.id, names[c.id])}
                style={s.catInput}
              />
              <Text style={s.count}>{counts[c.id] ?? 0}</Text>
              <Pressable onPress={() => removeCat(c.id, c.name)} accessibilityLabel={`Usuń kategorię ${c.name}`} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={20} color={C.redInk} />
              </Pressable>
            </View>
          ))}
          <View style={s.row}>
            <TextInput
              value={newCat}
              onChangeText={setNewCat}
              placeholder="Nowa kategoria"
              placeholderTextColor={C.muted}
              style={[st.input, { flex: 1 }]}
              onSubmitEditing={() => {
                if (newCat.trim()) addCategory(newCat);
                setNewCat('');
              }}
            />
            <Btn
              label="Dodaj"
              onPress={() => {
                if (newCat.trim()) addCategory(newCat);
                setNewCat('');
              }}
            />
          </View>
          <Text style={st.small}>Nazwę kategorii zmienisz, stukając w nią.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Kopia zapasowa</Text>
          <Text style={st.small}>
            Kopia zawiera wpisy, kategorie, notatki i linki. Zapisz ją np. na Dysku Google. Zdjęcia z galerii zostają w galerii, a kopię wczytasz też na nowym telefonie.
          </Text>
          <View style={s.row}>
            <Btn label="Zapisz kopię" icon="cloud-upload-outline" onPress={exportBackup} style={{ flex: 1 }} />
            <Btn label="Wczytaj" icon="cloud-download-outline" kind="ghost" onPress={importBackup} style={{ flex: 1 }} />
          </View>
          {!!msg && <Text style={s.msg}>{msg}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 10 },
  h2: { fontFamily: F.heavy, fontSize: 20, color: C.text },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  actionTitle: { fontFamily: F.heavy, fontSize: 17, color: C.text },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 4 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  catInput: { flex: 1, fontFamily: F.bold, fontSize: 17, color: C.text, paddingVertical: 8 },
  count: { fontFamily: F.heavy, fontSize: 15, color: C.muted },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  msg: { fontFamily: F.bold, fontSize: 15, color: C.text, backgroundColor: C.yellowSoft, padding: 10, borderRadius: 10 },
});
