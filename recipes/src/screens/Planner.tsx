import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { box, categoryColor, colors, fonts } from '../theme';
import { Button, Header, Text, inputStyle } from '../components/ui';
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
    <View style={{ flex: 1 }}>
      <Header title="Jadłospis" />
      <ScrollView contentContainerStyle={{ paddingBottom: 30, paddingTop: 16 }}>
        {data.recipes.length === 0 && <Text style={st.empty}>Najpierw zapisz jakiś przepis, a potem zaplanuj go na wybrany dzień.</Text>}
        {days.map((d, idx) => {
          const entries = data.plan.filter((p) => p.date === d.iso);
          return (
            <View key={d.iso} style={[st.day, box(idx === 0 ? colors.yellow : colors.card, 22)]}>
              <View style={st.dayHead}>
                <Text style={st.dayName}>{dayLabel(d.date)}</Text>
                <Pressable onPress={() => { setQuery(''); setPickFor(d.iso); }} hitSlop={10} disabled={data.recipes.length === 0} style={[st.plus, data.recipes.length === 0 && { opacity: 0.3 }]}>
                  <Ionicons name="add" size={22} color={colors.ink} />
                </Pressable>
              </View>
              {entries.map((p) => {
                const r = data.recipes.find((x) => x.id === p.recipeId);
                if (!r) return null;
                return (
                  <View key={p.id} style={[st.entry, { backgroundColor: categoryColor(r.category) }]}>
                    <Pressable style={{ flex: 1 }} onPress={() => nav.push({ name: 'detail', id: r.id })}>
                      <Text style={st.entryTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={st.entryMeta}>{r.category} · {r.servings} porcji</Text>
                    </Pressable>
                    <Pressable onPress={() => removeFromPlan(p.id)} hitSlop={10}>
                      <Ionicons name="close" size={22} color={colors.ink} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
        {planned.length > 0 && <Button title="Dodaj składniki do zakupów" icon="cart-outline" onPress={toShopping} style={{ marginHorizontal: 20, marginTop: 18 }} />}
      </ScrollView>

      <Modal visible={pickFor !== null} transparent animationType="slide" onRequestClose={() => setPickFor(null)}>
        <Pressable style={st.backdrop} onPress={() => setPickFor(null)} />
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>Wybierz przepis</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Szukaj…" placeholderTextColor={colors.muted} style={[inputStyle, { marginBottom: 8 }]} />
          <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
            {choices.map((r) => (
              <Pressable key={r.id} style={st.choice} onPress={() => { if (pickFor) addToPlan(pickFor, r.id); setPickFor(null); }}>
                <Text style={{ fontSize: 17, color: colors.ink, fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.title}</Text>
                <Text style={{ color: colors.muted }}>{r.category}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  empty: { color: colors.muted, marginHorizontal: 20, marginBottom: 12, fontSize: 15 },
  day: { padding: 14, marginHorizontal: 20, marginBottom: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.ink, textTransform: 'capitalize', flex: 1, lineHeight: 28 },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, marginTop: 10, borderWidth: 2.5, borderColor: colors.ink },
  entryTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.ink, lineHeight: 24 },
  entryMeta: { color: colors.muted, fontSize: 13, marginTop: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(22,17,15,0.45)' },
  sheet: { backgroundColor: colors.bg, padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 0 },
  sheetTitle: { fontSize: 26, fontFamily: fonts.display, color: colors.ink, marginBottom: 10, lineHeight: 34 },
  choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1.5, borderBottomColor: colors.line, gap: 12 },
});
