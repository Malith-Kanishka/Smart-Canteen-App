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
  RefreshControl
} from 'react-native';
import api from '../../shared/api/axiosConfig';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const deleteCustomer = async (id, name) => {
    Alert.alert('Delete Customer', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/customers/${id}`);
            await fetchCustomers();
          } catch (err) {
            Alert.alert('Delete failed', err.response?.data?.message || 'Unable to delete customer');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.fullName}</Text>
      <Text style={styles.meta}>Username: {item.username || '-'}</Text>
      <Text style={styles.meta}>Email: {item.email || '-'}</Text>
      <Text style={styles.meta}>Phone: {item.phone || '-'}</Text>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCustomer(item._id, item.fullName)}>
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Management</Text>
      <TextInput
        style={styles.input}
        placeholder="Search by customer name or username"
        value={search}
        onChangeText={setSearch}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color="#1abc9c" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No customers found</Text>}
        />
      )}
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
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  name: { fontWeight: '700', color: '#111827', fontSize: 16, marginBottom: 4 },
  meta: { color: '#475569', marginTop: 2 },
  deleteBtn: { marginTop: 10, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center', paddingVertical: 10 },
  deleteBtnText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#dc2626', marginBottom: 6 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20 }
});

export default CustomerManagement;
