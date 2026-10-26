import React, { useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { C, F } from '../theme';
import { Btn, CatChip, IconBtn, TopBar, st } from '../ui';
import { Nav } from '../types';

export default function Detail({ nav, id }: { nav: Nav; id: string }) {
  const { data, deleteItem } = useStore();
  const item = data.items.find((i) => i.id === id);
  const [full, setFull] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!item) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="Wpis" onBack={nav.pop} />
        <Text style={[st.small, { padding: 16 }]}>Tego wpisu już nie ma.</Text>
      </View>
    );
  }

  const hero = item.photos[0] ?? item.image;
  const cats = data.categories.filter((c) => item.cats.includes(c.id));

  const remove = () =>
    Alert.alert('Usunąć wpis?', item.assetId ? 'Zdjęcie zostanie w galerii telefonu.' : 'Tej operacji nie da się cofnąć.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          nav.pop();
          deleteItem(item.id);
        },
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <TopBar
        title=""
        onBack={nav.pop}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconBtn icon="create-outline" label="Edytuj" onPress={() => nav.push({ name: 'edit', id: item.id })} />
            <IconBtn icon="trash-outline" label="Usuń" color={C.redInk} onPress={remove} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
        {!!hero && (
          <Pressable onPress={() => setFull(hero)}>
            <Image source={{ uri: hero }} style={s.hero} resizeMode="cover" />
          </Pressable>
        )}
        <Text style={s.title} selectable>
          {item.title}
        </Text>
        {!!item.site && <Text style={s.site}>{item.site}</Text>}
        {!!item.url && (
          <View style={s.row}>
            <Btn label="Otwórz stronę" icon="open-outline" onPress={() => Linking.openURL(item.url!).catch(() => {})} style={{ flex: 2 }} />
            <Btn
              label={copied ? 'Skopiowano' : 'Kopiuj link'}
              icon="copy-outline"
              kind="ghost"
              onPress={async () => {
                await Clipboard.setStringAsync(item.url!);
                setCopied(true);
              }}
              style={{ flex: 1.4 }}
            />
          </View>
        )}
        <View style={s.chips}>
          {cats.length ? cats.map((c) => <CatChip key={c.id} cat={c} on />) : <Text style={st.small}>Bez kategorii – czeka w skrzynce do posortowania.</Text>}
        </View>
        {!!item.note && (
          <View style={[st.card, { padding: 14 }]}>
            <Text style={s.note} selectable>
              {item.note}
            </Text>
          </View>
        )}
        {item.photos.length > (hero === item.photos[0] ? 1 : 0) && (
          <View style={s.grid}>
            {item.photos.slice(hero === item.photos[0] ? 1 : 0).map((p) => (
              <Pressable key={p} onPress={() => setFull(p)}>
                <Image source={{ uri: p }} style={s.photo} resizeMethod="resize" />
              </Pressable>
            ))}
          </View>
        )}
        <Text style={st.small}>
          Dodano {new Date(item.createdAt).toLocaleDateString('pl-PL')}
          {item.album ? ` · z albumu „${item.album}”` : ''}
        </Text>
      </ScrollView>

      <Modal visible={!!full} transparent animationType="fade" onRequestClose={() => setFull(null)}>
        <View style={s.modal}>
          {!!full && <Image source={{ uri: full }} style={{ flex: 1 }} resizeMode="contain" />}
          <Pressable onPress={() => setFull(null)} style={s.close} accessibilityLabel="Zamknij">
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { width: '100%', height: 260, borderRadius: 14, backgroundColor: C.blueSoft },
  title: { fontFamily: F.heavy, fontSize: 24, lineHeight: 30, color: C.text },
  site: { fontFamily: F.bold, fontSize: 15, color: C.blueInk, marginTop: -8 },
  row: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { fontFamily: F.body, fontSize: 17, lineHeight: 25, color: C.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 104, height: 104, borderRadius: 10, backgroundColor: C.blueSoft },
  modal: { flex: 1, backgroundColor: '#000000' },
  close: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: 8 },
});
