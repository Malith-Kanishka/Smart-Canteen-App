import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import api from '../../shared/api/axiosConfig';

const BrowseMenu = ({ navigation }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCounts, setSelectedCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState('');

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customer/menu', {
        params: { search: searchText || undefined },
      });
      setMenuItems(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => {
    fetchMenu();
  }, [searchText]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMenu();
    setRefreshing(false);
  };

  const updateCount = (item, delta) => {
    setSelectedCounts((prev) => {
      const currentValue = prev[item._id] || 0;
      const maxAllowed = Math.max(0, Number(item.quantity) || 0);
      const nextValue = Math.min(maxAllowed, Math.max(0, currentValue + delta));
      return { ...prev, [item._id]: nextValue };
    });
  };

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity
      style={styles.menuCard}
      onPress={() => Alert.alert('Info', 'Item details screen is not configured yet.')}
    >
      {item.image && (
        <Image
          source={{ uri: `${api.defaults.baseURL.replace('/api', '')}${item.image}` }}
          style={styles.itemImage}
        />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>Rs. {Number(item.price).toFixed(2)}</Text>
        <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.stockRow}>
          <View style={[styles.qtyBadge, item.isOutOfStock && styles.outStockBadge]}>
            <Text style={[styles.qtyBadgeText, item.isOutOfStock && styles.outStockBadgeText]}>
              {item.isOutOfStock ? 'OUT OF STOCK' : `Qty: ${Math.max(0, Number(item.quantity) || 0)}`}
            </Text>
          </View>
          <View style={styles.counterWrap}>
            <TouchableOpacity
              style={[styles.counterBtn, (selectedCounts[item._id] || 0) <= 0 && styles.counterBtnDisabled]}
              onPress={() => updateCount(item, -1)}
              disabled={(selectedCounts[item._id] || 0) <= 0}
            >
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterText}>{selectedCounts[item._id] || 0}</Text>
            <TouchableOpacity
              style={[
                styles.counterBtn,
                (item.isOutOfStock || (selectedCounts[item._id] || 0) >= Math.max(0, Number(item.quantity) || 0)) && styles.counterBtnDisabled
              ]}
              onPress={() => updateCount(item, 1)}
              disabled={item.isOutOfStock || (selectedCounts[item._id] || 0) >= Math.max(0, Number(item.quantity) || 0)}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
      <TextInput
        style={styles.searchInput}
        placeholder="Search items..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#999"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <FlatList
        data={menuItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items available</Text>
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
    paddingTop: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 10,
    fontSize: 14,
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  itemImage: {
    width: 100,
    height: 100,
    backgroundColor: '#ecf0f1',
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1abc9c',
    marginTop: 4,
  },
  itemDesc: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  stockRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyBadge: {
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyBadgeText: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 11,
  },
  outStockBadge: {
    backgroundColor: '#fee2e2',
  },
  outStockBadgeText: {
    color: '#991b1b',
  },
  counterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1abc9c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  counterBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 18,
  },
  counterText: {
    minWidth: 18,
    textAlign: 'center',
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
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

export default BrowseMenu;
