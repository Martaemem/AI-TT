import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { uid, useStore } from '../store';
import { box, colors, fonts } from '../theme';
import { Button, Header, Text, inputStyle } from '../components/ui';
import { Art } from '../components/Art';
import { Nav } from '../nav';
import { Draft, extractUrl, fetchSource, guessCategory, parseRecipeText, Source } from '../source';
import { recipeWithAi } from '../ai';
import { Recipe } from '../types';
import { estimateServings, minutesFromText, servingsFromText } from '../units';

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
          parsed = { title: source?.title || 'Nowy przepis', servings: servingsFromText(material) ?? estimateServings(p.ingredients), ingredients: p.ingredients, steps: p.steps, tags: [] };
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={[st.h1, { flex: 1 }]}>Dodaj przepis</Text>
          <Art kind="pot" size={84} />
        </View>

        <Text style={st.label}>Link do przepisu</Text>
        <Text style={st.hint}>TikTok, Instagram albo dowolna strona z przepisem (np. aniagotuje.pl, kwestiasmaku.com).</Text>
        <TextInput value={url} onChangeText={setUrl} placeholder="https://…" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={inputStyle} />
        <Button title="Wklej ze schowka" icon="clipboard-outline" outline onPress={paste} style={{ marginTop: 12 }} />

        <Text style={[st.label, { marginTop: 24 }]}>Albo wklej tekst przepisu (opcjonalnie)</Text>
        <TextInput value={text} onChangeText={setText} multiline placeholder={'Składniki:\n2 jajka\n200 g mąki\n\nPrzygotowanie:\n1. Wymieszaj…'} placeholderTextColor={colors.muted} style={[inputStyle, { minHeight: 140, textAlignVertical: 'top' }]} />

        <View style={[box(colors.lavender, 22), { marginTop: 20, padding: 14 }]}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>{hasKey ? `✨ Tryb AI (${{ claude: 'Claude', groq: 'Groq', gemini: 'Gemini' }[data.settings.provider]})` : '📋 Tryb bez AI'}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {hasKey ? 'Przepisy z TikToka i Instagrama zostaną rozpisane na składniki i kroki.' : 'Strony z przepisami działają bez AI. Do filmów z TikToka dodaj darmowy klucz w Więcej → Ustawienia AI.'}
          </Text>
        </View>

        {busy ? (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <ActivityIndicator color={colors.ink} size="large" />
            <Text style={{ color: colors.muted, marginTop: 8 }}>{busy}</Text>
          </View>
        ) : (
          <>
            <Button title="Importuj przepis" icon="sparkles" onPress={run} style={{ marginTop: 22 }} />
            <Button title="Wpisz ręcznie" icon="create-outline" outline onPress={() => nav.replace({ name: 'edit', draft: true })} style={{ marginTop: 12 }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  h1: { fontSize: 34, fontFamily: fonts.display, color: colors.ink, lineHeight: 42 },
  label: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.ink, marginBottom: 4, lineHeight: 26 },
  hint: { color: colors.muted, marginBottom: 10, lineHeight: 20 },
});
