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

const OrderDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes] = await Promise.all([
        api.get('/order'),
      ]);

      const orders = ordersRes.data;
      const pendingCount = orders.filter((o) => o.status === 'pending').length;
      const completedCount = orders.filter((o) => o.status === 'completed').length;

      setStats({
        totalOrders: orders.length,
        pending: pendingCount,
        completed: completedCount,
      });
      setRecentOrders(orders.slice(0, 5));
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
      <Text style={[styles.statValue, { color }]}>{value}</Text>
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
      <Text style={styles.title}>Order Dashboard</Text>

      {stats && (
        <View style={styles.statsContainer}>
          <StatCard title="Total Orders" value={stats.totalOrders} color="#1abc9c" />
          <StatCard title="Pending" value={stats.pending} color="#f39c12" />
          <StatCard title="Completed" value={stats.completed} color="#27ae60" />
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Orders</Text>
      {recentOrders.map((order) => (
        <TouchableOpacity
          key={order._id}
          style={styles.orderItem}
          onPress={() => navigation.navigate('OrderDetail', { order })}
        >
          <Text style={styles.orderName}>{order.orderId}</Text>
          <Text style={styles.orderStatus}>{order.status}</Text>
          <Text style={styles.orderAmount}>Rs. {order.payableAmount}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('ManualOrder')}
      >
        <Text style={styles.createButtonText}>Create New Order</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  orderItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  orderStatus: {
    fontSize: 12,
    color: '#f39c12',
    marginHorizontal: 10,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1abc9c',
  },
  createButton: {
    backgroundColor: '#1abc9c',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OrderDashboard;
