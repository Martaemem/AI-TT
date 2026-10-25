import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shoppingLabel, useStore } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';

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
    <Pressable key={s.id} onPress={() => toggleShopping(s.id)} onLongPress={() => removeShopping(s.id)} style={st.row}>
      <Ionicons name={s.checked ? 'checkbox' : 'square-outline'} size={26} color={s.checked ? colors.primary : colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={[st.name, s.checked && { textDecorationLine: 'line-through', color: colors.muted }]}>{shoppingLabel(s)}</Text>
        {!!s.recipeTitle && <Text style={st.from} numberOfLines={1}>{s.recipeTitle}</Text>}
      </View>
      <Pressable onPress={() => removeShopping(s.id)} hitSlop={10}>
        <Ionicons name="close" size={20} color={colors.muted} />
      </Pressable>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <Header title="Zakupy" right={<Text style={st.counter}>{open.length} do kupienia</Text>} />
      <View style={st.add}>
        <TextInput value={name} onChangeText={setName} onSubmitEditing={add} placeholder="Dodaj produkt…" placeholderTextColor={colors.muted} style={st.input} returnKeyType="done" />
        <Button title="Dodaj" onPress={add} />
      </View>

      {data.shopping.length === 0 && (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 56 }}>🛒</Text>
          <Text style={st.empty}>Lista jest pusta. Dodaj składniki ze szczegółów przepisu.</Text>
        </View>
      )}
      {open.map(row)}
      {done.length > 0 && <Text style={st.section}>KUPIONE</Text>}
      {done.map(row)}

      {done.length > 0 && <Button title="Usuń kupione" outline icon="trash-outline" onPress={clearChecked} style={{ marginHorizontal: 20, marginTop: 18 }} />}
      {data.shopping.length > 0 && (
        <Button
          title="Wyczyść całą listę"
          outline
          onPress={() => Alert.alert('Wyczyścić listę?', 'Wszystkie pozycje zostaną usunięte.', [{ text: 'Anuluj', style: 'cancel' }, { text: 'Wyczyść', style: 'destructive', onPress: clearShopping }])}
          style={{ marginHorizontal: 20, marginTop: 12 }}
        />
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  counter: { color: colors.primaryDark, fontWeight: '700', backgroundColor: colors.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  add: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 12 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, fontSize: 16, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, padding: 14, borderRadius: 14, marginHorizontal: 20, marginTop: 8 },
  name: { fontSize: 17, color: colors.text },
  from: { color: colors.muted, fontSize: 13, marginTop: 2 },
  section: { color: '#F59E0B', fontWeight: '800', letterSpacing: 1.5, marginTop: 24, marginBottom: 4, marginHorizontal: 20, fontSize: 14 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 8, fontSize: 15 },
});
