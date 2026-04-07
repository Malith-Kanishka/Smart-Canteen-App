import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import api from '../../shared/api/axiosConfig';

const emptyEdit = {
  _id: '',
  userId: '',
  fullName: '',
  username: '',
  email: '',
  phone: '',
  address: '',
  dateOfBirth: ''
};

const formatDate = (value) => (value ? String(value).slice(0, 10) : '');
const formatDisplay = (value) => (value ? value : '-');

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyEdit);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (search.trim()) {
        params.search = search.trim();
      }

      const { data } = await api.get('/admin/customers', { params });
      setCustomers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const openEdit = (item) => {
    setEditForm({
      _id: item._id,
      userId: item.userId || item.staffId || '',
      fullName: item.fullName || '',
      username: item.username || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      dateOfBirth: formatDate(item.dateOfBirth)
    });
    setEditModal(true);
  };

  const closeEdit = () => {
    setEditModal(false);
    setEditForm(emptyEdit);
  };

  const updateField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitUpdate = async () => {
    if (!editForm._id) {
      setError('Invalid customer selected');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.put(`/admin/customers/${editForm._id}`, {
        fullName: editForm.fullName.trim(),
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        dateOfBirth: editForm.dateOfBirth || null
      });

      closeEdit();
      await fetchCustomers();
      Alert.alert('Success', 'Customer updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (id) => {
    try {
      await api.delete(`/admin/customers/${id}`);
      await fetchCustomers();
    } catch (err) {
      Alert.alert('Delete failed', err.response?.data?.message || 'Unable to delete customer');
    }
  };

  const deleteCustomer = async (id, name) => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`Delete ${name}?`) : true;
      if (confirmed) {
        await performDelete(id);
      }
      return;
    }

    Alert.alert('Delete Customer', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => performDelete(id) }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.userId}>{item.userId || item.staffId || '-'}</Text>
      </View>

      <Text style={styles.meta}>Username: {formatDisplay(item.username)}</Text>
      <Text style={styles.meta}>Role: {formatDisplay(item.role)}</Text>
      <Text style={styles.meta}>Email: {formatDisplay(item.email)}</Text>
      <Text style={styles.meta}>Phone: {formatDisplay(item.phone)}</Text>
      <Text style={styles.meta}>Address: {formatDisplay(item.address)}</Text>
      <Text style={styles.meta}>DOB: {formatDisplay(formatDate(item.dateOfBirth))}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCustomer(item._id, item.fullName)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Management</Text>
      <TextInput
        style={styles.input}
        placeholder="Search by customer name, user ID, or username"
        value={search}
        onChangeText={setSearch}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color="#1abc9c" style={styles.loader} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No customers found</Text>}
        />
      )}

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Edit Customer</Text>
              <Text style={styles.readOnlyText}>User ID: {formatDisplay(editForm.userId)}</Text>
              <TextInput style={styles.input} placeholder="Full Name" value={editForm.fullName} onChangeText={(value) => updateField('fullName', value)} />
              <TextInput style={styles.input} placeholder="Username" value={editForm.username} onChangeText={(value) => updateField('username', value)} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Email" value={editForm.email} onChangeText={(value) => updateField('email', value)} autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} placeholder="Phone" value={editForm.phone} onChangeText={(value) => updateField('phone', value)} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Address" value={editForm.address} onChangeText={(value) => updateField('address', value)} />
              <TextInput style={styles.input} placeholder="DOB (YYYY-MM-DD)" value={editForm.dateOfBirth} onChangeText={(value) => updateField('dateOfBirth', value)} />

              <TouchableOpacity style={styles.editBtn} onPress={submitUpdate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.editBtnText}>Update Customer</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={closeEdit}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f5f8', padding: 14 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  loader: { marginTop: 20 },
  listContent: { paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontWeight: '700', color: '#111827', fontSize: 16, flex: 1 },
  userId: { color: '#0f766e', fontWeight: '700' },
  meta: { color: '#475569', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editBtn: { flex: 1, backgroundColor: '#0ea5a2', borderRadius: 8, alignItems: 'center', paddingVertical: 10, marginTop: 10 },
  editBtnText: { color: '#fff', fontWeight: '700' },
  deleteBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center', paddingVertical: 10, marginTop: 10 },
  deleteBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  secondaryBtnText: { color: '#334155', fontWeight: '600' },
  errorText: { color: '#dc2626', marginBottom: 6 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 14 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, maxHeight: '92%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, color: '#1f2937' },
  readOnlyText: { color: '#475569', marginBottom: 8, fontWeight: '600' }
});

export default CustomerManagement;