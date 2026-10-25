import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useStore, uid } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';
import { Nav } from '../nav';
import { analyzeLocally, analyzeWithClaude, extractTikTokUrl } from '../ai';
import { fetchTikTokMeta } from '../tiktok';
import { fetchTikTokTranscript } from '../transcript';
import { Tip } from '../types';

export default function AddTip({ nav, initialUrl, autoStart }: { nav: Nav; initialUrl?: string; autoStart?: boolean }) {
  const { data, addTip } = useStore();
  const [url, setUrl] = useState(initialUrl ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const hasKey = data.settings.apiKey.trim().length > 0;

  const paste = async () => {
    const t = await Clipboard.getStringAsync();
    setUrl(extractTikTokUrl(t) ?? t);
  };

  const run = async () => {
    const link = extractTikTokUrl(url) ?? undefined;
    if (!link && !text.trim()) {
      Alert.alert('Brak materiału', 'Wklej link do TikToka albo opis / transkrypcję porady.');
      return;
    }
    const diag: string[] = [];
    const log = (l: string) => diag.push(l);
    try {
      setBusy('Pobieram dane filmu…');
      const meta = link ? await fetchTikTokMeta(link, log) : null;
      let transcript = text.trim();
      if (!transcript && link) {
        setBusy('Pobieram napisy z filmu…');
        transcript = (await fetchTikTokTranscript(link, log)) ?? '';
        if (!transcript) {
          Alert.alert('Brak napisów w filmie', `Nie znalazłem napisów do tego filmu. Aby uzyskać dokładniejszy wynik, wklej transkrypcję ręcznie.\n\nSzczegóły techniczne:\n${diag.join('\n')}`);
        }
      }
      const source = [meta?.title && `Opis filmu: ${meta.title}`, meta?.author && `Autor: ${meta.author}`, transcript && `Transkrypcja / notatki:\n${transcript}`]
        .filter(Boolean)
        .join('\n\n');
      if (!meta?.title && !transcript) {
        Alert.alert('Nie udało się pobrać opisu', `Wklej poniżej opis lub transkrypcję filmu – AI uporządkuje ją w kroki.\n\nSzczegóły techniczne:\n${diag.join('\n')}`);
        setBusy('');
        return;
      }
      setBusy(hasKey ? 'AI porządkuje poradę…' : 'Porządkuję poradę…');
      let analysis;
      if (hasKey) {
        try {
          analysis = await analyzeWithClaude(source, data.settings.apiKey.trim(), data.settings.model);
        } catch (e) {
          Alert.alert('AI niedostępne', `${(e as Error).message}\n\nUżyję prostego porządkowania offline.`);
          analysis = analyzeLocally(source, meta?.title ?? '');
        }
      } else {
        analysis = analyzeLocally(source, meta?.title ?? '');
      }
      const tip: Tip = {
        id: uid(),
        url: link,
        author: meta?.author,
        thumbnail: meta?.thumbnail,
        ...analysis,
        sourceText: source,
        checked: [],
        favorite: false,
        done: false,
        rating: 0,
        note: '',
        collectionIds: [],
        createdAt: Date.now(),
      };
      addTip(tip);
      nav.replace({ name: 'detail', id: tip.id });
    } finally {
      setBusy('');
    }
  };

  // Link z menu „Udostępnij” importujemy od razu
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
        <Text style={st.h1}>Dodaj poradę z TikToka</Text>
        <Text style={st.label}>Link do filmu</Text>
        <TextInput value={url} onChangeText={setUrl} placeholder="https://www.tiktok.com/…" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={st.input} />
        <Button title="Wklej ze schowka" icon="clipboard-outline" outline onPress={paste} style={{ marginTop: 10 }} />

        <Text style={[st.label, { marginTop: 22 }]}>Transkrypcja lub opis (opcjonalnie)</Text>
        <Text style={st.hint}>Aplikacja sama próbuje pobrać napisy z filmu. Jeśli ich nie ma, wklej tu transkrypcję – wynik będzie dużo dokładniejszy.</Text>
        <TextInput value={text} onChangeText={setText} multiline placeholder="Np. 1. Otwórz ChatGPT… 2. Wklej prompt…" placeholderTextColor={colors.muted} style={[st.input, { minHeight: 140, textAlignVertical: 'top' }]} />

        <View style={st.mode}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{hasKey ? '✨ Tryb AI (Claude)' : '📋 Tryb offline'}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {hasKey ? 'Porada zostanie rozpisana na kroki, prompty i narzędzia.' : 'Bez klucza API porada jest porządkowana prostymi regułami. Dodaj klucz w Więcej → Ustawienia AI.'}
          </Text>
        </View>

        {busy ? (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.muted, marginTop: 8 }}>{busy}</Text>
          </View>
        ) : (
          <Button title="Uporządkuj poradę" icon="sparkles" onPress={run} style={{ marginTop: 20 }} />
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
