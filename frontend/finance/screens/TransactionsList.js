import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { financeService } from '../../shared/api/services';

const TransactionsList = () => {
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState('all');
  const [paymentType, setPaymentType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await financeService.getTransactions(
        status === 'all' ? undefined : status,
        paymentType === 'all' ? undefined : paymentType,
        startDate || undefined,
        endDate || undefined
      );
      setTransactions(data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [status, paymentType, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const handleRefund = async (id) => {
    try {
      await financeService.refundTransaction(id);
      await fetchTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Refund failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await financeService.deleteTransaction(id);
      await fetchTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const askAction = (type, id) => {
    const actionText = type === 'refund' ? 'Refund' : 'Delete';
    const runAction = () => (type === 'refund' ? handleRefund(id) : handleDelete(id));

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`${actionText} this transaction?`) : true;
      if (confirmed) {
        runAction();
      }
      return;
    }

    Alert.alert(actionText, `${actionText} this transaction?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: actionText, style: type === 'delete' ? 'destructive' : 'default', onPress: runAction },
    ]);
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.txnId}>{item.transactionId}</Text>
      <Text style={styles.row}>Order: {item.orderId?.orderId || '-'}</Text>
      <Text style={styles.row}>Customer: {item.customerId?.userId || item.customerId?.username || '-'}</Text>
      <Text style={styles.row}>Payment: {item.paymentType}</Text>
      <Text style={styles.row}>Status: {item.status}</Text>
      <Text style={styles.row}>Discount: Rs. {Number(item.totalDiscount || 0).toFixed(2)}</Text>
      <Text style={styles.row}>Amount: Rs. {Number(item.payableAmount || 0).toFixed(2)}</Text>
      <Text style={styles.row}>Date: {new Date(item.createdAt).toLocaleString()}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, styles.refundBtn, item.status !== 'complete' && styles.disabled]}
          onPress={() => askAction('refund', item._id)}
          disabled={item.status !== 'complete'}
        >
          <Text style={styles.btnText}>Refund</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.deleteBtn]} onPress={() => askAction('delete', item._id)}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1abc9c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>
      {!!error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.filterCard}>
        <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="Start date YYYY-MM-DD" />
        <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="End date YYYY-MM-DD" />
        <View style={styles.inlineFilters}>
          {['all', 'complete', 'refund'].map((s) => (
            <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inlineFilters}>
          {['all', 'cash', 'card'].map((p) => (
            <TouchableOpacity key={p} style={[styles.chip, paymentType === p && styles.chipActive]} onPress={() => setPaymentType(p)}>
              <Text style={[styles.chipText, paymentType === p && styles.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No transaction records found</Text>}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1abc9c',
    marginBottom: 10,
  },
  error: { color: '#dc2626', marginBottom: 8 },
  filterCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 10, elevation: 1 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  inlineFilters: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#1abc9c', borderColor: '#1abc9c' },
  chipText: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  listContent: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  txnId: { color: '#0f172a', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  row: { color: '#334155', fontSize: 12, marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  btn: { borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  refundBtn: { backgroundColor: '#0ea5e9' },
  deleteBtn: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  disabled: { opacity: 0.5 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 20 },
});

export default TransactionsList;
