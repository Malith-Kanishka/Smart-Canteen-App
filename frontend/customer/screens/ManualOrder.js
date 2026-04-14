import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { customerService, orderService } from '../../shared/api/services';

const CUSTOMER_CART_KEY = 'customerCart';

const ManualOrder = ({ navigation, route }) => {
  const [menu, setMenu] = useState([]);
  const [seasonalPromo, setSeasonalPromo] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);

  const persistCart = async (nextCart) => {
    try {
      const compact = Object.entries(nextCart).reduce((acc, [key, qty]) => {
        const parsedQty = Number(qty || 0);
        if (parsedQty > 0) {
          acc[key] = parsedQty;
        }
        return acc;
      }, {});
      await AsyncStorage.setItem(CUSTOMER_CART_KEY, JSON.stringify(compact));
    } catch (_err) {
      // Non-blocking persistence.
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, promoRes, pendingRes] = await Promise.all([
        customerService.browseMenu(),
        customerService.getActivePromotions(),
        orderService.getMyPendingOrder(),
      ]);

      const menuData = menuRes.data || [];
      const pendingData = pendingRes.data || null;
      let seededCart = {};

      const storedCartRaw = await AsyncStorage.getItem(CUSTOMER_CART_KEY);
      if (storedCartRaw) {
        seededCart = JSON.parse(storedCartRaw) || {};
      }

      if (pendingData?.items?.length) {
        pendingData.items.forEach((item) => {
          seededCart[String(item.menuItemId)] = item.quantity;
        });
      }

      setMenu(menuData);
      setSeasonalPromo(promoRes.data?.activeSeasonalPromo || null);
      setPendingOrder(pendingData);
      setCart(seededCart);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (route?.params?.openSummary) {
      setSummaryOpen(true);
    }
  }, [route?.params?.openSummary, route?.params?.triggerAt]);

  useEffect(() => {
    if (route?.params?.cartSnapshot) {
      const snapshot = route.params.cartSnapshot;
      setCart(snapshot);
      persistCart(snapshot);
    }
  }, [route?.params?.cartSnapshot, route?.params?.triggerAt]);

  const selectedItems = useMemo(
    () => menu.filter((item) => Number(cart[item._id] || 0) > 0),
    [menu, cart]
  );

  const summary = useMemo(() => {
    let subtotal = 0;
    let dailySavings = 0;

    selectedItems.forEach((item) => {
      const qty = Number(cart[item._id] || 0);
      const unitPrice = Number(item.price || 0);
      const dailyDiscountPercentage = Number(item.dailyDiscount?.discountPercentage || 0);
      const lineSubtotal = unitPrice * qty;
      const lineDailySavings = (unitPrice * dailyDiscountPercentage * qty) / 100;
      subtotal += lineSubtotal;
      dailySavings += lineDailySavings;
    });

    const subtotalAfterDaily = subtotal - dailySavings;
    const seasonalPercentage = Number(seasonalPromo?.discountPercentage || 0);
    const seasonalSavings = (subtotalAfterDaily * seasonalPercentage) / 100;
    const totalSavings = dailySavings + seasonalSavings;
    const payable = subtotal - totalSavings;

    return {
      subtotal,
      dailySavings,
      seasonalSavings,
      totalSavings,
      payable,
    };
  }, [selectedItems, cart, seasonalPromo]);

  const savePendingOrder = async () => {
    if (!selectedItems.length) {
      setError('Add at least one item to create an order');
      return;
    }

    setSaving(true);
    try {
      const items = selectedItems.map((item) => ({
        menuItemId: item._id,
        quantity: Number(cart[item._id] || 0),
      }));

      let response;
      if (pendingOrder?._id) {
        response = await orderService.updatePendingOrder(pendingOrder._id, items);
      } else {
        response = await orderService.createOrder(items);
      }

      setPendingOrder(response.data.order);
      await AsyncStorage.setItem(CUSTOMER_CART_KEY, JSON.stringify(cart));
      setError('');
      return response.data.order;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save pending order');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const cancelPendingOrder = async () => {
    if (!pendingOrder?._id) {
      return;
    }

    setSaving(true);
    try {
      await orderService.voidOrder(pendingOrder._id);
      setPendingOrder(null);
      setCart({});
      await AsyncStorage.removeItem(CUSTOMER_CART_KEY);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setSaving(false);
    }
  };

  const proceedToPayment = async () => {
    const order = await savePendingOrder();
    if (order?._id) {
      setSummaryOpen(false);
      navigation.navigate('Billing');
    }
  };

  const adjustSummaryQty = (item, delta) => {
    const key = String(item._id);
    const current = Number(cart[key] || 0);
    const available = Math.max(0, Number(item.quantity || 0));
    const next = Math.max(0, Math.min(available, current + delta));

    const nextCart = { ...cart };
    if (next <= 0) {
      delete nextCart[key];
    } else {
      nextCart[key] = next;
    }

    setCart(nextCart);
    persistCart(nextCart);
  };

  const backToMenuToAddItems = () => {
    setSummaryOpen(false);
    navigation.navigate('Menu');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1abc9c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.contentCard}>
        <Text style={styles.infoTitle}>Order Page</Text>
        <Text style={styles.infoText}>Items selected from Menu: {selectedItems.length}</Text>
        <Text style={styles.infoText}>Total quantity: {Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0)}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setSummaryOpen(true)}>
          <Text style={styles.primaryBtnText}>View Order Summary</Text>
        </TouchableOpacity>
        {pendingOrder ? (
          <TouchableOpacity style={styles.voidBtn} onPress={cancelPendingOrder} disabled={saving}>
            <Text style={styles.primaryBtnText}>Cancel Pending Order</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal transparent visible={summaryOpen} animationType="fade" onRequestClose={() => setSummaryOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {selectedItems.length === 0 ? <Text style={styles.summaryRow}>No items selected</Text> : null}
            {selectedItems.map((item) => {
              const qty = Number(cart[item._id] || 0);
              const price = Number(item.price || 0);
              return (
                <View key={item._id} style={styles.itemRowWrap}>
                  <Text style={styles.summaryRow}>{item.name} x {qty} = Rs. {(price * qty).toFixed(2)}</Text>
                  <View style={styles.qtyAdjustRow}>
                    <TouchableOpacity style={styles.qtyAdjustBtn} onPress={() => adjustSummaryQty(item, -1)}>
                      <Text style={styles.qtyAdjustBtnText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.qtyAdjustBtn, qty >= Math.max(0, Number(item.quantity || 0)) && styles.disabledBtn]}
                      onPress={() => adjustSummaryQty(item, 1)}
                      disabled={qty >= Math.max(0, Number(item.quantity || 0))}
                    >
                      <Text style={styles.qtyAdjustBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <Text style={styles.summaryRow}>Subtotal: Rs. {summary.subtotal.toFixed(2)}</Text>
            <Text style={styles.summaryRow}>Daily savings: Rs. {summary.dailySavings.toFixed(2)}</Text>
            <Text style={styles.summaryRow}>Seasonal savings: Rs. {summary.seasonalSavings.toFixed(2)}</Text>
            <Text style={styles.summaryRow}>Total savings: Rs. {summary.totalSavings.toFixed(2)}</Text>
            <Text style={styles.summaryPayable}>Final payable: Rs. {summary.payable.toFixed(2)}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.menuBtn} onPress={backToMenuToAddItems}>
                <Text style={styles.primaryBtnText}>Back to Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSummaryOpen(false)}>
                <Text style={styles.primaryBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.disabledBtn]}
                onPress={proceedToPayment}
                disabled={saving || selectedItems.length === 0}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Proceed to Payment'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', paddingHorizontal: 12, marginBottom: 8 },
  contentCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginHorizontal: 10, elevation: 2 },
  infoTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#334155', marginBottom: 4 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 2 },
  summaryTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  summaryRow: { fontSize: 13, color: '#334155', marginBottom: 2 },
  summaryPayable: { fontSize: 16, fontWeight: '700', color: '#0f766e', marginTop: 6, marginBottom: 10 },
  primaryBtn: { backgroundColor: '#1abc9c', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  voidBtn: { marginTop: 8, backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  closeBtn: { backgroundColor: '#64748b', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  menuBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 14 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, maxHeight: '85%' },
  modalActions: { marginTop: 8 },
  itemRowWrap: {
    marginBottom: 6,
  },
  qtyAdjustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  qtyAdjustBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qtyAdjustBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ManualOrder;
