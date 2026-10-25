import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';
import { Nav } from '../nav';
import { formatIngredient, formatMinutes } from '../units';

/** Gotowanie krok po kroku: duży tekst, minutnik dla kroków z czasem, ekran nie gaśnie. */
export default function Cook({ nav, id, servings }: { nav: Nav; id: string; servings: number }) {
  useKeepAwake();
  const { data, updateRecipe } = useStore();
  const recipe = data.recipes.find((r) => r.id === id);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number | null>(null); // pozostałe sekundy minutnika
  const [showIng, setShowIng] = useState(false);

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      Vibration.vibrate([0, 600, 300, 600, 300, 600]);
      return;
    }
    const t = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);

  if (!recipe || recipe.steps.length === 0) return <Header onBack={nav.pop} />;
  const step = recipe.steps[i];
  const last = i === recipe.steps.length - 1;
  const factor = servings / recipe.servings;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const go = (dir: 1 | -1) => {
    if (dir === 1 && last) {
      updateRecipe(recipe.id, { cookedCount: recipe.cookedCount + 1 });
      nav.pop();
      return;
    }
    setI((x) => Math.min(Math.max(x + dir, 0), recipe.steps.length - 1));
  };

  return (
    <View style={{ flex: 1 }}>
      <Header onBack={nav.pop} right={<Text style={{ color: colors.muted, fontWeight: '700' }}>{i + 1} / {recipe.steps.length}</Text>} />
      <View style={st.track}><View style={[st.fill, { width: `${((i + 1) / recipe.steps.length) * 100}%` }]} /></View>

      {left !== null && (
        <Pressable style={[st.timer, left <= 0 && { backgroundColor: colors.danger }]} onPress={() => { Vibration.cancel(); setLeft(null); }}>
          <Text style={st.timerText}>{left <= 0 ? '⏰ Czas minął! (dotknij, aby wyłączyć)' : `⏱ ${mmss(left)} · dotknij, aby zatrzymać`}</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={st.no}>Krok {i + 1}</Text>
        <Text style={st.text}>{step.text}</Text>
        {!!step.minutes && left === null && (
          <Button title={`Uruchom minutnik (${formatMinutes(step.minutes)})`} icon="timer-outline" outline onPress={() => setLeft((step.minutes ?? 0) * 60)} style={{ marginTop: 24 }} />
        )}

        <Pressable onPress={() => setShowIng((v) => !v)} style={{ marginTop: 28 }}>
          <Text style={st.ingToggle}>{showIng ? '▾ Ukryj składniki' : '▸ Pokaż składniki'}</Text>
        </Pressable>
        {showIng && recipe.ingredients.map((ing, k) => <Text key={k} style={st.ing}>• {formatIngredient(ing, factor)}</Text>)}
      </ScrollView>

      <View style={st.nav}>
        <Button title="Wstecz" outline onPress={() => go(-1)} disabled={i === 0} style={{ flex: 1 }} />
        <Button title={last ? 'Gotowe ✓' : 'Dalej'} onPress={() => go(1)} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  track: { height: 6, backgroundColor: colors.line, marginHorizontal: 20, borderRadius: 3 },
  fill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  timer: { backgroundColor: colors.primaryDark, marginHorizontal: 20, marginTop: 14, padding: 14, borderRadius: 14 },
  timerText: { color: '#fff', fontWeight: '800', fontSize: 18, textAlign: 'center' },
  no: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 12 },
  text: { fontSize: 28, lineHeight: 38, fontWeight: '600', color: colors.text },
  ingToggle: { color: colors.primaryDark, fontWeight: '700', fontSize: 17 },
  ing: { fontSize: 18, color: colors.text, marginTop: 8 },
  nav: { flexDirection: 'row', gap: 12, padding: 20 },
});
