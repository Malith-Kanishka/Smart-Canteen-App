import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { financeService, orderService } from '../../shared/api/services';

const CUSTOMER_CART_KEY = 'customerCart';

const BillingSystem = () => {
  const [pendingOrder, setPendingOrder] = useState(null);
  const [paymentType, setPaymentType] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [stripePaymentMethodId, setStripePaymentMethodId] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [paidBillData, setPaidBillData] = useState(null);

  const resetBillingState = async () => {
    setPaymentType('cash');
    setAmountReceived('');
    setCardHolderName('');
    setCardNumber('');
    setExpiryDate('');
    setStripePaymentMethodId('');
    setShowGatewayModal(false);
    setPaidBillData(null);
    setSuccess('');
    setError('');
    await loadPendingOrder();
  };

  const loadPendingOrder = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await orderService.getMyPendingOrder();
      setPendingOrder(data || null);
      if (data?.payableAmount) {
        setAmountReceived(String(data.payableAmount));
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingOrder();
  }, [loadPendingOrder]);

  const completePayment = async () => {
    if (!pendingOrder?._id) {
      setError('No pending order available for billing');
      return;
    }

    const received = Number(amountReceived || 0);
    if (!Number.isFinite(received) || received < Number(pendingOrder.payableAmount || 0)) {
      setError('Amount received must be at least payable amount');
      return;
    }

    if (paymentType === 'card' && (!stripePaymentMethodId.trim() || !cardHolderName.trim() || !cardNumber.trim() || !expiryDate.trim())) {
      setError('Stripe payment method id, card holder, card number and expiry are required for card payment');
      return;
    }

    setPaying(true);
    try {
      const payload = {
        orderId: pendingOrder._id,
        paymentType,
        amountReceived: received,
        stripePaymentMethodId: paymentType === 'card' ? stripePaymentMethodId.trim() : undefined,
        cardDetails: paymentType === 'card'
          ? {
              cardHolderName: cardHolderName.trim(),
              cardNumber: cardNumber.trim(),
              expiryDate: expiryDate.trim(),
            }
          : null,
      };

      const { data } = await financeService.createTransaction(payload);
      setSuccess(`Payment complete. Transaction ${data.transaction?.transactionId || ''}`.trim());
      setPaidBillData({
        transactionId: data.transaction?.transactionId,
        paymentType,
        order: pendingOrder,
        paidAt: new Date().toISOString(),
      });

      await AsyncStorage.removeItem(CUSTOMER_CART_KEY);

      setPendingOrder(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const downloadBill = () => {
    const source = paidBillData || {
      transactionId: 'N/A',
      paymentType,
      order: pendingOrder,
      paidAt: new Date().toISOString(),
    };

    if (!source?.order) {
      setError('No bill data available');
      return;
    }

    const lines = [
      'Smart Canteen Bill',
      `Order ID: ${source.order.orderId}`,
      `Transaction ID: ${source.transactionId || 'N/A'}`,
      `Payment method: ${source.paymentType}`,
      `Date: ${new Date(source.paidAt).toLocaleString()}`,
      '',
      'Items:',
      ...(source.order.items || []).map((item) => `${item.itemName} x ${item.quantity} = Rs. ${Number(item.lineTotal || 0).toFixed(2)}`),
      '',
      `Subtotal: Rs. ${Number(source.order.subtotal || 0).toFixed(2)}`,
      `Daily discount: Rs. ${Number(source.order.dailyDiscountTotal || 0).toFixed(2)}`,
      `Seasonal discount: Rs. ${Number(source.order.seasonalPromoDiscount || 0).toFixed(2)}`,
      `Total savings: Rs. ${Number(source.order.totalDiscount || 0).toFixed(2)}`,
      `Final payable: Rs. ${Number(source.order.payableAmount || 0).toFixed(2)}`,
    ];

    const content = lines.join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${source.order.orderId || 'bill'}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      resetBillingState();
      return;
    }

    setSuccess('Bill is ready. On mobile, this demo shows bill generation confirmation.');
    resetBillingState();
  };

  const openCardGateway = () => {
    setShowGatewayModal(true);
  };

  const confirmCardGatewayPayment = async () => {
    await completePayment();
    setShowGatewayModal(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1abc9c" />
      </View>
    );
  }

  if (!pendingOrder) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No Pending Order</Text>
        <Text style={styles.emptySub}>Create an order first from the menu and order summary flow.</Text>
        {paidBillData ? (
          <TouchableOpacity style={styles.downloadBtn} onPress={downloadBill}>
            <Text style={styles.payText}>Download Bill</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing</Text>
      {!!error ? <Text style={styles.error}>{error}</Text> : null}
      {!!success ? <Text style={styles.success}>{success}</Text> : null}

      <View style={styles.billCard}>
        <Text style={styles.billRow}>Order ID: {pendingOrder.orderId}</Text>
        <Text style={styles.billRow}>Items: {pendingOrder.items?.length || 0}</Text>
        <Text style={styles.billRow}>Subtotal: Rs. {Number(pendingOrder.subtotal || 0).toFixed(2)}</Text>
        <Text style={styles.billRow}>Daily discount: Rs. {Number(pendingOrder.dailyDiscountTotal || 0).toFixed(2)}</Text>
        <Text style={styles.billRow}>Seasonal discount: Rs. {Number(pendingOrder.seasonalPromoDiscount || 0).toFixed(2)}</Text>
        <Text style={styles.billRow}>Total savings: Rs. {Number(pendingOrder.totalDiscount || 0).toFixed(2)}</Text>
        <Text style={styles.payable}>Final amount: Rs. {Number(pendingOrder.payableAmount || 0).toFixed(2)}</Text>
      </View>

      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[styles.methodBtn, paymentType === 'cash' && styles.methodBtnActive]}
          onPress={() => setPaymentType('cash')}
        >
          <Text style={[styles.methodText, paymentType === 'cash' && styles.methodTextActive]}>Cash</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.methodBtn, paymentType === 'card' && styles.methodBtnActive]}
          onPress={() => setPaymentType('card')}
        >
          <Text style={[styles.methodText, paymentType === 'card' && styles.methodTextActive]}>Card</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        value={amountReceived}
        onChangeText={setAmountReceived}
        keyboardType="numeric"
        placeholder="Amount received"
      />

      {paymentType === 'cash' ? (
        <View>
          <TouchableOpacity style={[styles.payBtn, paying && styles.disabled]} onPress={completePayment} disabled={paying}>
            <Text style={styles.payText}>{paying ? 'Processing...' : 'Complete Cash Payment'}</Text>
          </TouchableOpacity>
          {paidBillData ? (
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadBill}>
              <Text style={styles.payText}>Download Bill</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View>
          <TouchableOpacity style={styles.payBtn} onPress={openCardGateway}>
            <Text style={styles.payText}>Open Stripe Payment Gateway</Text>
          </TouchableOpacity>
          {paidBillData ? (
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadBill}>
              <Text style={styles.payText}>Download Bill</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <Modal transparent visible={showGatewayModal} animationType="fade" onRequestClose={() => setShowGatewayModal(false)}>
        <View style={styles.gatewayBackdrop}>
          <View style={styles.gatewayCard}>
            <Text style={styles.gatewayTitle}>Stripe Payment Gateway</Text>
            <Text style={styles.gatewayHint}>Use test PaymentMethod id, e.g. pm_card_visa</Text>
            <TextInput style={styles.input} value={stripePaymentMethodId} onChangeText={setStripePaymentMethodId} placeholder="Stripe PaymentMethod ID" />
            <TextInput style={styles.input} value={cardHolderName} onChangeText={setCardHolderName} placeholder="Card holder name" />
            <TextInput style={styles.input} value={cardNumber} onChangeText={setCardNumber} placeholder="Card number" />
            <TextInput style={styles.input} value={expiryDate} onChangeText={setExpiryDate} placeholder="MM/YY" />

            <TouchableOpacity
              style={[styles.payBtn, paying && styles.disabled]}
              onPress={confirmCardGatewayPayment}
              disabled={paying}
            >
              <Text style={styles.payText}>{paying ? 'Processing...' : 'Pay Now'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeGatewayBtn} onPress={() => setShowGatewayModal(false)}>
              <Text style={styles.payText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1abc9c', marginBottom: 10 },
  billCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, elevation: 2, marginBottom: 12 },
  billRow: { fontSize: 13, color: '#334155', marginBottom: 4 },
  payable: { fontSize: 16, fontWeight: '700', color: '#0f766e', marginTop: 6 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  methodBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  methodBtnActive: { backgroundColor: '#1abc9c', borderColor: '#1abc9c' },
  methodText: { color: '#64748b', fontWeight: '700' },
  methodTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8 },
  payBtn: { backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  downloadBtn: { backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  closeGatewayBtn: { backgroundColor: '#64748b', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  payText: { color: '#fff', fontWeight: '700' },
  error: { color: '#dc2626', marginBottom: 8 },
  success: { color: '#16a34a', marginBottom: 8 },
  emptyTitle: { color: '#0f172a', fontWeight: '700', fontSize: 18 },
  emptySub: { color: '#64748b', marginTop: 4 },
  disabled: { opacity: 0.6 },
  gatewayHint: { color: '#475569', fontSize: 12, marginBottom: 6 },
  gatewayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 14 },
  gatewayCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  gatewayTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
});

export default BillingSystem;
