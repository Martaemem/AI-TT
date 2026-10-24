import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';
import { CopyBox, Header } from '../components/ui';

/** Biblioteka wszystkich promptów z zapisanych porad. */
export default function Prompts() {
  const { data } = useStore();
  const items = data.tips.flatMap((t) => {
    const all = [...t.prompts, ...t.steps.map((s) => s.prompt).filter((p): p is string => !!p)];
    return [...new Set(all)].map((p) => ({ tip: t.title, text: p }));
  });
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Prompty" />
      {items.length === 0 && <Text style={st.empty}>Brak promptów. Pojawią się, gdy porada zawiera gotowe polecenia dla AI.</Text>}
      {items.map((it, i) => (
        <View key={i} style={st.card}>
          <Text style={st.from} numberOfLines={1}>{it.tip}</Text>
          <CopyBox text={it.text} />
        </View>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  empty: { color: colors.muted, textAlign: 'center', margin: 40 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 12 },
  from: { color: colors.primaryDark, fontWeight: '700' },
});
