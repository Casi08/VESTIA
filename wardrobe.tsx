import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { VestiaBackground } from '@/components/VestiaBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { File as ExpoFile, Paths } from 'expo-file-system';
import { Camera, Image as ImageIcon, Shirt, Plus, Trash2, X, Filter, Tag } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/lib/theme';
import { fetchClothingItems, insertClothingItem, deleteClothingItem, updateClothingItem } from '@/lib/data';
import { clothingDisplayName } from '@/lib/clothing-utils';
import { analyzeClothing } from '@/lib/ai';
import { deleteClothingPhotos, uploadClothingImage } from '@/lib/storage';
import { AnalyzedClothing, ClothingItem } from '@/lib/types';

const CATEGORIES = ['all', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories', 'dresses'];
type PendingRemoval = { kind: 'item' } | { kind: 'photo'; side: 'front' | 'back' };

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function imageAssetToBase64(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    const assetFile = (asset as ImagePicker.ImagePickerAsset & { file?: File }).file;
    let file: File;
    if (assetFile) {
      file = assetFile;
    } else {
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Impossibile leggere la foto selezionata.');
      file = new globalThis.File([await response.blob()], 'clothing-photo.jpg', { type: 'image/jpeg' });
    }
    return fileToBase64(await compressImage(file, 1200, 0.8));
  }

  return FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
}

async function remoteImageToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Impossibile leggere la foto salvata.');
    const file = new globalThis.File([await response.blob()], 'clothing-photo.jpg', { type: 'image/jpeg' });
    return fileToBase64(await compressImage(file, 1200, 0.8));
  }

  const downloaded = await ExpoFile.downloadFileAsync(
    uri,
    new ExpoFile(Paths.cache, `vestia-ai-${Date.now()}.jpg`)
  );
  try {
    return await FileSystem.readAsStringAsync(downloaded.uri, { encoding: 'base64' });
  } finally {
    downloaded.delete();
  }
}

function compressImage(file: File, maxSize = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new globalThis.Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = image;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas non supportato'));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Compressione fallita'));
      }, 'image/jpeg', quality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossibile leggere l’immagine'));
    };
    image.src = url;
  });
}

