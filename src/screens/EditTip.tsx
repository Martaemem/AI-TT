import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, Chip, Header } from '../components/ui';
import { Nav } from '../nav';
import { Step, Term, Tip } from '../types';

const LEVELS: Tip['difficulty'][] = ['łatwe', 'średnie', 'trudne'];

/** Edycja wszystkich pól porady: tytuł, opis, kategoria, ważne informacje, hasła, prompty i kroki. */
export default function EditTip({ nav, id }: { nav: Nav; id: string }) {
  const { data, updateTip, addTool } = useStore();
  const tip = data.tips.find((t) => t.id === id);
  const [title, setTitle] = useState(tip?.title ?? '');
  const [summary, setSummary] = useState(tip?.summary ?? '');
  const [tool, setTool] = useState(tip?.tool ?? 'AI');
  const [newTool, setNewTool] = useState('');
  const [category, setCategory] = useState(tip?.category ?? 'Inne');
  const [difficulty, setDifficulty] = useState<Tip['difficulty']>(tip?.difficulty ?? 'łatwe');
  const [keyPoints, setKeyPoints] = useState<string[]>(tip?.keyPoints ?? []);
  const [terms, setTerms] = useState<Term[]>(tip?.terms ?? []);
  const [needed, setNeeded] = useState<string[]>(tip?.toolsNeeded ?? []);
  const [prompts, setPrompts] = useState<string[]>(tip?.prompts ?? []);
  const [steps, setSteps] = useState<Step[]>(tip?.steps ?? []);
  if (!tip) return <Header onBack={nav.pop} />;

  const save = () => {
    if (!title.trim()) {
      Alert.alert('Brak tytułu', 'Podaj tytuł porady.');
      return;
    }
    const clean = (a: string[]) => a.map((x) => x.trim()).filter(Boolean);
    const cleanSteps = steps.map((s) => ({ text: s.text.trim(), prompt: s.prompt?.trim() || undefined })).filter((s) => s.text);
    updateTip(tip.id, {
      title: title.trim(),
      summary: summary.trim(),
      tool: tool.trim() || 'AI',
      category,
      difficulty,
      keyPoints: clean(keyPoints),
      terms: terms.map((t) => ({ name: t.name.trim(), desc: t.desc.trim() })).filter((t) => t.name),
      toolsNeeded: clean(needed),
      prompts: clean(prompts),
      steps: cleanSteps,
      // odhaczone kroki przestają pasować, gdy zmienia się ich liczba
      checked: cleanSteps.length === tip.steps.length ? tip.checked : [],
    });
    nav.pop();
  };

  const move = <T,>(list: T[], set: (l: T[]) => void, i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header onBack={nav.pop} right={<Pressable onPress={save} hitSlop={10}><Text style={st.save}>Zapisz</Text></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1}>Edytuj poradę</Text>

        <Text style={st.label}>Tytuł</Text>
        <TextInput value={title} onChangeText={setTitle} style={st.input} placeholder="Tytuł porady" placeholderTextColor={colors.muted} />

        <Text style={st.label}>Krótki opis</Text>
        <TextInput value={summary} onChangeText={setSummary} multiline style={[st.input, st.area]} placeholder="O czym jest ta porada?" placeholderTextColor={colors.muted} />

        <Text style={st.label}>Narzędzie AI</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {data.tools.map((t) => <Chip key={t} label={t} active={tool === t} onPress={() => setTool(t)} />)}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TextInput value={newTool} onChangeText={setNewTool} style={[st.input, { flex: 1 }]} placeholder="Nowe narzędzie, np. Gamma" placeholderTextColor={colors.muted} />
          <Button
            title="Dodaj"
            onPress={() => {
              const n = newTool.trim();
              if (!n) return;
              addTool(n);
              setTool(n);
              setNewTool('');
            }}
          />
        </View>

        <Text style={st.label}>Kategoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {data.categories.map((c) => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}
        </ScrollView>

        <Text style={st.label}>Poziom</Text>
        <View style={{ flexDirection: 'row' }}>
          {LEVELS.map((l) => <Chip key={l} label={l} active={difficulty === l} onPress={() => setDifficulty(l)} />)}
        </View>

        <Section title="Najważniejsze" onAdd={() => setKeyPoints([...keyPoints, ''])}>
          {keyPoints.map((k, i) => (
            <Row key={i} onRemove={() => setKeyPoints(keyPoints.filter((_, x) => x !== i))}>
              <TextInput value={k} onChangeText={(v) => setKeyPoints(keyPoints.map((x, n) => (n === i ? v : x)))} multiline style={[st.input, { flex: 1 }]} placeholder="Ważna informacja" placeholderTextColor={colors.muted} />
            </Row>
          ))}
        </Section>

        <Section title="Hasła i komendy" onAdd={() => setTerms([...terms, { name: '', desc: '' }])}>
          {terms.map((t, i) => (
            <Row key={i} onRemove={() => setTerms(terms.filter((_, x) => x !== i))}>
              <View style={{ flex: 1, gap: 6 }}>
                <TextInput value={t.name} onChangeText={(v) => setTerms(terms.map((x, n) => (n === i ? { ...x, name: v } : x)))} style={st.input} placeholder="Hasło / komenda" placeholderTextColor={colors.muted} autoCapitalize="none" />
                <TextInput value={t.desc} onChangeText={(v) => setTerms(terms.map((x, n) => (n === i ? { ...x, desc: v } : x)))} multiline style={st.input} placeholder="Do czego służy" placeholderTextColor={colors.muted} />
              </View>
            </Row>
          ))}
        </Section>

        <Section title="Potrzebne" onAdd={() => setNeeded([...needed, ''])}>
          {needed.map((k, i) => (
            <Row key={i} onRemove={() => setNeeded(needed.filter((_, x) => x !== i))}>
              <TextInput value={k} onChangeText={(v) => setNeeded(needed.map((x, n) => (n === i ? v : x)))} style={[st.input, { flex: 1 }]} placeholder="np. konto ChatGPT" placeholderTextColor={colors.muted} />
            </Row>
          ))}
        </Section>

        <Section title="Prompty" onAdd={() => setPrompts([...prompts, ''])}>
          {prompts.map((k, i) => (
            <Row key={i} onRemove={() => setPrompts(prompts.filter((_, x) => x !== i))}>
              <TextInput value={k} onChangeText={(v) => setPrompts(prompts.map((x, n) => (n === i ? v : x)))} multiline style={[st.input, { flex: 1, minHeight: 90, textAlignVertical: 'top' }]} placeholder="Tekst promptu" placeholderTextColor={colors.muted} />
            </Row>
          ))}
        </Section>

        <Section title="Kroki instrukcji" onAdd={() => setSteps([...steps, { text: '' }])}>
          {steps.map((s, i) => (
            <Row key={i} onRemove={() => setSteps(steps.filter((_, x) => x !== i))} onUp={i > 0 ? () => move(steps, setSteps, i, -1) : undefined} onDown={i < steps.length - 1 ? () => move(steps, setSteps, i, 1) : undefined} label={String(i + 1)}>
              <View style={{ flex: 1, gap: 6 }}>
                <TextInput value={s.text} onChangeText={(v) => setSteps(steps.map((x, n) => (n === i ? { ...x, text: v } : x)))} multiline style={st.input} placeholder="Opis kroku" placeholderTextColor={colors.muted} />
                <TextInput value={s.prompt ?? ''} onChangeText={(v) => setSteps(steps.map((x, n) => (n === i ? { ...x, prompt: v } : x)))} multiline style={st.input} placeholder="Prompt do tego kroku (opcjonalnie)" placeholderTextColor={colors.muted} />
              </View>
            </Row>
          ))}
        </Section>

        <Button title="Zapisz zmiany" icon="checkmark" onPress={save} style={{ marginTop: 28 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={st.section}>{title.toUpperCase()}</Text>
        <Pressable onPress={onAdd} style={st.add} hitSlop={8}>
          <Ionicons name="add" size={18} color={colors.primaryDark} />
          <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Dodaj</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function Row({ children, onRemove, onUp, onDown, label }: { children: React.ReactNode; onRemove: () => void; onUp?: () => void; onDown?: () => void; label?: string }) {
  return (
    <View style={st.row}>
      {label && <Text style={st.no}>{label}</Text>}
      {children}
      <View style={{ alignItems: 'center', gap: 4 }}>
        {onUp && <Pressable onPress={onUp} hitSlop={8}><Ionicons name="chevron-up" size={22} color={colors.muted} /></Pressable>}
        <Pressable onPress={onRemove} hitSlop={8}><Ionicons name="trash-outline" size={22} color={colors.danger} /></Pressable>
        {onDown && <Pressable onPress={onDown} hitSlop={8}><Ionicons name="chevron-down" size={22} color={colors.muted} /></Pressable>}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 6 },
  save: { color: colors.primaryDark, fontSize: 18, fontWeight: '800' },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 6 },
  input: { backgroundColor: '#F2EFEC', borderRadius: 14, padding: 12, fontSize: 16, color: colors.text },
  area: { minHeight: 80, textAlignVertical: 'top' },
  section: { color: '#F59E0B', fontWeight: '800', letterSpacing: 1.5, fontSize: 15 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.primarySoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  no: { fontSize: 20, fontWeight: '800', color: colors.primary, width: 24, marginTop: 8 },
});
