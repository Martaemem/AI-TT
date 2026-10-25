import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shoppingLabel, useStore } from '../store';
import { box, colors, fonts } from '../theme';
import { Button, Check, Header, Tag, Text, inputStyle } from '../components/ui';
import { Art } from '../components/Art';

export default function Shopping() {
  const { data, addShoppingItem, toggleShopping, removeShopping, clearChecked, clearShopping } = useStore();
  const [name, setName] = useState('');
  const open = data.shopping.filter((s) => !s.checked);
  const done = data.shopping.filter((s) => s.checked);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    addShoppingItem(n);
    setName('');
  };

  const row = (s: (typeof data.shopping)[number]) => (
    <Pressable key={s.id} onPress={() => toggleShopping(s.id)} onLongPress={() => removeShopping(s.id)} style={[st.row, box(s.checked ? colors.sand : colors.card, 18), { borderBottomWidth: 4 }]}>
      <Check on={s.checked} />
      <View style={{ flex: 1 }}>
        <Text style={[st.name, s.checked && { textDecorationLine: 'line-through', color: colors.muted }]}>{shoppingLabel(s)}</Text>
        {!!s.recipeTitle && <Text style={st.from} numberOfLines={1}>{s.recipeTitle}</Text>}
      </View>
      <Pressable onPress={() => removeShopping(s.id)} hitSlop={10}>
        <Ionicons name="close" size={22} color={colors.ink} />
      </Pressable>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <Header title="Zakupy" right={<View style={st.counter}><Text style={st.counterText}>{open.length} do kupienia</Text></View>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 30, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
        <View style={st.add}>
          <TextInput value={name} onChangeText={setName} onSubmitEditing={add} placeholder="Dodaj produkt…" placeholderTextColor={colors.muted} style={[inputStyle, { flex: 1 }]} returnKeyType="done" />
          <Button title="Dodaj" onPress={add} />
        </View>

        {data.shopping.length === 0 && (
          <View style={{ alignItems: 'center', padding: 30 }}>
            <Art kind="basket" size={130} />
            <Text style={st.emptyTitle}>Lista jest pusta</Text>
            <Text style={st.empty}>Dodaj składniki ze szczegółów przepisu.</Text>
          </View>
        )}
        {open.map(row)}
        {done.length > 0 && <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 4 }}><Tag label="Kupione" bg={colors.mint} /></View>}
        {done.map(row)}

        {done.length > 0 && <Button title="Usuń kupione" outline icon="trash-outline" onPress={clearChecked} style={{ marginHorizontal: 20, marginTop: 20 }} />}
        {data.shopping.length > 0 && (
          <Button
            title="Wyczyść całą listę"
            outline
            onPress={() => Alert.alert('Wyczyścić listę?', 'Wszystkie pozycje zostaną usunięte.', [{ text: 'Anuluj', style: 'cancel' }, { text: 'Wyczyść', style: 'destructive', onPress: clearShopping }])}
            style={{ marginHorizontal: 20, marginTop: 12 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  counter: { backgroundColor: colors.yellow, borderWidth: 2.5, borderColor: colors.ink, borderBottomWidth: 4, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 4 },
  counterText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  add: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 14, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, marginHorizontal: 20, marginTop: 10 },
  name: { fontSize: 18, color: colors.ink, fontWeight: '700' },
  from: { color: colors.muted, fontSize: 13, marginTop: 2 },
  emptyTitle: { fontSize: 26, fontFamily: fonts.display, color: colors.ink, marginTop: 8, lineHeight: 34 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 2, fontSize: 16 },
});
