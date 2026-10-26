import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { VestiaBackground } from '@/components/VestiaBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { fetchOutfitLogs, insertOutfitLog, fetchClothingItems } from '@/lib/data';
import { OutfitLog, ClothingItem } from '@/lib/types';
import { clothingDisplayName } from '@/lib/clothing-utils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<OutfitLog[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedLogs, fetchedItems] = await Promise.all([
        fetchOutfitLogs(user.id),
        fetchClothingItems(user.id),
      ]);
      setLogs(fetchedLogs);
      setItems(fetchedItems);
    } catch (err) {
      console.error('Failed to load:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const formatDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getLogsForDate = (dateStr: string) => logs.filter((l) => l.date === dateStr);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayPress = (day: number) => {
    const dateStr = formatDate(year, month, day);
    setSelectedDate(dateStr);
    const existing = getLogsForDate(dateStr);
    if (existing.length > 0) {
      setNote(existing[0].note || '');
      setSelectedItems(existing[0].item_ids || []);
    } else {
      setNote('');
      setSelectedItems([]);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user || !selectedDate) return;
    try {
      await insertOutfitLog({
        item_ids: selectedItems,
        date: selectedDate,
        note: note || null,
      });
      setModalVisible(false);
      setNote('');
      setSelectedItems([]);
      await loadData();
    } catch (err) {
      console.error('Failed to save log:', err);
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <VestiaBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.title}>Outfit Calendar</Text>
            <Text style={styles.subtitle}>Track what you wear each day</Text>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={prevMonth}>
                <ChevronLeft color={Colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth}>
                <ChevronRight color={Colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekHeader}>
              {DAYS.map((day, i) => (
                <Text key={i} style={styles.weekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(year, month, day);
                const dayLogs = getLogsForDate(dateStr);
                const hasLog = dayLogs.length > 0;
                const isToday = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === dateStr;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      isToday && styles.dayCellToday,
                      hasLog && styles.dayCellHasLog,
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                      hasLog && !isToday && styles.dayNumberHasLog,
                    ]}>
                      {day}
                    </Text>
                    {hasLog && <View style={styles.logIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Outfits</Text>
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => {
                const logItems = (log.item_ids || [])
                  .map((id) => items.find((i) => i.id === id))
                  .filter(Boolean) as ClothingItem[];
                return (
                  <View key={log.id} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logDate}>
                        {new Date(log.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    {logItems.length > 0 && (
                      <Text style={styles.logItems}>
                        {logItems.map((i) => i.name).join(' · ')}
                      </Text>
                    )}
                    {log.note && <Text style={styles.logNote}>{log.note}</Text>}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <CalendarIcon color={Colors.textTertiary} size={40} strokeWidth={1.5} />
                <Text style={styles.emptyText}>No outfits logged yet</Text>
                <Text style={styles.emptySubtext}>Tap any day to log what you wore</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X color={Colors.textSecondary} size={22} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>What did you wear?</Text>
              {items.length > 0 ? (
                <ScrollView style={styles.itemPicker} showsVerticalScrollIndicator={false}>
                  {items.map((item) => {
                    const isSelected = selectedItems.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.itemPickerRow, isSelected && styles.itemPickerRowActive]}
                        onPress={() => toggleItem(item.id)}
                      >
                        <View style={styles.itemPickerCheck}>
                          {isSelected && <View style={styles.itemPickerCheckDot} />}
                        </View>
                        <Text style={styles.itemPickerName}>{clothingDisplayName(item)}</Text>
                        <Text style={styles.itemPickerCat}>{item.category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={styles.noItemsText}>Add items to your wardrobe first</Text>
              )}

              <Text style={styles.modalLabel}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note about this outfit..."
                placeholderTextColor={Colors.textTertiary}
                value={note}
                onChangeText={setNote}
                multiline
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Outfit Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </VestiaBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.lg },
  title: { ...Typography.h1, color: Colors.text, fontSize: 28 },
  subtitle: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: Spacing.xs },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  monthTitle: {
    ...Typography.h2,
    color: Colors.text,
    fontSize: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellToday: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.round,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  dayCellHasLog: {
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.round,
  },
  dayNumber: {
    ...Typography.body,
    color: Colors.text,
    fontFamily: 'Inter-Medium',
  },
  dayNumberToday: {
    color: Colors.accent,
  },
  dayNumberHasLog: {
    color: Colors.accent,
  },
  logIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 2,
  },
  section: { marginTop: Spacing.xl },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  logCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDate: {
    ...Typography.body,
    color: Colors.text,
    fontFamily: 'Inter-Semi',
  },
  logItems: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  logNote: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text,
    fontSize: 20,
    flex: 1,
  },
  modalLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  itemPicker: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  itemPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  itemPickerRowActive: {},
  itemPickerCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPickerCheckDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  itemPickerName: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  itemPickerCat: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  noItemsText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
  },
  noteInput: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 60,
    marginBottom: Spacing.lg,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4,
    alignItems: 'center',
  },
  saveButtonText: {
    ...Typography.h3,
    color: Colors.primary,
    fontFamily: 'Inter-Semi',
  },
});
