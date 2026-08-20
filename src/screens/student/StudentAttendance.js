import React, {useState, useCallback} from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, } from 'react-native';
import DatePicker from 'react-native-date-picker';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import {useFocusEffect} from '@react-navigation/native';
import useAuthStore from '@store/authStore';
import {studentApi} from '@api/studentApi';

// Theme 
const PRIMARY = '#7b68ee';
const PRIMARY_LIGHT = '#ede9ff';
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

// Constants
const TIME_FRAMES = [
  {label: 'Today', value: 'today'},
  {label: '7 Days', value: '7days'},
  {label: '30 Days', value: '30days'},
  {label: '365 Days', value: '365days'},
  {label: 'Custom', value: 'custom'},
];

const PAGE_SIZE = 25;

// Helpers

// Format Date object to 'YYYY-MM-DD'
const formatDate = date => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Format 'YYYY-MM-DD' to 'DD MMM YYYY'
const formatDisplay = dateStr => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
};

// Get startDate & endDate for predefined filters
const getDateRange = filter => {
  const today = new Date();
  const end = formatDate(today);
  switch (filter) {
    case 'today':
      return {startDate: end, endDate: end};
    case '7days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return {startDate: formatDate(s), endDate: end};
    }
    case '30days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return {startDate: formatDate(s), endDate: end};
    }
    case '365days': {
      const s = new Date(today);
      s.setFullYear(s.getFullYear() - 1);
      s.setDate(s.getDate() + 1);
      return {startDate: formatDate(s), endDate: end};
    }
    default:
      return {startDate: end, endDate: end};
  }
};

// Status color & icon
const getStatusStyle = status => {
  switch (status?.toLowerCase()) {
    case 'present':
      return {color: GREEN, icon: 'check-circle-outline', bg: '#dcfce7'};
    case 'absent':
      return {color: RED, icon: 'close-circle-outline', bg: '#fee2e2'};
    case 'sunday':
    case 'holiday':
      return {color: BLUE, icon: 'calendar-star', bg: '#dbeafe'};
    case 'late':
      return {color: ORANGE, icon: 'clock-alert-outline', bg: '#ffedd5'};
    case 'leave':
      return {color: ORANGE, icon: 'calendar-remove-outline', bg: '#ffedd5'};
    default:
      return {color: TEXT_LIGHT, icon: 'help-circle-outline', bg: GREY_2};
  }
};

// Attendance Item
const AttendanceItem = ({item}) => {
  const s = getStatusStyle(item.status);
  return (
    <View style={styles.itemCard}>
      <View style={[styles.itemIconWrap, {backgroundColor: s.bg}]}>
        <MatIcon name={s.icon} size={22} color={s.color} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemDate}>{formatDisplay(item.date)}</Text>
        {item.loginTime || item.logoutTime ? (
          <Text style={styles.itemTime}>
            {item.loginTime ?? '--'} → {item.logoutTime ?? '--'}
          </Text>
        ) : null}
      </View>
      <View style={[styles.statusBadge, {backgroundColor: s.bg}]}>
        <Text style={[styles.statusText, {color: s.color}]}>{item.status}</Text>
      </View>
    </View>
  );
};

