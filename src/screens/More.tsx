import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';
import { Button, Header } from '../components/ui';

export default function More() {
  const { data, setSettings } = useStore();
  const [key, setKey] = useState(data.settings.apiKey);
  const [model, setModel] = useState(data.settings.model);
  const done = data.tips.filter((t) => t.done).length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
      <Header title="Więcej" />
      <View style={st.card}>
        <Text style={st.h}>Statystyki</Text>
        <Text style={st.p}>Zapisane porady: {data.tips.length}</Text>
        <Text style={st.p}>Wypróbowane: {done}</Text>
      </View>
      <View style={st.card}>
        <Text style={st.h}>Ustawienia AI</Text>
        <Text style={st.p}>Podaj własny klucz API Anthropic, aby porady były rozpisywane przez Claude. Klucz zapisuje się tylko na tym telefonie i jest wysyłany wyłącznie do api.anthropic.com.</Text>
        <TextInput value={key} onChangeText={setKey} placeholder="sk-ant-…" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} secureTextEntry style={st.input} />
        <TextInput value={model} onChangeText={setModel} placeholder="Model" placeholderTextColor={colors.muted} autoCapitalize="none" style={[st.input, { marginTop: 10 }]} />
        <Button title="Zapisz" onPress={() => { setSettings({ apiKey: key.trim(), model: model.trim() || 'claude-sonnet-5-5' }); Alert.alert('Zapisano'); }} style={{ marginTop: 14 }} />
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
