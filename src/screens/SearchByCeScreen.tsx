import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { searchByCe } from '../db/orders';
import type { Order } from '../types/models';
import { OrderListItem } from '../components/OrderListItem';
import { colors, fonts, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchByCe'>;

export function SearchByCeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    searchByCe(query).then((orders) => {
      if (!cancelled) {
        setResults(orders);
        setSearched(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Find by CE Number</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type a CE number..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          style={styles.input}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        renderItem={({ item }) => (
          <OrderListItem order={item} onPress={() => navigation.navigate('Order', { orderId: item.id })} />
        )}
        ListEmptyComponent={
          searched ? <Text style={styles.emptyText}>No orders match "{query}".</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  list: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.family,
    fontSize: 18,
    color: colors.textPrimary,
  },
  emptyText: {
    padding: spacing.xxl,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
