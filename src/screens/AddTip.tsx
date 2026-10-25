import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useStore, uid } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';
import { Nav } from '../nav';
import { analyzeTip, extractTikTokUrl } from '../ai';
import { readSlides } from '../vision';
import { fetchTikTokMeta, isGeneric } from '../tiktok';
import { fetchTikTokTranscript } from '../transcript';
import { Tip } from '../types';

export default function AddTip({ nav, initialUrl, autoStart }: { nav: Nav; initialUrl?: string; autoStart?: boolean }) {
  const { data, addTip } = useStore();
  const [url, setUrl] = useState(initialUrl ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [slides, setSlides] = useState<string[]>([]); // zdjęcia slajdów w base64
  const hasKey = data.settings.apiKey.trim().length > 0;

  const paste = async () => {
    const t = await Clipboard.getStringAsync();
    setUrl(extractTikTokUrl(t) ?? t);
  };

  const pickSlides = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 12,
      quality: 0.6,
      base64: true,
    });
    if (res.canceled) return;
    setSlides(res.assets.map((a) => a.base64).filter((b): b is string => !!b));
  };

  const run = async () => {
    const link = extractTikTokUrl(url) ?? undefined;
    if (!link && !text.trim() && slides.length === 0) {
      Alert.alert('Brak materiału', 'Wklej link do TikToka albo opis / transkrypcję porady.');
      return;
    }
    const diag: string[] = [];
    const log = (l: string) => diag.push(l);
    try {
      setBusy('Pobieram dane filmu…');
      const meta = link ? await fetchTikTokMeta(link, log) : null;
      const caption = meta?.title && !isGeneric(meta.title) ? meta.title : '';
      let transcript = text.trim();
      if (!transcript && link) {
        setBusy('Pobieram napisy z filmu…');
        transcript = (await fetchTikTokTranscript(link, log)) ?? '';
        // długi opis (np. lista narzędzi w poście) wystarcza – wtedy brak napisów nie jest problemem
        if (!transcript && caption.length < 150 && slides.length === 0) {
          Alert.alert('Brak napisów w filmie', `Nie znalazłem napisów do tego filmu. Aby uzyskać dokładniejszy wynik, wklej transkrypcję ręcznie.\n\nSzczegóły techniczne:\n${diag.join('\n')}`);
        }
      }
      let slideError = '';
      if (slides.length > 0) {
        setBusy(`Odczytuję tekst ze zdjęć (${slides.length})…`);
        try {
          const slidesText = await readSlides(slides, data.settings);
          if (slidesText) transcript = [transcript, `Tekst ze slajdów:\n${slidesText}`].filter(Boolean).join('\n\n');
          else log('zdjęcia: AI nie zwróciło tekstu');
        } catch (e) {
          slideError = (e as Error).message;
          log(`zdjęcia: ${slideError}`);
        }
      }
      const source = [caption && `Opis filmu: ${caption}`, meta?.author && `Autor: ${meta.author}`, transcript && `Transkrypcja / notatki:\n${transcript}`]
        .filter(Boolean)
        .join('\n\n');
      if (!caption && !transcript) {
        Alert.alert(
          slides.length > 0 ? 'Nie udało się odczytać zdjęć' : 'Nie udało się pobrać opisu',
          `${slides.length > 0 ? 'Wklej tekst ze slajdów ręcznie albo spróbuj ponownie.' : 'Wklej poniżej opis lub transkrypcję filmu – AI uporządkuje ją w kroki.'}\n\nSzczegóły techniczne:\n${diag.join('\n') || '(brak)'}`,
        );
        setBusy('');
        return;
      }
      if (slideError) Alert.alert('Zdjęć nie udało się odczytać', `${slideError}\n\nPorada powstanie bez tekstu ze slajdów.`);
      setBusy(hasKey ? 'AI porządkuje poradę…' : 'Porządkuję poradę…');
      const { analysis, error } = await analyzeTip(source, data.settings, caption);
      if (error) Alert.alert('AI niedostępne', `${error}\n\nUżyłem prostego porządkowania offline.`);
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

        <Text style={[st.label, { marginTop: 22 }]}>Slajdy ze zdjęć (opcjonalnie)</Text>
        <Text style={st.hint}>Dla postów ze zdjęciami: zrób zrzuty ekranu slajdów, wybierz je tutaj, a AI przepisze z nich tekst i prompty.</Text>
        <Button title={slides.length ? `Wybrano ${slides.length} zdjęć – zmień` : 'Wybierz zrzuty slajdów'} icon="images-outline" outline onPress={pickSlides} />

        <View style={st.mode}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{hasKey ? `✨ Tryb AI (${{ claude: 'Claude', groq: 'Groq', gemini: 'Gemini' }[data.settings.provider]})` : '📋 Tryb offline'}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            {hasKey ? 'Porada zostanie rozpisana na kroki, prompty i narzędzia.' : 'Bez klucza porada jest porządkowana prostymi regułami. Darmowy klucz dodasz w Więcej → Ustawienia AI.'}
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
