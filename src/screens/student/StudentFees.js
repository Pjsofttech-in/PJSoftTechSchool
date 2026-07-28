import React, {useEffect, useState, useCallback, useRef} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Animated, } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import {studentApi} from '@api/studentApi';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme
const PRIMARY = '#7b68ee';
const PRIMARY_LIGHT = '#ede9ff';
const PRIMARY_DARK = '#5a4fcf';
const WHITE = '#ffffff';
const GREY_1 = '#f5f4fb';
const GREY_2 = '#e8e6f5';
const TEXT_DARK = '#1a1a2e';
const TEXT_MID = '#555577';
const TEXT_LIGHT = '#9999bb';
const GREEN = '#22c55e';
const RED = '#ef4444';
const ORANGE = '#f97316';

// Helpers
const fmt = val =>
  val != null && val !== 0
    ? `₹${Number(val).toLocaleString('en-IN', {minimumFractionDigits: 2})}`
    : null;

const getStatusStyle = status => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return {color: GREEN, bg: '#dcfce7', icon: 'check-circle-outline'};
    case 'pending':
      return {color: RED, bg: '#fee2e2', icon: 'clock-alert-outline'};
    case 'ongoing':
      return {color: ORANGE, bg: '#ffedd5', icon: 'progress-clock'};
    default:
      return {color: TEXT_LIGHT, bg: GREY_2, icon: 'help-circle-outline'};
  }
};

// Small Components
const Grid2 = ({label1, value1, label2, value2, highlight1, highlight2}) => {
  const has1 = value1 != null && value1 !== '';
  const has2 = value2 != null && value2 !== '';
  if (!has1 && !has2) return null;
  return (
    <View style={styles.gridRow}>
      {has1 && (
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>{label1}</Text>
          <Text style={[styles.gridValue, highlight1 && {color: highlight1}]}>
            {value1}
          </Text>
        </View>
      )}
      {has2 && (
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>{label2}</Text>
          <Text style={[styles.gridValue, highlight2 && {color: highlight2}]}>
            {value2}
          </Text>
        </View>
      )}
    </View>
  );
};

const SectionCard = ({title, icon, children, defaultOpen = true}) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = React.Children.toArray(children).some(c => c);
  if (!hasContent) return null;
  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.cardHeader}
        onPress={() => setOpen(o => !o)}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardIconWrap}>
            <MatIcon name={icon} size={14} color={PRIMARY} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <MatIcon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={PRIMARY}
        />
      </TouchableOpacity>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
};

