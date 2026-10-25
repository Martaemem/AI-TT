import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, Header, Stepper, emojiFor } from '../components/ui';
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
            <Pressable onPress={confirmDelete} hitSlop={12}><Ionicons name="trash-outline" size={24} color={colors.text} /></Pressable>
          </>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={st.hero}>
          {recipe.image ? <Image source={{ uri: recipe.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 80 }}>{emojiFor(recipe.category)}</Text>}
          <Pressable style={st.heart} onPress={() => updateRecipe(recipe.id, { favorite: !recipe.favorite })}>
            <Ionicons name={recipe.favorite ? 'heart' : 'heart-outline'} size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={st.title}>{recipe.title}</Text>
          <View style={st.meta}>
            <Pressable onPress={() => setCatOpen(true)}><Badge text={`${emojiFor(recipe.category)} ${recipe.category} ✎`} /></Pressable>
            {!!recipe.time && <Badge text={`⏱ ${formatMinutes(recipe.time)}`} />}
            {recipe.cookedCount > 0 && <Badge text={`✓ ugotowane ${recipe.cookedCount}×`} />}
          </View>

          <View style={st.actions}>
            <Action icon="calendar-outline" label="Jadłospis" onPress={() => setPlanOpen(true)} />
            <Action icon="cart-outline" label="Lista zakupów" onPress={shop} />
            <Action icon="share-outline" label="Udostępnij" onPress={share} />
          </View>

          <Button title="Gotuj krok po kroku" icon="play" onPress={() => nav.push({ name: 'cook', id: recipe.id, servings })} style={{ marginTop: 22 }} disabled={recipe.steps.length === 0} />

          <Text style={st.section}>SKŁADNIKI</Text>
          <View style={st.servRow}>
            <Stepper value={servings} onChange={setServings} />
            <Text style={{ color: colors.muted, fontSize: 16 }}>{servings === 1 ? 'porcja' : servings < 5 ? 'porcje' : 'porcji'}</Text>
          </View>
          {recipe.ingredients.length === 0 && <Text style={{ color: colors.muted, marginTop: 12 }}>Brak składników. Dotknij „Edytuj”, aby je dodać.</Text>}
          {recipe.ingredients.map((ing, i) => {
            const on = checked.includes(i);
            return (
              <Pressable key={i} onPress={() => setChecked((c) => (on ? c.filter((x) => x !== i) : [...c, i]))} style={st.ing}>
                <Text style={[st.ingText, on && { textDecorationLine: 'line-through', color: colors.muted }]}>{formatIngredient(ing, factor)}</Text>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? colors.primary : colors.muted} />
              </Pressable>
            );
          })}
          {checked.length > 0 && <Text style={st.hint}>Zaznaczone składniki (masz je w domu) nie trafią na listę zakupów.</Text>}

          <Text style={st.section}>PRZYGOTOWANIE</Text>
          {recipe.url && (
            <Pressable onPress={() => Linking.openURL(recipe.url!)}>
              <Text style={{ color: colors.muted, fontSize: 16, marginBottom: 8 }}>Otwórz źródło{recipe.author ? ` (@${recipe.author})` : ''} ↗</Text>
            </Pressable>
          )}
          {recipe.steps.length === 0 && <Text style={{ color: colors.muted }}>Brak kroków. Dotknij „Edytuj”, aby je dodać.</Text>}
          {recipe.steps.map((s, i) => (
            <View key={i} style={st.step}>
              <Text style={st.stepNo}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.stepText}>{s.text}</Text>
                {!!s.minutes && <Text style={st.stepTime}>⏱ {formatMinutes(s.minutes)}</Text>}
              </View>
            </View>
          ))}

          <Text style={st.section}>NOTATKI</Text>
          <View style={st.doneRow}>
            <Pressable onPress={() => updateRecipe(recipe.id, { cookedCount: recipe.cookedCount + 1 })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="restaurant-outline" size={26} color={colors.primary} />
              <Text style={{ fontSize: 16, color: colors.text }}>Ugotowałam / ugotowałem</Text>
            </Pressable>
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => updateRecipe(recipe.id, { rating: recipe.rating === n ? 0 : n })}>
                  <Ionicons name="star" size={26} color={n <= recipe.rating ? '#F5B301' : '#D9D2CC'} />
                </Pressable>
              ))}
            </View>
          </View>
          <TextInput value={recipe.note} onChangeText={(note) => updateRecipe(recipe.id, { note })} placeholder="Dodaj notatkę (np. zmiany w przepisie)" placeholderTextColor={colors.muted} multiline style={st.note} />
        </View>
      </ScrollView>

      {!!toast && (
        <Pressable style={st.toast} onPress={() => setToast('')}>
          <Text style={st.toastText}>{toast}</Text>
        </Pressable>
      )}

      <Modal visible={planOpen} transparent animationType="slide" onRequestClose={() => setPlanOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setPlanOpen(false)} />
        <View style={st.sheet}>
          <Text style={[st.title, { fontSize: 22 }]}>Dodaj do jadłospisu</Text>
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
                <Text style={{ fontSize: 17, color: colors.text }}>{dayLabel(d.date)}</Text>
                <Text style={{ color: colors.muted }}>{data.plan.filter((p) => p.date === d.iso).length || ''}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={catOpen} transparent animationType="slide" onRequestClose={() => setCatOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setCatOpen(false)} />
        <View style={st.sheet}>
          <Text style={[st.title, { fontSize: 22 }]}>Kategoria</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {data.categories.map((c) => (
              <Pressable key={c} onPress={() => { updateRecipe(recipe.id, { category: c }); setCatOpen(false); }} style={st.dayRow}>
                <Text style={{ fontSize: 17, color: colors.text }}>{emojiFor(c)} {c}</Text>
                <Ionicons name={recipe.category === c ? 'radio-button-on' : 'radio-button-off'} size={24} color={recipe.category === c ? colors.primary : colors.muted} />
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TextInput value={newCat} onChangeText={setNewCat} placeholder="Nowa kategoria…" placeholderTextColor={colors.muted} style={[st.note, { flex: 1, marginTop: 0, minHeight: 0 }]} />
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
  edit: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  hero: { height: 240, backgroundColor: '#C98F6B', alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  actions: { flexDirection: 'row', marginTop: 22 },
  actionCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  section: { color: '#F59E0B', fontWeight: '800', letterSpacing: 1.5, marginTop: 28, marginBottom: 12, fontSize: 15 },
  servRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  ing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  ingText: { fontSize: 18, color: colors.text, flex: 1 },
  hint: { color: colors.muted, marginTop: 8, fontSize: 14 },
  step: { flexDirection: 'row', gap: 14, paddingVertical: 12, alignItems: 'flex-start' },
  stepNo: { fontSize: 24, fontWeight: '800', color: colors.primary, width: 28 },
  stepText: { fontSize: 18, lineHeight: 26, color: colors.text },
  stepTime: { color: colors.primaryDark, fontWeight: '700', marginTop: 4 },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  note: { backgroundColor: '#F2EFEC', borderRadius: 14, padding: 14, minHeight: 90, fontSize: 16, marginTop: 14, color: colors.text, textAlignVertical: 'top' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: '#222', borderRadius: 14, padding: 16 },
  toastText: { color: '#fff', fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
});
