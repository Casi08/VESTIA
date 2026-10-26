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
import { Package, MapPin, Calendar, Cloud, Sparkles, Check, Lightbulb, ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/lib/theme';
import { fetchClothingItems } from '@/lib/data';
import { generatePackingList } from '@/lib/ai';
import { ClothingItem, PackingResult } from '@/lib/types';

export default function PackingScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('3');
  const [weather, setWeather] = useState('mild');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchClothingItems(user.id);
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleGenerate = async () => {
    if (!destination.trim()) {
      setError('Please enter a destination');
      return;
    }
    if (items.length === 0) {
      setError('Add clothing items to your wardrobe first');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generatePackingList(
        destination,
        parseInt(duration) || 3,
        weather,
        items
      );
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate packing list');
    } finally {
      setLoading(false);
    }
  };

  const WEATHERS = [
    { label: 'Hot', value: 'hot' },
    { label: 'Warm', value: 'warm' },
    { label: 'Mild', value: 'mild' },
    { label: 'Cool', value: 'cool' },
    { label: 'Cold', value: 'cold' },
  ];

  return (
    <VestiaBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft color={Colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.title}>Packing Assistant</Text>
            </View>
            <Text style={styles.subtitle}>AI plans your trip wardrobe</Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Package color={Colors.accent} size={48} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No items to pack</Text>
              <Text style={styles.emptyText}>
                Add clothing to your wardrobe first, then Vestia can help you pack.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Destination</Text>
                  <View style={styles.inputRow}>
                    <MapPin color={Colors.textTertiary} size={18} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Paris, Tokyo, Miami..."
                      placeholderTextColor={Colors.textTertiary}
                      value={destination}
                      onChangeText={setDestination}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Duration (days)</Text>
                  <View style={styles.inputRow}>
                    <Calendar color={Colors.textTertiary} size={18} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="3"
                      placeholderTextColor={Colors.textTertiary}
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Weather</Text>
                  <View style={styles.weatherRow}>
                    {WEATHERS.map((w) => {
                      const isActive = weather === w.value;
                      return (
                        <TouchableOpacity
                          key={w.value}
                          style={[styles.weatherChip, isActive && styles.weatherChipActive]}
                          onPress={() => setWeather(w.value)}
                        >
                          <Text style={[styles.weatherChipText, isActive && styles.weatherChipTextActive]}>
                            {w.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerate}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color={Colors.primary} />
                      <Text style={styles.generateButtonText}>Packing your bag...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles color={Colors.primary} size={20} strokeWidth={2} />
                      <Text style={styles.generateButtonText}>Generate Packing List</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {result && (
                <View style={styles.resultSection}>
                  <Text style={styles.resultTitle}>Your Packing List</Text>

                  {result.packing_list && result.packing_list.length > 0 && (
                    <View style={styles.packingListCard}>
                      {result.packing_list.map((item, i) => (
                        <View key={i} style={styles.packingItem}>
                          <View style={styles.packingItemDot}>
                            <Check color={Colors.accent} size={14} strokeWidth={2.5} />
                          </View>
                          <View style={styles.packingItemInfo}>
                            <Text style={styles.packingItemName}>{item.item_name}</Text>
                            <Text style={styles.packingItemReason}>{item.reason}</Text>
                          </View>
                          <View style={styles.packingQty}>
                            <Text style={styles.packingQtyText}>x{item.quantity}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {result.tips && result.tips.length > 0 && (
                    <View style={styles.tipsCard}>
                      <View style={styles.tipsHeader}>
                        <Lightbulb color={Colors.accent} size={18} strokeWidth={2} />
                        <Text style={styles.tipsTitle}>Packing Tips</Text>
                      </View>
                      {result.tips.map((tip, i) => (
                        <Text key={i} style={styles.tipText}>• {tip}</Text>
                      ))}
                    </View>
                  )}

                  {result.outfit_plan && result.outfit_plan.length > 0 && (
                    <View style={styles.planCard}>
                      <Text style={styles.planTitle}>Outfit Plan</Text>
                      {result.outfit_plan.map((plan, i) => (
                        <Text key={i} style={styles.planText}>{plan}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </VestiaBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { ...Typography.h1, color: Colors.text, fontSize: 28 },
  subtitle: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: Spacing.xs },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputGroup: { marginBottom: Spacing.lg },
  inputLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  textInput: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
    paddingVertical: Spacing.md,
  },
  weatherRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  weatherChip: {
    flex: 1,
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  weatherChipActive: {
    backgroundColor: Colors.accent,
  },
  weatherChipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  weatherChipTextActive: {
    color: Colors.primary,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4,
  },
  generateButtonText: {
    ...Typography.h3,
    color: Colors.primary,
    fontFamily: 'Inter-Semi',
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  resultSection: { marginTop: Spacing.xl },
  resultTitle: {
    ...Typography.h2,
    color: Colors.accent,
    fontSize: 22,
    marginBottom: Spacing.md,
  },
  packingListCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  packingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  packingItemDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  packingItemInfo: { flex: 1 },
  packingItemName: {
    ...Typography.body,
    color: Colors.text,
    fontFamily: 'Inter-Medium',
  },
  packingItemReason: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  packingQty: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  packingQtyText: {
    ...Typography.caption,
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
  tipsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontSize: 18,
  },
  tipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  planText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
});
