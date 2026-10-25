import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { uid, useStore } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';
import { Nav } from '../nav';
import { Draft, extractUrl, fetchSource, guessCategory, parseRecipeText, Source } from '../source';
import { recipeWithAi } from '../ai';
import { Recipe } from '../types';
import { minutesFromText } from '../units';

export default function AddRecipe({ nav, initialUrl, autoStart }: { nav: Nav; initialUrl?: string; autoStart?: boolean }) {
  const { data, saveRecipe } = useStore();
  const [url, setUrl] = useState(initialUrl ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const hasKey = data.settings.apiKey.trim().length > 0;

  const paste = async () => {
    const t = await Clipboard.getStringAsync();
    setUrl(extractUrl(t) ?? t);
  };

  const run = async () => {
    const link = extractUrl(url) ?? undefined;
    if (!link && !text.trim()) {
      Alert.alert('Brak materiału', 'Wklej link do przepisu albo tekst przepisu.');
      return;
    }
    const diag: string[] = [];
    const log = (l: string) => diag.push(l);
    try {
      setBusy('Pobieram przepis…');
      let source: Source | null = null;
      if (link) source = await fetchSource(link, log);

      // 1) gotowy przepis ze strony (schema.org) – bez AI
      let draft: (Draft & { category?: string }) | null = source?.structured ?? null;

      // 2) tekst do rozpisania: opis posta / transkrypcja / wklejony tekst
      const material = [source?.text, text.trim() && `Tekst od użytkownika:\n${text.trim()}`].filter(Boolean).join('\n\n');
      if (!draft && material) {
        setBusy(hasKey ? 'AI rozpisuje przepis…' : 'Porządkuję przepis…');
        let parsed: (Draft & { category?: string }) | null = null;
        if (hasKey) {
          try {
            parsed = await recipeWithAi(material, data.settings, data.categories, source?.title ?? '');
          } catch (e) {
            Alert.alert('AI niedostępne', `${(e as Error).message}\n\nUżyję prostego porządkowania offline.`);
          }
        }
        if (!parsed) {
          const p = parseRecipeText(material.replace(/^(Opis filmu|Opis|Transkrypcja|Tekst od użytkownika):\s*/gim, ''));
          parsed = { title: source?.title || 'Nowy przepis', servings: 4, ingredients: p.ingredients, steps: p.steps, tags: [] };
        }
        draft = parsed;
      }
      if (!draft || (draft.ingredients.length === 0 && draft.steps.length === 0)) {
        Alert.alert(
          'Nie znalazłem przepisu',
          `Nie udało się wyczytać składników ani kroków. Wklej tekst przepisu w polu poniżej albo wpisz go ręcznie.\n\nSzczegóły techniczne:\n${diag.join('\n') || '(brak)'}`,
        );
        setBusy('');
        return;
      }
      const title = draft.title && !/^(TikTok|Instagram)\b/i.test(draft.title) ? draft.title : source?.title || 'Przepis';
      const recipe: Recipe = {
        id: uid(),
        title: title.slice(0, 100),
        url: source?.url ?? link,
        author: draft.author ?? source?.author,
        image: draft.image ?? source?.image,
        servings: draft.servings || 4,
        time: draft.time ?? minutesFromText(draft.steps.map((s) => s.text).join(' ')),
        category: draft.category ?? guessCategory(`${title} ${draft.tags.join(' ')}`, data.categories),
        ingredients: draft.ingredients,
        steps: draft.steps,
        tags: draft.tags,
        note: '',
        sourceText: material.slice(0, 6000),
        favorite: false,
        rating: 0,
        cookedCount: 0,
        createdAt: Date.now(),
      };
      saveRecipe(recipe);
      nav.replace({ name: 'detail', id: recipe.id });
    } finally {
      setBusy('');
    }
  };

  const started = useRef(false);
  useEffect(() => {
    if (autoStart && initialUrl && !started.current) {
      started.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1}>Dodaj przepis</Text>
        <Text style={st.label}>Link do przepisu</Text>
        <Text style={st.hint}>TikTok, Instagram albo dowolna strona z przepisem (np. aniagotuje.pl, kwestiasmaku.com).</Text>
        <TextInput value={url} onChangeText={setUrl} placeholder="https://…" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={st.input} />
        <Button title="Wklej ze schowka" icon="clipboard-outline" outline onPress={paste} style={{ marginTop: 10 }} />

        <Text style={[st.label, { marginTop: 22 }]}>Albo wklej tekst przepisu (opcjonalnie)</Text>
        <TextInput value={text} onChangeText={setText} multiline placeholder={'Składniki:\n2 jajka\n200 g mąki\n\nPrzygotowanie:\n1. Wymieszaj…'} placeholderTextColor={colors.muted} style={[st.input, { minHeight: 140, textAlignVertical: 'top' }]} />

        <View style={st.mode}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{hasKey ? `✨ Tryb AI (${{ claude: 'Claude', groq: 'Groq', gemini: 'Gemini' }[data.settings.provider]})` : '📋 Tryb bez AI'}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {hasKey ? 'Przepisy z TikToka i Instagrama zostaną rozpisane na składniki i kroki.' : 'Strony z przepisami działają bez AI. Do filmów z TikToka dodaj darmowy klucz w Więcej → Ustawienia AI.'}
          </Text>
        </View>

        {busy ? (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.muted, marginTop: 8 }}>{busy}</Text>
          </View>
        ) : (
          <>
            <Button title="Importuj przepis" icon="sparkles" onPress={run} style={{ marginTop: 20 }} />
            <Button title="Wpisz ręcznie" icon="create-outline" outline onPress={() => nav.replace({ name: 'edit', draft: true })} style={{ marginTop: 12 }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  hint: { color: colors.muted, marginBottom: 8, lineHeight: 20 },
  input: { backgroundColor: colors.card, borderRadius: 14, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.line },
  mode: { marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: colors.primarySoft },
});