// Fee Card
const FeeCard = ({fee, index}) => {
  const s = getStatusStyle(fee.feesStatus);
  const paid = fee.paidAmount ?? 0;
  const pending = fee.pendingAmount ?? 0;

  // use totalamount for progress
  const totalFees = fee.totalamount ?? 0;
  const progressPct =
    totalFees > 0 ? Math.min((paid / totalFees) * 100, 100) : 0;

  // progress bar
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedWidth.setValue(0);
    Animated.timing(animatedWidth, {
      toValue: progressPct,
      duration: 1000,
      delay: index * 150,
      useNativeDriver: false,
    }).start();
  }, [progressPct, animatedWidth, index]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.feeCard}>
      {/* Fee card header */}
      <View style={styles.feeCardHeader}>
        <View style={styles.feeCardHeaderLeft}>
          <Text style={styles.feeCardTitle}>
            {fee.standardName ?? `Fee #${index + 1}`}
            {fee.mediumName ? ` • ${fee.mediumName}` : ''}
          </Text>
          <Text style={styles.feeCardSub}>
            {[fee.feesCollectionType, fee.institutionType, fee.approvalDate]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: s.bg}]}>
          <MatIcon
            name={s.icon}
            size={11}
            color={s.color}
            style={{marginRight: 3}}
          />
          <Text style={[styles.statusText, {color: s.color}]}>
            {fee.feesStatus}
          </Text>
        </View>
      </View>

      {/* Animated progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: widthInterpolated,
                backgroundColor: s.color,
              },
            ]}
          />
        </View>
        <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{fmt(fee.totalamount) ?? '—'}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {fmt(paid) ?? '—'}
          </Text>
          <Text style={styles.summaryLabel}>Paid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text
            style={[styles.summaryVal, {color: pending > 0 ? RED : GREEN}]}>
            {fmt(pending) ?? '—'}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        {fee.discount > 0 && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, {color: PRIMARY}]}>
                {fmt(fee.discount) ?? '—'}
              </Text>
              <Text style={styles.summaryLabel}>Discount</Text>
            </View>
          </>
        )}
      </View>

      {/* Fee breakdown — collapsed by default */}
      <SectionCard
        title="Fee Breakdown"
        icon="format-list-bulleted"
        defaultOpen={false}>
        <Grid2
          label1="Tuition Fee"
          value1={fmt(fee.tuitionFee)}
          label2="Admission Fee"
          value2={fmt(fee.admissionFee)}
        />
        <Grid2
          label1="Practical Fee"
          value1={fmt(fee.practicalFee)}
          label2="Exam Fee"
          value2={fmt(fee.examFees)}
        />
        <Grid2
          label1="Computer Fee"
          value1={fmt(fee.computerClassFee)}
          label2="Uniform Fee"
          value2={fmt(fee.uniformFee)}
        />
        <Grid2
          label1="Transport Fee"
          value1={fmt(fee.transportBusFee)}
          label2="Hostel Fee"
          value2={fmt(fee.hostelFee)}
        />
        <Grid2
          label1="Building Fund"
          value1={fmt(fee.buildingFundFee)}
          label2="Library Fee"
          value2={fmt(fee.libraryFees)}
        />
        <Grid2
          label1="Sport Fee"
          value1={fmt(fee.sportFees)}
          label2="GST"
          value2={fee.gst > 0 ? fmt(fee.gst) : null}
        />
      </SectionCard>

      {/* Payment Schedule */}
      <SectionCard
        title="Payment Schedule"
        icon="calendar-check"
        defaultOpen={false}>
          
          {Array.isArray(fee.scheduleList) && fee.scheduleList.length > 0 ? (
            fee.scheduleList.map(item => (
            <View key={item.id} style={styles.scheduleRow}>
              {/* Left Side */}
              <View style={styles.scheduleLeft}>
                <Text style={styles.scheduleMonth}>{item.month}</Text>
                <Text style={styles.scheduleDate}>
                  Due: {item.dueDate}
                </Text>
              </View>
              
              {/* Right Side */}
              <View style={styles.scheduleRight}>
                <Text style={styles.scheduleAmount}>
                  {fmt(item.collectAmount)}
                </Text>
                
                {item.paid ? (
                  <View style={styles.paidBadge}>
                    <MatIcon
                    name="check-circle"
                    size={14}
                    color={GREEN}
                  />
                  <Text style={styles.paidText}>Paid</Text>
                  </View>
                  ) : (
                  <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => {
                    console.log('Pay Installment:', item);
                    // Future:
                    // handlePayInstallment(item);
                  }}>
                    <Text style={styles.payBtnText}>Pay</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
        <Text style={styles.emptyText}>
          No payment schedule available.
        </Text>
      )}
      
      </SectionCard>
    </View>
  );
};

// Main Screen
const StudentFees = () => {
  const {user} = useAuthStore();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  
  const insets = useSafeAreaInsets();

  const fetchFees = useCallback(async () => {
    try {
      setError(null);
      setFees([]); // remounts animation replays
      const data = await studentApi.getStudentFees(
        user?.id,
        user?.role,
        user?.email,
      );
      setFees(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[StudentFees] fetch error:', e.message);
      setError(e.message || 'Failed to load fees.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFees();
  };

  // Overall summary
  const totalFees = fees.reduce((s, f) => s + (f.totalamount ?? 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paidAmount ?? 0), 0);
  const totalPending = fees.reduce((s, f) => s + (f.pendingAmount ?? 0), 0);

  // Loading View
  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" transparent={true} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading fees…</Text>
      </View>
    );
  }

  // Error View
  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" transparent={true} />
        <MatIcon name="alert-circle-outline" size={48} color={ORANGE} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchFees}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty View
  if (!loading && !refreshing && fees.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" transparent={true} />
        <MatIcon name="cash-remove" size={48} color={TEXT_LIGHT} />
        <Text style={styles.errorText}>No fee records found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchFees}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" transparent={true} />

      <View style={[
        styles.header, 
        { paddingTop: Math.max(12, insets.top) }
      ]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
              <MatIcon name="arrow-left" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fees Details</Text>
      </View>

      {/* Overall Summary Strip */}
      <View style={styles.overallCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{fmt(totalFees) ?? '—'}</Text>
          <Text style={styles.summaryLabel}>Total Fees</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>
            {fmt(totalPaid) ?? '—'}
          </Text>
          <Text style={styles.summaryLabel}>Paid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text
            style={styles.summaryVal}>
            {fmt(totalPending) ?? '—'}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }>
        {fees.map((fee, index) => (
          <FeeCard key={fee.fid ?? index} fee={fee} index={index} />
        ))}
      </ScrollView>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: GREY_1},
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: WHITE, gap: 8, },
  backBtn: { padding: 4, borderRadius: 8, backgroundColor: PRIMARY_LIGHT },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  overallCard: { flexDirection: 'row', backgroundColor: PRIMARY, paddingVertical: 14, paddingHorizontal: 8, elevation: 6, shadowColor: PRIMARY_DARK, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, },
  summaryItem: { flex: 1, alignItems: 'center'},
  summaryVal: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: "#ffffff", lineHeight: 20, },
  summaryLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.7)', marginTop: 1, },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4, },
  scroll: {padding: 12, paddingTop: 14},
  feeCard: { backgroundColor: WHITE, borderRadius: 14, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 4, },
  feeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingBottom: 8, },
  feeCardHeaderLeft: { flex: 1, marginRight: 8},
  feeCardTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  feeCardSub: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginTop: 1, },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, },
  statusText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', },
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10, gap: 8, },
  progressBg: { flex: 1, height: 6, backgroundColor: GREY_2, borderRadius: 3, overflow: 'hidden', },
  progressFill: { height: '100%', borderRadius: 3, },
  progressPct: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: TEXT_MID, minWidth: 30, textAlign: 'right', },
  summaryStrip: { flexDirection: 'row', backgroundColor: PRIMARY, marginHorizontal: 12, borderRadius: 10, paddingVertical: 8, marginBottom: 10, },
  card: { marginHorizontal: 12, marginBottom: 10, borderRadius: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: GREY_2, },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: PRIMARY_LIGHT, },
  cardHeaderLeft: {flexDirection: 'row', alignItems: 'center', gap: 6},
  cardIconWrap: { width: 22, height: 22, borderRadius: 5, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', },
  cardTitle: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: PRIMARY_DARK, },
  cardBody: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: WHITE, },
  gridRow: { flexDirection: 'row', gap: 6, marginBottom: 4},
  gridCell: { flex: 1, backgroundColor: GREY_1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, },
  gridLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, },
  gridValue: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginTop: 1, },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: GREY_1, padding: 24 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: GREY_2, },
  scheduleLeft: { flex: 1 },
  scheduleMonth: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  scheduleDate: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginTop: 2, },
  scheduleRight: {alignItems: 'flex-end', gap: 6, },
  scheduleAmount: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginBottom: 6 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, },
  paidText: { marginLeft: 4, fontSize: 10, fontFamily: 'Poppins-SemiBold', color: GREEN, },
  payBtn: { backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, },
  payBtnText: { color: WHITE, fontSize: 10, fontFamily: 'Poppins-SemiBold', },
  emptyText: { textAlign: 'center', paddingVertical: 12, color: TEXT_LIGHT, fontFamily: 'Poppins-Regular', },
  loadingText: { marginTop: 10, color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, },
  errorText: { color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', marginHorizontal: 32, marginTop: 12, marginBottom: 16, },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 9, borderRadius: 20, },
  retryText: { color: WHITE, fontFamily: 'Poppins-SemiBold', fontSize: 13, },
});

export default StudentFees;