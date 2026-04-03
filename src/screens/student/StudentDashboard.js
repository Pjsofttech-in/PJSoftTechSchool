import React, {useEffect, useState, useCallback} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Linking } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import {useNavigation} from '@react-navigation/native';
import useAuthStore from '@store/authStore';
import {studentApi} from '@api/studentApi';

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
const BLUE = '#3b82f6';

// Helpers
const formatDate = date => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fmt = val =>
  val != null && val !== 0
    ? `₹${Number(val).toLocaleString('en-IN', {minimumFractionDigits: 0})}`
    : '₹0';

const getDaysInfo = dueDateStr => {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming';
};

// Stat Card
const StatCard = ({icon, label, value, color, bg, onPress}) => (
  <TouchableOpacity
    style={[styles.statCard, {backgroundColor: bg}]}
    onPress={onPress}
    activeOpacity={0.8}>
    <View style={[styles.statIconWrap, {backgroundColor: color + '22'}]}>
      <MatIcon name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.statVal, {color}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

// Section Header
const SectionHeader = ({title, icon, onPress}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <MatIcon name={icon} size={16} color={PRIMARY} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.viewAllBtn}>
      <Text style={styles.viewAllText}>View All</Text>
      <MatIcon name="chevron-right" size={16} color={PRIMARY} />
    </TouchableOpacity>
  </View>
);

