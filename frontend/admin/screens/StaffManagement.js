import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import api from '../../shared/api/axiosConfig';

const roleOptions = ['all', 'admin', 'foodmaster', 'inventory', 'promotion', 'order', 'finance', 'feedback'];

const emptyEdit = {
  _id: '',
  fullName: '',
  nic: '',
  email: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  role: 'foodmaster'
};

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) {
        params.search = search.trim();
      }
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      const { data } = await api.get('/admin/staff', { params });
      setStaffList(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStaff();
    setRefreshing(false);
  };

  const openEdit = (item) => {
    setEditForm({
      _id: item._id,
      fullName: item.fullName || '',
      nic: item.nic || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      dateOfBirth: item.dateOfBirth ? String(item.dateOfBirth).slice(0, 10) : '',
      role: item.role || 'foodmaster'
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
    setSaving(true);
    setError('');
    try {
      const payload = {
        fullName: editForm.fullName,
        nic: editForm.nic,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        dateOfBirth: editForm.dateOfBirth,
        role: editForm.role
      };
      await api.put(`/admin/staff/${editForm._id}`, payload);
      closeEdit();
      await fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update staff');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (id, name) => {
    Alert.alert('Delete Staff', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/staff/${id}`);
            await fetchStaff();
          } catch (err) {
            Alert.alert('Delete failed', err.response?.data?.message || 'Unable to delete staff');
          }
        }
      }
    ]);
  };

  const filteredCount = useMemo(() => staffList.length, [staffList]);

  const renderItem = ({ item }) => (
    <View style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.staffId}>{item.staffId || 'No ID'}</Text>
      </View>
      <Text style={styles.meta}>NIC: {item.nic || '-'}</Text>
      <Text style={styles.meta}>Email: {item.email || '-'}</Text>
      <Text style={styles.meta}>Phone: {item.phone || '-'}</Text>
      <Text style={styles.meta}>Role: {item.role}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteStaff(item._id, item.fullName)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Management</Text>

      <TextInput
        style={styles.input}
        placeholder="Search by name or staff ID"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterWrap}>
        {roleOptions.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.filterChip, roleFilter === role && styles.filterChipActive]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[styles.filterText, roleFilter === role && styles.filterTextActive]}>{role}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>Results: {filteredCount}</Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color="#1abc9c" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No staff found</Text>}
        />
      )}

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Staff</Text>

            <TextInput style={styles.input} placeholder="Full Name" value={editForm.fullName} onChangeText={(v) => updateField('fullName', v)} />
            <TextInput style={styles.input} placeholder="NIC" value={editForm.nic} onChangeText={(v) => updateField('nic', v)} />
            <TextInput style={styles.input} placeholder="Email" value={editForm.email} onChangeText={(v) => updateField('email', v)} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Phone" value={editForm.phone} onChangeText={(v) => updateField('phone', v)} />
            <TextInput style={styles.input} placeholder="Address" value={editForm.address} onChangeText={(v) => updateField('address', v)} />
            <TextInput style={styles.input} placeholder="DOB (YYYY-MM-DD)" value={editForm.dateOfBirth} onChangeText={(v) => updateField('dateOfBirth', v)} />

            <Text style={styles.smallHeading}>Role</Text>
            <View style={styles.filterWrap}>
              {roleOptions.filter((r) => r !== 'all').map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.filterChip, editForm.role === role && styles.filterChipActive]}
                  onPress={() => updateField('role', role)}
                >
                  <Text style={[styles.filterText, editForm.role === role && styles.filterTextActive]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={submitUpdate} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Update Staff</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={closeEdit}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    marginBottom: 8
  },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filterChip: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff' },
  filterChipActive: { borderColor: '#0f766e', backgroundColor: '#ccfbf1' },
  filterText: { color: '#334155', textTransform: 'capitalize', fontSize: 12 },
  filterTextActive: { color: '#115e59', fontWeight: '700' },
  countText: { color: '#475569', marginBottom: 6 },
  rowCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: '700', color: '#111827', fontSize: 16 },
  staffId: { color: '#0f766e', fontWeight: '700' },
  meta: { color: '#475569', marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editBtn: { flex: 1, backgroundColor: '#0ea5a2', borderRadius: 8, alignItems: 'center', paddingVertical: 10 },
  editBtnText: { color: '#fff', fontWeight: '700' },
  deleteBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center', paddingVertical: 10 },
  deleteBtnText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 14 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, color: '#1f2937' },
  smallHeading: { color: '#1f2937', fontWeight: '700', marginTop: 2, marginBottom: 8 },
  primaryButton: { backgroundColor: '#0ea5a2', borderRadius: 8, alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, alignItems: 'center', paddingVertical: 11, marginTop: 8 },
  secondaryButtonText: { color: '#334155', fontWeight: '600' },
  errorText: { color: '#dc2626', marginBottom: 6 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20 }
});

export default StaffManagement;
