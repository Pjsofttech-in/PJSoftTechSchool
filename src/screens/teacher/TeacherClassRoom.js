import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, SafeAreaView, Modal, Linking, Platform, StatusBar, RefreshControl, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { ClassroomFilterBar } from '@components/ClassroomFilterBar';
import { applyClassroomFilters } from '@utils/classroomFilterUtils';

const PRIMARY = '#7b68ee';
const RIPPLE_CONFIG = { color: 'rgba(123, 104, 238, 0.15)', borderless: false };

export const TeacherClassRoom = () => {
  const user = useAuthStore((state) => state.user);

  // Core Data States
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [notices, setNotices] = useState([]);

  // Form input states
  const [noticeName, setNoticeName] = useState('');
  const [noticeDescription, setNoticeDescription] = useState('');

  // UI Loading and Modal States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [isNotifyModalVisible, setIsNotifyModalVisible] = useState(false);

  // Selected Class details tracker
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  // Fetch Classrooms - decoupled from local filtering
  const fetchClassrooms = useCallback(async (isSwiping = false) => {
    if (isSwiping) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      if (!user?.id || !user?.email) return;
      const data = await teacherApi.getClassRooms(user.id, user.email);
      setAllClassrooms(data);
    } catch (err) {
      console.error('[ClassRoomHub] Fetch Error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchClassrooms(false);
  }, [fetchClassrooms]);

  // Derived filtered classrooms computed safely via useMemo
  const classrooms = useMemo(() => {
    return applyClassroomFilters(allClassrooms, activeFilters);
  }, [allClassrooms, activeFilters]);

  const handleRefresh = () => {
    fetchClassrooms(true);
  };

  const handleFilterApply = (filters) => {
    setActiveFilters(filters);
  };

  // Student details modal fetch
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

  // Timetable schedule details fetch
  const fetchTimetable = async (classId, className) => {
    setIsScheduleModalVisible(true);
    setModalLoading(true);
    setSelectedClassName(className);
    setTimetable([]);
    try {
      const data = await teacherApi.getTimeTableByClassId(user.email, classId);
      const sortedData = data.map(day => ({
        ...day,
        scheduledPeriods: [...day.scheduledPeriods].sort((a, b) => a.periodNo - b.periodNo)
      }));
      setTimetable(sortedData);
    } catch (err) {
      console.error('Fetch Timetable Error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Notification history modal
  const fetchNotificationHistory = async (classId, className) => {
    setIsNotifyModalVisible(true);
    setModalLoading(true);
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setNoticeName('');
    setNoticeDescription('');
    setNotices([]);
    try {
      const data = await teacherApi.getNotificationsByClassRoom(user.email, classId);
      if (Array.isArray(data)) {
        // Sort chronologically
        const sortedNotices = [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          if (dateB - dateA !== 0) return dateB - dateA;
          return b.id - a.id; 
        });
        setNotices(sortedNotices);
      } else {
        setNotices([]);
      }
    } catch (err) {
      console.error('Fetch Notices Error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Submit Notice Event & Instant History Refresh
  const handleReleaseNotice = async () => {
    if (!noticeName.trim() || !noticeDescription.trim()) {
      Alert.alert('Validation Error', 'Please input a Title and Description.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        classRoomId: selectedClassId,
        noticeName: noticeName.trim(),
        noticeDescription: noticeDescription.trim()
      };

      const responseObj = await teacherApi.createNotification(user.email, payload);
      
      // Prepends the new notice
      setNotices((prevNotices) => [responseObj, ...prevNotices]);
      setNoticeName('');
      setNoticeDescription('');
      Alert.alert('Success', 'Notice posted successfully!');
    } catch (err) {
      console.error('Release Notice Error:', err);
      Alert.alert('Error', 'Failed to publish notice. Please try again.');
    } finally {
      setActionLoading(false);
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

  // render items useCallback references
  const renderClassItem = useCallback(({ item }) => (
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
        {renderActionButton('bell-ring-outline', 'Notify', '#FF6B6B', () => fetchNotificationHistory(item.id, `${item.standard}-${item.division}`))}
        {renderActionButton('calendar-clock-outline', 'Schedule', '#4ECDC4', () => fetchTimetable(item.id, `${item.standard}-${item.division}`))}
        {renderActionButton('account-group-outline', 'Students', PRIMARY, () => fetchStudents(item.id, `${item.standard}-${item.division}`))}
      </View>
    </View>
  ), [allClassrooms]);

  const renderStudentItem = useCallback(({ item }) => (
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
  ), []);

  const renderNoticeItem = useCallback(({ item }) => (
    <View style={styles.noticeCard}>
      <View style={styles.noticeHeaderRow}>
        <Text style={styles.noticeItemTitle} numberOfLines={1}>{item.noticeName}</Text>
        <Text style={styles.noticeDate}>{item.createdAt}</Text>
      </View>
      <Text style={styles.noticeItemDesc}>{item.noticeDescription}</Text>
      <View style={styles.noticeFooterInfo}>
        <MatIcon name="account-circle-outline" size={12} color="#888" />
        <Text style={styles.noticeAuthorText}>{item.createdByEmail} ({item.role})</Text>
      </View>
    </View>
  ), []);

  const renderDayItem = useCallback(({ item }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <MatIcon name="calendar-today" size={16} color={PRIMARY} />
        <Text style={styles.dayHeaderText}>{item.dayOfWeek}</Text>
      </View>
      
      {item.scheduledPeriods.map((period, index) => (
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
  ), []);

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

      {/* Notice Release and History Modal Layout */}
      <Modal animationType="slide" visible={isNotifyModalVisible} onRequestClose={() => setIsNotifyModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.fullscreenModalContainer}
        >
          <View style={styles.androidActionBar}>
            <Pressable android_ripple={{ borderless: true, radius: 24 }} style={styles.actionIconPadding} onPress={() => setIsNotifyModalVisible(false)}>
              <MatIcon name="arrow-left" size={24} color="#1a1a2e" />
            </Pressable>
            <Text style={styles.actionBarTitle}>Class Notices: {selectedClassName}</Text>
          </View>

          {/* Form Structure Container at top view */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionHeading}>Release New Notice</Text>
            <TextInput 
              style={styles.inputField}
              placeholder="Notice Title (e.g., Today Activity)"
              placeholderTextColor="#999"
              value={noticeName}
              onChangeText={setNoticeName}
            />
            <TextInput 
              style={[styles.inputField, styles.textAreaField]}
              placeholder="Write notice descriptions details here..."
              placeholderTextColor="#999"
              value={noticeDescription}
              onChangeText={setNoticeDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <Pressable 
              style={[styles.submitButton, actionLoading && styles.disabledButton]} 
              onPress={handleReleaseNotice}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MatIcon name="send" size={16} color="#fff" />
                  <Text style={styles.submitButtonText}>Publish Notice</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.historySectionDivider}>
            <Text style={styles.sectionHeading}>Notice History Log</Text>
          </View>

          {modalLoading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
          ) : (
            <FlatList
              data={notices}
              renderItem={renderNoticeItem}
              keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
              ListEmptyComponent={() => renderEmptyState('bell-off-outline', 'No notifications posted to this classroom yet.')}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            />
          )}
        </KeyboardAvoidingView>
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
  standardText: { color: PRIMARY, fontFamily: 'Poppins-SemiBold', fontSize: 15, fontWeight: '600' },
  headerText: { marginLeft: 12, flex: 1 },
  mainTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: '#1a1a2e', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  subTitle: { fontSize: 12, color: '#666', fontFamily: 'Poppins-Regular', fontWeight: '400' },
  yearBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  yearText: { fontSize: 10, color: '#777', fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  grid: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, backgroundColor: '#fff', overflow: 'hidden' },
  actionLabel: { fontSize: 12, fontFamily: 'Poppins-Regular', fontWeight: '500', marginLeft: 6 },
  fullscreenModalContainer: { flex: 1, backgroundColor: '#f4f5f9' },
  androidActionBar: { height: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', backgroundColor: '#fff', elevation: 2, paddingHorizontal: 4 },
  actionIconPadding: { padding: 12, borderRadius: 24 },
  actionBarTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', fontWeight: '600', color: '#1a1a2e', marginLeft: 8 },
  studentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 1 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontFamily: 'Poppins-SemiBold', fontWeight: '600', fontSize: 15 },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 14, fontFamily: 'Poppins-SemiBold', fontWeight: '600', color: '#1a1a2e' },
  studentSub: { fontSize: 11, color: '#777', fontFamily: 'Poppins-Regular', fontWeight: '400', marginTop: 2 },
  callButtonContainer: { padding: 8, borderRadius: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { marginTop: 12, color: '#777', fontSize: 14, fontFamily: 'Poppins-Regular', fontWeight: '400', textAlign: 'center' },
  dayCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 14, overflow: 'hidden', elevation: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdfbfe', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8 },
  dayHeaderText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', fontWeight: '600', color: PRIMARY },
  periodRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  periodTimeBox: { width: 65, alignItems: 'flex-start' },
  periodTimeText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', fontWeight: '600', color: '#1a1a2e' },
  periodTimeSub: { fontSize: 11, color: '#777', fontFamily: 'Poppins-Regular', fontWeight: '400', marginTop: 1 },
  periodInfo: { flex: 1, marginLeft: 10 },
  periodSubject: { fontSize: 13, fontFamily: 'Poppins-SemiBold', fontWeight: '600', color: '#333' },
  periodTeacher: { fontSize: 11, color: '#666', fontFamily: 'Poppins-Regular', fontWeight: '400', marginTop: 2 },
  periodNumberBadge: { backgroundColor: '#ede9ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  periodNumberText: { fontSize: 11, color: PRIMARY, fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  
  // Notice Modal Layout Items
  formContainer: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', elevation: 1 },
  sectionHeading: { fontSize: 13, fontFamily: 'Poppins-SemiBold', fontWeight: '600', color: '#444', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputField: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#333', fontFamily: 'Poppins-Regular', fontSize: 14, fontWeight: '400', marginBottom: 10 },
  textAreaField: { height: 80, paddingVertical: 10, textAlignVertical: 'top' },
  submitButton: { backgroundColor: PRIMARY, height: 44, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4, elevation: 1 },
  disabledButton: { backgroundColor: '#bcaaa4' },
  submitButtonText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  historySectionDivider: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  noticeCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#FF6B6B' },
  noticeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noticeItemTitle: { fontSize: 14, fontFamily: 'Poppins-SemiBold', fontWeight: '600', color: '#1a1a2e', flex: 1, marginRight: 10 },
  noticeDate: { fontSize: 11, color: '#999', fontFamily: 'Poppins-Regular', fontWeight: '400' },
  noticeItemDesc: { fontSize: 13, color: '#555', fontFamily: 'Poppins-Regular', fontWeight: '400', lineHeight: 18, marginBottom: 8 },
  noticeFooterInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 6 },
  noticeAuthorText: { fontSize: 11, color: '#888', fontFamily: 'Poppins-Regular', fontWeight: '400', fontStyle: 'italic' }
});

export default TeacherClassRoom;