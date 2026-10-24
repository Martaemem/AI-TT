import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, CopyBox, Header } from '../components/ui';
import { Nav } from '../nav';

export default function Steps({ nav, id }: { nav: Nav; id: string }) {
  const { data, updateTip } = useStore();
  const tip = data.tips.find((t) => t.id === id);
  const [i, setI] = useState(() => {
    const first = tip ? tip.steps.findIndex((_, k) => !tip.checked.includes(k)) : 0;
    return first < 0 ? 0 : first;
  });
  if (!tip || tip.steps.length === 0) return <Header onBack={nav.pop} />;

  const step = tip.steps[i];
  const last = i === tip.steps.length - 1;
  const markAndGo = (dir: 1 | -1) => {
    if (dir === 1 && !tip.checked.includes(i)) updateTip(tip.id, { checked: [...tip.checked, i] });
    if (dir === 1 && last) {
      updateTip(tip.id, { done: true });
      nav.pop();
      return;
    }
    setI((x) => Math.min(Math.max(x + dir, 0), tip.steps.length - 1));
  };

  return (
    <View style={{ flex: 1 }}>
      <Header onBack={nav.pop} right={<Text style={{ color: colors.muted, fontWeight: '700' }}>{i + 1} / {tip.steps.length}</Text>} />
      <View style={st.track}>
        <View style={[st.fill, { width: `${((i + 1) / tip.steps.length) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={st.no}>Krok {i + 1}</Text>
        <Text style={st.text}>{step.text}</Text>
        {!!step.prompt && (
          <>
            <Text style={st.label}>PROMPT DO WKLEJENIA</Text>
            <CopyBox text={step.prompt} />
          </>
        )}
      </ScrollView>
      <View style={st.nav}>
        <Button title="Wstecz" outline onPress={() => markAndGo(-1)} disabled={i === 0} style={{ flex: 1 }} />
        <Button title={last ? 'Zakończ ✓' : 'Zrobione, dalej'} onPress={() => markAndGo(1)} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  track: { height: 6, backgroundColor: colors.line, marginHorizontal: 20, borderRadius: 3 },
  fill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  no: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 12 },
  text: { fontSize: 28, lineHeight: 38, fontWeight: '600', color: colors.text },
  label: { color: '#F59E0B', fontWeight: '800', letterSpacing: 1.5, marginTop: 28, fontSize: 14 },
  nav: { flexDirection: 'row', gap: 12, padding: 20 },
});
