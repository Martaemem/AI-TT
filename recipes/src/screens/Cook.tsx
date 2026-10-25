import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useStore } from '../store';
import { box, colors, fonts } from '../theme';
import { Button, Header, Text } from '../components/ui';
import { Art, kindFor } from '../components/Art';
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
      <Header onBack={nav.pop} right={<Text style={st.counter}>{i + 1} / {recipe.steps.length}</Text>} />
      <View style={st.track}><View style={[st.fill, { width: `${((i + 1) / recipe.steps.length) * 100}%` }]} /></View>

      {left !== null && (
        <Pressable style={[st.timer, box(left <= 0 ? colors.coral : colors.yellow, 22)]} onPress={() => { Vibration.cancel(); setLeft(null); }}>
          <Text style={st.timerText}>{left <= 0 ? 'Czas minął! Dotknij, aby wyłączyć' : `${mmss(left)} · dotknij, aby zatrzymać`}</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={[box(colors.card, 30), { padding: 22 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={st.no}>Krok {i + 1}</Text>
            <Art kind={kindFor(recipe.category)} size={64} />
          </View>
          <Text style={st.text}>{step.text}</Text>
        </View>
        {!!step.minutes && left === null && (
          <Button title={`Uruchom minutnik (${formatMinutes(step.minutes)})`} icon="timer-outline" outline onPress={() => setLeft((step.minutes ?? 0) * 60)} style={{ marginTop: 18 }} />
        )}

        <Pressable onPress={() => setShowIng((v) => !v)} style={{ marginTop: 24 }}>
          <Text style={st.ingToggle}>{showIng ? '▾ Ukryj składniki' : '▸ Pokaż składniki'}</Text>
        </Pressable>
        {showIng && (
          <View style={[box(colors.mint, 22), { padding: 16, marginTop: 10 }]}>
            {recipe.ingredients.map((ing, k) => <Text key={k} style={st.ing}>• {formatIngredient(ing, factor)}</Text>)}
          </View>
        )}
      </ScrollView>

      <View style={st.nav}>
        <Button title="Wstecz" outline onPress={() => go(-1)} disabled={i === 0} style={{ flex: 1 }} />
        <Button title={last ? 'Gotowe!' : 'Dalej'} onPress={() => go(1)} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  counter: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, lineHeight: 28 },
  track: { height: 14, backgroundColor: colors.card, marginHorizontal: 20, marginTop: 14, borderRadius: 7, borderWidth: 2.5, borderColor: colors.ink, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.yellow, borderRightWidth: 2.5, borderRightColor: colors.ink },
  timer: { marginHorizontal: 20, marginTop: 14, padding: 14 },
  timerText: { color: colors.ink, fontFamily: fonts.display, fontSize: 22, textAlign: 'center', lineHeight: 30 },
  no: { fontSize: 22, fontFamily: fonts.display, color: colors.coral, lineHeight: 30 },
  text: { fontSize: 28, lineHeight: 38, fontFamily: fonts.displayBold, color: colors.ink, marginTop: 8 },
  ingToggle: { color: colors.ink, fontWeight: '800', fontSize: 17, textDecorationLine: 'underline' },
  ing: { fontSize: 18, color: colors.ink, marginTop: 6, fontWeight: '700' },
  nav: { flexDirection: 'row', gap: 12, padding: 20 },
});
