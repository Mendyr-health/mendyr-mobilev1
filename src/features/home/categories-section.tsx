import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, ErrorState, SectionTitle, SkeletonList } from '@/components/ui';
import { useT } from '@/i18n';
import { useCategories, useServices } from '@/features/catalog/api';
import { ServiceCard } from '@/features/catalog/service-card';

export function CategoriesSection({ title }: { title: string | null }) {
  const t = useT();
  const categories = useCategories();
  const services = useServices();
  const [selected, setSelected] = useState<string | null>(null);

  const visibleCategories = (categories.data ?? []).filter((cat) => services.data?.some((s) => s.category_id === cat.id));
  const list = (services.data ?? []).filter((s) => !selected || s.category_id === selected);

  return (
    <View style={s.wrap}>
      <SectionTitle title={title ?? t('home.categories')} />
      {visibleCategories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipScroll}>
          <Chip label={t('common.all')} selected={!selected} onPress={() => setSelected(null)} />
          {visibleCategories.map((cat) => (
            <Chip key={cat.id} label={cat.name} selected={selected === cat.id} onPress={() => setSelected(cat.id)} />
          ))}
        </ScrollView>
      ) : null}
      {services.isPending ? (
        <SkeletonList count={3} />
      ) : services.isError ? (
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      ) : (
        <View style={s.list}>
          {list.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  chipScroll: { marginHorizontal: -16 },
  chips: { paddingHorizontal: 16, gap: 8 },
  list: { gap: 12 },
});
