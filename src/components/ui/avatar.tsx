import { Image } from 'expo-image';
import { View } from 'react-native';
import { initials } from '@/lib/format';
import { useTheme } from '@/theme';
import { Text } from './text';

export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) {
  const { colors: c } = useTheme();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.divider }}
        contentFit="cover"
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant={size > 52 ? 'h2' : 'title'} color="primaryDark">
        {initials(name)}
      </Text>
    </View>
  );
}
