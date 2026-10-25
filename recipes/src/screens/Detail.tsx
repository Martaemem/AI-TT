import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { box, categoryColor, colors, fonts } from '../theme';
import { Button, Check, Header, Stepper, Tag, Text, inputStyle } from '../components/ui';
import { Art, kindFor } from '../components/Art';
import { Nav } from '../nav';
import { formatIngredient, formatMinutes } from '../units';
import { dayLabel, nextDays } from '../dates';

export default function Detail({ nav, id }: { nav: Nav; id: string }) {
  const { data, updateRecipe, deleteRecipe, addToShopping, addToPlan, addCategory } = useStore();
  const recipe = data.recipes.find((r) => r.id === id);
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [checked, setChecked] = useState<number[]>([]);
  const [toast, setToast] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!recipe) return <Header onBack={nav.pop} />;
  const factor = servings / recipe.servings;

  const share = () =>
    Share.share({
      message: `${recipe.title}\n\nSkładniki (${servings} porcji):\n${recipe.ingredients.map((i) => `• ${formatIngredient(i, factor)}`).join('\n')}\n\nPrzygotowanie:\n${recipe.steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}${recipe.url ? `\n\n${recipe.url}` : ''}`,
    });

  const confirmDelete = () =>
    Alert.alert('Usunąć przepis?', recipe.title, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => { deleteRecipe(recipe.id); nav.pop(); } },
    ]);

  const shop = () => {
    const missing = recipe.ingredients.filter((_, i) => !checked.includes(i));
    addToShopping(missing.length ? missing : recipe.ingredients, factor, recipe.title);
    setToast('Produkty dodane do listy zakupów');
  };

  return (
    <View style={{ flex: 1 }}>
      <Header
        onBack={nav.pop}
        right={
          <>
            <Pressable onPress={() => nav.push({ name: 'edit', id: recipe.id })} hitSlop={10}><Text style={st.edit}>Edytuj</Text></Pressable>
            <Pressable onPress={confirmDelete} hitSlop={12}><Ionicons name="trash-outline" size={24} color={colors.ink} /></Pressable>
          </>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={[st.hero, { backgroundColor: categoryColor(recipe.category) }]}>
          {recipe.image ? <Image source={{ uri: recipe.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Art kind={kindFor(recipe.category)} size={170} />}
          <Pressable style={st.heart} onPress={() => updateRecipe(recipe.id, { favorite: !recipe.favorite })}>
            <Ionicons name={recipe.favorite ? 'heart' : 'heart-outline'} size={24} color={recipe.favorite ? colors.coral : colors.ink} />
          </Pressable>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={st.title}>{recipe.title}</Text>
          <View style={st.meta}>
            <Pressable onPress={() => setCatOpen(true)}><Tag label={`${recipe.category} ✎`} bg={categoryColor(recipe.category)} /></Pressable>
            {!!recipe.time && <Tag label={formatMinutes(recipe.time)} />}
            {recipe.cookedCount > 0 && <Tag label={`ugotowane ${recipe.cookedCount}×`} bg={colors.mint} />}
          </View>

          <View style={st.actions}>
            <Action icon="calendar-outline" label="Jadłospis" bg={colors.lavender} onPress={() => setPlanOpen(true)} />
            <Action icon="cart-outline" label="Zakupy" bg={colors.mint} onPress={shop} />
            <Action icon="share-outline" label="Udostępnij" bg={colors.pink} onPress={share} />
          </View>

          <Button title="Gotuj krok po kroku" icon="play" onPress={() => nav.push({ name: 'cook', id: recipe.id, servings })} style={{ marginTop: 22 }} disabled={recipe.steps.length === 0} />

          <View style={st.sectionHead}><Tag label="Składniki" /></View>
          <View style={st.servRow}>
            <Stepper value={servings} onChange={setServings} />
            <Text style={{ color: colors.muted, fontSize: 16, fontWeight: '700' }}>{servings === 1 ? 'porcja' : servings < 5 ? 'porcje' : 'porcji'}</Text>
          </View>
          <View style={[box(colors.card, 24), { marginTop: 14, paddingHorizontal: 16 }]}>
            {recipe.ingredients.length === 0 && <Text style={{ color: colors.muted, paddingVertical: 16 }}>Brak składników. Dotknij „Edytuj”, aby je dodać.</Text>}
            {recipe.ingredients.map((ing, i) => {
              const on = checked.includes(i);
              return (
                <Pressable key={i} onPress={() => setChecked((c) => (on ? c.filter((x) => x !== i) : [...c, i]))} style={[st.ing, i > 0 && st.ingLine]}>
                  <Text style={[st.ingText, on && { textDecorationLine: 'line-through', color: colors.muted }]}>{formatIngredient(ing, factor)}</Text>
                  <Check on={on} />
                </Pressable>
              );
            })}
          </View>
          {checked.length > 0 && <Text style={st.hint}>Zaznaczone składniki (masz je w domu) nie trafią na listę zakupów.</Text>}

          <View style={st.sectionHead}><Tag label="Przygotowanie" /></View>
          {recipe.url && (
            <Pressable onPress={() => Linking.openURL(recipe.url!)}>
              <Text style={{ color: colors.muted, fontSize: 16, marginBottom: 8, fontWeight: '700', textDecorationLine: 'underline' }}>Otwórz źródło{recipe.author ? ` (@${recipe.author})` : ''} ↗</Text>
            </Pressable>
          )}
          {recipe.steps.length === 0 && <Text style={{ color: colors.muted }}>Brak kroków. Dotknij „Edytuj”, aby je dodać.</Text>}
          {recipe.steps.map((s, i) => (
            <View key={i} style={st.step}>
              <View style={st.stepNo}><Text style={st.stepNoText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.stepText}>{s.text}</Text>
                {!!s.minutes && <Text style={st.stepTime}>{formatMinutes(s.minutes)}</Text>}
              </View>
            </View>
          ))}

          <View style={st.sectionHead}><Tag label="Notatki" /></View>
          <View style={st.doneRow}>
            <Pressable onPress={() => updateRecipe(recipe.id, { cookedCount: recipe.cookedCount + 1 })} style={[box(colors.mint, 20), st.cookedBtn]}>
              <Ionicons name="restaurant-outline" size={22} color={colors.ink} />
              <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '800' }}>Ugotowane!</Text>
            </Pressable>
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => updateRecipe(recipe.id, { rating: recipe.rating === n ? 0 : n })}>
                  <Ionicons name="star" size={28} color={n <= recipe.rating ? colors.yellow : colors.line} style={n <= recipe.rating ? { textShadowColor: colors.ink, textShadowRadius: 1 } : undefined} />
                </Pressable>
              ))}
            </View>
          </View>
          <TextInput value={recipe.note} onChangeText={(note) => updateRecipe(recipe.id, { note })} placeholder="Dodaj notatkę (np. zmiany w przepisie)" placeholderTextColor={colors.muted} multiline style={[inputStyle, { marginTop: 14, minHeight: 90, textAlignVertical: 'top' }]} />
        </View>
      </ScrollView>

      {!!toast && (
        <Pressable style={[st.toast, box(colors.ink, 18)]} onPress={() => setToast('')}>
          <Text style={st.toastText}>{toast}</Text>
        </Pressable>
      )}

      <Modal visible={planOpen} transparent animationType="slide" onRequestClose={() => setPlanOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setPlanOpen(false)} />
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>Dodaj do jadłospisu</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {nextDays(14).map((d) => (
              <Pressable
                key={d.iso}
                style={st.dayRow}
                onPress={() => {
                  addToPlan(d.iso, recipe.id);
                  setPlanOpen(false);
                  setToast(`Dodano do jadłospisu: ${dayLabel(d.date)}`);
                }}
              >
                <Text style={{ fontSize: 17, color: colors.ink, fontWeight: '700' }}>{dayLabel(d.date)}</Text>
                <Text style={{ color: colors.muted }}>{data.plan.filter((p) => p.date === d.iso).length || ''}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={catOpen} transparent animationType="slide" onRequestClose={() => setCatOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setCatOpen(false)} />
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>Kategoria</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {data.categories.map((c) => (
              <Pressable key={c} onPress={() => { updateRecipe(recipe.id, { category: c }); setCatOpen(false); }} style={st.dayRow}>
                <Text style={{ fontSize: 17, color: colors.ink, fontWeight: '700' }}>{c}</Text>
                <Ionicons name={recipe.category === c ? 'radio-button-on' : 'radio-button-off'} size={24} color={colors.ink} />
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <TextInput value={newCat} onChangeText={setNewCat} placeholder="Nowa kategoria…" placeholderTextColor={colors.muted} style={[inputStyle, { flex: 1 }]} />
            <Button
              title="Dodaj"
              onPress={() => {
                const n = newCat.trim();
                if (!n) return;
                addCategory(n);
                updateRecipe(recipe.id, { category: n });
                setNewCat('');
                setCatOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Action = ({ icon, label, bg, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[box(bg, 22), { flex: 1, alignItems: 'center', paddingVertical: 14 }]}>
    <Ionicons name={icon} size={28} color={colors.ink} />
    <Text style={{ marginTop: 6, color: colors.ink, fontSize: 14, fontWeight: '800' }}>{label}</Text>
  </Pressable>
);

const st = StyleSheet.create({
  edit: { color: colors.ink, fontSize: 17, fontFamily: fonts.displayBold, textDecorationLine: 'underline' },
  hero: { height: 250, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2.5, borderBottomColor: colors.ink, overflow: 'hidden' },
  heart: { position: 'absolute', top: 14, right: 14, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 34, fontFamily: fonts.display, color: colors.ink, lineHeight: 40 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  sectionHead: { marginTop: 30, marginBottom: 14 },
  servRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
  ingLine: { borderTopWidth: 1.5, borderTopColor: colors.line },
  ingText: { fontSize: 18, color: colors.ink, flex: 1, fontWeight: '700' },
  hint: { color: colors.muted, marginTop: 10, fontSize: 14 },
  step: { flexDirection: 'row', gap: 14, paddingVertical: 12, alignItems: 'flex-start' },
  stepNo: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.yellow, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, lineHeight: 28 },
  stepText: { fontSize: 18, lineHeight: 26, color: colors.ink, fontWeight: '600', marginTop: 4 },
  stepTime: { color: colors.ink, fontWeight: '800', marginTop: 6, backgroundColor: colors.pink, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, overflow: 'hidden' },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cookedBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 4 },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 16, padding: 16 },
  toastText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(22,17,15,0.45)' },
  sheet: { backgroundColor: colors.bg, padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 0 },
  sheetTitle: { fontSize: 26, fontFamily: fonts.display, color: colors.ink, marginBottom: 10, lineHeight: 34 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1.5, borderBottomColor: colors.line },
});
