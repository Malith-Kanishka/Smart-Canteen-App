import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../shared/api/axiosConfig';

const FoodMasterMenu = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [addForm, setAddForm] = useState({ name: '', price: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', price: '', description: '' });
  const [uploadedImage, setUploadedImage] = useState(null);
  const [editUploadedImage, setEditUploadedImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = search ? { search } : {};
      const { data } = await api.get('/foodmaster/menu', { params });
      setMenu(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMenu();
    setRefreshing(false);
  };

  const updateAddField = (key, value) => {
    setAddForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const appendImageToFormData = async (formData, asset) => {
    if (!asset) {
      return;
    }

    const extension = (asset.fileName || asset.uri || '').match(/\.[a-zA-Z0-9]+$/)?.[0] || '.jpg';
    const fileName = `menu-${Date.now()}${extension}`;

    if (Platform.OS === 'web') {
      if (asset.file) {
        formData.append('image', asset.file, fileName);
      } else {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append('image', blob, fileName);
      }
      return;
    }

    formData.append('image', {
      uri: asset.uri,
      name: fileName,
      type: asset.mimeType || 'image/jpeg'
    });
  };

  const pickImage = async (setImage) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload menu item image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setImage(result.assets[0]);
  };

  const submitAddItem = async () => {
    if (!addForm.name.trim()) {
      Alert.alert('Validation', 'Item name is required');
      return;
    }
    if (!addForm.price || isNaN(addForm.price)) {
      Alert.alert('Validation', 'Valid price is required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', addForm.name);
      formData.append('price', addForm.price);
      formData.append('description', addForm.description);

      await appendImageToFormData(formData, uploadedImage);

      const uploadHeaders = Platform.OS === 'web'
        ? {}
        : { 'Content-Type': 'multipart/form-data' };

      await api.post('/foodmaster/menu', formData, {
        headers: uploadHeaders
      });

      setAddOpen(false);
      setAddForm({ name: '', price: '', description: '' });
      setUploadedImage(null);
      await fetchMenu();
      Alert.alert('Success', 'Menu item added successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      price: String(item.price),
      description: item.description || ''
    });
    setEditUploadedImage(null);
    setEditOpen(true);
  };

  const submitEditItem = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Validation', 'Item name is required');
      return;
    }
    if (!editForm.price || isNaN(editForm.price)) {
      Alert.alert('Validation', 'Valid price is required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('price', editForm.price);
      formData.append('description', editForm.description);

      await appendImageToFormData(formData, editUploadedImage);

      const uploadHeaders = Platform.OS === 'web'
        ? {}
        : { 'Content-Type': 'multipart/form-data' };

      await api.put(`/foodmaster/menu/${editingItem._id}`, formData, {
        headers: uploadHeaders
      });

      setEditOpen(false);
      setEditingItem(null);
      setEditUploadedImage(null);
      await fetchMenu();
      Alert.alert('Success', 'Menu item updated successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const performDeleteItem = async (itemId) => {
    setSaving(true);
    try {
      await api.delete(`/foodmaster/menu/${itemId}`);
      await fetchMenu();
      Alert.alert('Success', 'Item deleted successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`Delete "${item.name}"?`) : true;
      if (confirmed) {
        await performDeleteItem(item._id);
      }
      return;
    }

    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void performDeleteItem(item._id);
        }
      }
    ]);
  };

  const renderMenuItem = ({ item }) => {
    const imageUri = item.image ? `${api.defaults.baseURL.replace('/api', '')}${item.image}` : null;
    const descriptionText = item.description
      ? `${item.description.substring(0, 50)}${item.description.length > 50 ? '...' : ''}`
      : '';

    return (
      <View style={styles.itemCard}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderImageText}>No Image</Text>
          </View>
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          {descriptionText ? <Text style={styles.itemDesc}>{descriptionText}</Text> : null}
          <Text style={styles.itemPrice}>Rs. {Number(item.price).toFixed(2)}</Text>
          <View style={styles.itemActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)} disabled={saving}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteBtn, saving ? styles.disabledButton : null]} onPress={() => void deleteItem(item)} disabled={saving}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !menu.length) {
    return <ActivityIndicator size="large" color="#1abc9c" style={{ marginTop: 30 }} />;
  }

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Menu Catalog</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search menu items..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#999"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No menu items found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={menu}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          Platform.OS === 'web'
            ? undefined
            : <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Add Item Modal */}
      <Modal visible={addOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Menu Item</Text>
            <View>
              <TextInput
                style={styles.input}
                placeholder="Item Name"
                value={addForm.name}
                onChangeText={(v) => updateAddField('name', v)}
              />
              <TextInput
                style={styles.input}
                placeholder="Price (Rs.)"
                value={addForm.price}
                onChangeText={(v) => updateAddField('price', v)}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Description"
                value={addForm.description}
                onChangeText={(v) => updateAddField('description', v)}
                multiline
              />

              {uploadedImage && (
                <Image
                  source={{ uri: uploadedImage.uri }}
                  style={styles.previewImage}
                />
              )}

              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setUploadedImage)}>
                <Text style={styles.imagePickerText}>
                  {uploadedImage ? 'Change Image' : 'Pick Image'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={submitAddItem} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Add Item</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setAddOpen(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Menu Item</Text>
            <View>
              <TextInput
                style={styles.input}
                placeholder="Item Name"
                value={editForm.name}
                onChangeText={(v) => updateEditField('name', v)}
              />
              <TextInput
                style={styles.input}
                placeholder="Price (Rs.)"
                value={editForm.price}
                onChangeText={(v) => updateEditField('price', v)}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Description"
                value={editForm.description}
                onChangeText={(v) => updateEditField('description', v)}
                multiline
              />

              {editUploadedImage ? (
                <Image source={{ uri: editUploadedImage.uri }} style={styles.previewImage} />
              ) : editingItem?.image ? (
                <Image
                  source={{ uri: `${api.defaults.baseURL.replace('/api', '')}${editingItem.image}` }}
                  style={styles.previewImage}
                />
              ) : null}

              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setEditUploadedImage)}>
                <Text style={styles.imagePickerText}>
                  {editUploadedImage ? 'Change Image' : 'Pick Image'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={submitEditItem} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Update Item</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditOpen(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f5f8' },
  content: { padding: 16, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937' },
  addButton: { backgroundColor: '#0ea5a2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    flexDirection: 'row'
  },
  itemImage: { width: 100, height: 100, backgroundColor: '#e5e7eb' },
  placeholderImage: {
    width: 100,
    height: 100,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderImageText: { color: '#999' },
  itemContent: { flex: 1, padding: 10 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  itemDesc: { fontSize: 12, color: '#666', marginTop: 3 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#0ea5a2', marginTop: 5 },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { flex: 1, backgroundColor: '#0ea5a2', borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  deleteBtn: { flex: 1, backgroundColor: '#f59e0b', borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  disabledButton: { opacity: 0.6 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  errorText: { color: '#dc2626', marginBottom: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 14, color: '#1f2937' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14
  },
  previewImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
  imagePicker: { backgroundColor: '#e5e7eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#334155', fontWeight: '600', fontSize: 14 },
  primaryButton: { backgroundColor: '#0ea5a2', borderRadius: 8, alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, alignItems: 'center', paddingVertical: 11 },
  secondaryButtonText: { color: '#334155', fontWeight: '600' }
});

export default FoodMasterMenu;
