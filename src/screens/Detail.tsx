import React, { useState } from 'react';
import { Alert, Dimensions, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, uid } from '../store';
import { colors } from '../theme';
import { Button, CopyBox, Header, toolEmoji } from '../components/ui';
import { analyzeTip } from '../ai';
import { Nav } from '../nav';
import { pickPhotos, removePhoto, takePhoto } from '../photos';

export default function Detail({ nav, id }: { nav: Nav; id: string }) {
  const { data, updateTip, deleteTip, addCollection, addCategory, addTool } = useStore();
  const [toolPick, setToolPick] = useState(false);
  const [newTool, setNewTool] = useState('');
  const [catPick, setCatPick] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [redoing, setRedoing] = useState(false);
  const tip = data.tips.find((t) => t.id === id);
  const [pick, setPick] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editNote, setEditNote] = useState<{ id: string; text: string } | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  if (!tip) return <Header onBack={nav.pop} />;

  const redo = async () => {
    setRedoing(true);
    const { analysis, error } = await analyzeTip(tip.sourceText, data.settings, '');
    // kategoria wybrana przez użytkownika zostaje, jeśli była już ustawiona poza listą domyślną
    updateTip(tip.id, { ...analysis, category: data.categories.includes(analysis.category) ? analysis.category : tip.category, checked: [] });
    setRedoing(false);
    if (error) Alert.alert('AI niedostępne', `${error}\n\nUżyłem prostego porządkowania offline.`);
  };

  const toggleStep = (i: number) =>
    updateTip(tip.id, { checked: tip.checked.includes(i) ? tip.checked.filter((x) => x !== i) : [...tip.checked, i] });

  const share = () =>
    Share.share({
      message: `${tip.title}\n\n${tip.steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}${tip.url ? `\n\n${tip.url}` : ''}`,
    });

  const confirmDelete = () =>
    Alert.alert('Usunąć poradę?', tip.title, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => { (tip.photos ?? []).forEach(removePhoto); deleteTip(tip.id); nav.pop(); } },
    ]);

  const toggleCollection = (cid: string) =>
    updateTip(tip.id, { collectionIds: tip.collectionIds.includes(cid) ? tip.collectionIds.filter((x) => x !== cid) : [...tip.collectionIds, cid] });

  const photos = tip.photos ?? [];
  const notes = tip.notes ?? [];
  const addPhotos = (uris: string[]) => uris.length && updateTip(tip.id, { photos: [...photos, ...uris] });
  const askPhoto = () =>
    Alert.alert('Dodaj zdjęcie', undefined, [
      { text: 'Z galerii', onPress: () => pickPhotos().then(addPhotos).catch((e) => Alert.alert('Nie udało się dodać zdjęcia', String(e?.message ?? e))) },
      { text: 'Zrób zdjęcie', onPress: () => takePhoto().then((u) => u && addPhotos([u])).catch((e) => Alert.alert('Aparat', String(e?.message ?? e))) },
      { text: 'Anuluj', style: 'cancel' },
    ]);
  const deletePhoto = (uri: string) =>
    Alert.alert('Usunąć zdjęcie?', undefined, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          removePhoto(uri);
          updateTip(tip.id, { photos: photos.filter((p) => p !== uri), cover: tip.cover === uri ? undefined : tip.cover });
          setViewPhoto(null);
        },
      },
    ]);
  const addNote = () => {
    const text = newNote.trim();
    if (!text) return;
    updateTip(tip.id, { notes: [{ id: uid(), text, createdAt: Date.now() }, ...notes] });
    setNewNote('');
  };
  const saveEditedNote = () => {
    if (!editNote) return;
    const text = editNote.text.trim();
    updateTip(tip.id, { notes: text ? notes.map((n) => (n.id === editNote.id ? { ...n, text } : n)) : notes.filter((n) => n.id !== editNote.id) });
    setEditNote(null);
  };
  const noteDate = (t: number) => new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <Header
        onBack={nav.pop}
        right={
          <>
            <Pressable onPress={() => nav.push({ name: 'edit', id: tip.id })} hitSlop={10}><Ionicons name="create-outline" size={25} color={colors.text} /></Pressable>
            <Pressable onPress={confirmDelete} hitSlop={12}><Ionicons name="trash-outline" size={24} color={colors.text} /></Pressable>
          </>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={st.hero}>
          {tip.cover ?? tip.thumbnail ? <Image source={{ uri: tip.cover ?? tip.thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 80 }}>{toolEmoji(tip.tool)}</Text>}
          <Pressable style={st.heart} onPress={() => updateTip(tip.id, { favorite: !tip.favorite })}>
            <Ionicons name={tip.favorite ? 'heart' : 'heart-outline'} size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={st.title}>{tip.title}</Text>
          <View style={st.meta}>
            <Pressable onPress={() => setToolPick(true)}><Badge text={`${toolEmoji(tip.tool)} ${tip.tool} ✎`} /></Pressable>
            <Pressable onPress={() => setCatPick(true)}><Badge text={`${tip.category} ✎`} /></Pressable>
            <Badge text={`Poziom: ${tip.difficulty}`} />
          </View>
          {!!tip.summary && <Text style={st.summary}>{tip.summary}</Text>}

          <View style={st.actions}>
            <Action icon="albums-outline" label="Zbiory" onPress={() => setPick(true)} />
            <Action icon="play-circle-outline" label="Krok po kroku" onPress={() => nav.push({ name: 'steps', id: tip.id })} />
            <Action icon="share-outline" label="Udostępnij" onPress={share} />
          </View>

          {(tip.keyPoints?.length ?? 0) > 0 && (
            <>
              <Text style={st.section}>NAJWAŻNIEJSZE</Text>
              {tip.keyPoints!.map((k, i) => (
                <Text key={i} style={st.need}>• {k}</Text>
              ))}
            </>
          )}

          {(tip.terms?.length ?? 0) > 0 && (
            <>
              <Text style={st.section}>HASŁA I KOMENDY</Text>
              {tip.terms!.map((t, i) => (
                <View key={i} style={st.term}>
                  <Text style={st.termName}>{t.name}</Text>
                  {!!t.desc && <Text style={st.termDesc}>{t.desc}</Text>}
                  <CopyBox text={t.name} />
                </View>
              ))}
            </>
          )}

          {tip.toolsNeeded.length > 0 && (
            <>
              <Text style={st.section}>POTRZEBNE</Text>
              {tip.toolsNeeded.map((t) => (
                <Text key={t} style={st.need}>• {t}</Text>
              ))}
            </>
          )}

          {tip.prompts.length > 0 && (
            <>
              <Text style={st.section}>PROMPTY</Text>
              {tip.prompts.map((p, i) => <CopyBox key={i} text={p} />)}
            </>
          )}

          <Text style={st.section}>INSTRUKCJA</Text>
          <Button title="Wykonaj krok po kroku" icon="play" onPress={() => nav.push({ name: 'steps', id: tip.id })} outline style={{ marginBottom: 14 }} />
          {tip.steps.length === 0 && <Text style={{ color: colors.muted }}>Brak rozpoznanych kroków. Spróbuj dodać transkrypcję filmu.</Text>}
          {tip.steps.map((s, i) => {
            const on = tip.checked.includes(i);
            return (
              <Pressable key={i} onPress={() => toggleStep(i)} style={st.step}>
                <Text style={st.stepNo}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.stepText, on && { textDecorationLine: 'line-through', color: colors.muted }]}>{s.text}</Text>
                  {!!s.prompt && <CopyBox text={s.prompt} />}
                </View>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? colors.primary : colors.muted} />
              </Pressable>
            );
          })}

          <Button title={redoing ? 'Porządkuję…' : data.settings.apiKey.trim() ? '✨ Uporządkuj ponownie z AI' : 'Uporządkuj ponownie'} outline disabled={redoing} onPress={redo} style={{ marginTop: 18 }} />

          {tip.url && (
            <Pressable onPress={() => Linking.openURL(tip.url!)} style={{ marginTop: 18 }}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>Otwórz TikTok{tip.author ? ` (@${tip.author})` : ''} ↗</Text>
            </Pressable>
          )}

          <Text style={st.section}>NOTATKI</Text>
          <View style={st.doneRow}>
            <Pressable onPress={() => updateTip(tip.id, { done: !tip.done })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name={tip.done ? 'checkmark-circle' : 'ellipse-outline'} size={30} color={tip.done ? colors.green : colors.danger} />
              <Text style={{ fontSize: 17, color: colors.text }}>{tip.done ? 'Wypróbowane' : 'Oznacz jako wypróbowane'}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => updateTip(tip.id, { rating: tip.rating === n ? 0 : n })}>
                  <Ionicons name="star" size={26} color={n <= tip.rating ? '#F5B301' : '#D9D2CC'} />
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'flex-end' }}>
            <TextInput value={newNote} onChangeText={setNewNote} placeholder="Dodaj notatkę" placeholderTextColor={colors.muted} multiline style={[st.note, { flex: 1, marginTop: 0, minHeight: 56 }]} />
            <Button title="Dodaj" onPress={addNote} disabled={!newNote.trim()} />
          </View>
          {notes.map((n) => (
            <Pressable key={n.id} onPress={() => setEditNote({ id: n.id, text: n.text })} style={st.noteCard}>
              <Text style={{ fontSize: 16, lineHeight: 23, color: colors.text }}>{n.text}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{noteDate(n.createdAt)} · dotknij, aby edytować</Text>
            </Pressable>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={st.section}>ZDJĘCIA</Text>
            <Pressable onPress={askPhoto} style={st.addPhoto} hitSlop={8}>
              <Ionicons name="camera-outline" size={18} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Dodaj</Text>
            </Pressable>
          </View>
          {photos.length === 0 && <Text style={{ color: colors.muted }}>Dodaj własne zdjęcia, np. zrzuty ekranu albo efekt wypróbowania porady.</Text>}
          <View style={st.grid}>
            {photos.map((u) => (
              <Pressable key={u} onPress={() => setViewPhoto(u)} style={st.thumb}>
                <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} />
                {tip.cover === u && <View style={st.coverTag}><Ionicons name="star" size={12} color="#fff" /></View>}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!editNote} transparent animationType="slide" onRequestClose={() => setEditNote(null)}>
        <Pressable style={st.backdrop} onPress={() => setEditNote(null)} />
        <View style={st.sheet}>
          <Text style={[st.title, { fontSize: 22 }]}>Edytuj notatkę</Text>
          <TextInput value={editNote?.text ?? ''} onChangeText={(text) => setEditNote((e) => (e ? { ...e, text } : e))} multiline autoFocus style={[st.note, { minHeight: 120 }]} />
          <Text style={{ color: colors.muted, marginTop: 8 }}>Puste pole usunie notatkę.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button title="Usuń" outline onPress={() => { if (editNote) updateTip(tip.id, { notes: notes.filter((n) => n.id !== editNote.id) }); setEditNote(null); }} style={{ flex: 1 }} />
            <Button title="Zapisz" onPress={saveEditedNote} style={{ flex: 2 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!viewPhoto} animationType="fade" onRequestClose={() => setViewPhoto(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {viewPhoto && <Image source={{ uri: viewPhoto }} style={{ flex: 1 }} resizeMode="contain" />}
          <View style={st.viewerBar}>
            <Pressable onPress={() => setViewPhoto(null)} style={st.viewerBtn}><Ionicons name="close" size={22} color="#fff" /><Text style={st.viewerTxt}>Zamknij</Text></Pressable>
            <Pressable onPress={() => { if (viewPhoto) updateTip(tip.id, { cover: tip.cover === viewPhoto ? undefined : viewPhoto }); setViewPhoto(null); }} style={st.viewerBtn}>
              <Ionicons name={tip.cover === viewPhoto ? 'star' : 'star-outline'} size={22} color="#fff" />
              <Text style={st.viewerTxt}>{tip.cover === viewPhoto ? 'Zdejmij okładkę' : 'Ustaw jako okładkę'}</Text>
            </Pressable>
            <Pressable onPress={() => viewPhoto && deletePhoto(viewPhoto)} style={st.viewerBtn}><Ionicons name="trash-outline" size={22} color="#fff" /><Text style={st.viewerTxt}>Usuń</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={toolPick} transparent animationType="slide" onRequestClose={() => setToolPick(false)}>
        <Pressable style={st.backdrop} onPress={() => setToolPick(false)} />
        <View style={st.sheet}>
          <Text style={[st.title, { fontSize: 22 }]}>Narzędzie AI</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {data.tools.map((n) => (
              <Pressable key={n} onPress={() => { updateTip(tip.id, { tool: n }); setToolPick(false); }} style={st.collRow}>
                <Text style={{ flex: 1, fontSize: 17, color: colors.text }}>{toolEmoji(n)} {n}</Text>
                <Ionicons name={tip.tool === n ? 'radio-button-on' : 'radio-button-off'} size={24} color={tip.tool === n ? colors.primary : colors.muted} />
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TextInput value={newTool} onChangeText={setNewTool} placeholder="Nowe narzędzie…" placeholderTextColor={colors.muted} style={[st.note, { flex: 1, marginTop: 0, minHeight: 0 }]} />
            <Button
              title="Dodaj"
              onPress={() => {
                const name = newTool.trim();
                if (!name) return;
                addTool(name);
                updateTip(tip.id, { tool: name });
                setNewTool('');
                setToolPick(false);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={catPick} transparent animationType="slide" onRequestClose={() => setCatPick(false)}>
        <Pressable style={st.backdrop} onPress={() => setCatPick(false)} />
        <View style={st.sheet}>
          <Text style={[st.title, { fontSize: 22 }]}>Kategoria porady</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {data.categories.map((c) => (
              <Pressable key={c} onPress={() => { updateTip(tip.id, { category: c }); setCatPick(false); }} style={st.collRow}>
                <Text style={{ flex: 1, fontSize: 17, color: colors.text }}>{c}</Text>
                <Ionicons name={tip.category === c ? 'radio-button-on' : 'radio-button-off'} size={24} color={tip.category === c ? colors.primary : colors.muted} />
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TextInput value={newCat} onChangeText={setNewCat} placeholder="Nowa kategoria…" placeholderTextColor={colors.muted} style={[st.note, { flex: 1, marginTop: 0, minHeight: 0 }]} />
            <Button
              title="Dodaj"
              onPress={() => {
                const name = newCat.trim();
                if (!name) return;
                addCategory(name);
                updateTip(tip.id, { category: name });
                setNewCat('');
                setCatPick(false);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={pick} transparent animationType="slide" onRequestClose={() => setPick(false)}>
        <Pressable style={st.backdrop} onPress={() => setPick(false)} />
        <View style={st.sheet}>
          <Text style={[st.title, { fontSize: 22 }]}>Dodaj do zbioru</Text>
          {data.collections.map((c) => {
            const on = tip.collectionIds.includes(c.id);
            return (
              <Pressable key={c.id} onPress={() => toggleCollection(c.id)} style={st.collRow}>
                <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
                <Text style={{ flex: 1, fontSize: 17, color: colors.text }}>{c.name}</Text>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? colors.primary : colors.muted} />
              </Pressable>
            );
          })}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TextInput value={newName} onChangeText={setNewName} placeholder="Nowy zbiór…" placeholderTextColor={colors.muted} style={[st.note, { flex: 1, marginTop: 0, minHeight: 0 }]} />
            <Button
              title="Dodaj"
              onPress={() => {
                const name = newName.trim();
                if (!name) return;
                const cid = uid();
                addCollection({ id: cid, name, emoji: '📁' });
                updateTip(tip.id, { collectionIds: [...tip.collectionIds, cid] });
                setNewName('');
              }}
            />
          </View>
          <Button title="Gotowe" outline onPress={() => setPick(false)} style={{ marginTop: 14 }} />
        </View>
      </Modal>
    </View>
  );
}

const Badge = ({ text }: { text: string }) => (
  <View style={st.badge}><Text style={{ color: colors.primaryDark, fontWeight: '600', fontSize: 13 }}>{text}</Text></View>
);

const Action = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ alignItems: 'center', flex: 1 }}>
    <View style={st.actionCircle}><Ionicons name={icon} size={28} color={colors.primary} /></View>
    <Text style={{ marginTop: 8, color: colors.text, fontSize: 14, textAlign: 'center' }}>{label}</Text>
  </Pressable>
);

const st = StyleSheet.create({
  hero: { height: 240, backgroundColor: '#8a6f5f', alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  summary: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 14 },
  actions: { flexDirection: 'row', marginTop: 22 },
  actionCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  section: { color: '#F59E0B', fontWeight: '800', letterSpacing: 1.5, marginTop: 28, marginBottom: 12, fontSize: 15 },
  term: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  termName: { fontSize: 18, fontWeight: '800', color: colors.text },
  termDesc: { color: colors.muted, fontSize: 15, marginTop: 4, lineHeight: 21 },
  need: { fontSize: 17, color: colors.text, marginBottom: 6 },
  step: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'flex-start' },
  stepNo: { fontSize: 24, fontWeight: '800', color: colors.primary, width: 28 },
  stepText: { fontSize: 18, lineHeight: 26, color: colors.text },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  note: { backgroundColor: '#F2EFEC', borderRadius: 14, padding: 14, minHeight: 90, fontSize: 16, marginTop: 14, color: colors.text, textAlignVertical: 'top' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  noteCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 10 },
  addPhoto: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  thumb: { width: (Dimensions.get('window').width - 40 - 16) / 3, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E7E0DA' },
  coverTag: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  viewerBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 18, paddingBottom: 30, backgroundColor: '#111' },
  viewerBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10 },
  viewerTxt: { color: '#fff', fontSize: 13 },
  collRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
});
