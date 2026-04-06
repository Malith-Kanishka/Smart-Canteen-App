import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import api from '../../shared/api/axiosConfig';

const FeedbackList = ({ navigation }) => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await api.get('/feedback', { params });
      setFeedback(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchFeedback();
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeedback();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'resolved':
        return '#27ae60';
      default:
        return '#95a5a6';
    }
  };

  const renderFeedbackCard = ({ item }) => (
    <TouchableOpacity
      style={styles.feedbackCard}
      onPress={() => navigation.navigate('FeedbackDetail', { feedback: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.type}>{item.type.toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      {item.rating && <Text style={styles.rating}>Rating: ★ {item.rating}/5</Text>}
      <Text style={styles.comment} numberOfLines={2}>{item.comment}</Text>
      <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1abc9c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feedback & Complaints</Text>

      <View style={styles.filterContainer}>
        {['all', 'pending', 'resolved'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={feedback}
        renderItem={renderFeedbackCard}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent=(
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No feedback found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingTop: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1abc9c',
    marginBottom: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#1abc9c',
    borderColor: '#1abc9c',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  filterTextActive: {
    color: '#fff',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 10,
    fontSize: 14,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  type: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9b59b6',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rating: {
    fontSize: 12,
    color: '#f39c12',
    marginBottom: 6,
  },
  comment: {
    fontSize: 13,
    color: '#2c3e50',
    marginBottom: 6,
  },
  date: {
    fontSize: 11,
    color: '#95a5a6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
});

export default FeedbackList;
