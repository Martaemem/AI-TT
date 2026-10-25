import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { uid, useStore } from '../store';
import { colors } from '../theme';
import { Button, Chip, Header, Stepper } from '../components/ui';
import { Nav } from '../nav';
import { formatIngredient, minutesFromText, parseIngredient } from '../units';
import { Recipe } from '../types';

/** Formularz dodawania / edycji. Składniki i kroki wpisujesz po jednym w linii. */
export default function Edit({ nav, id }: { nav: Nav; id?: string }) {
  const { data, saveRecipe } = useStore();
  const existing = data.recipes.find((r) => r.id === id);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [servings, setServings] = useState(existing?.servings ?? 4);
  const [time, setTime] = useState(existing?.time ? String(existing.time) : '');
  const [category, setCategory] = useState(existing?.category ?? data.categories[0] ?? 'Inne');
  const [ingText, setIngText] = useState(existing ? existing.ingredients.map((i) => formatIngredient(i)).join('\n') : '');
  const [stepText, setStepText] = useState(existing ? existing.steps.map((s) => s.text).join('\n') : '');

  const save = () => {
    if (!title.trim()) {
      Alert.alert('Brak nazwy', 'Podaj nazwę przepisu.');
      return;
    }
    const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);
    const recipe: Recipe = {
      id: existing?.id ?? uid(),
      title: title.trim(),
      url: existing?.url,
      author: existing?.author,
      image: existing?.image,
      servings,
      time: Number(time) > 0 ? Math.round(Number(time)) : undefined,
      category,
      ingredients: lines(ingText).map(parseIngredient).filter((i) => i.name),
      steps: lines(stepText).map((l) => l.replace(/^\d+[.)]\s+/, '')).map((text) => ({ text, minutes: minutesFromText(text) })),
      tags: existing?.tags ?? [],
      note: existing?.note ?? '',
      sourceText: existing?.sourceText ?? '',
      favorite: existing?.favorite ?? false,
      rating: existing?.rating ?? 0,
      cookedCount: existing?.cookedCount ?? 0,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    saveRecipe(recipe);
    if (existing) nav.pop();
    else nav.replace({ name: 'detail', id: recipe.id });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1}>{existing ? 'Edytuj przepis' : 'Nowy przepis'}</Text>

        <Text style={st.label}>Nazwa</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="np. Szarlotka babci" placeholderTextColor={colors.muted} style={st.input} />

        <View style={st.row}>
          <View>
            <Text style={st.label}>Porcje</Text>
            <Stepper value={servings} onChange={setServings} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Czas (min)</Text>
            <TextInput value={time} onChangeText={setTime} keyboardType="number-pad" placeholder="np. 45" placeholderTextColor={colors.muted} style={st.input} />
          </View>
        </View>

        <Text style={[st.label, { marginTop: 18 }]}>Kategoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {data.categories.map((c) => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}
        </ScrollView>

        <Text style={[st.label, { marginTop: 18 }]}>Składniki (każdy w osobnej linii)</Text>
        <TextInput value={ingText} onChangeText={setIngText} multiline placeholder={'2 jajka\n200 g mąki\n1/2 szklanki mleka'} placeholderTextColor={colors.muted} style={[st.input, st.area]} />

        <Text style={[st.label, { marginTop: 18 }]}>Przygotowanie (każdy krok w osobnej linii)</Text>
        <TextInput value={stepText} onChangeText={setStepText} multiline placeholder={'Wymieszaj składniki.\nPiecz 30 minut w 180°C.'} placeholderTextColor={colors.muted} style={[st.input, st.area, { minHeight: 180 }]} />
        <Text style={st.hint}>Czas w kroku (np. „piecz 30 minut”) automatycznie uruchomi minutnik w trybie gotowania.</Text>

        <Button title="Zapisz przepis" icon="checkmark" onPress={save} style={{ marginTop: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  hint: { color: colors.muted, marginTop: 8, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 18, marginTop: 18, alignItems: 'flex-start' },
  input: { backgroundColor: colors.card, borderRadius: 14, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.line },
  area: { minHeight: 140, textAlignVertical: 'top' },
});
