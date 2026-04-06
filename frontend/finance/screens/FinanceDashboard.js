import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api from '../../shared/api/axiosConfig';

const FinanceDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/finance/dashboard');
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>Rs. {value}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1abc9c" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Finance Dashboard</Text>

      {stats && (
        <View style={styles.statsContainer}>
          <StatCard title="Total Revenue" value={stats.totalRevenue || 0} color="#1abc9c" />
          <StatCard title="Total Orders" value={stats.totalOrders || 0} color="#2980b9" />
          <StatCard title="Refunded Amount" value={stats.refundedAmount || 0} color="#e74c3c" />
        </View>
      )}

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('TransactionsList')}
      >
        <Text style={styles.buttonText}>View Transactions</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.buttonSecondary]}
        onPress={() => navigation.navigate('BillingSystem')}
      >
        <Text style={styles.buttonText}>Process Payment</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1abc9c',
    marginBottom: 20,
  },
  statsContainer: {
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#1abc9c',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default FinanceDashboard;
