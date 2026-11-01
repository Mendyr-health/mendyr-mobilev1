import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Badge, Button, Card, EmptyState, ErrorState, Header, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { addressLine } from '@/lib/format';
import type { Address } from '@/lib/types';
import { useTheme } from '@/theme';
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from './api';

export function AddressesScreen() {
  const t = useT();
  const toast = useToast();
  const addresses = useAddresses();
  const remove = useDeleteAddress();
  const makeDefault = useSetDefaultAddress();

  const confirmDelete = (a: Address) =>
    Alert.alert(t('address.deleteTitle'), t('address.deleteBody', { label: a.label }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          remove.mutate(a.id, {
            onSuccess: () => toast.show(t('address.deleted'), 'success'),
            onError: (e) => toast.show(e.message, 'error'),
          }),
      },
    ]);

  return (
    <Screen
      header={<Header title={t('address.title')} />}
      onRefresh={() => addresses.refetch()}
      footer={<Button title={t('address.addNew')} icon="plus" onPress={() => router.push('/address-form')} />}
    >
      {addresses.isPending ? (
        <SkeletonList count={2} />
      ) : addresses.isError ? (
        <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} />
      ) : addresses.data.length === 0 ? (
        <EmptyState icon="pin" title={t('address.emptyTitle')} body={t('address.emptyBody')} />
      ) : (
        addresses.data.map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            onEdit={() => router.push(`/address-form?id=${a.id}`)}
            onDelete={() => confirmDelete(a)}
            onDefault={() => makeDefault.mutate(a.id, { onError: (e) => toast.show(e.message, 'error') })}
          />
        ))
      )}
    </Screen>
  );
}

function AddressCard({ address: a, onEdit, onDelete, onDefault }: { address: Address; onEdit: () => void; onDelete: () => void; onDefault: () => void }) {
  const t = useT();
  const { colors: c } = useTheme();
  return (
    <Card style={s.card}>
      <View style={s.head}>
        <Icon name="pin" size={18} color={c.primary} />
        <Text variant="title" style={s.flex}>
          {a.label}
        </Text>
        {a.is_default ? <Badge label={t('address.default')} tone="primary" /> : null}
      </View>
      <Text variant="bodySm" color="muted">
        {addressLine(a)}
      </Text>
      {a.contact_name ? (
        <Text variant="caption" color="subtle">
          {t('address.forContact', { name: a.contact_name })}
        </Text>
      ) : null}
      <View style={s.actions}>
        <Button title={t('common.edit')} icon="edit" size="sm" variant="outline" full={false} onPress={onEdit} />
        {!a.is_default ? <Button title={t('address.setDefault')} size="sm" variant="ghost" full={false} onPress={onDefault} /> : null}
        <View style={s.flex} />
        <Button title={t('common.delete')} icon="trash" size="sm" variant="danger" full={false} onPress={onDelete} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
});
