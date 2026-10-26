import { router, Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Home, Layers, LogOut, Shirt, Sparkles } from 'lucide-react-native';
import { Colors, Spacing } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type VestiaTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

const icons = {
  index: Home,
  stylist: Sparkles,
  wardrobe: Shirt,
  profile: Layers,
};

function VestiaTabBar({ state, descriptors, navigation }: VestiaTabBarProps) {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)');
  };

  return (
    <View style={[styles.bar, { paddingTop: topInset }]}>
      <View style={styles.barContent}>
        <View style={styles.brandArea}>
          <Text accessibilityRole="header" style={styles.brand}>VESTIA</Text>
        </View>

        <View style={styles.navigation}>
          {state.routes
            .map((route, index) => ({ route, index }))
            .filter(({ route }) => route.name !== 'calendar')
            .map(({ route, index }) => {
              const { options } = descriptors[route.key];
              const Icon = icons[route.name as keyof typeof icons];
              if (!Icon) return null;
              const focused = state.index === index;
              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={onPress}
                  style={[styles.navButton, focused && styles.navButtonActive]}
                  activeOpacity={0.8}
                  testID={`vestia-tab-${route.name}`}
                >
                  <Icon
                    color={focused ? Colors.accentLight : Colors.textSecondary}
                    size={21}
                    strokeWidth={1.8}
                  />
                </TouchableOpacity>
              );
            })}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Esci"
          onPress={handleSignOut}
          style={styles.logoutButton}
          activeOpacity={0.75}
          testID="vestia-logout"
        >
          <LogOut color={Colors.textSecondary} size={20} strokeWidth={1.7} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <VestiaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'top',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="stylist" options={{ title: 'Stylist' }} />
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    zIndex: 10,
  },
  barContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  brandArea: {
    width: 98,
    justifyContent: 'center',
  },
  brand: {
    color: Colors.accentLight,
    fontFamily: 'Georgia',
    fontSize: 18,
    letterSpacing: 4,
  },
  navigation: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
