import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { promotionService } from '../../shared/api/services';

const emptyForm = { menuItemId: '', discountPercentage: '' };

const notify = (title, message) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

const DailyDiscounts = () => {
  const [discounts, setDiscounts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [menuPickerOpen, setMenuPickerOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formMessage, setFormMessage] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [discountRes, menuRes] = await Promise.all([
        promotionService.getDailyDiscounts({ search: search || undefined, status: statusFilter || undefined }),
        promotionService.getMenuItems(),
      ]);
      setDiscounts(Array.isArray(discountRes.data) ? discountRes.data : []);
      setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load daily discounts');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingDiscount(null);
    setMenuPickerOpen(false);
    setFormMessage('');
  };

  const selectedMenuItem = useMemo(
    () => menuItems.find((item) => item._id === form.menuItemId),
    [menuItems, form.menuItemId]
  );

  const computedNewPrice = useMemo(() => {
    if (!selectedMenuItem || !form.discountPercentage) return null;
    const discount = Number(form.discountPercentage);
    if (!Number.isFinite(discount)) return null;
    return (Number(selectedMenuItem.price) - (Number(selectedMenuItem.price) * discount) / 100).toFixed(2);
  }, [selectedMenuItem, form.discountPercentage]);

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (discount) => {
    setEditingDiscount(discount);
    setForm({
      menuItemId: discount.menuItemId,
      discountPercentage: String(discount.discountPercentage),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.menuItemId) {
      setFormMessage('Please select a menu item');
      notify('Validation', 'Please select a menu item');
      return;
    }

    const discountValue = Number(form.discountPercentage);
    if (!Number.isFinite(discountValue) || discountValue <= 0 || discountValue >= 100) {
      setFormMessage('Discount percentage must be between 1 and 99');
      notify('Validation', 'Discount percentage must be between 1 and 99');
      return;
    }

    setSaving(true);
    setFormMessage('');
    try {
      if (editingDiscount) {
        await promotionService.updateDailyDiscount(editingDiscount._id, {
          menuItemId: form.menuItemId,
          discountPercentage: discountValue,
        });
      } else {
        await promotionService.createDailyDiscount(form.menuItemId, discountValue);
      }

      setModalOpen(false);
      resetForm();
      await fetchData();
      notify('Success', editingDiscount ? 'Daily discount updated' : 'Daily discount created');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save daily discount';
      setFormMessage(message);
      notify('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (discount, nextStatus) => {
    try {
      await promotionService.updateDailyDiscount(discount._id, { status: nextStatus });
      await fetchData();
    } catch (err) {
      notify('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const removeDiscount = (discount) => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`Delete discount for ${discount.productName}?`) : true;
      if (confirmed) {
        promotionService.deleteDailyDiscount(discount._id)
          .then(fetchData)
          .catch((err) => notify('Error', err.response?.data?.message || 'Failed to delete discount'));
      }
      return;
    }

    Alert.alert('Delete Discount', `Delete discount for ${discount.productName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await promotionService.deleteDailyDiscount(discount._id);
            await fetchData();
          } catch (err) {
            notify('Error', err.response?.data?.message || 'Failed to delete discount');
          }
        },
      },
    ]);
  };

  const renderDiscount = ({ item }) => {
    const statusColor = item.status === 'active' ? '#0f766e' : item.status === 'paused' ? '#b45309' : '#991b1b';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{item.productName}</Text>
            <Text style={styles.cardSubtitle}>{item.discountId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.metaText}>Original: Rs. {Number(item.originalPrice).toFixed(2)}</Text>
        <Text style={styles.metaText}>Discount: {item.discountPercentage}% OFF</Text>
        <Text style={styles.metaText}>New Price: Rs. {Number(item.newPrice).toFixed(2)}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openEdit(item)}>
            <Text style={styles.primaryBtnText}>Edit</Text>
          </TouchableOpacity>
          {item.status !== 'expired' && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => updateStatus(item, item.status === 'active' ? 'paused' : 'active')}
            >
              <Text style={styles.secondaryBtnText}>{item.status === 'active' ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => removeDiscount(item)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Discounts</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search discounts..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#94a3b8"
      />

      <View style={styles.filterRow}>
        {['', 'active', 'paused', 'expired'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
              {status ? status.toUpperCase() : 'ALL'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading && !refreshing ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#0f766e" /></View>
      ) : (
        <FlatList
          data={discounts}
          keyExtractor={(item) => item._id}
          renderItem={renderDiscount}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No daily discounts found</Text>}
          contentContainerStyle={discounts.length === 0 ? styles.emptyWrap : styles.listContent}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingDiscount ? 'Edit Daily Discount' : 'Create Daily Discount'}</Text>
            <ScrollView>
              {!!formMessage && <Text style={styles.formMessage}>{formMessage}</Text>}
              <TouchableOpacity style={styles.dropdown} onPress={() => setMenuPickerOpen(true)}>
                <Text style={[styles.dropdownText, !selectedMenuItem && styles.placeholder]}>
                  {selectedMenuItem ? `${selectedMenuItem.name} - Rs. ${Number(selectedMenuItem.price).toFixed(2)}` : 'Select menu item'}
                </Text>
                <Text style={styles.dropdownCaret}>▼</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Discount %"
                value={form.discountPercentage}
                onChangeText={(value) => setForm((prev) => ({ ...prev, discountPercentage: value }))}
                keyboardType="number-pad"
              />

              {selectedMenuItem ? (
                <View style={styles.previewBox}>
                  <Text style={styles.previewText}>Original Price: Rs. {Number(selectedMenuItem.price).toFixed(2)}</Text>
                  <Text style={styles.previewText}>New Price: {computedNewPrice ? `Rs. ${computedNewPrice}` : '-'}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editingDiscount ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalOpen(false); resetForm(); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={menuPickerOpen} transparent animationType="fade" onRequestClose={() => setMenuPickerOpen(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select Menu Item</Text>
            <FlatList
              data={menuItems}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setForm((prev) => ({ ...prev, menuItemId: item._id }));
                    setMenuPickerOpen(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{item.name} - Rs. {Number(item.price).toFixed(2)}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyMenuText}>No menu items found</Text>}
              style={styles.pickerList}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuPickerOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  addButton: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  addButtonText: { color: '#fff', fontWeight: '700' },
  searchInput: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#dbe1ea', marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  filterChipActive: { backgroundColor: '#0f766e' },
  filterChipText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  errorText: { color: '#dc2626', marginBottom: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 24 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  metaText: { color: '#475569', fontSize: 13, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryBtn: { backgroundColor: '#0f766e', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  secondaryBtn: { backgroundColor: '#f59e0b', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deleteBtn: { backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '88%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  dropdown: { borderWidth: 1, borderColor: '#dbe1ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dropdownText: { color: '#0f172a', fontSize: 14 },
  placeholder: { color: '#94a3b8' },
  dropdownCaret: { color: '#64748b', fontSize: 12 },
  dropdownOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  dropdownOptionText: { color: '#0f172a', fontSize: 14 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'center', padding: 20 },
  pickerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, maxHeight: '70%' },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  pickerList: { marginBottom: 10 },
  emptyMenuText: { textAlign: 'center', color: '#64748b', paddingVertical: 16 },
  input: { borderWidth: 1, borderColor: '#dbe1ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 },
  previewBox: { backgroundColor: '#ecfeff', borderRadius: 10, padding: 12, marginBottom: 12 },
  previewText: { color: '#155e75', fontWeight: '600', marginBottom: 4 },
  submitBtn: { backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { color: '#334155', fontWeight: '700' },
  formMessage: { color: '#dc2626', marginBottom: 10, fontWeight: '600' },
});

export default DailyDiscounts;