export default function WardrobeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [detailItem, setDetailItem] = useState<ClothingItem | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [regeneratingAiDetails, setRegeneratingAiDetails] = useState(false);
  const [uploadingBackPhoto, setUploadingBackPhoto] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadItems = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchClothingItems(user.id);
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handleUpload = async (source: 'camera' | 'gallery') => {
    setUploadError('');
    setAnalyzing(true);

    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        throw new Error(source === 'camera' ? 'Consenti l’accesso alla fotocamera per scattare una foto.' : 'Consenti l’accesso alla galleria per scegliere una foto.');
      }

      const pickerResult = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.8 });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;
      if (!user) throw new Error('Accedi per aggiungere un capo al guardaroba.');

      const base64 = await imageAssetToBase64(pickerResult.assets[0]);
      const mimeType = 'image/jpeg';
      let analysis: AnalyzedClothing;
      try {
        analysis = await analyzeClothing(base64, mimeType);
      } catch (err: unknown) {
        const reason = err instanceof Error ? ` ${err.message}` : '';
        throw new Error(`Non è stato possibile generare nome e descrizione con l’IA. La foto non è stata salvata.${reason}`);
      }

      const imageUrl = await uploadClothingImage(user.id, base64, mimeType);
      const newItem = await insertClothingItem({
        name: analysis.name,
        category: analysis.category || 'other',
        subcategory: analysis.subcategory || null,
        color: analysis.color || null,
        color_hex: analysis.color_hex || null,
        material: analysis.material || null,
        season: analysis.season || 'all',
        image_url: imageUrl,
        ai_description: analysis.description,
      });
      setItems((prev) => [newItem, ...prev]);
      setDetailItem(newItem);
      setNotesDraft(newItem.personal_notes ?? '');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nel caricamento della foto. Riprova.';
      setUploadError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const openDetailItem = (item: ClothingItem) => {
    setDetailItem(item);
    setNotesDraft(item.personal_notes ?? '');
    setUploadError('');
  };

  const handleSaveDetails = async () => {
    if (!detailItem) return;
    setSavingDetails(true);
    setUploadError('');
    try {
      const updatedItem = await updateClothingItem(detailItem.id, {
        personal_notes: notesDraft.trim() || null,
      });
      setDetailItem(updatedItem);
      setItems((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Impossibile salvare i dettagli.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleRegenerateAiDetails = async () => {
    if (!detailItem?.image_url) {
      setUploadError('Aggiungi una foto del capo per generare nome e descrizione con l’IA.');
      return;
    }

    setRegeneratingAiDetails(true);
    setUploadError('');
    try {
      const imageBase64 = await remoteImageToBase64(detailItem.image_url);
      const analysis = await analyzeClothing(imageBase64, 'image/jpeg');
      const updatedItem = await updateClothingItem(detailItem.id, {
        name: analysis.name,
        category: analysis.category || detailItem.category || 'other',
        subcategory: analysis.subcategory || null,
        color: analysis.color || null,
        color_hex: analysis.color_hex || null,
        material: analysis.material || null,
        season: analysis.season || 'all',
        ai_description: analysis.description,
      });
      setDetailItem(updatedItem);
      setItems((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Impossibile generare i dettagli con l’IA.');
    } finally {
      setRegeneratingAiDetails(false);
    }
  };

  const handleBackPhoto = async (source: 'camera' | 'gallery') => {
    if (!detailItem) return;
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError(source === 'camera' ? 'Consenti l’accesso alla fotocamera per aggiungere il retro.' : 'Consenti l’accesso alla galleria per aggiungere il retro.');
      return;
    }
    const pickerResult = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

    setUploadingBackPhoto(true);
    setUploadError('');
    try {
      const asset = pickerResult.assets[0];
      const base64 = await imageAssetToBase64(asset);
      const backImageUrl = user ? await uploadClothingImage(user.id, base64, 'image/jpeg') : null;
      if (!backImageUrl) throw new Error('Impossibile salvare la foto del retro.');
      const updatedItem = await updateClothingItem(detailItem.id, { back_image_url: backImageUrl });
      setDetailItem(updatedItem);
      setItems((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Impossibile aggiungere la foto del retro.');
    } finally {
      setUploadingBackPhoto(false);
    }
  };

  const handleConfirmRemoval = async () => {
    if (!pendingRemoval || !detailItem || removing) return;

    setRemoving(true);
    setUploadError('');
    try {
      if (pendingRemoval.kind === 'item') {
        await deleteClothingPhotos([detailItem.image_url, detailItem.back_image_url]);
        await deleteClothingItem(detailItem.id);
        setItems((prev) => prev.filter((item) => item.id !== detailItem.id));
        setDetailItem(null);
      } else {
        const reference = pendingRemoval.side === 'front'
          ? detailItem.image_url
          : detailItem.back_image_url;
        const update: Partial<ClothingItem> = pendingRemoval.side === 'front'
          ? { image_url: null }
          : { back_image_url: null };

        await deleteClothingPhotos([reference]);
        const updatedItem = await updateClothingItem(detailItem.id, update);
        setDetailItem(updatedItem);
        setItems((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
      }
      setPendingRemoval(null);
    } catch (err: unknown) {
      setPendingRemoval(null);
      setUploadError(err instanceof Error ? err.message : 'Impossibile rimuovere la foto.');
    } finally {
      setRemoving(false);
    }
  };

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter((i) => i.category === activeCategory);
  const detailNeedsAi = !!detailItem && (
    detailItem.name === 'Capo da descrivere' || !detailItem.ai_description?.trim()
  );

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => openDetailItem(item)}
      activeOpacity={0.85}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <Shirt color={Colors.textTertiary} size={32} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{clothingDisplayName(item)}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        {item.color && (
          <View style={styles.colorRow}>
            {item.color_hex && <View style={[styles.colorDot, { backgroundColor: item.color_hex }]} />}
            <Text style={styles.itemColor}>{item.color}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <VestiaBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>IL TUO ARMADIO</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Guardaroba</Text>
              <Text style={styles.subtitle}>Una foto fronte e, se vuoi, una retro per ogni capo. Più capi carichi, più abbinamenti precisi ricevi.</Text>
            </View>
            <Text style={styles.itemCount}>{items.length} CAPI</Text>
          </View>
          <View style={styles.uploadActions}>
            <TouchableOpacity style={styles.addButton} onPress={() => void handleUpload('camera')} disabled={analyzing} activeOpacity={0.85}>
              <Camera color={Colors.primary} size={20} strokeWidth={2.2} />
              <Text style={styles.addButtonText}>{analyzing ? 'CARICAMENTO...' : 'SCATTA FOTO'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryButton} onPress={() => void handleUpload('gallery')} disabled={analyzing} activeOpacity={0.85}>
              <ImageIcon color={Colors.accent} size={20} strokeWidth={2.2} />
              <Text style={styles.galleryButtonText}>DALLA GALLERIA</Text>
            </TouchableOpacity>
          </View>
          {uploadError ? <Text style={styles.uploadError}>{uploadError}</Text> : null}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  activeCategory === cat && styles.filterChipActive,
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeCategory === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.accent} size="large" />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIcon}>
              <Shirt color={Colors.accent} size={48} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? 'Your wardrobe is empty' : 'No items in this category'}
            </Text>
            <Text style={styles.emptyText}>
              {items.length === 0
                ? 'Snap a photo of your clothing to add it. AI will identify everything automatically.'
                : 'Try a different category filter.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fabGallery} onPress={() => void handleUpload('gallery')} disabled={analyzing}>
            <Tag color={Colors.text} size={22} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => void handleUpload('camera')} disabled={analyzing}>
            {analyzing ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Plus color={Colors.primary} size={28} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingCard}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={styles.analyzingTitle}>Analisi del capo in corso...</Text>
              <Text style={styles.analyzingText}>L’IA sta generando il nome, la descrizione e i dettagli.</Text>
            </View>
          </View>
        )}

        <Modal
          visible={detailItem !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (pendingRemoval) setPendingRemoval(null);
            else setDetailItem(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {pendingRemoval ? (
                <View style={styles.confirmationContent}>
                  <View style={styles.confirmationIcon}>
                    <Trash2 color={Colors.error} size={24} />
                  </View>
                  <Text style={styles.confirmationTitle}>
                    {pendingRemoval.kind === 'item' ? 'Rimuovere il capo?' : 'Rimuovere la foto?'}
                  </Text>
                  <Text style={styles.confirmationText}>
                    {pendingRemoval.kind === 'item'
                      ? 'Il capo e le sue foto verranno rimossi dal guardaroba.'
                      : `La foto ${pendingRemoval.side === 'front' ? 'fronte' : 'retro'} verrà rimossa dal capo.`}
                  </Text>
                  <View style={styles.confirmationActions}>
                    <TouchableOpacity
                      style={styles.cancelRemovalButton}
                      onPress={() => setPendingRemoval(null)}
                      disabled={removing}
                    >
                      <Text style={styles.cancelRemovalText}>ANNULLA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmRemovalButton}
                      onPress={() => void handleConfirmRemoval()}
                      disabled={removing}
                    >
                      {removing ? (
                        <ActivityIndicator color={Colors.text} />
                      ) : (
                        <Text style={styles.confirmRemovalText}>RIMUOVI</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setDetailItem(null)}>
                    <X color={Colors.textSecondary} size={22} />
                  </TouchableOpacity>
                  {detailItem && (
                <ScrollView contentContainerStyle={styles.modalContent}>
                  <>
                  <View style={styles.photoStack}>
                    {detailItem.image_url ? (
                      <View style={styles.photoColumn}>
                        <View style={styles.photoLabelRow}>
                          <Text style={styles.photoLabel}>FRONTE</Text>
                          <TouchableOpacity
                            onPress={() => setPendingRemoval({ kind: 'photo', side: 'front' })}
                            accessibilityRole="button"
                            accessibilityLabel="Rimuovi foto fronte"
                            hitSlop={8}
                          >
                            <Trash2 color={Colors.error} size={16} />
                          </TouchableOpacity>
                        </View>
                        <Image source={{ uri: detailItem.image_url }} style={styles.modalImage} />
                      </View>
                    ) : null}
                    {detailItem.back_image_url ? (
                      <View style={styles.photoColumn}>
                        <View style={styles.photoLabelRow}>
                          <Text style={styles.photoLabel}>RETRO</Text>
                          <TouchableOpacity
                            onPress={() => setPendingRemoval({ kind: 'photo', side: 'back' })}
                            accessibilityRole="button"
                            accessibilityLabel="Rimuovi foto retro"
                            hitSlop={8}
                          >
                            <Trash2 color={Colors.error} size={16} />
                          </TouchableOpacity>
                        </View>
                        <Image source={{ uri: detailItem.back_image_url }} style={styles.modalImage} />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.modalName}>{clothingDisplayName(detailItem)}</Text>
                  {!detailItem.back_image_url && (
                    <View style={styles.backPhotoActions}>
                      <TouchableOpacity style={styles.backPhotoButton} onPress={() => void handleBackPhoto('camera')} disabled={uploadingBackPhoto}>
                        <Camera color={Colors.accent} size={18} />
                        <Text style={styles.backPhotoButtonText}>{uploadingBackPhoto ? 'CARICAMENTO...' : 'FOTO RETRO'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.backPhotoButton} onPress={() => void handleBackPhoto('gallery')} disabled={uploadingBackPhoto}>
                        <ImageIcon color={Colors.accent} size={18} />
                        <Text style={styles.backPhotoButtonText}>GALLERIA</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.modalTags}>
                    <View style={styles.modalTag}>
                      <Text style={styles.modalTagText}>{detailItem.category}</Text>
                    </View>
                    {detailItem.subcategory && (
                      <View style={styles.modalTag}>
                        <Text style={styles.modalTagText}>{detailItem.subcategory}</Text>
                      </View>
                    )}
                    <View style={styles.modalTag}>
                      <Text style={styles.modalTagText}>{detailItem.season}</Text>
                    </View>
                  </View>
                  {detailItem.color && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Color</Text>
                      <View style={styles.modalDetailValue}>
                        {detailItem.color_hex && <View style={[styles.colorDot, { backgroundColor: detailItem.color_hex }]} />}
                        <Text style={styles.modalDetailText}>{detailItem.color}</Text>
                      </View>
                    </View>
                  )}
                  {detailItem.material && (
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Material</Text>
                      <Text style={styles.modalDetailText}>{detailItem.material}</Text>
                    </View>
                  )}
                  <Text style={styles.editLabel}>DESCRIZIONE</Text>
                  <Text style={styles.modalDescription}>
                    {detailItem.ai_description?.trim() || 'La descrizione verrà generata dall’IA.'}
                  </Text>
                  {detailNeedsAi && (
                    <TouchableOpacity
                      style={styles.saveDetailsButton}
                      onPress={() => void handleRegenerateAiDetails()}
                      disabled={regeneratingAiDetails}
                      activeOpacity={0.85}
                    >
                      {regeneratingAiDetails ? (
                        <ActivityIndicator color={Colors.primary} />
                      ) : (
                        <Text style={styles.saveDetailsText}>GENERA NOME E DESCRIZIONE CON IA</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  <Text style={styles.editLabel}>NOTE E DETTAGLI PERSONALI</Text>
                  <TextInput
                    value={notesDraft}
                    onChangeText={setNotesDraft}
                    style={[styles.detailInput, styles.notesInput]}
                    multiline
                    placeholder="Aggiungi vestibilità, ricordi o altri dettagli"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  {uploadError ? <Text style={styles.modalError}>{uploadError}</Text> : null}
                  <TouchableOpacity style={styles.saveDetailsButton} onPress={() => void handleSaveDetails()} disabled={savingDetails}>
                    {savingDetails ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveDetailsText}>SALVA DETTAGLI</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => setPendingRemoval({ kind: 'item' })}
                  >
                    <Trash2 color={Colors.error} size={18} strokeWidth={2} />
                    <Text style={styles.deleteButtonText}>RIMUOVI CAPO DAL GUARDAROBA</Text>
                  </TouchableOpacity>
                  </>
                </ScrollView>
              )}
                </>
              )}
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    fontSize: 34,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 24,
  },
  itemCount: {
    ...Typography.label,
    color: Colors.textTertiary,
    letterSpacing: 2,
    marginTop: Spacing.sm,
  },
  uploadActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  addButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  addButtonText: {
    ...Typography.label,
    color: Colors.primary,
    letterSpacing: 2.5,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md - 1,
  },
  galleryButtonText: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 2,
  },
  uploadError: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.md,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  grid: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },
  itemCard: {
    flex: 1,
    margin: Spacing.sm,
    backgroundColor: 'rgba(18, 15, 21, 0.7)',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '48%',
  },
  itemImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.surfaceLighter,
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    padding: Spacing.sm + 2,
  },
  itemName: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  itemCategory: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemColor: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.xl + 60,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.large,
  },
  fabGallery: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceLighter,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Spacing.xxl,
  },
  analyzingTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  analyzingText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    width: '88%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalContent: {
    paddingBottom: Spacing.lg,
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStack: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  photoColumn: {
    flex: 1,
  },
  photoLabel: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 2,
  },
  photoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    minHeight: 24,
  },
  modalImage: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.lg,
  },
  backPhotoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  backPhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  backPhotoButtonText: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  modalName: {
    ...Typography.h2,
    color: Colors.text,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalTag: {
    backgroundColor: Colors.surfaceLighter,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  modalTagText: {
    ...Typography.caption,
    color: Colors.accent,
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  modalDetailLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  modalDetailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalDetailText: {
    ...Typography.body,
    color: Colors.text,
  },
  editLabel: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 2,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  detailInput: {
    ...Typography.body,
    color: Colors.text,
    marginHorizontal: Spacing.lg,
    minHeight: 76,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLighter,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  },
  notesInput: { minHeight: 64 },
  modalError: {
    ...Typography.bodySmall,
    color: Colors.error,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  saveDetailsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.accent,
  },
  saveDetailsText: {
    ...Typography.label,
    color: Colors.primary,
    letterSpacing: 2,
  },
  modalDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    lineHeight: 22,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deleteButtonText: {
    ...Typography.body,
    color: Colors.error,
  },
  confirmationContent: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  confirmationIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceLighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  confirmationTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  confirmationText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  confirmationActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  cancelRemovalButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelRemovalText: {
    ...Typography.label,
    color: Colors.text,
    letterSpacing: 1,
  },
  confirmRemovalButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.error,
  },
  confirmRemovalText: {
    ...Typography.label,
    color: Colors.text,
    letterSpacing: 1,
  },
});
