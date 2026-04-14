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

const BillingSystem = ({ navigation }) => {
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
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);

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
    setIsTransactionComplete(false);
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

  const calculateChange = () => {
    if (paymentType !== 'cash' || !pendingOrder) return '0.00';
    const received = Number(amountReceived || 0);
    const total = Number(pendingOrder.payableAmount || 0);
    if (received < total) return '0.00';
    return (received - total).toFixed(2);
  };

  const buildReceiptContent = (source) => {
    return [
      '============================================',
      '              SMART CANTEEN SYSTEM         ',
      '                  Receipt                  ',
      '============================================',
      `Order ID: ${source.order.orderId}`,
      `Transaction ID: ${source.transactionId || 'N/A'}`,
      `Date: ${new Date(source.paidAt).toLocaleString()}`,
      `Payment Method: ${source.paymentType === 'cash' ? 'Cash' : 'Card'}`,
      '--------------------------------------------',
      'Items:',
      ...(source.order.items || []).map((item) => {
        const itemDiscount = Number(item.discount || 0);
        const discountAmt = itemDiscount > 0 ? (Number(item.lineTotal || 0) * itemDiscount / 100) : 0;
        const lineTotal = Number(item.lineTotal || 0);
        return `  ${item.itemName} x${item.quantity}${itemDiscount > 0 ? ` [${itemDiscount}% off]` : ''}  Rs. ${lineTotal.toFixed(2)}`;
      }),
      '--------------------------------------------',
      `Subtotal           : Rs. ${Number(source.order.subtotal || 0).toFixed(2)}`,
      source.order.dailyDiscountTotal > 0 ? `Daily Discounts    : -Rs. ${Number(source.order.dailyDiscountTotal || 0).toFixed(2)}` : null,
      source.order.seasonalPromoDiscount > 0 ? `Seasonal Discount  : -Rs. ${Number(source.order.seasonalPromoDiscount || 0).toFixed(2)}` : null,
      `Total Savings      : -Rs. ${Number(source.order.totalDiscount || 0).toFixed(2)}`,
      '============================================',
      `FINAL AMOUNT       : Rs. ${Number(source.order.payableAmount || 0).toFixed(2)}`,
      source.paymentType === 'cash' ? `Amount Received    : Rs. ${Number(source.amountReceived || 0).toFixed(2)}` : null,
      source.paymentType === 'cash' ? `Change             : Rs. ${calculateChange()}` : null,
      '============================================',
      '         Thank you for your order!          ',
      '============================================',
    ].filter(Boolean).join('\n');
  };

  const saveReceiptToBackend = async (source) => {
    try {
      const receiptContent = buildReceiptContent(source);
      const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
      
      const formData = new FormData();
      formData.append('receipt', blob, `receipt_${source.transactionId || source.order.orderId}.txt`);
      formData.append('transactionId', source.transactionId || 'N/A');
      formData.append('orderId', source.order.orderId);
      
      await fetch('http://localhost:5000/api/save-receipt', {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.error('Error saving receipt to backend:', err);
      // Don't throw error, allow transaction to continue
    }
  };

  const startNewOrder = () => {
    resetBillingState();
    if (navigation?.navigate) {
      navigation.navigate('Menu'); // Navigate to Menu to show updated stock
    }
  };

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
      
      const billData = {
        transactionId: data.transaction?.transactionId,
        paymentType,
        amountReceived: received,
        order: pendingOrder,
        paidAt: new Date().toISOString(),
      };
      
      setPaidBillData(billData);

      await AsyncStorage.removeItem(CUSTOMER_CART_KEY);

      setPendingOrder(null);
      setError('');
      setIsTransactionComplete(true);
      
      // Save receipt to backend
      await saveReceiptToBackend(billData);
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
      amountReceived: amountReceived || '0',
      order: pendingOrder,
      paidAt: new Date().toISOString(),
    };

    if (!source?.order) {
      setError('No bill data available');
      return;
    }

    const content = buildReceiptContent(source);

    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `receipt_${source.order.orderId || 'bill'}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      return;
    }

    setSuccess('Bill is ready. On mobile, this demo shows bill generation confirmation.');
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

  // Show empty state only if no pending order AND no completed transaction
  if (!pendingOrder && !isTransactionComplete) {
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

  // Use paidBillData if transaction complete, otherwise use pendingOrder
  const displayOrder = isTransactionComplete ? paidBillData?.order : pendingOrder;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing System</Text>
      {!!error ? <Text style={styles.error}>{error}</Text> : null}
      {!!success ? <Text style={styles.success}>{success}</Text> : null}

      {/* Bill Display Section */}
      <View style={styles.billCard}>
        <View style={styles.billHeader}>
          <Text style={styles.billTitle}>Generated Bill</Text>
          <Text style={styles.billOrderId}>Order ID: {displayOrder?.orderId || 'N/A'}</Text>
          <Text style={styles.billDate}>{new Date().toLocaleDateString()}</Text>
        </View>

        {/* Itemized Items */}
        <View style={styles.billDivider} />
        <Text style={styles.billSectionTitle}>Items:</Text>
        {(displayOrder?.items || []).map((item, idx) => {
          const diascount = Number(item.discount || 0);
          const discountAmount = diascount > 0 ? (Number(item.lineTotal || 0) * diascount / 100).toFixed(2) : 0;
          return (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.itemName} x{item.quantity}</Text>
              {diascount > 0 && <Text style={styles.itemDiscount}>({diascount}% off)</Text>}
              <Text style={styles.itemTotal}>Rs. {Number(item.lineTotal || 0).toFixed(2)}</Text>
            </View>
          );
        })}

        {/* Bill Totals */}
        <View style={styles.billDivider} />
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>Rs. {Number(displayOrder?.subtotal || 0).toFixed(2)}</Text>
          </View>
          {Number(displayOrder?.dailyDiscountTotal || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, styles.discountLabel]}>Daily Discounts</Text>
              <Text style={[styles.totalValue, styles.discountValue]}>-Rs. {Number(displayOrder?.dailyDiscountTotal || 0).toFixed(2)}</Text>
            </View>
          )}
          {Number(displayOrder?.seasonalPromoDiscount || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, styles.discountLabel]}>Seasonal Discount</Text>
              <Text style={[styles.totalValue, styles.discountValue]}>-Rs. {Number(displayOrder?.seasonalPromoDiscount || 0).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.discountLabel]}>Total Savings</Text>
            <Text style={[styles.totalValue, styles.discountValue]}>-Rs. {Number(displayOrder?.totalDiscount || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.finalTotalRow]}>
            <Text style={styles.finalTotalLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.finalTotalValue}>Rs. {Number(displayOrder?.payableAmount || 0).toFixed(2)}</Text>
          </View>

          {/* Cash Change Display */}
          {isTransactionComplete && paymentType === 'cash' && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Amount Received</Text>
                <Text style={styles.totalValue}>Rs. {Number(amountReceived || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, styles.changeLabel]}>Change</Text>
                <Text style={[styles.totalValue, styles.changeValue]}>Rs. {calculateChange()}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Payment Section */}
      {!isTransactionComplete && (
        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Select Payment Method</Text>
          
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

          {paymentType === 'cash' && (
            <TextInput
              style={styles.input}
              value={amountReceived}
              onChangeText={setAmountReceived}
              keyboardType="numeric"
              placeholder="Amount received"
            />
          )}

          {paymentType === 'cash' ? (
            <TouchableOpacity
              style={[styles.payBtn, paying && styles.disabled]}
              onPress={completePayment}
              disabled={paying}
            >
              <Text style={styles.payText}>{paying ? 'Processing...' : 'Complete Payment'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.payBtn, paying && styles.disabled]}
              onPress={openCardGateway}
              disabled={paying}
            >
              <Text style={styles.payText}>{paying ? 'Processing...' : 'Open Card Payment'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Transaction Complete Section */}
      {isTransactionComplete && (
        <View style={styles.completeCard}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.completeTitle}>Transaction Completed!</Text>
          <Text style={styles.completeSubtitle}>Payment recorded successfully</Text>
          
          <View style={styles.completeBtnRow}>
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadBill}>
              <Text style={styles.payText}>Download Bill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newTransactionBtn} onPress={startNewOrder}>
              <Text style={styles.payText}>New Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Card Gateway Modal */}
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
  title: { fontSize: 24, fontWeight: '700', color: '#1abc9c', marginBottom: 12 },
  
  // Bill Card Styles
  billCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2, marginBottom: 12 },
  billHeader: { marginBottom: 10 },
  billTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  billOrderId: { fontSize: 12, color: '#64748b', marginTop: 3 },
  billDate: { fontSize: 11, color: '#94a3b8' },
  billDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  billSectionTitle: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  
  // Item Display
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 },
  itemName: { fontSize: 12, color: '#1e293b', fontWeight: '500', flex: 1 },
  itemDiscount: { fontSize: 10, color: '#dc2626', marginHorizontal: 4 },
  itemTotal: { fontSize: 12, fontWeight: '600', color: '#0f172a', minWidth: 60, textAlign: 'right' },
  
  // Totals Section
  totalsSection: { marginTop: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  totalValue: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
  discountLabel: { color: '#dc2626' },
  discountValue: { color: '#dc2626' },
  finalTotalRow: { paddingTop: 8, borderTopWidth: 2, borderTopColor: '#f1f5f9', marginTop: 4 },
  finalTotalLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  finalTotalValue: { fontSize: 16, fontWeight: '700', color: '#1abc9c' },
  changeLabel: { color: '#16a34a' },
  changeValue: { color: '#16a34a', fontWeight: '700' },
  
  // Payment Card
  paymentCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, elevation: 2, marginBottom: 12 },
  paymentTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 10 },
  
  // Method Selection
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  methodBtn: { flex: 1, borderWidth: 2, borderColor: '#475569', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: 'transparent' },
  methodBtnActive: { backgroundColor: '#1abc9c', borderColor: '#1abc9c' },
  methodText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  methodTextActive: { color: '#fff' },
  
  // Input
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10, marginBottom: 10, fontSize: 13 },
  
  // Buttons
  payBtn: { backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  downloadBtn: { backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  newTransactionBtn: { backgroundColor: '#8b5cf6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  completeBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  closeGatewayBtn: { backgroundColor: '#64748b', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  payText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.6 },
  
  // Complete Card
  completeCard: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 16, elevation: 2, alignItems: 'center', marginBottom: 12 },
  successIcon: { fontSize: 40, color: '#16a34a', fontWeight: '700', marginBottom: 8 },
  completeTitle: { fontSize: 18, fontWeight: '700', color: '#15803d', marginBottom: 4 },
  completeSubtitle: { fontSize: 13, color: '#4ade80', marginBottom: 12 },
  
  // Messages
  error: { color: '#dc2626', marginBottom: 8, paddingHorizontal: 4, fontWeight: '600' },
  success: { color: '#16a34a', marginBottom: 8, paddingHorizontal: 4, fontWeight: '600' },
  emptyTitle: { color: '#0f172a', fontWeight: '700', fontSize: 18 },
  emptySub: { color: '#64748b', marginTop: 4 },
  
  // Gateway Modal
  gatewayHint: { color: '#475569', fontSize: 12, marginBottom: 8 },
  gatewayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 14 },
  gatewayCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  gatewayTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
});

export default BillingSystem;
