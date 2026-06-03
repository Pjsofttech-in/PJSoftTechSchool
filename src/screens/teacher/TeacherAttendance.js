import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Dimensions, RefreshControl } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { ClassroomFilterBar } from '@components/ClassroomFilterBar';
import { applyClassroomFilters } from '@utils/classroomFilterUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#7b68ee';
const SUCCESS = '#4caf50';
const DANGER = '#f44336';

const TIMEFRAME_LABELS = {
  today: 'Today',
  '7days': '7 Days',
  '30days': '30 Days',
  '365days': 'Year',
};

export const TeacherAttendance = () => {
  const user = useAuthStore((state) => state.user);

  const [allClassrooms, setAllClassrooms] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [activeTimeFrame, setActiveTimeFrame] = useState('today');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeFilters, setActiveFilters] = useState({});
  const [filterResetKey, setFilterResetKey] = useState(0);

  // direct loads and pulled refreshes seamlessly
  const fetchClassrooms = useCallback(async (isARefreshCall = false) => {
    if (isARefreshCall) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await teacherApi.getClassRooms(user.id, user.email);
      const filtered = applyClassroomFilters(data, activeFilters);
      setAllClassrooms(data);
      setClassrooms(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id, user.email, activeFilters]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

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
      console.error(err);
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
          <View style={{ flex: 1, marginLeft: 10 }}>
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
              <Text style={[styles.detailValue, { color: PRIMARY, fontFamily: 'Poppins-SemiBold' }]}>
                {item.workingMinutes}m
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.subtitle}>Manage classroom presence and history</Text>
      </View>

      <ClassroomFilterBar key={filterResetKey} email={user.email} onApply={handleFilterApply} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={classrooms}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[PRIMARY]}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MatIcon name="calendar-remove-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No classrooms match the selected filters.</Text>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
                <Text style={styles.clearFiltersText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <MatIcon name="calendar-check" size={24} color={PRIMARY} />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.classTitle}>{item.standard} - {item.division}</Text>
                  <Text style={styles.classSub}>{item.medium} | {item.year}</Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <MatIcon name="clock-outline" size={14} color="#666" />
                  <Text style={styles.detailText}>{item.startTime} - {item.endTime}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MatIcon name="map-marker-outline" size={14} color="#666" />
                  <Text style={styles.detailText}>{item.branchCode}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleViewAttendance(item.id, `${item.standard} - ${item.division}`)}
              >
                <Text style={styles.buttonText}>View Attendance</Text>
                <MatIcon name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Attendance Detail Modal */}
      <Modal animationType="slide" transparent visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedClassName}</Text>
                <View style={styles.filtersRow}>
                  {/* Timeframe Dropdown */}
                  <View style={{ zIndex: 2000 }}>
                    <TouchableOpacity 
                      style={styles.dropdownChip} 
                      onPress={() => {
                        setShowTimeDropdown(!showTimeDropdown);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={styles.chipLabel}>Time: </Text>
                      <Text style={styles.chipValue}>{TIMEFRAME_LABELS[activeTimeFrame]}</Text>
                      <MatIcon name="menu-down" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    {showTimeDropdown && (
                      <View style={styles.dropdownMenu}>
                        {Object.keys(TIMEFRAME_LABELS).map((key) => (
                          <TouchableOpacity 
                            key={key} 
                            style={styles.menuItem} 
                            onPress={() => handleViewAttendance(selectedClassId, selectedClassName, key)}
                          >
                            <Text style={[
                              styles.menuItemText, 
                              activeTimeFrame === key && { color: PRIMARY, fontFamily: 'Poppins-SemiBold' }
                            ]}>
                              {TIMEFRAME_LABELS[key]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Status Dropdown */}
                  <View style={{ zIndex: 2000 }}>
                    <TouchableOpacity 
                      style={[styles.dropdownChip, { marginLeft: 10 }]} 
                      onPress={() => {
                        setShowStatusDropdown(!showStatusDropdown);
                        setShowTimeDropdown(false);
                      }}
                    >
                      <Text style={styles.chipLabel}>Status: </Text>
                      <Text style={styles.chipValue}>{activeStatus}</Text>
                      <MatIcon name="menu-down" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    {showStatusDropdown && (
                      <View style={[styles.dropdownMenu, { left: 10 }]}>
                        {['All', 'On Time', 'Absent'].map((status) => (
                          <TouchableOpacity 
                            key={status} 
                            style={styles.menuItem} 
                            onPress={() => filterByStatus(status)}
                          >
                            <Text style={[
                              styles.menuItemText, 
                              activeStatus === status && { color: PRIMARY, fontFamily: 'Poppins-SemiBold' }
                            ]}>
                              {status}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity 
                style={{ padding: 4 }}
                onPress={() => {
                  setIsModalVisible(false);
                  setShowTimeDropdown(false);
                  setShowStatusDropdown(false);
                }}
              >
                <MatIcon name="close-circle" size={32} color="#bbb" />
              </TouchableOpacity>
            </View>

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
              <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50 }} />
            ) : (
              <FlatList 
                data={filteredData} 
                renderItem={renderStudentItem} 
                keyExtractor={(item, index) => index.toString()} 
                contentContainerStyle={{ paddingBottom: 30 }} 
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
  topSection: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#fff', elevation: 2 },
  subtitle: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#666', marginTop: 4 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { marginLeft: 16 },
  classTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#1a1a2e' },
  classSub: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#666' },
  detailsRow: { flexDirection: 'row', gap: 15, marginBottom: 20, paddingLeft: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#666' },
  actionButton: { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  buttonText: { fontFamily: 'Poppins-SemiBold', color: '#fff', fontSize: 14 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontFamily: 'Poppins-Regular', color: '#666', textAlign: 'center', marginTop: 10, fontSize: 14 },
  clearFiltersButton: { marginTop: 15, backgroundColor: '#ede9ff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  clearFiltersText: { fontFamily: 'Poppins-SemiBold', color: PRIMARY, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: SCREEN_HEIGHT * 0.85, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  modalTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 20, color: '#1a1a2e' },
  filtersRow: { flexDirection: 'row', marginTop: 12 },
  dropdownChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#7b68ee33' },
  chipLabel: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#555' },
  chipValue: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: PRIMARY, marginRight: 2 },
  dropdownMenu: { position: 'absolute', top: 42, left: 0, backgroundColor: '#fff', borderRadius: 12, width: 140, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, paddingVertical: 5 },
  menuItem: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  menuItemText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#333' },
  statsBar: { flexDirection: 'row', backgroundColor: '#f8f9fe', borderRadius: 15, padding: 15, marginBottom: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#1a1a2e' },
  statSub: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#777', marginTop: 2 },
  studentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  rollNoText: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#777', width: 35 },
  studentNameText: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#1a1a2e' },
  dateLabel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#777' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusText: { fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  presentDetailsRow: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8f8f8', justifyContent: 'space-between' },
  detailBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailValue: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#555' },
});

export default TeacherAttendance;