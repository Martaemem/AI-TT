import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';
import { Nav } from '../nav';

/** Lista kategorii z liczbą porad; dotknięcie otwiera porady z danej kategorii. */
export default function Categories({ nav }: { nav: Nav }) {
  const { data, addCategory, deleteCategory } = useStore();
  const [name, setName] = useState('');

  const confirmDelete = (c: string) =>
    Alert.alert(`Usunąć kategorię „${c}”?`, 'Porady z tej kategorii trafią do „Inne”.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => deleteCategory(c) },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Header title="Kategorie" />
      <Text style={st.sub}>Dotknij kategorii, aby zobaczyć jej porady. Kategorię porady zmienisz w jej szczegółach.</Text>
      {data.categories.map((c) => {
        const count = data.tips.filter((t) => t.category === c).length;
        return (
          <Pressable key={c} onPress={() => nav.push({ name: 'list', collectionId: `cat:${c}`, title: c })} style={st.row}>
            <Text style={st.name}>{c}</Text>
            <Text style={st.count}>{count}</Text>
            {c !== 'Inne' && (
              <Pressable onPress={() => confirmDelete(c)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={colors.muted} />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        );
      })}
      <View style={st.add}>
        <TextInput value={name} onChangeText={setName} placeholder="Nowa kategoria…" placeholderTextColor={colors.muted} style={st.input} />
        <Button
          title="Dodaj"
          onPress={() => {
            const n = name.trim();
            if (!n) return;
            addCategory(n);
            setName('');
          }}
        />
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  sub: { color: colors.muted, marginHorizontal: 20, marginBottom: 14, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 16, borderRadius: 16, marginHorizontal: 20, marginBottom: 10 },
  name: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
  count: { color: colors.muted },
  add: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 8 },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, fontSize: 16, color: colors.text },
});
