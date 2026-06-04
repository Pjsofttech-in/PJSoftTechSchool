import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, SafeAreaView, Modal, Dimensions, RefreshControl, StatusBar } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { ClassroomFilterBar } from '@components/ClassroomFilterBar';
import { applyClassroomFilters } from '@utils/classroomFilterUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#7b68ee';
const SUCCESS = '#4caf50';
const DANGER = '#f44336';

const RIPPLE_CONFIG = { color: 'rgba(123, 104, 238, 0.15)', borderless: false };
const CIRCLE_RIPPLE = { borderless: true, radius: 20 };
const SPINNER_COLORS = [PRIMARY];

const TIMEFRAME_LABELS = {
  today: 'Today',
  '7days': '7 Days',
  '30days': '30 Days',
  '365days': 'Year',
};

export const TeacherAttendance = () => {
  const user = useAuthStore((state) => state.user);

  // Core Data States
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Selection Contexts
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [activeTimeFrame, setActiveTimeFrame] = useState('today');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeFilters, setActiveFilters] = useState({});
  const [filterResetKey, setFilterResetKey] = useState(0);

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
    setFilterResetKey(prev => prev + 1);
  };

  const handleViewAttendance = async (classId, className, timeFrame = 'today') => {
    setIsModalVisible(true);
    setModalLoading(true);
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setActiveTimeFrame(timeFrame);
    setActiveStatus('All');
    setShowTimeDropdown(false);

    try {
      const res = await teacherApi.getAttendanceByClass(classId, timeFrame);
      const data = res.content || [];
      setAttendanceData(data);
      setFilteredData(data);
    } catch (err) {
      console.error('[AttendanceDetails] Fetch Error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const filterByStatus = (status) => {
    const filtered = status === 'All' 
      ? attendanceData 
      : attendanceData.filter((i) => i.status === status);
    
    setActiveStatus(status);
    setFilteredData(filtered);
    setShowStatusDropdown(false);
  };

  const stats = useMemo(() => {
    const total = attendanceData.length;
    const onTime = attendanceData.filter((i) => i.status === 'On Time').length;
    const absent = attendanceData.filter((i) => i.status === 'Absent').length;
    return { total, onTime, absent };
  }, [attendanceData]);

  const renderStudentItem = useCallback(({ item }) => {
    const isOnTime = item.status === 'On Time';
    return (
      <View style={styles.studentCard}>
        <View style={styles.cardMain}>
          <Text style={styles.rollNoText}>{item.rollNo}</Text>
          <View style={styles.flexTextContainer}>
            <Text style={styles.studentNameText}>{item.studentName}</Text>
            <Text style={styles.dateLabel}>{item.date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isOnTime ? '#e8f5e9' : '#ffebee' }]}>
            <Text style={[styles.statusText, { color: isOnTime ? SUCCESS : DANGER }]}>{item.status}</Text>
          </View>
        </View>
        {isOnTime && (
          <View style={styles.presentDetailsRow}>
            <View style={styles.detailBox}>
              <MatIcon name="login" size={14} color="#666" />
              <Text style={styles.detailValue}>In: {item.loginTime || '--:--'}</Text>
            </View>
            <View style={styles.detailBox}>
              <MatIcon name="logout" size={14} color="#666" />
              <Text style={styles.detailValue}>Out: {item.logoutTime || '--:--'}</Text>
            </View>
            <View style={styles.detailBox}>
              <MatIcon name="clock-outline" size={14} color={PRIMARY} />
              <Text style={[styles.detailValue, styles.workingMinsText]}>
                {item.workingMinutes}m
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }, []);

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
        <MatIcon name="chevron-right" size={20} color="#fff" />
      </Pressable>
    </View>
  ), []);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyBox}>
      <MatIcon name="calendar-remove-outline" size={60} color="#ccc" />
      <Text style={styles.emptyText}>No classrooms match the selected filters.</Text>
      <Pressable 
        android_ripple={RIPPLE_CONFIG} 
        style={styles.clearFiltersButton} 
        onPress={handleClearFilters}
      >
        <Text style={styles.clearFiltersText}>Reset Filters</Text>
      </Pressable>
    </View>
  ), [allClassrooms]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f4f7ff" barStyle="dark-content" />
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
              progressBackgroundColor="#fff"
            />
          }
        />
      )}

      {/* Attendance Detail Modal Sheet */}
      <Modal animationType="slide" transparent visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.headerFlex}>
                <Text style={styles.modalTitle}>{selectedClassName}</Text>
                
                <View style={styles.filtersRow}>
                  {/* Timeframe Selector */}
                  <View style={styles.dropdownWrapper}>
                    <Pressable 
                      android_ripple={RIPPLE_CONFIG}
                      style={styles.dropdownChip} 
                      onPress={() => {
                        setShowTimeDropdown(!showTimeDropdown);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={styles.chipLabel}>Time: </Text>
                      <Text style={styles.chipValue}>{TIMEFRAME_LABELS[activeTimeFrame]}</Text>
                      <MatIcon name="menu-down" size={16} color={PRIMARY} />
                    </Pressable>
                    {showTimeDropdown && (
                      <View style={styles.dropdownMenu}>
                        {Object.keys(TIMEFRAME_LABELS).map((key) => (
                          <Pressable 
                            key={key} 
                            android_ripple={RIPPLE_CONFIG}
                            style={styles.menuItem} 
                            onPress={() => handleViewAttendance(selectedClassId, selectedClassName, key)}
                          >
                            <Text style={[
                              styles.menuItemText, 
                              activeTimeFrame === key && styles.selectedMenuText
                            ]}>
                              {TIMEFRAME_LABELS[key]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Status Filter */}
                  <View style={styles.dropdownWrapper}>
                    <Pressable 
                      android_ripple={RIPPLE_CONFIG}
                      style={[styles.dropdownChip, styles.marginLeftChip]} 
                      onPress={() => {
                        setShowStatusDropdown(!showStatusDropdown);
                        setShowTimeDropdown(false);
                      }}
                    >
                      <Text style={styles.chipLabel}>Status: </Text>
                      <Text style={styles.chipValue}>{activeStatus}</Text>
                      <MatIcon name="menu-down" size={16} color={PRIMARY} />
                    </Pressable>
                    {showStatusDropdown && (
                      <View style={[styles.dropdownMenu, styles.statusMenuOffset]}>
                        {['All', 'On Time', 'Absent'].map((status) => (
                          <Pressable 
                            key={status} 
                            android_ripple={RIPPLE_CONFIG}
                            style={styles.menuItem} 
                            onPress={() => filterByStatus(status)}
                          >
                            <Text style={[
                              styles.menuItemText, 
                              activeStatus === status && styles.selectedMenuText
                            ]}>
                              {status}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <Pressable 
                android_ripple={CIRCLE_RIPPLE}
                style={styles.closeBtnPadding}
                onPress={() => {
                  setIsModalVisible(false);
                  setShowTimeDropdown(false);
                  setShowStatusDropdown(false);
                }}
              >
                <MatIcon name="close-circle" size={32} color="#bbb" />
              </Pressable>
            </View>

            {/* Dashboard Aggregates */}
            <View style={styles.statsBar}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.total}</Text>
                <Text style={styles.statSub}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: SUCCESS }]}>{stats.onTime}</Text>
                <Text style={styles.statSub}>On Time</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: DANGER }]}>{stats.absent}</Text>
                <Text style={styles.statSub}>Absent</Text>
              </View>
            </View>

            {modalLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : (
              <FlatList 
                data={filteredData} 
                renderItem={renderStudentItem} 
                keyExtractor={(item, index) => index.toString()} 
                contentContainerStyle={styles.modalListPadding} 
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MatIcon name="account-search-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No registration data logs found matching this group filter criteria.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 1.5, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  standardCircle: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  standardText: { color: PRIMARY, fontFamily: 'Poppins-Medium', fontSize: 15, fontWeight: 'bold' },
  headerText: { marginLeft: 12, flex: 1 },
  mainTitle: { fontSize: 15, fontFamily: 'Poppins-Medium', color: '#1a1a2e', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  subTitle: { fontSize: 12, color: '#666', fontFamily: 'Poppins-Regular' },
  yearBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  yearText: { fontSize: 10, color: '#777', fontWeight: 'bold' },
  
  actionButton: { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8, overflow: 'hidden' },
  buttonText: { fontFamily: 'Poppins-SemiBold', color: '#fff', fontSize: 14 },
  
  // Empty UI States
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontFamily: 'Poppins-Regular', color: '#666', textAlign: 'center', marginTop: 10, fontSize: 14 },
  clearFiltersButton: { marginTop: 15, backgroundColor: '#ede9ff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
  clearFiltersText: { fontFamily: 'Poppins-SemiBold', color: PRIMARY, fontSize: 13 },
  
  // Modal Base Layers
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: SCREEN_HEIGHT * 0.85, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  headerFlex: { flex: 1 },
  modalTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 20, color: '#1a1a2e' },
  filtersRow: { flexDirection: 'row', marginTop: 12 },
  dropdownWrapper: { zIndex: 2000 },
  dropdownChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#7b68ee33', overflow: 'hidden' },
  marginLeftChip: { marginLeft: 10 },
  chipLabel: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555' },
  chipValue: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: PRIMARY, marginRight: 2 },
  dropdownMenu: { position: 'absolute', top: 42, left: 0, backgroundColor: '#fff', borderRadius: 12, width: 140, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, paddingVertical: 5, zIndex: 3000 },
  statusMenuOffset: { left: 10 },
  menuItem: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0', overflow: 'hidden' },
  menuItemText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#333' },
  selectedMenuText: { color: PRIMARY, fontFamily: 'Poppins-SemiBold' },
  closeBtnPadding: { padding: 4, borderRadius: 20 },
  
  // Statistics Panel
  statsBar: { flexDirection: 'row', backgroundColor: '#f8f9fe', borderRadius: 15, padding: 15, marginBottom: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#1a1a2e' },
  statSub: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#777', marginTop: 2 },
  
  // Student Card Items
  studentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  rollNoText: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#777', width: 35 },
  flexTextContainer: { flex: 1, marginLeft: 10 },
  studentNameText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#1a1a2e' },
  dateLabel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#777' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusText: { fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  presentDetailsRow: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8f8f8', justifyContent: 'space-between' },
  detailBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailValue: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#555' },
  workingMinsText: { color: PRIMARY, fontFamily: 'Poppins-SemiBold' },
  modalListPadding: { paddingBottom: 40 }
});

export default TeacherAttendance;