// Main Screen
const StudentDashboard = () => {
  const {user} = useAuthStore();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [feesData, setFeesData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [assignmentsData, setAssignmentsData] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const today = formatDate(new Date());

      const [attendance, fees, results, assignments] = await Promise.allSettled([
        // Today's attendance
        studentApi.getAttendance(user?.id, 'today', today, today, 0, 1),
        // Fees
        studentApi.getStudentFees(user?.id, user?.role, user?.email),
        // Results
        studentApi.getStudentResults(user?.id, user?.role, user?.email),
        // Assignments
        studentApi.getAssignments(user?.classRoomId, user?.role, user?.email),
      ]);

      // Attendance
      if (attendance.status === 'fulfilled') {
        const content = attendance.value?.content ?? [];
        setAttendanceToday(content[0] ?? null);
      }

      // Fees
      if (fees.status === 'fulfilled') {
        const data = Array.isArray(fees.value) ? fees.value : [];
        const totalFees = data.reduce((s, f) => s + (f.totalamount ?? 0), 0);
        const totalPaid = data.reduce((s, f) => s + (f.paidAmount ?? 0), 0);
        const totalPending = data.reduce((s, f) => s + (f.pendingAmount ?? 0), 0);
        setFeesData({totalFees, totalPaid, totalPending});
      }

      // Results
      if (results.status === 'fulfilled') {
        const data = Array.isArray(results.value) ? results.value : [];
        const avg =
          data.length > 0
            ? data.reduce((s, r) => s + (r.percentage ?? 0), 0) / data.length
            : 0;
        setResultsData({total: data.length, avg: avg.toFixed(1)});
      }

      // Assignments
      if (assignments.status === 'fulfilled') {
        const data = Array.isArray(assignments.value) ? assignments.value : [];
        const overdue = data.filter(a => getDaysInfo(a.dueDate) === 'overdue').length;
        const dueToday = data.filter(a => getDaysInfo(a.dueDate) === 'today').length;
        setAssignmentsData({total: data.length, overdue, dueToday});
      }
    } catch (e) {
      console.error('[Dashboard] fetchAll error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // Greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Attendance status style
  const getAttendanceStyle = status => {
    switch (status?.toLowerCase()) {
      case 'present': return {color: GREEN, bg: '#dcfce7', icon: 'check-circle-outline'};
      case 'absent':  return {color: RED,   bg: '#fee2e2', icon: 'close-circle-outline'};
      case 'sunday':
      case 'holiday': return {color: BLUE,  bg: '#dbeafe', icon: 'calendar-star'};
      case 'late':    return {color: ORANGE, bg: '#ffedd5', icon: 'clock-alert-outline'};
      default:        return {color: TEXT_LIGHT, bg: GREY_2, icon: 'help-circle-outline'};
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Student';
  const atStyle = getAttendanceStyle(attendanceToday?.status);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[PRIMARY]}
          tintColor={PRIMARY}
        />
      }>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeLeft}>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.welcomeName}>{firstName}</Text>
          <View style={styles.welcomeMeta}>
            {user?.classRoomId && (
              <View style={styles.metaPill}>
                <MatIcon name="google-classroom" size={11} color={PRIMARY} />
                <Text style={styles.metaPillText}>Room {user.classRoomId}</Text>
              </View>
            )}
            {user?.branchCode && (
              <View style={styles.metaPill}>
                <MatIcon name="office-building-outline" size={11} color={PRIMARY} />
                <Text style={styles.metaPillText}>{user.branchCode}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.welcomeAvatar}>
          <Text style={styles.welcomeAvatarText}>
            {user?.name
              ?.split(' ')
              .slice(0, 2)
              .map(n => n[0])
              .join('')
              .toUpperCase() ?? '?'}
          </Text>
        </View>
      </View>

      {/* Today's Attendance */}
      <SectionHeader
        title="Today's Attendance"
        icon="calendar-today"
        onPress={() => navigation.navigate('Attendance')}
      />
      <TouchableOpacity
        style={[styles.attendanceCard, {backgroundColor: atStyle.bg}]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Attendance')}>
        <MatIcon name={atStyle.icon} size={32} color={atStyle.color} />
        <View style={styles.attendanceInfo}>
          <Text style={[styles.attendanceStatus, {color: atStyle.color}]}>
            {attendanceToday?.status ?? 'No Record'}
          </Text>
          <Text style={styles.attendanceDate}>
            {attendanceToday?.date ?? new Date().toISOString().split('T')[0]}
          </Text>
          {attendanceToday?.loginTime && (
            <Text style={styles.attendanceTime}>
              {attendanceToday.loginTime} → {attendanceToday.logoutTime ?? '--'}
            </Text>
          )}
        </View>
        <MatIcon name="chevron-right" size={20} color={atStyle.color} />
      </TouchableOpacity>

      {/* Fees */}
      <SectionHeader
        title="Fees"
        icon="cash-multiple"
        onPress={() => navigation.navigate('StudentFees')}
      />
      <View style={styles.feesCard}>
        <View style={styles.feesItem}>
          <Text style={styles.feesLabel}>Total</Text>
          <Text style={styles.feesVal}>{fmt(feesData?.totalFees)}</Text>
        </View>
        <View style={styles.feesDivider} />
        <View style={styles.feesItem}>
          <Text style={styles.feesLabel}>Paid</Text>
          <Text style={[styles.feesVal, {color: GREEN}]}>{fmt(feesData?.totalPaid)}</Text>
        </View>
        <View style={styles.feesDivider} />
        <View style={styles.feesItem}>
          <Text style={styles.feesLabel}>Pending</Text>
          <Text
            style={[
              styles.feesVal,
              {color: (feesData?.totalPending ?? 0) > 0 ? RED : GREEN},
            ]}>
            {fmt(feesData?.totalPending)}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <Text style={styles.quickStatsLabel}>Quick Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard
          icon="chart-bar"
          label="Avg Result"
          value={resultsData ? `${resultsData.avg}%` : '—'}
          color={PRIMARY}
          bg={PRIMARY_LIGHT}
          onPress={() => navigation.navigate('StudentResult')}
        />
        <StatCard
          icon="clipboard-check-outline"
          label="Exams"
          value={resultsData?.total ?? '—'}
          color={BLUE}
          bg="#dbeafe"
          onPress={() => navigation.navigate('StudentResult')}
        />
        <StatCard
          icon="clipboard-text-outline"
          label="Assignments"
          value={assignmentsData?.total ?? '—'}
          color={GREEN}
          bg="#dcfce7"
          onPress={() => navigation.navigate('Assignments')}
        />
        <StatCard
          icon="clock-alert-outline"
          label="Overdue"
          value={assignmentsData?.overdue ?? '—'}
          color={RED}
          bg="#fee2e2"
          onPress={() => navigation.navigate('Assignments')}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => Linking.openURL('https://pjsofttech.com')}>
          <Text style={styles.footerText}>Software Designed By PJSOFTTECH Pvt. Ltd.</Text>
        </TouchableOpacity>
        <Text style={styles.footerCopyright}>© All Rights Reserved</Text>
      </View>

      <View style={styles.bottomPad} />
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GREY_1 },
  scroll: { padding: 14, paddingTop: 16 },
  // Loading
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: GREY_1, },
  loadingText: { marginTop: 10, color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, },
  // Welcome card
  welcomeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 6, },
  welcomeLeft: { flex: 1 },
  greeting: { fontSize: 12, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, },
  welcomeName: { fontSize: 20, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginTop: 1, },
  welcomeMeta: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', },
  metaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4, },
  metaPillText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: PRIMARY, },
  welcomeAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginLeft: 12, },
  welcomeAvatarText: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: WHITE, },
  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4, },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, },
  sectionTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, },
  viewAllText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: PRIMARY, },
  // Attendance card
  attendanceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 16, gap: 12, },
  attendanceInfo: { flex: 1 },
  attendanceStatus: { fontSize: 16, fontFamily: 'Poppins-SemiBold', lineHeight: 22, },
  attendanceDate: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_MID, marginTop: 1, },
  attendanceTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_MID, },
  // Fees card
  feesCard: { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 14, paddingVertical: 14, marginBottom: 16, elevation: 2, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 4, },
  feesItem: { flex: 1, alignItems: 'center' },
  feesLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginBottom: 3, },
  feesVal: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  feesDivider: { width: 1, backgroundColor: GREY_2, marginVertical: 4, },
  // Quick stats
  quickStatsLabel: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginBottom: 8, marginTop: 4, },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, },
  statCard: { width: '47%', borderRadius: 14, padding: 14, alignItems: 'flex-start', elevation: 1, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 3, },
  statIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8, },
  statVal: { fontSize: 20, fontFamily: 'Poppins-SemiBold', lineHeight: 26,  },
  statLabel: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_MID, marginTop: 2, },
  // Footer
  footer: { alignItems: 'center', marginTop: 20, },
  footerText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: PRIMARY, textDecorationLine: 'underline', },
  footerCopyright: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginTop: 3, },
  // BottomPad
  bottomPad: { height: 20 },
});

export default StudentDashboard;