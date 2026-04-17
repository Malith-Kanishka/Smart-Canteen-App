import React, { useCallback, useEffect, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { promotionService } from '../../shared/api/services';

const emptyForm = { title: '', discountPercentage: '', startDate: '', endDate: '' };

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateString) => {
  if (!dateString) {
    return new Date();
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
};

const WebDateInput = ({ value, onChange, min, style }) => {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <input
      type="date"
      value={value}
      min={min}
      onChange={(event) => onChange(event.target.value)}
      style={style}
    />
  );
};

const notify = (title, message) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

const DateRow = ({ value, placeholder, onPress }) => (
  <TouchableOpacity style={styles.dateInputRow} onPress={onPress}>
    <Text style={value ? styles.dateValue : styles.datePlaceholder}>{value || placeholder}</Text>
    <Text style={styles.dateRowIcon}>CAL</Text>
  </TouchableOpacity>
);

const SeasonalPromos = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formMessage, setFormMessage] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await promotionService.getPromos({ search: search || undefined, status: statusFilter || undefined });
      setPromos(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load seasonal promotions');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPromos();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditingPromo(null);
    setForm(emptyForm);
    setFormMessage('');
    setShowStartPicker(false);
    setShowEndPicker(false);
    setModalOpen(true);
  };

  const openEdit = (promo) => {
    setEditingPromo(promo);
    setForm({
      title: promo.title,
      discountPercentage: String(promo.discountPercentage),
      startDate: new Date(promo.startDate).toISOString().slice(0, 10),
      endDate: new Date(promo.endDate).toISOString().slice(0, 10),
    });
    setFormMessage('');
    setShowStartPicker(false);
    setShowEndPicker(false);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setFormMessage('Title is required');
      notify('Validation', 'Title is required');
      return;
    }

    const discountValue = Number(form.discountPercentage);
    if (!Number.isFinite(discountValue) || discountValue <= 0 || discountValue >= 100) {
      setFormMessage('Discount percentage must be between 1 and 99');
      notify('Validation', 'Discount percentage must be between 1 and 99');
      return;
    }

    if (!form.startDate || !form.endDate) {
      setFormMessage('Start and end date are required');
      notify('Validation', 'Start and end date are required');
      return;
    }

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setFormMessage('End date must be after start date');
      notify('Validation', 'End date must be after start date');
      return;
    }

    setSaving(true);
    setFormMessage('');
    try {
      const payload = {
        title: form.title.trim(),
        discountPercentage: discountValue,
        startDate: form.startDate,
        endDate: form.endDate,
      };

      if (editingPromo) {
        await promotionService.updatePromo(editingPromo._id, payload);
      } else {
        await promotionService.createPromo(payload);
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingPromo(null);
      await fetchPromos();
      notify('Success', editingPromo ? 'Seasonal promotion updated' : 'Seasonal promotion created');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save seasonal promotion';
      setFormMessage(message);
      notify('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const togglePromoStatus = async (promo) => {
    const nextStatus = promo.status === 'active' ? 'paused' : 'active';
    try {
      await promotionService.updatePromo(promo._id, { status: nextStatus });
      await fetchPromos();
    } catch (err) {
      notify('Error', err.response?.data?.message || 'Failed to update promo status');
    }
  };

  const removePromo = (promo) => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`Delete ${promo.title}?`) : true;
      if (confirmed) {
        promotionService.deletePromo(promo._id)
          .then(fetchPromos)
          .catch((err) => notify('Error', err.response?.data?.message || 'Failed to delete promotion'));
      }
      return;
    }

    Alert.alert('Delete Promotion', `Delete ${promo.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await promotionService.deletePromo(promo._id);
            await fetchPromos();
          } catch (err) {
            notify('Error', err.response?.data?.message || 'Failed to delete promotion');
          }
        },
      },
    ]);
  };

  const renderPromo = ({ item }) => {
    const badgeColor = item.status === 'active'
      ? '#0f766e'
      : item.status === 'paused'
        ? '#b45309'
        : item.status === 'scheduled'
          ? '#1d4ed8'
          : '#991b1b';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.promoId}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.metaText}>Discount: {item.discountPercentage}%</Text>
        <Text style={styles.metaText}>Start: {new Date(item.startDate).toLocaleDateString()}</Text>
        <Text style={styles.metaText}>End: {new Date(item.endDate).toLocaleDateString()}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openEdit(item)}>
            <Text style={styles.primaryBtnText}>Edit</Text>
          </TouchableOpacity>
          {['active', 'paused'].includes(item.status) && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => togglePromoStatus(item)}>
              <Text style={styles.secondaryBtnText}>{item.status === 'active' ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => removePromo(item)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seasonal Promotions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search seasonal promotions..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#94a3b8"
      />

      <View style={styles.filterRow}>
        {['', 'scheduled', 'active', 'paused', 'expired'].map((status) => (
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
          data={promos}
          keyExtractor={(item) => item._id}
          renderItem={renderPromo}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No seasonal promotions found</Text>}
          contentContainerStyle={promos.length === 0 ? styles.emptyWrap : styles.listContent}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingPromo ? 'Edit Seasonal Promotion' : 'Create Seasonal Promotion'}</Text>
            <ScrollView>
              {!!formMessage && <Text style={styles.formMessage}>{formMessage}</Text>}
              
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Title"
                value={form.title}
                onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
              />
              
              <Text style={styles.fieldLabel}>Discount Percentage</Text>
              <TextInput
                style={styles.input}
                placeholder="Discount %"
                value={form.discountPercentage}
                onChangeText={(value) => setForm((prev) => ({ ...prev, discountPercentage: value }))}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Start Date</Text>
              {Platform.OS === 'web' ? (
                <WebDateInput
                  value={form.startDate}
                  min={formatDate(new Date())}
                  onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
                  style={styles.webDateInput}
                />
              ) : (
                <>
                  <DateRow value={form.startDate} placeholder="Select start date" onPress={() => setShowStartPicker(true)} />
                  {showStartPicker && (
                    <DateTimePicker
                      value={parseDate(form.startDate)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={(_event, selectedDate) => {
                        setShowStartPicker(false);
                        if (selectedDate) {
                          setForm((prev) => ({ ...prev, startDate: formatDate(selectedDate) }));
                        }
                      }}
                    />
                  )}
                </>
              )}

              <Text style={styles.fieldLabel}>End Date</Text>
              {Platform.OS === 'web' ? (
                <WebDateInput
                  value={form.endDate}
                  min={form.startDate || formatDate(new Date())}
                  onChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
                  style={styles.webDateInput}
                />
              ) : (
                <>
                  <DateRow value={form.endDate} placeholder="Select end date" onPress={() => setShowEndPicker(true)} />
                  {showEndPicker && (
                    <DateTimePicker
                      value={parseDate(form.endDate)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={parseDate(form.startDate || new Date())}
                      onChange={(_event, selectedDate) => {
                        setShowEndPicker(false);
                        if (selectedDate) {
                          setForm((prev) => ({ ...prev, endDate: formatDate(selectedDate) }));
                        }
                      }}
                    />
                  )}
                </>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editingPromo ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalOpen(false); setEditingPromo(null); setForm(emptyForm); setFormMessage(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
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
  addBtn: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  searchInput: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#dbe1ea', marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
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
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
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
  fieldLabel: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 2 },
  input: { borderWidth: 1, borderColor: '#dbe1ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 },
  dateInputRow: {
    borderWidth: 1,
    borderColor: '#dbe1ea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff'
  },
  dateValue: { color: '#0f172a', fontSize: 14 },
  datePlaceholder: { color: '#94a3b8', fontSize: 14 },
  dateRowIcon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ecfeff'
  },
  webDateInput: {
    width: '100%',
    boxSizing: 'border-box',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#dbe1ea',
    borderRadius: 10,
    padding: 11,
    marginBottom: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff'
  },
  submitBtn: { backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { color: '#334155', fontWeight: '700' },
  formMessage: { color: '#dc2626', marginBottom: 10, fontWeight: '600' },
});

export default SeasonalPromos;
