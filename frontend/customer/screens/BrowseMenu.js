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
} from 'react-native';
import api from '../../shared/api/axiosConfig';

const BrowseMenu = ({ navigation }) => {
  const [menuItems, setMenuItems] = useState([]);
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

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity
      style={styles.menuCard}
      onPress={() => navigation.navigate('ItemDetail', { item })}
    >
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.itemImage}
        />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>Rs. {item.price}</Text>
        <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('Cart', { item })}
        >
          <Text style={styles.addBtnText}>Add to Cart</Text>
        </TouchableOpacity>
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
  addBtn: {
    backgroundColor: '#1abc9c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
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
