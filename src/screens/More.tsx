import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, Chip, Header } from '../components/ui';
import { Provider } from '../types';

const DEFAULT_MODEL: Record<Provider, string> = { groq: 'openai/gpt-oss-120b', gemini: 'gemini-2.5-flash', claude: 'claude-sonnet-5-5' };

export default function More() {
  const { data, setSettings } = useStore();
  const [provider, setProvider] = useState<Provider>(data.settings.provider);
  const [key, setKey] = useState(data.settings.apiKey);
  const [model, setModel] = useState(data.settings.model);
  const done = data.tips.filter((t) => t.done).length;

  const pick = (p: Provider) => {
    if (p === provider) return;
    setProvider(p);
    setModel(DEFAULT_MODEL[p]);
    setKey(p === data.settings.provider ? data.settings.apiKey : '');
  };

  const exportAll = () =>
    Share.share({
      message: data.tips
        .map((t) => [`# ${t.title}`, t.summary, ...(t.keyPoints ?? []).map((k) => `- ${k}`), ...t.steps.map((s, i) => `${i + 1}. ${s.text}`), t.url ?? ''].filter(Boolean).join('\n'))
        .join('\n\n---\n\n'),
    });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <Header title="Więcej" />
      <View style={st.card}>
        <Text style={st.h}>Statystyki</Text>
        <Text style={st.p}>Zapisane porady: {data.tips.length}</Text>
        <Text style={st.p}>Wypróbowane: {done}</Text>
        <Button title="Eksportuj wszystkie porady" icon="share-outline" outline onPress={exportAll} disabled={data.tips.length === 0} style={{ marginTop: 8 }} />
      </View>
      <View style={st.card}>
        <Text style={st.h}>Ustawienia AI</Text>
        <Text style={st.p}>AI rozpisuje transkrypcję na najważniejsze informacje, hasła, kroki i prompty. Klucz zapisuje się tylko na tym telefonie i jest wysyłany wyłącznie do wybranego dostawcy.</Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <Chip label="Groq (darmowy)" active={provider === 'groq'} onPress={() => pick('groq')} />
          <Chip label="Gemini" active={provider === 'gemini'} onPress={() => pick('gemini')} />
          <Chip label="Claude" active={provider === 'claude'} onPress={() => pick('claude')} />
        </View>
        {provider === 'groq' && (
          <>
            <Text style={[st.p, { marginTop: 10 }]}>Darmowy klucz: otwórz Groq Console, zaloguj się (np. kontem Google), wybierz „Create API Key” i skopiuj klucz (zaczyna się od gsk_) tutaj.</Text>
            <Button title="Otwórz Groq Console" icon="open-outline" outline onPress={() => Linking.openURL('https://console.groq.com/keys')} />
          </>
        )}
        {provider === 'gemini' && (
          <>
            <Text style={[st.p, { marginTop: 10 }]}>Klucz z Google AI Studio. Uwaga: nowe klucze zaczynające się od „AQ.” bywają odrzucane. Wtedy użyj Groq.</Text>
            <Button title="Otwórz Google AI Studio" icon="open-outline" outline onPress={() => Linking.openURL('https://aistudio.google.com/apikey')} />
          </>
        )}
        {provider === 'claude' && <Text style={[st.p, { marginTop: 10 }]}>Klucz Claude (płatny) utworzysz w console.anthropic.com.</Text>}
        <TextInput value={key} onChangeText={setKey} placeholder={provider === 'groq' ? 'gsk_…' : provider === 'gemini' ? 'AIza…' : 'sk-ant-…'} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} secureTextEntry style={st.input} />
        <Text style={[st.p, { marginTop: 12, marginBottom: 0 }]}>Model AI (zostaw domyślny; to nie jest nazwa projektu):</Text>
        <TextInput value={model} onChangeText={setModel} placeholder="Model" placeholderTextColor={colors.muted} autoCapitalize="none" style={[st.input, { marginTop: 10 }]} />
        <Button
          title="Zapisz"
          onPress={() => {
            setSettings({ provider, apiKey: key.trim(), model: model.trim() || DEFAULT_MODEL[provider] });
            Alert.alert('Zapisano');
          }}
          style={{ marginTop: 14 }}
        />
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginHorizontal: 20, marginBottom: 14 },
  h: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  p: { color: colors.muted, fontSize: 15, lineHeight: 21, marginBottom: 6 },
  input: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, fontSize: 16, color: colors.text, marginTop: 8 },
});