// Main Screen
const StudentAttendance = () => {
  const {user} = useAuthStore();

  const [selectedFilter, setSelectedFilter] = useState('today');
  const [attendanceData, setAttendanceData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Custom date range
  const [customRange, setCustomRange] = useState({
    startDate: null,
    endDate: null,
  });

  // Date picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState('start'); // 'start' | 'end'
  const [tempStart, setTempStart] = useState(null);

  // Counts calculated from data 
  const presentCount = attendanceData.filter(
    i => i.status?.toLowerCase() === 'present',
  ).length;
  const absentCount = attendanceData.filter(
    i => i.status?.toLowerCase() === 'absent',
  ).length;
  const holidayCount = attendanceData.filter(i =>
    ['sunday', 'holiday'].includes(i.status?.toLowerCase()),
  ).length;
  const lateCount = attendanceData.filter(
    i => i.status?.toLowerCase() === 'late',
  ).length;

  // Load data
  const loadAttendance = useCallback(
    async (filter, isRefresh = false, range = null) => {
      try {
        isRefresh ? setRefreshing(true) : setIsLoading(true);
        if (!isRefresh) setAttendanceData([]);

        let startDate, endDate;

        if (filter === 'custom' && range?.startDate && range?.endDate) {
          startDate = range.startDate;
          endDate = range.endDate;
        } else {
          const dates = getDateRange(filter);
          startDate = dates.startDate;
          endDate = dates.endDate;
        }

        const data = await studentApi.getAttendance(
          user?.id,
          filter,
          startDate,
          endDate,
          0,
          PAGE_SIZE,
        );

        setAttendanceData(data?.content ?? []);
        setTotalElements(data?.totalElements ?? 0);
      } catch (e) {
        console.error('[StudentAttendance] load error:', e.message);
        setAttendanceData([]);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      if (selectedFilter === 'custom') {
        if (customRange.startDate && customRange.endDate) {
          loadAttendance('custom', false, customRange);
        }
      } else {
        loadAttendance(selectedFilter);
      }
    }, [selectedFilter, customRange, loadAttendance]),
  );

  // Filter press
  const handleFilterPress = value => {
    if (isLoading) return;
    if (value === 'custom') {
      // Open date picker for start date first
      setTempStart(null);
      setPickingFor('start');
      setPickerOpen(true);
      return;
    }
    setSelectedFilter(value);
  };

  // Date picker confirm
  const handleDateConfirm = date => {
    setPickerOpen(false);
    if (pickingFor === 'start') {
      setTempStart(date);
      // Now pick end date
      setTimeout(() => {
        setPickingFor('end');
        setPickerOpen(true);
      }, 300);
    } else {
      // Both dates picked
      const range = {
        startDate: formatDate(tempStart),
        endDate: formatDate(date),
      };
      setCustomRange(range);
      setSelectedFilter('custom');
      loadAttendance('custom', false, range);
    }
  };

  // Refresh
  const onRefresh = useCallback(() => {
    loadAttendance(
      selectedFilter,
      true,
      selectedFilter === 'custom' ? customRange : null,
    );
  }, [selectedFilter, customRange, loadAttendance]);

  // Filter chip label
  const getFilterLabel = filter => {
  if (
    filter.value === 'custom' &&
    selectedFilter === 'custom' &&
    customRange.startDate
  ) {
    const fmt = str => {
      const [, m, d] = str.split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${d} ${months[parseInt(m) - 1]}`;
    };
    return `${fmt(customRange.startDate)} → ${fmt(customRange.endDate)}`; // ← "18 Mar → 25 Mar"
  }
  return filter.label;
};

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="000" />

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}>
        {TIME_FRAMES.map(filter => (
          <TouchableOpacity
            key={filter.value}
            onPress={() => handleFilterPress(filter.value)}
            disabled={isLoading}
            activeOpacity={0.75}
            style={[
              styles.filterChip,
              selectedFilter === filter.value && styles.filterChipActive,
              isLoading && styles.filterChipDisabled,
            ]}>
            {filter.value === 'custom' && (
              <MatIcon
                name="calendar-range"
                size={12}
                color={selectedFilter === 'custom' ? PRIMARY : TEXT_MID}
                style={{marginRight: 4}}
              />
            )}
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.value && styles.filterChipTextActive,
              ]}
              numberOfLines={1}>
              {getFilterLabel(filter)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Strip */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, {color: GREEN}]}>{presentCount}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, {color: RED}]}>{absentCount}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, {color: ORANGE}]}>{lateCount}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, {color: BLUE}]}>{holidayCount}</Text>
          <Text style={styles.statLabel}>Holiday</Text>
        </View>
      </View>

      {/* Total records label */}
      {!isLoading && attendanceData.length > 0 && (
        <Text style={styles.totalLabel}>
          {totalElements} record{totalElements !== 1 ? 's' : ''} found
        </Text>
      )}

      {/* List */}
      {isLoading && !refreshing ? (
        <View style={{flex: 1}}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading attendance…</Text>
          </View>
        </View>  
      ) : selectedFilter === 'custom' && !customRange.startDate ? (
        <View style={{flex: 1}}>
          <View style={styles.centered}>
            <MatIcon name="calendar-range" size={48} color={GREY_2} />
            <Text style={styles.emptyText}>
              Tap Custom to select a date range
            </Text>
          </View>
        </View>
      ) : attendanceData.length === 0 ? (
        <View style={{flex: 1}}>
          <ScrollView
            contentContainerStyle={styles.centered}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[PRIMARY]}
                tintColor={PRIMARY}
              />
            }>
            <MatIcon name="calendar-blank-outline" size={48} color={GREY_2} />
            <Text style={styles.emptyText}>
              No records found for this period
            </Text>
          </ScrollView>
        </View>
      ) : (
        <View style={{flex: 1}}>
          <FlatList
            data={attendanceData}
            renderItem={({item}) => <AttendanceItem item={item} />}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() : `${item.date}-${index}`
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
               onRefresh={onRefresh}
                colors={[PRIMARY]}
                tintColor={PRIMARY}
              />
            }
          />
        </View>
      )}

      {/* Date Picker */}
      <DatePicker
        modal
        open={pickerOpen}
        date={
          pickingFor === 'end' && tempStart
            ? tempStart
            : new Date()
        }
        mode="date"
        title={pickingFor === 'start' ? 'Select Start Date' : 'Select End Date'}
        confirmText="Confirm"
        cancelText="Cancel"
        maximumDate={new Date()}
        minimumDate={
          pickingFor === 'end' && tempStart ? tempStart : undefined
        }
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerOpen(false)}
      />
    </View>
  );
};

// Styles 
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: GREY_1},
  // Filters
  filtersScroll: { maxHeight: 36, marginTop: 12, },
  filtersContent: { paddingHorizontal: 12, alignItems: 'center', },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 16, marginRight: 6, backgroundColor: WHITE, borderWidth: 1, borderColor: GREY_2, minHeight: 28, maxWidth: 160, },
  filterChipActive: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY, },
  filterChipDisabled: { opacity: 0.5, },
  filterChipText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: TEXT_MID, flexShrink: 1, },
  filterChipTextActive: { fontFamily: 'Poppins-SemiBold', color: PRIMARY, },
  // Stats card
  statsCard: { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 14, marginHorizontal: 12, marginTop: 12, marginBottom: 4, paddingVertical: 12, elevation: 2, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 4, },
  statItem: { flex: 1, alignItems: 'center'},
  statVal: { fontSize: 18, fontFamily: 'Poppins-SemiBold', lineHeight: 24, },
  statLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginTop: 1, },
  statDivider: { width: 1, backgroundColor: GREY_2, marginVertical: 4, },
  // Total label
  totalLabel: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginHorizontal: 16, marginTop: 8, marginBottom: 4, },
  // List
  listContent: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 20, },
  // Attendance item
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, elevation: 1, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3, },
  itemIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, },
  itemInfo: {flex: 1},
  itemDate: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  itemTime: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginTop: 1, },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, },
  statusText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', },
  // Empty / Loading
  centered: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40, },
  loadingText: { marginTop: 10, color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, },
  emptyText: { color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', marginTop: 12, marginHorizontal: 32, },
});

export default StudentAttendance;