import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { studentApi } from '@api/studentApi';

const PRIMARY = '#7b68ee';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

// Subject color palette — cycles through for variety
const SUBJECT_COLORS = [
  { bg: '#ede9ff', text: '#7b68ee' },
  { bg: '#e4f0ff', text: '#1e88e5' },
  { bg: '#e4ffed', text: '#2e7d32' },
  { bg: '#fff8e1', text: '#f57f17' },
  { bg: '#fce4ec', text: '#c62828' },
  { bg: '#e0f7fa', text: '#00838f' },
  { bg: '#f3e5f5', text: '#7b1fa2' },
];

const getSubjectColor = (index) => SUBJECT_COLORS[index % SUBJECT_COLORS.length];

export class StudentTimeTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      timetable: {},        // { Monday: [periods...], Tuesday: [periods...] }
      availableDays: [],    // ordered list of days that have data
      selectedDay: '',
      loading: true,
      error: null,
    };
  }

  componentDidMount() {
    this.fetchTimeTable();
  }

  fetchTimeTable = async () => {
    this.setState({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const student = await studentApi.getStudentById(user.id, user.role, user.email);
      //studetn.classsRoomId          pass as a classId
      const data = await studentApi.getTimeTableByClassId(user.role, user.email, student.classsRoomId);
      this.processTimeTable(data);
    } catch (err) {
      console.error('[StudentTimeTable] fetchTimeTable failed:', err);
      this.setState({ loading: false, error: 'Failed to load timetable. Tap to retry.' });
    }
  };

  // Merge all entries by dayOfWeek, flatten scheduledPeriods, sort by periodNo
  processTimeTable = (data) => {
    const map = {};

    data.forEach((entry) => {
      const day = entry.dayOfWeek;
      if (!map[day]) map[day] = [];
      entry.scheduledPeriods.forEach((period) => {
        map[day].push(period);
      });
    });

    // Sort each day's periods by periodNo
    Object.keys(map).forEach((day) => {
      map[day].sort((a, b) => a.periodNo - b.periodNo);
    });

    // Only include days that have data, in correct weekday order
    const availableDays = DAY_ORDER.filter((d) => map[d] && map[d].length > 0);

    // Default select today's day if available, else first available day
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const selectedDay = availableDays.includes(today) ? today : availableDays[0] || '';

    this.setState({ timetable: map, availableDays, selectedDay, loading: false });
  };

  // Render Day Tab
  renderDayTab = (day) => {
    const isSelected = this.state.selectedDay === day;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const isToday = day === today;

    return (
      <TouchableOpacity
        key={day}
        style={[styles.dayTab, isSelected && styles.dayTabActive]}
        onPress={() => this.setState({ selectedDay: day })}
      >
        <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
          {DAY_SHORT[day]}
        </Text>
        {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
      </TouchableOpacity>
    );
  };

  // Render Period Card
  renderPeriodItem = ({ item, index }) => {
    const color = getSubjectColor(index);
    return (
      <View style={styles.periodCard}>
        {/* Left: period number + time column */}
        <View style={styles.periodLeft}>
          <View style={[styles.periodNumBadge, { backgroundColor: color.bg }]}>
            <Text style={[styles.periodNumText, { color: color.text }]}>{item.periodNo}</Text>
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.timeStart}>{item.startTime}</Text>
            <View style={styles.timeDivider} />
            <Text style={styles.timeEnd}>{item.endTime}</Text>
          </View>
        </View>

        {/* Vertical divider */}
        <View style={[styles.verticalLine, { backgroundColor: color.bg }]} />

        {/* Right: subject + teacher */}
        <View style={styles.periodRight}>
          <View style={[styles.subjectTag, { backgroundColor: color.bg }]}>
            <Text style={[styles.subjectTagText, { color: color.text }]}>{item.subjectName}</Text>
          </View>
          <View style={styles.teacherRow}>
            <MatIcon name="account-tie-outline" size={13} color="#999" />
            <Text style={styles.teacherName}>{item.teacherName}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render
  render() {
    const { loading, error, availableDays, selectedDay, timetable } = this.state;

    if (error) {
      return (
        <View style={styles.centered}>
          <MatIcon name="wifi-off" size={40} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={this.fetchTimeTable}>
            <MatIcon name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      );
    }

    if (availableDays.length === 0) {
      return (
        <View style={styles.centered}>
          <MatIcon name="calendar-remove-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No timetable available.</Text>
        </View>
      );
    }

    const periodsForDay = timetable[selectedDay] || [];

    return (
      <SafeAreaView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>
            {periodsForDay.length} period{periodsForDay.length !== 1 ? 's' : ''} · {selectedDay}
          </Text>
        </View>

        {/* Day Tabs */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {availableDays.map((day) => this.renderDayTab(day))}
          </ScrollView>
        </View>

        {/* Periods List */}
        <FlatList
          data={periodsForDay}
          renderItem={this.renderPeriodItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MatIcon name="calendar-blank-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No periods scheduled.</Text>
            </View>
          }
        />

      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  // Header
  header: { paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerSub: { fontSize: 13, color: '#999', marginVertical: 10, alignSelf: 'flex-end' },
  // Day Tabs
  tabsWrapper: { backgroundColor: '#fff', elevation: 2 },
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dayTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', },
  dayTabActive: { backgroundColor: PRIMARY },
  dayTabText: { fontSize: 13, fontWeight: '600', color: '#999' },
  dayTabTextActive: { color: '#fff' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PRIMARY, marginTop: 3 },
  todayDotActive: { backgroundColor: '#fff' },
  // Period Card
  listPadding: { padding: 16 },
  periodCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, elevation: 2, flexDirection: 'row', alignItems: 'center', },
  periodLeft: { alignItems: 'center', marginRight: 12 },
  periodNumBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6, },
  periodNumText: { fontWeight: 'bold', fontSize: 14 },
  timeColumn: { alignItems: 'center' },
  timeStart: { fontSize: 11, color: '#555', fontWeight: '500' },
  timeDivider: { width: 1, height: 8, backgroundColor: '#ddd', marginVertical: 2 },
  timeEnd: { fontSize: 11, color: '#999' },
  verticalLine: { width: 3, height: '80%', borderRadius: 4, marginRight: 12 },
  periodRight: { flex: 1 },
  subjectTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8, },
  subjectTagText: { fontSize: 13, fontWeight: '700' },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  teacherName: { fontSize: 12, color: '#777' },
  // Error / Empty
  errorText: { color: '#999', marginTop: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 16, },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 13 },
});

export default StudentTimeTable;