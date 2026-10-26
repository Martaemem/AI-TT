import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { newId, useStore } from '../store';
import { C, F } from '../theme';
import { Btn, CatChip, TopBar, st } from '../ui';
import { Item, Nav } from '../types';
import { domainOf, extractUrl, fetchMeta } from '../meta';
import { deletePhoto, isStored, pickFromGallery, storePhoto, takePhoto } from '../photos';

type Props = { nav: Nav; id?: string; url?: string; photos?: string[]; text?: string; cat?: string };

export default function Edit({ nav, id, url: initialUrl, photos: initialPhotos, text, cat }: Props) {
  const { data, saveItem, addCategory } = useStore();
  const existing = id ? data.items.find((i) => i.id === id) : undefined;

  const [url, setUrl] = useState(existing?.url ?? initialUrl ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? (text && !initialUrl ? text : ''));
  const [cats, setCats] = useState<string[]>(existing?.cats ?? (cat && cat !== 'all' && cat !== 'none' ? [cat] : []));
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? initialPhotos ?? []);
  const [image, setImage] = useState<string | undefined>(existing?.image);
  const [site, setSite] = useState<string | undefined>(existing?.site);
  const [fetching, setFetching] = useState(false);
  const [msg, setMsg] = useState('');
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const lastFetched = useRef(existing?.url ?? '');

  const loadMeta = async (u: string, force = false) => {
    const link = extractUrl(u) ?? (u.includes('.') && !u.includes(' ') ? 'https://' + u.trim() : null);
    if (!link) return;
    if (!force && lastFetched.current === link) return;
    lastFetched.current = link;
    if (link !== url) setUrl(link);
    setFetching(true);
    setMsg('');
    const m = await fetchMeta(link);
    setFetching(false);
    setSite(m.site ?? domainOf(link));
    if (m.image) setImage(m.image);
    if (m.title) setTitle((t) => (t && !force ? t : m.title!));
    else setMsg('Strona nie podała tytułu. Wpisz go sama.');
  };

  useEffect(() => {
    if (!existing && initialUrl) loadMeta(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paste = async () => {
    const t = await Clipboard.getStringAsync();
    const link = extractUrl(t);
    if (link) {
      setUrl(link);
      loadMeta(link);
    } else setMsg('W schowku nie ma linku.');
  };

  const addPhotos = async (from: 'gallery' | 'camera') => {
    try {
      const uris = from === 'gallery' ? await pickFromGallery() : await takePhoto();
      if (uris.length) setPhotos((p) => [...p, ...uris]);
    } catch {
      setMsg(from === 'camera' ? 'Aplikacja nie ma zgody na aparat. Włącz ją w ustawieniach telefonu.' : 'Nie udało się dodać zdjęć.');
    }
  };

  const toggleCat = (cid: string) => setCats((c) => (c.includes(cid) ? c.filter((x) => x !== cid) : [...c, cid]));

  const createCat = () => {
    if (!newCat.trim()) return;
    const c = addCategory(newCat);
    setCats((cs) => (cs.includes(c.id) ? cs : [...cs, c.id]));
    setNewCat('');
    setAddingCat(false);
  };

  const save = () => {
    const link = url.trim() ? extractUrl(url) ?? (url.includes('.') ? 'https://' + url.trim() : undefined) : undefined;
    if (!link && !title.trim() && !note.trim() && !photos.length) {
      setMsg('Dodaj link, tytuł, notatkę albo zdjęcie.');
      return;
    }
    let stored: string[];
    try {
      // Zdjęcia już zapisane (także te wskazane w galerii) zostają bez zmian; kopiujemy tylko nowo dodane
      stored = photos.map((p) => (existing?.photos.includes(p) ? p : storePhoto(p)));
    } catch {
      Alert.alert('Zdjęcia', 'Nie udało się zapisać jednego ze zdjęć. Spróbuj dodać je jeszcze raz.');
      return;
    }
    existing?.photos.filter((p) => !stored.includes(p)).forEach(deletePhoto);
    const now = new Date().toISOString();
    const item: Item = {
      id: existing?.id ?? newId(),
      url: link,
      title: title.trim() || (link ? site ?? domainOf(link) : note.trim().split('\n')[0].slice(0, 60) || 'Notatka ze zdjęciem'),
      note: note.trim(),
      photos: stored,
      image: link ? image : undefined,
      site: link ? site ?? domainOf(link) : undefined,
      cats,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    saveItem(item);
    nav.replace({ name: 'detail', id: item.id });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title={existing ? 'Edytuj' : 'Nowy wpis'} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={s.block}>
          <Text style={st.label}>LINK DO STRONY</Text>
          <View style={s.urlRow}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              onEndEditing={() => url.trim() && loadMeta(url)}
              placeholder="https://…"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[st.input, { flex: 1 }]}
            />
            <Pressable onPress={paste} style={s.paste} accessibilityRole="button">
              <Ionicons name="clipboard-outline" size={20} color={C.blueInk} />
              <Text style={s.pasteText}>Wklej</Text>
            </Pressable>
          </View>
          {fetching && (
            <View style={s.fetching}>
              <ActivityIndicator color={C.blue} />
              <Text style={st.small}>Pobieram tytuł i obrazek…</Text>
            </View>
          )}
          {!!image && !fetching && <Image source={{ uri: image }} style={s.preview} resizeMode="cover" />}
          {!!url.trim() && !fetching && (
            <Pressable onPress={() => loadMeta(url, true)}>
              <Text style={s.link}>Pobierz tytuł ze strony jeszcze raz</Text>
            </Pressable>
          )}
        </View>

        <View style={s.block}>
          <Text style={st.label}>TYTUŁ</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Np. Jesienne karty pracy – liczenie" placeholderTextColor={C.muted} style={st.input} />
        </View>

        <View style={s.block}>
          <Text style={st.label}>KATEGORIE (możesz wybrać kilka)</Text>
          <View style={s.chips}>
            {data.categories.map((c) => (
              <CatChip key={c.id} cat={c} on={cats.includes(c.id)} onPress={() => toggleCat(c.id)} />
            ))}
            {!addingCat && (
              <Pressable onPress={() => setAddingCat(true)} style={s.addCat}>
                <Ionicons name="add" size={18} color={C.blueInk} />
                <Text style={s.addCatText}>Nowa kategoria</Text>
              </Pressable>
            )}
          </View>
          {addingCat && (
            <View style={s.urlRow}>
              <TextInput
                value={newCat}
                onChangeText={setNewCat}
                onSubmitEditing={createCat}
                autoFocus
                placeholder="Nazwa kategorii"
                placeholderTextColor={C.muted}
                style={[st.input, { flex: 1 }]}
              />
              <Btn label="Dodaj" onPress={createCat} />
            </View>
          )}
        </View>

        <View style={s.block}>
          <Text style={st.label}>NOTATKA</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Co tu jest ciekawego, jak to wykorzystać, do kiedy…"
            placeholderTextColor={C.muted}
            multiline
            textAlignVertical="top"
            style={[st.input, { minHeight: 140, lineHeight: 24 }]}
          />
        </View>

        <View style={s.block}>
          <Text style={st.label}>ZDJĘCIA</Text>
          {photos.length > 0 && (
            <View style={s.photos}>
              {photos.map((p) => (
                <View key={p}>
                  <Image source={{ uri: p }} style={s.photo} />
                  <Pressable onPress={() => setPhotos((ps) => ps.filter((x) => x !== p))} style={s.remove} accessibilityLabel="Usuń zdjęcie">
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                  {!isStored(p) && !existing?.photos.includes(p) && <View style={s.newDot} />}
                </View>
              ))}
            </View>
          )}
          <View style={s.urlRow}>
            <Btn label="Z galerii" icon="images-outline" kind="ghost" onPress={() => addPhotos('gallery')} style={{ flex: 1 }} />
            <Btn label="Aparat" icon="camera-outline" kind="ghost" onPress={() => addPhotos('camera')} style={{ flex: 1 }} />
          </View>
        </View>

        {!!msg && <Text style={s.msg}>{msg}</Text>}
        <Btn label="Zapisz" icon="checkmark" kind="green" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  block: { gap: 8 },
  urlRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  paste: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: C.card },
  pasteText: { fontFamily: F.heavy, fontSize: 15, color: C.blueInk },
  fetching: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { width: '100%', height: 170, borderRadius: 12, backgroundColor: C.blueSoft },
  link: { fontFamily: F.bold, fontSize: 15, color: C.blueInk, textDecorationLine: 'underline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addCat: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  addCatText: { fontFamily: F.bold, fontSize: 15, color: C.blueInk },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 96, height: 96, borderRadius: 10, backgroundColor: C.blueSoft },
  remove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: 3 },
  newDot: { position: 'absolute', bottom: 6, left: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: C.yellow },
  msg: { fontFamily: F.bold, fontSize: 15, color: C.text, backgroundColor: C.yellowSoft, padding: 10, borderRadius: 10 },
});
