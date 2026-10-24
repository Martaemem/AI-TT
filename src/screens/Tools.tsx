import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';
import { Header, toolEmoji } from '../components/ui';

/** Odpowiednik „Zakupów”: wszystkie narzędzia AI potrzebne do zapisanych porad. */
export default function Tools() {
  const { data } = useStore();
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    data.tips.filter((t) => !t.done).forEach((t) => {
      const names = new Set([t.tool, ...t.toolsNeeded]);
      names.forEach((n) => map.set(n, [...(map.get(n) ?? []), t.title]));
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [data.tips]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Header title="Narzędzia" />
      <Text style={st.sub}>Narzędzia potrzebne do porad, których jeszcze nie wypróbowałeś/aś.</Text>
      {groups.length === 0 && <Text style={st.empty}>Brak narzędzi – dodaj pierwszą poradę.</Text>}
      {groups.map(([name, titles]) => (
        <View key={name} style={st.card}>
          <Text style={st.name}>{toolEmoji(name)} {name} <Text style={{ color: colors.muted }}>· {titles.length}</Text></Text>
          {titles.map((t, i) => <Text key={i} style={st.item} numberOfLines={1}>• {t}</Text>)}
        </View>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  sub: { color: colors.muted, marginHorizontal: 20, marginBottom: 14, fontSize: 15 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 12 },
  name: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 6 },
  item: { color: colors.muted, fontSize: 15, marginTop: 3 },
});
