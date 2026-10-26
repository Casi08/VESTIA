import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { VestiaBackground } from '@/components/VestiaBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { User, LogOut, TrendingUp, Palette, Package, ChevronRight, PieChart } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { fetchClothingItems, fetchStyleProfile, fetchOutfitLogs, upsertStyleProfile } from '@/lib/data';
import { ClothingItem, StyleProfile, OutfitLog } from '@/lib/types';
import { clothingDisplayName } from '@/lib/clothing-utils';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [logs, setLogs] = useState<OutfitLog[]>([]);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [bodyType, setBodyType] = useState('');
  const [skinTone, setSkinTone] = useState('');
  const [preferredColors, setPreferredColors] = useState('');
  const [stylePrefs, setStylePrefs] = useState('');
  const [sizeTop, setSizeTop] = useState('');
  const [sizeBottom, setSizeBottom] = useState('');
  const [sizeShoes, setSizeShoes] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedItems, fetchedProfile, fetchedLogs] = await Promise.all([
        fetchClothingItems(user.id),
        fetchStyleProfile(user.id),
        fetchOutfitLogs(user.id),
      ]);
      setItems(fetchedItems);
      setProfile(fetchedProfile);
      setLogs(fetchedLogs);
      if (fetchedProfile) {
        setBodyType(fetchedProfile.body_type || '');
        setSkinTone(fetchedProfile.skin_tone || '');
        setPreferredColors((fetchedProfile.preferred_colors || []).join(', '));
        setStylePrefs((fetchedProfile.style_preferences || []).join(', '));
        setSizeTop(fetchedProfile.size_top || '');
        setSizeBottom(fetchedProfile.size_bottom || '');
        setSizeShoes(fetchedProfile.size_shoes || '');
      }
    } catch (err) {
      console.error('Failed to load:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const colors = preferredColors.split(',').map((c) => c.trim()).filter(Boolean);
      const prefs = stylePrefs.split(',').map((p) => p.trim()).filter(Boolean);
      const updated = await upsertStyleProfile({
        user_id: user.id,
        body_type: bodyType,
        skin_tone: skinTone,
        preferred_colors: colors,
        style_preferences: prefs,
        size_top: sizeTop,
        size_bottom: sizeBottom,
        size_shoes: sizeShoes,
      });
      setProfile(updated);
      setEditingProfile(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const categoryCounts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unworn = items.filter((i) => i.times_worn === 0).length;
  const mostWorn = [...items].sort((a, b) => b.times_worn - a.times_worn)[0];
  const leastWorn = items.filter((i) => i.times_worn === 0).slice(0, 3);

  return (
    <VestiaBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
              <LogOut color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.userInfoCard}>
            <View style={styles.avatar}>
              <User color={Colors.accent} size={32} strokeWidth={1.5} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email || 'User'}</Text>
              <Text style={styles.userItems}>{items.length} items - {logs.length} outfits logged</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/profile/packing')}
            activeOpacity={0.85}
          >
            <View style={styles.menuIcon}>
              <Package color={Colors.accent} size={20} strokeWidth={2} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Packing Assistant</Text>
              <Text style={styles.menuSubtitle}>Plan outfits for your next trip</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={20} />
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Palette color={Colors.accent} size={18} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Style Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingProfile(!editingProfile)}>
                <Text style={styles.editButton}>{editingProfile ? 'Cancel' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            {editingProfile ? (
              <View style={styles.profileEditForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Body Type</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. slim, athletic, curvy"
                    placeholderTextColor={Colors.textTertiary}
                    value={bodyType}
                    onChangeText={setBodyType}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Skin Tone</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. fair, medium, deep"
                    placeholderTextColor={Colors.textTertiary}
                    value={skinTone}
                    onChangeText={setSkinTone}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Preferred Colors (comma-separated)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="navy, black, beige"
                    placeholderTextColor={Colors.textTertiary}
                    value={preferredColors}
                    onChangeText={setPreferredColors}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Style Preferences (comma-separated)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="minimalist, streetwear, classic"
                    placeholderTextColor={Colors.textTertiary}
                    value={stylePrefs}
                    onChangeText={setStylePrefs}
                  />
                </View>
                <View style={styles.sizesRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Top Size</Text>
                    <TextInput style={styles.textInput} placeholder="M" placeholderTextColor={Colors.textTertiary} value={sizeTop} onChangeText={setSizeTop} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bottom Size</Text>
                    <TextInput style={styles.textInput} placeholder="32" placeholderTextColor={Colors.textTertiary} value={sizeBottom} onChangeText={setSizeBottom} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Shoe Size</Text>
                    <TextInput style={styles.textInput} placeholder="42" placeholderTextColor={Colors.textTertiary} value={sizeShoes} onChangeText={setSizeShoes} />
                  </View>
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileCard}>
                {profile && (profile.body_type || profile.skin_tone) ? (
                  <>
                    {profile.body_type && (
                      <View style={styles.profileRow}>
                        <Text style={styles.profileLabel}>Body Type</Text>
                        <Text style={styles.profileValue}>{profile.body_type}</Text>
                      </View>
                    )}
                    {profile.skin_tone && (
                      <View style={styles.profileRow}>
                        <Text style={styles.profileLabel}>Skin Tone</Text>
                        <Text style={styles.profileValue}>{profile.skin_tone}</Text>
                      </View>
                    )}
                    {profile.preferred_colors && profile.preferred_colors.length > 0 && (
                      <View style={styles.profileRow}>
                        <Text style={styles.profileLabel}>Preferred Colors</Text>
                        <Text style={styles.profileValue}>{profile.preferred_colors.join(', ')}</Text>
                      </View>
                    )}
                    {profile.style_preferences && profile.style_preferences.length > 0 && (
                      <View style={styles.profileRow}>
                        <Text style={styles.profileLabel}>Style</Text>
                        <Text style={styles.profileValue}>{profile.style_preferences.join(', ')}</Text>
                      </View>
                    )}
                    {(profile.size_top || profile.size_bottom || profile.size_shoes) && (
                      <View style={styles.profileRow}>
                        <Text style={styles.profileLabel}>Sizes</Text>
                        <Text style={styles.profileValue}>
                          {[profile.size_top, profile.size_bottom, profile.size_shoes].filter(Boolean).join(' | ')}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.profileEmpty}>
                    <Text style={styles.profileEmptyText}>
                      Tell Vestia about your style to get better outfit recommendations
                    </Text>
                    <TouchableOpacity onPress={() => setEditingProfile(true)}>
                      <Text style={styles.editButton}>Set up profile</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <PieChart color={Colors.accent} size={18} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Wardrobe Analytics</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{items.length}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{unworn}</Text>
                <Text style={styles.statLabel}>Unworn Items</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{logs.length}</Text>
                <Text style={styles.statLabel}>Days Logged</Text>
              </View>
            </View>
          </View>

          {Object.keys(categoryCounts).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category Breakdown</Text>
              <View style={styles.categoryList}>
                {Object.entries(categoryCounts).map(([cat, count]) => {
                  const pct = Math.round((count / items.length) * 100);
                  return (
                    <View key={cat} style={styles.categoryRow}>
                      <Text style={styles.categoryName}>{cat}</Text>
                      <View style={styles.categoryBar}>
                        <View style={[styles.categoryBarFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.categoryCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {mostWorn && mostWorn.times_worn > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <TrendingUp color={Colors.accent} size={18} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Most Worn</Text>
              </View>
              <View style={styles.highlightCard}>
                <Text style={styles.highlightName}>{clothingDisplayName(mostWorn)}</Text>
              </View>
            </View>
          )}

          {leastWorn.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Never Worn</Text>
              <View style={styles.unwornList}>
                {leastWorn.map((item) => (
                  <View key={item.id} style={styles.unwornChip}>
                    <Text style={styles.unwornText}>{clothingDisplayName(item)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </VestiaBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: { ...Typography.h1, color: Colors.text, fontSize: 28 },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  userInfo: { flex: 1 },
  userEmail: { ...Typography.h3, color: Colors.text },
  userItems: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuTitle: { ...Typography.body, color: Colors.text, fontFamily: 'Inter-Semi' },
  menuSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { ...Typography.h3, color: Colors.text, fontSize: 18 },
  editButton: { ...Typography.bodySmall, color: Colors.accent, fontFamily: 'Inter-Semi' },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileLabel: { ...Typography.body, color: Colors.textSecondary },
  profileValue: { ...Typography.body, color: Colors.text, fontFamily: 'Inter-Medium' },
  profileEmpty: { alignItems: 'center', paddingVertical: Spacing.lg },
  profileEmptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  profileEditForm: {},
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.xs },
  textInput: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  sizesRow: { flexDirection: 'row', gap: Spacing.md },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: { ...Typography.h3, color: Colors.primary, fontFamily: 'Inter-Semi' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: { ...Typography.h1, color: Colors.accent, fontSize: 28 },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
  categoryList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  categoryName: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontFamily: 'Inter-Medium',
    width: 80,
    textTransform: 'capitalize',
  },
  categoryBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLighter,
    overflow: 'hidden',
  },
  categoryBarFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.accent },
  categoryCount: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    width: 24,
    textAlign: 'right',
  },
  highlightCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  highlightName: { ...Typography.h3, color: Colors.text, fontSize: 18 },
  unwornList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  unwornChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unwornText: { ...Typography.bodySmall, color: Colors.textSecondary },
});
