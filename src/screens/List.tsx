import React from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme';
import { Header, TipCard } from '../components/ui';
import { Nav } from '../nav';

export default function List({ nav, collectionId, title }: { nav: Nav; collectionId: string; title: string }) {
  const { data, deleteCollection } = useStore();
  const tips = data.tips.filter((t) => (collectionId === 'all' ? true : collectionId === 'favorites' ? t.favorite : t.collectionIds.includes(collectionId)));
  const custom = data.collections.some((c) => c.id === collectionId);

  return (
    <View style={{ flex: 1 }}>
      <Header
        onBack={nav.pop}
        right={
          custom ? (
            <Pressable
              hitSlop={12}
              onPress={() =>
                Alert.alert('Usunąć zbiór?', 'Porady zostaną zachowane.', [
                  { text: 'Anuluj', style: 'cancel' },
                  { text: 'Usuń', style: 'destructive', onPress: () => { deleteCollection(collectionId); nav.pop(); } },
                ])
              }
            >
              <Ionicons name="trash-outline" size={24} color={colors.text} />
            </Pressable>
          ) : undefined
        }
      />
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, paddingHorizontal: 20, marginBottom: 12 }}>{title}</Text>
      <FlatList
        data={tips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>Pusto. Dodaj porady do tego zbioru ze szczegółów porady.</Text>}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 14 }}>
            <TipCard tip={item} onPress={() => nav.push({ name: 'detail', id: item.id })} />
          </View>
        )}
      />
    </View>
  );
}
