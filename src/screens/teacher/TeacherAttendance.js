import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, Dimensions, RefreshControl, StatusBar, Alert, } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { ClassroomFilterBar } from '@components/ClassroomFilterBar';
import { applyClassroomFilters } from '@utils/classroomFilterUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#7b68ee';
const SUCCESS = '#4caf50';
const DANGER = '#f44336';
const SURFACE_BG = '#f8f9fe';

const RIPPLE_CONFIG = { color: 'rgba(123, 104, 238, 0.1)', borderless: false };
const SPINNER_COLORS = [PRIMARY];

const TIMEFRAME_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7days', label: '7 Days' },
  { id: '30days', label: '30 Days' },
  { id: '365days', label: 'Year' },
];

const STATUS_OPTIONS = [
  { id: 'All', label: 'All' },
  { id: 'On Time', label: 'On Time' },
  { id: 'Absent', label: 'Absent' },
];

const StudentRow = React.memo(({ item, isSelected, onToggle }) => {
  const isOnTime = item.status === 'On Time';

  return (
    <Pressable
      onPress={() => onToggle(item.rollNo)}
      android_ripple={RIPPLE_CONFIG}
      style={[styles.studentCard, isSelected && styles.studentCardSelected]}
    >
      <View style={styles.cardMain}>
        <MatIcon
          name={isSelected ? 'checkbox-marked-circle' : 'minus-circle-outline'}
          size={22}
          color={isSelected ? PRIMARY : '#bbb'}
        />

        <Text style={styles.rollNoText}>{item.rollNo}</Text>

        <View style={styles.flexTextContainer}>
          <Text style={styles.studentNameText}>{item.studentName}</Text>
          <Text style={styles.dateLabel}>{item.date}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: isOnTime ? '#e8f5e9' : '#ffebee' }]}>
          <Text style={[styles.statusText, { color: isOnTime ? SUCCESS : DANGER }]}>
            {item.status}
          </Text>
        </View>
      </View>

      {isOnTime && (
        <View style={styles.presentDetailsRow}>
          <View style={styles.detailBox}>
            <MatIcon name="login" size={12} color="#777" />
            <Text style={styles.detailValue}>In: {item.loginTime || '--:--'}</Text>
          </View>

          <View style={styles.detailBox}>
            <MatIcon name="logout" size={12} color="#777" />
            <Text style={styles.detailValue}>Out: {item.logoutTime || '--:--'}</Text>
          </View>

          <View style={styles.detailBox}>
            <MatIcon name="clock-outline" size={12} color={PRIMARY} />
            <Text style={[styles.detailValue, styles.workingMinsText]}>
              {item.workingMinutes}m
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
});

