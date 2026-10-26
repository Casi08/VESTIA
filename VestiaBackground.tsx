import { PropsWithChildren } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/lib/theme';

const marbleTexture = require('../assets/images/Screenshot_20261014-210031.png');

export function VestiaBackground({ children }: PropsWithChildren) {
  return (
    <ImageBackground source={marbleTexture} resizeMode="cover" style={styles.container}>
      <LinearGradient
        colors={['rgba(7, 5, 8, 0.16)', 'rgba(34, 10, 50, 0.14)', 'rgba(7, 4, 14, 0.32)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
});
