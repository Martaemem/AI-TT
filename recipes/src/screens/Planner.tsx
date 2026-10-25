import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';
import { Nav } from '../nav';
import { dayLabel, nextDays } from '../dates';

export default function Planner({ nav }: { nav: Nav }) {
  const { data, addToPlan, removeFromPlan, addToShopping } = useStore();
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const days = nextDays(14);

  const planned = data.plan.filter((p) => days.some((d) => d.iso === p.date));
  const toShopping = () => {
    let count = 0;
    for (const p of planned) {
      const r = data.recipes.find((x) => x.id === p.recipeId);
      if (r) {
        addToShopping(r.ingredients, 1, r.title);
        count++;
      }
    }
    Alert.alert('Gotowe', count ? `Dodano składniki z ${count} przepisów do listy zakupów.` : 'Jadłospis jest pusty.');
  };

  const choices = data.recipes.filter((r) => !query.trim() || r.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <Header title="Jadłospis" />
      {data.recipes.length === 0 && <Text style={st.empty}>Najpierw zapisz jakiś przepis, a potem zaplanuj go na wybrany dzień.</Text>}
      {days.map((d) => {
        const entries = data.plan.filter((p) => p.date === d.iso);
        return (
          <View key={d.iso} style={st.day}>
            <View style={st.dayHead}>
              <Text style={st.dayName}>{dayLabel(d.date)}</Text>
              <Pressable onPress={() => { setQuery(''); setPickFor(d.iso); }} hitSlop={10} disabled={data.recipes.length === 0}>
                <Ionicons name="add-circle" size={30} color={data.recipes.length === 0 ? colors.line : colors.primary} />
              </Pressable>
            </View>
            {entries.map((p) => {
              const r = data.recipes.find((x) => x.id === p.recipeId);
              if (!r) return null;
              return (
                <View key={p.id} style={st.entry}>
                  <Pressable style={{ flex: 1 }} onPress={() => nav.push({ name: 'detail', id: r.id })}>
                    <Text style={st.entryTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={st.entryMeta}>{r.category} · {r.servings} porcji</Text>
                  </Pressable>
                  <Pressable onPress={() => removeFromPlan(p.id)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        );
      })}
      {planned.length > 0 && <Button title="Dodaj składniki z jadłospisu do zakupów" icon="cart-outline" onPress={toShopping} style={{ marginHorizontal: 20, marginTop: 18 }} />}

      <Modal visible={pickFor !== null} transparent animationType="slide" onRequestClose={() => setPickFor(null)}>
        <Pressable style={st.backdrop} onPress={() => setPickFor(null)} />
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>Wybierz przepis</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Szukaj…" placeholderTextColor={colors.muted} style={st.search} />
          <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
            {choices.map((r) => (
              <Pressable key={r.id} style={st.choice} onPress={() => { if (pickFor) addToPlan(pickFor, r.id); setPickFor(null); }}>
                <Text style={{ fontSize: 17, color: colors.text }} numberOfLines={1}>{r.title}</Text>
                <Text style={{ color: colors.muted }}>{r.category}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  empty: { color: colors.muted, marginHorizontal: 20, marginBottom: 12, fontSize: 15 },
  day: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 10 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontSize: 16, fontWeight: '800', color: colors.text, textTransform: 'capitalize', flex: 1 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, borderRadius: 12, padding: 12, marginTop: 8 },
  entryTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  entryMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.bg, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 10 },
  search: { backgroundColor: colors.card, borderRadius: 12, padding: 12, fontSize: 16, color: colors.text, marginBottom: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
});
