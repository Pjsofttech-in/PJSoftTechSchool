import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, SafeAreaView, Modal, Linking, Platform, StatusBar, RefreshControl } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { ClassroomFilterBar } from '@components/ClassroomFilterBar';
import { applyClassroomFilters } from '@utils/classroomFilterUtils';

const PRIMARY = '#7b68ee';
const RIPPLE_CONFIG = { color: 'rgba(123, 104, 238, 0.15)', borderless: false };

export const TeacherClassRoom = () => {
  const user = useAuthStore((state) => state.user);

  // Component States
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  const fetchClassrooms = useCallback(async (isSwiping = false) => {
    if (isSwiping) {
      setIsRefreshing(true);
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
      console.error('[ClassRoomHub] Fetch Error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, user?.email, activeFilters]);

  useEffect(() => {
    fetchClassrooms(false);
  }, [fetchClassrooms]);

  const handleRefresh = () => {
    fetchClassrooms(true);
  };

  const handleFilterApply = (filters) => {
    const filtered = applyClassroomFilters(allClassrooms, filters);
    setActiveFilters(filters);
    setClassrooms(filtered);
  };

  const fetchStudents = async (classId, className) => {
    setIsStudentModalVisible(true);
    setModalLoading(true);
    setSelectedClassName(className);
    setStudents([]);
    try {
      const data = await teacherApi.getStudentsByClass(user.email, classId);
      setStudents(data);
    } catch (err) {
      console.error('Fetch Students Error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchTimetable = async (classId, className) => {
    setIsScheduleModalVisible(true);
    setModalLoading(true);
    setSelectedClassName(className);
    setTimetable([]);
    try {
      const data = await teacherApi.getTimeTableByClassId(user.email, classId);
      setTimetable(data);
    } catch (err) {
      console.error('Fetch Timetable Error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const makeCall = (phoneNumber) => {
    if (!phoneNumber) {
      alert('Contact number not available for this student');
      return;
    }
    const url = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    Linking.openURL(url).catch((err) => console.error("Couldn't open dialer", err));
  };

  const renderActionButton = (icon, label, color, onPress) => (
    <Pressable 
      android_ripple={RIPPLE_CONFIG} 
      style={[styles.actionBtn, { borderColor: color + '33' }]} 
      onPress={onPress}
    >
      <MatIcon name={icon} size={20} color={color} />
      <Text style={[styles.actionLabel, { color: color }]}>{label}</Text>
    </Pressable>
  );

  const renderClassItem = ({ item }) => (
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

      <View style={styles.grid}>
        {renderActionButton('numeric-positive-1', 'Marks', '#FF6B6B', () => console.log('Marks', item.id))}
        {renderActionButton('calendar-clock', 'Schedule', '#4ECDC4', () => fetchTimetable(item.id, `${item.standard}-${item.division}`))}
        {renderActionButton('account-group', 'Students', PRIMARY, () => fetchStudents(item.id, `${item.standard}-${item.division}`))}
      </View>
    </View>
  );

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentAvatar}>
        <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.fullName}</Text>
        <Text style={styles.studentSub}>Roll No: {item.rollNo}  •  {item.gender}</Text>
      </View>
      <Pressable 
        android_ripple={{ borderless: true, radius: 20 }} 
        style={styles.callButtonContainer} 
        onPress={() => makeCall(item.contact)}
      >
        <MatIcon name="phone-outline" size={22} color={item.contact ? '#4caf50' : '#ccc'} />
      </Pressable>
    </View>
  );

  const renderDayItem = ({ item }) => {
    const sortedPeriods = [...item.scheduledPeriods].sort((a, b) => a.periodNo - b.periodNo);

    return (
      <View style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <MatIcon name="calendar-today" size={16} color={PRIMARY} />
          <Text style={styles.dayHeaderText}>{item.dayOfWeek}</Text>
        </View>
        
        {sortedPeriods.map((period, index) => (
          <View key={period.id || index} style={styles.periodRow}>
            <View style={styles.periodTimeBox}>
              <Text style={styles.periodTimeText}>{period.startTime}</Text>
              <Text style={styles.periodTimeSub}>{period.endTime}</Text>
            </View>
            <View style={styles.periodInfo}>
              <Text style={styles.periodSubject}>{period.subjectName}</Text>
              <Text style={styles.periodTeacher}>Teacher: {period.teacherName}</Text>
            </View>
            <View style={styles.periodNumberBadge}>
              <Text style={styles.periodNumberText}>P{period.periodNo}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderEmptyState = (icon, message) => (
    <View style={styles.emptyContainer}>
      <MatIcon name={icon} size={64} color="#bbb" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f4f5f9" barStyle="dark-content" />
      <ClassroomFilterBar email={user?.email} onApply={handleFilterApply} />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList
          data={classrooms}
          renderItem={renderClassItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmptyState('google-classroom', 'No classrooms match the selected filters.')}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              colors={[PRIMARY]}
              progressBackgroundColor="#fff"
            />
          }
        />
      )}

      {/* Student List Modal Layout */}
      <Modal animationType="slide" visible={isStudentModalVisible} onRequestClose={() => setIsStudentModalVisible(false)}>
        <View style={styles.fullscreenModalContainer}>
          <View style={styles.androidActionBar}>
            <Pressable android_ripple={{ borderless: true, radius: 24 }} style={styles.actionIconPadding} onPress={() => setIsStudentModalVisible(false)}>
              <MatIcon name="arrow-left" size={24} color="#1a1a2e" />
            </Pressable>
            <Text style={styles.actionBarTitle}>Students: {selectedClassName}</Text>
          </View>

          {modalLoading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
          ) : (
            <FlatList
              data={students}
              renderItem={renderStudentItem}
              ListEmptyComponent={() => renderEmptyState('account-search-outline', 'No students found in this class')}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 16 }}
            />
          )}
        </View>
      </Modal>

      {/* Schedule Modal Layout */}
      <Modal animationType="slide" visible={isScheduleModalVisible} onRequestClose={() => setIsScheduleModalVisible(false)}>
        <View style={styles.fullscreenModalContainer}>
          <View style={styles.androidActionBar}>
            <Pressable android_ripple={{ borderless: true, radius: 24 }} style={styles.actionIconPadding} onPress={() => setIsScheduleModalVisible(false)}>
              <MatIcon name="arrow-left" size={24} color="#1a1a2e" />
            </Pressable>
            <Text style={styles.actionBarTitle}>Schedule: {selectedClassName}</Text>
          </View>

          {modalLoading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
          ) : (
            <FlatList
              data={timetable}
              renderItem={renderDayItem}
              ListEmptyComponent={() => renderEmptyState('calendar-remove-outline', 'No schedule created for this class yet.')}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={{ padding: 16 }}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  standardCircle: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  standardText: { color: PRIMARY, fontFamily: 'Poppins-Medium', fontSize: 15, fontWeight: 'bold' },
  headerText: { marginLeft: 12, flex: 1 },
  mainTitle: { fontSize: 15, fontFamily: 'Poppins-Medium', color: '#1a1a2e', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  subTitle: { fontSize: 12, color: '#666', fontFamily: 'Poppins-Regular' },
  yearBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  yearText: { fontSize: 10, color: '#777', fontWeight: 'bold' },
  grid: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, backgroundColor: '#fff', overflow: 'hidden' },
  actionLabel: { fontSize: 12, fontWeight: '500', marginLeft: 6 },
  fullscreenModalContainer: { flex: 1, backgroundColor: '#f4f5f9' },
  androidActionBar: { height: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', backgroundColor: '#fff', elevation: 2, paddingHorizontal: 4 },
  actionIconPadding: { padding: 12, borderRadius: 24 },
  actionBarTitle: { fontSize: 18, fontWeight: '500', color: '#1a1a2e', marginLeft: 8 },
  studentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 1 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  studentSub: { fontSize: 11, color: '#777', marginTop: 2 },
  callButtonContainer: { padding: 8, borderRadius: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { marginTop: 12, color: '#777', fontSize: 14, textAlign: 'center' },
  dayCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 14, overflow: 'hidden', elevation: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdfbfe', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8 },
  dayHeaderText: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  periodRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  periodTimeBox: { width: 65, alignItems: 'flex-start' },
  periodTimeText: { fontSize: 12, fontWeight: 'bold', color: '#1a1a2e' },
  periodTimeSub: { fontSize: 11, color: '#777', marginTop: 1 },
  periodInfo: { flex: 1, marginLeft: 10 },
  periodSubject: { fontSize: 13, fontWeight: '600', color: '#333' },
  periodTeacher: { fontSize: 11, color: '#666', marginTop: 2 },
  periodNumberBadge: { backgroundColor: '#ede9ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  periodNumberText: { fontSize: 11, color: PRIMARY, fontWeight: 'bold' },
});

export default TeacherClassRoom;