export const TeacherAttendance = () => {
  const user = useAuthStore((state) => state.user);

  // Core Data States
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Selection Contexts
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [activeTimeFrame, setActiveTimeFrame] = useState('today');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeFilters, setActiveFilters] = useState({});
  const [filterResetKey, setFilterResetKey] = useState(0);

  const [selectedRollNos, setSelectedRollNos] = useState([]);

  const fetchClassrooms = useCallback(async (isARefreshCall = false) => {
    if (isARefreshCall) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (!user?.id || !user?.email) return;
      const data = await teacherApi.getClassRooms(user.id, user.email);
      const filtered = applyClassroomFilters(data, activeFilters);
      setAllClassrooms(data);
      setClassrooms(filtered);
    } catch (err) {
      console.error('[AttendanceHub] Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.email, activeFilters]);

  useEffect(() => {
    fetchClassrooms(false);
  }, [fetchClassrooms]);

  const onRefresh = useCallback(() => {
    fetchClassrooms(true);
  }, [fetchClassrooms]);

  const handleFilterApply = (filters) => {
    const filtered = applyClassroomFilters(allClassrooms, filters);
    setActiveFilters(filters);
    setClassrooms(filtered);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setClassrooms(allClassrooms);
    setFilterResetKey((prev) => prev + 1);
  };

  // Internal structural query runner (prevents flickering modal components)
  const queryAttendanceData = async (classId, timeFrame, targetStatus) => {
    setModalLoading(true);
    try {
      const res = await teacherApi.getAttendanceByClass(classId, timeFrame);
      const data = res.content || [];
      setAttendanceData(data);

      const filtered = targetStatus === 'All'
        ? data
        : data.filter((i) => i.status === targetStatus);
      setFilteredData(filtered);
    } catch (err) {
      console.error('[AttendanceDetails] Fetch Query Error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewAttendance = (classId, className) => {
    setSelectedRollNos([]);
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setActiveTimeFrame('today');
    setActiveStatus('All');
    setIsModalVisible(true);
    queryAttendanceData(classId, 'today', 'All');
  };

  const handleTimeframeChange = (timeFrame) => {
    setActiveTimeFrame(timeFrame);
    setSelectedRollNos([]);
    queryAttendanceData(selectedClassId, timeFrame, activeStatus);
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    const filtered = status === 'All'
      ? attendanceData
      : attendanceData.filter((i) => i.status === status);
    setFilteredData(filtered);
  };

  const toggleStudentSelection = useCallback((rollNo) => {
    setSelectedRollNos((prev) =>
      prev.includes(rollNo) ? prev.filter((id) => id !== rollNo) : [...prev, rollNo]
    );
  }, []);

  const handleSelectAll = () => {
    const allRollNos = filteredData.map((item) => item.rollNo);
    if (selectedRollNos.length === allRollNos.length && allRollNos.length > 0) {
      setSelectedRollNos([]);
    } else {
      setSelectedRollNos(allRollNos);
    }
  };

  const refreshAttendanceData = async () => {
    try {
      const res = await teacherApi.getAttendanceByClass(selectedClassId, activeTimeFrame);
      const data = res.content || [];
      setAttendanceData(data);

      const filtered = activeStatus === 'All'
        ? data
        : data.filter((i) => i.status === activeStatus);
      setFilteredData(filtered);
    } catch (err) {
      console.error('[Attendance Refresh Error]', err);
    }
  };

  const handleMarkAttendance = async () => {
    if (selectedRollNos.length === 0) return;

    try {
      const response = await teacherApi.markStudentAttendance(
        selectedClassId,
        selectedRollNos
      );
      Alert.alert('Attendance', response?.message || 'Attendance status altered successfully.');
      setSelectedRollNos([]);
      await refreshAttendanceData();
    } catch (error) {
      Alert.alert('Attendance Exception', error.message || 'Failed to sync modifications.');
    }
  };

  const stats = useMemo(() => {
    const total = attendanceData.length;
    const onTime = attendanceData.filter((i) => i.status === 'On Time').length;
    const absent = attendanceData.filter((i) => i.status === 'Absent').length;
    return { total, onTime, absent };
  }, [attendanceData]);

  const renderStudentItem = useCallback(({ item }) => (
    <StudentRow
      item={item}
      isSelected={selectedRollNos.includes(item.rollNo)}
      onToggle={toggleStudentSelection}
    />
  ), [selectedRollNos, toggleStudentSelection]);

  const renderClassroomItem = useCallback(({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.standardCircle}>
          <Text style={styles.standardText}>{item.standard}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.mainTitle}>Division {item.division} • {item.medium}</Text>
          <View style={styles.timeRow}>
            <MatIcon name="clock-outline" size={14} color="#666" />
            <Text style={styles.subTitle}>{item.startTime} - {item.endTime}</Text>
          </View>
        </View>
        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>{item.year}</Text>
        </View>
      </View>

      <Pressable
        android_ripple={RIPPLE_CONFIG}
        style={styles.actionButton}
        onPress={() => handleViewAttendance(item.id, `${item.standard} - ${item.division}`)}
      >
        <Text style={styles.buttonText}>View Attendance</Text>
        <MatIcon name="arrow-right" size={18} color="#fff" />
      </Pressable>
    </View>
  ), []);

  const renderEmptyState = () => (
    <View style={styles.emptyBox}>
      <MatIcon name="calendar-remove-outline" size={54} color="#ccc" />
      <Text style={styles.emptyText}>No classrooms match the selected filters.</Text>
      <Pressable style={styles.clearFiltersButton} onPress={handleClearFilters}>
        <Text style={styles.clearFiltersText}>Reset Filters</Text>
      </Pressable>
    </View>
  );

  const isAllSelected = filteredData.length > 0 && selectedRollNos.length === filteredData.length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <ClassroomFilterBar key={filterResetKey} email={user?.email} onApply={handleFilterApply} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={classrooms}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderClassroomItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={SPINNER_COLORS}
              tintColor={PRIMARY}
            />
          }
        />
      )}

      {/* Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.notchHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.headerFlex}>
                <Text style={styles.modalTitle}>{selectedClassName}</Text>
                <Text style={styles.modalSubTitle}>Class Management Matrix</Text>
              </View>

              <Pressable style={styles.closeButtonIcon} onPress={() => setIsModalVisible(false)}>
                <MatIcon name="close" size={20} color="#222" />
              </Pressable>
            </View>

            {/* Micro Dashboard Statistics Tracker */}
            <View style={styles.statsBar}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.total}</Text>
                <Text style={styles.statSub}>Total Enrolled</Text>
              </View>
              <View style={styles.dividerLine} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: SUCCESS }]}>{stats.onTime}</Text>
                <Text style={styles.statSub}>Present</Text>
              </View>
              <View style={styles.dividerLine} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: DANGER }]}>{stats.absent}</Text>
                <Text style={styles.statSub}>Absent</Text>
              </View>
            </View>

            {/* Timeframe Horizontal Scrollable Row */}
            <View style={styles.pillScrollerContainer}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={TIMEFRAME_OPTIONS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isActive = activeTimeFrame === item.id;
                  return (
                    <Pressable
                      onPress={() => handleTimeframeChange(item.id)}
                      style={[styles.pillChip, isActive && styles.pillChipActive]}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            {/* Status Segmented Segment Controls */}
            <View style={styles.segmentedContainer}>
              {STATUS_OPTIONS.map((opt) => {
                const isActive = activeStatus === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleStatusChange(opt.id)}
                    style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                  >
                    <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Inline Selection Utility Controller */}
            <View style={styles.utilityActionHeader}>
              <Pressable style={styles.selectAllContainer} onPress={handleSelectAll}>
                <MatIcon
                  name={isAllSelected ? 'checkbox-marked-circle' : 'minus-circle-outline'}
                  size={20}
                  color={PRIMARY}
                />
                <Text style={styles.selectAllText}>
                  {isAllSelected ? 'Deselect All Logs' : 'Select Group Spectrum'}
                </Text>
              </Pressable>
            </View>

            {/* Inner List Area */}
            {modalLoading ? (
              <View style={styles.modalLoaderContainer}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.loadingDataText}>Syncing records...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredData}
                renderItem={renderStudentItem}
                keyExtractor={(item) => `${item.rollNo}-${item.date}`}
                contentContainerStyle={styles.modalListPadding}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MatIcon name="account-search-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>No logs match current filters.</Text>
                  </View>
                }
              />
            )}

            {/* Sticky Floating Action Control Module */}
            {selectedRollNos.length > 0 && (
              <View style={styles.floatingActionContainer}>
                <Pressable
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  style={styles.floatingActionButton}
                  onPress={handleMarkAttendance}
                >
                  <Text style={styles.floatingActionText}>
                    Mark {selectedRollNos.length} Selected Student{selectedRollNos.length > 1 ? 's' : ''}
                  </Text>
                  <MatIcon name="check-all" size={18} color="#fff" />
                </Pressable>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#edf2f7' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  standardCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  standardText: { color: PRIMARY, fontSize: 15, fontWeight: 'bold' },
  headerText: { marginLeft: 12, flex: 1 },
  mainTitle: { fontSize: 15, color: '#1a1a2e', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  subTitle: { fontSize: 12, color: '#666' },
  yearBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  yearText: { fontSize: 10, color: '#777', fontWeight: 'bold' },
  actionButton: { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyText: { color: '#777', textAlign: 'center', marginTop: 10, fontSize: 13 },
  clearFiltersButton: { marginTop: 15, backgroundColor: '#ede9ff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  clearFiltersText: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
  
  // Bottom Sheet Modal Layout
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,10,20,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_HEIGHT * 0.88, paddingHorizontal: 20, paddingTop: 8, pb: 0 },
  notchHandle: { width: 38, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerFlex: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  modalSubTitle: { fontSize: 12, color: '#777', marginTop: 1 },
  closeButtonIcon: { backgroundColor: '#f1f3f9', p: 8, borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  
  // Bento Grid Info Stats Top Rail Layouts
  statsBar: { flexDirection: 'row', backgroundColor: SURFACE_BG, borderRadius: 14, paddingVertical: 12, marginBottom: 14, alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '700', color: '#111' },
  statSub: { fontSize: 11, color: '#718096', marginTop: 1 },
  dividerLine: { width: 1, height: 24, backgroundColor: '#e2e8f0' },
  
  // Clean Pill Horizontal Scrollers 
  pillScrollerContainer: { marginBottom: 12 },
  pillChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: SURFACE_BG, marginRight: 8, borderWidth: 1, borderColor: '#edf2f7' },
  pillChipActive: { backgroundColor: '#ede9ff', borderColor: '#7b68ee44' },
  pillText: { fontSize: 12, color: '#4a5568', fontWeight: '500' },
  pillTextActive: { color: PRIMARY, fontWeight: '700' },

  // Segmented Bar Control Systems
  segmentedContainer: { flexDirection: 'row', backgroundColor: SURFACE_BG, borderRadius: 10, padding: 3, marginBottom: 14 },
  segmentTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  segmentLabel: { fontSize: 12, color: '#718096', fontWeight: '500' },
  segmentLabelActive: { color: PRIMARY, fontWeight: '700' },

  // Inline List Utility Row Headers
  utilityActionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginBottom: 8 },
  selectAllContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 12, color: '#4a5568', fontWeight: '600' },

  // Student Borderless Compact List
  studentCard: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f7fafc', marginBottom: 2 },
  studentCardSelected: { backgroundColor: '#fcfbfe' },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  rollNoText: { fontSize: 13, fontWeight: '700', color: '#718096', width: 32, marginLeft: 10, textAlign: 'center' },
  flexTextContainer: { flex: 1, marginLeft: 8 },
  studentNameText: { fontSize: 14, fontWeight: '600', color: '#1a202c' },
  dateLabel: { fontSize: 11, color: '#a0aec0', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  presentDetailsRow: { flexDirection: 'row', marginTop: 10, paddingLeft: 42, justifyContent: 'flex-start', gap: 20 },
  detailBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailValue: { fontSize: 11, color: '#718096' },
  workingMinsText: { color: PRIMARY, fontWeight: '600' },
  
  modalLoaderContainer: { py: 40, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingDataText: { fontSize: 12, color: '#718096' },
  modalListPadding: { paddingBottom: 100 },

  // Contextual Floating Action Buttons
  floatingActionContainer: { position: 'absolute', bottom: 24, left: 20, right: 20, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 8 },
  floatingActionButton: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  floatingActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default TeacherAttendance;