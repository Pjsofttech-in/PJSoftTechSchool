import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, SafeAreaView, Modal, ScrollView, TouchableWithoutFeedback, StatusBar, RefreshControl, Pressable, } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dense Layout Config
const PRIMARY = '#7b68ee';
const PRIMARY_LIGHT = '#ede9ff';
const BG_LIGHT = '#f8f9fe';
const SURFACE_BG = '#ffffff';
const TEXT_DARK = '#1a1a2e';
const TEXT_MID = '#555577';
const TEXT_LIGHT = '#9999bb';
const CARD_BORDER = '#edf2f7';

const NOTICE_CARD_WIDTH = SCREEN_WIDTH * 0.78;
const GRID_GAP = 8;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 40 - GRID_GAP) / 2;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

const formatTime = (timeString) => {
  if (!timeString) return '09:00';
  return timeString.substring(0, 5);
};

export const TeacherDashboard = ({ navigation }) => {
  // Reactive Zustand Selector
  const user = useAuthStore((state) => state.user);

  // Functional Component State
  const [notices, setNotices] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [teacherName, setTeacherName] = useState('Faculty');
  const [nextClass, setNextClass] = useState(null);
  const [activeTab, setActiveTab] = useState('classes');

  // Logic state setting side-effects
  const calculateNextUpcomingClass = useCallback((currentClassrooms) => {
    if (!currentClassrooms || currentClassrooms.length === 0) return;
    
    const workingSet = currentClassrooms.filter(c => c.year === '2026-27').length > 0 
      ? currentClassrooms.filter(c => c.year === '2026-27') 
      : currentClassrooms;

    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    let nextUp = null;
    let minDiff = Infinity;

    workingSet.forEach(classroom => {
      if (!classroom.startTime) return;
      const [sh, sm] = classroom.startTime.split(':').map(Number);
      const diff = (sh * 60 + sm) - currentTimeInMinutes;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        nextUp = classroom;
      }
    });

    setNextClass(nextUp || workingSet[0]);
  }, []);

  const fetchNotices = useCallback(async (email) => {
    if (!email) return;
    try {
      const data = await teacherApi.getNotifications(email);
      setNotices(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  }, []);

  const fetchClassroomStructures = useCallback(async (id, email) => {
    if (!id || !email) return;
    try {
      const classData = await teacherApi.getClassRooms(id, email);
      const sanitizedClasses = Array.isArray(classData) ? classData : [];
      setClassrooms(sanitizedClasses);
      calculateNextUpcomingClass(sanitizedClasses);
      return sanitizedClasses;
    } catch (err) {
      console.error('Error fetching classrooms:', err);
    }
  }, [calculateNextUpcomingClass]);

  const fetchExams = useCallback(async (email, teacherId, currentClassrooms) => {
    if (!email || !teacherId) return;
    try {
      if (!currentClassrooms || currentClassrooms.length === 0) return;
      const examData = await teacherApi.getExamByClassId(email, currentClassrooms[0].id);
      setExams(Array.isArray(examData) ? examData : []);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      if (user?.name || user?.teacherName) {
        setTeacherName(user.name || user.teacherName);
      }
      
      const updatedClasses = await fetchClassroomStructures(user?.id, user?.email);
      
      await Promise.all([
        fetchNotices(user?.email),
        fetchExams(user?.email, user?.id, updatedClasses)
      ]);
    } catch (err) {
      console.error('[Dashboard Sync Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchClassroomStructures, fetchNotices, fetchExams]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getTotalUniqueSubjects = () => {
    const subjects = new Set();
    classrooms.forEach(c => {
      c.teacherSubjectMappings?.forEach(m => {
        m.subjects?.forEach(sub => sub && subjects.add(sub));
      });
    });
    return subjects.size;
  };

  // Render Helpers
  const renderNoticeItem = ({ item }) => (
    <Pressable 
      style={styles.noticeCard}
      onPress={() => setSelectedNotice(item)}
      android_ripple={{ color: 'rgba(123, 104, 238, 0.1)' }}
    >
      <View style={styles.noticeAccentBar} />
      <View style={styles.noticeContent}>
        <Text style={styles.noticeTitle} numberOfLines={1}>{item.noticeName}</Text>
        <Text style={styles.noticeDesc} numberOfLines={1}>{item.noticeDescription}</Text>
      </View>
    </Pressable>
  );

  const renderSnapshotItem = (label, value, icon, bg) => (
    <View style={[styles.snapshotItem, { backgroundColor: bg }]}>
      <MatIcon name={icon} size={16} color={PRIMARY} style={styles.snapIcon} />
      <View style={styles.snapTextContainer}>
        <Text style={styles.snapshotValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.snapshotLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );

  const renderQuickAction = (title, icon, bg, onPress) => (
    <Pressable
      style={styles.quickActionItem}
      onPress={onPress}
      android_ripple={{ color: 'rgba(123, 104, 238, 0.12)' }}
    >
      <View style={[styles.actionIconBg, { backgroundColor: bg }]}>
        <MatIcon name={icon} size={18} color={PRIMARY} />
      </View>
      <Text style={styles.actionTitle} numberOfLines={1}>{title}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={BG_LIGHT} barStyle="dark-content" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} />}
      >
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerGreeting} numberOfLines={1}>{getGreeting()}, {teacherName}</Text>
            <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Profile')} android_ripple={{ radius: 20, borderless: true }}>
            <MatIcon name="account-circle" size={36} color={PRIMARY} />
          </Pressable>
        </View>

        {/* SNAPSHOT GRID */}
        <View style={styles.snapshotGrid}>
          {renderSnapshotItem('Classes', classrooms.length, 'school', '#ede9ff')}
          {renderSnapshotItem('Subjects', getTotalUniqueSubjects(), 'book-multiple', '#e0efff')}
          {renderSnapshotItem('Academic', classrooms[0]?.year || '2026-27', 'calendar', '#fef3c7')}
          {renderSnapshotItem('Next Up', nextClass ? formatTime(nextClass.startTime) : 'N/A', 'clock-outline', '#dcfce7')}
        </View>

        {/* ACTIONS ROW */}
        <View style={styles.quickActionsRow}>
          {renderQuickAction('Attendance', 'calendar-check', '#ede9ff', () => navigation.navigate('Attendance'))}
          {renderQuickAction('Results', 'chart-box-outline', '#e0efff', () => navigation.navigate('TeacherResult'))}
          {renderQuickAction('Tasks', 'file-document', '#fef3c7', () => navigation.navigate('Assignments'))}
          {renderQuickAction('Profile', 'account-details', '#f3f4f6', () => navigation.navigate('Profile'))}
        </View>

        {/* HORIZONTAL NOTICES */}
        <View style={styles.sectionSection}>
          <Text style={styles.compactSectionTitle}>Latest Notices</Text>
          {loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 10 }} />
          ) : notices.length === 0 ? (
            <Text style={styles.emptyText}>No alerts active</Text>
          ) : (
            <FlatList
              data={notices.slice(0, 4)}
              renderItem={renderNoticeItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 8, paddingTop: 4 }}
            />
          )}
        </View>

        {/* TAB MIXED */}
        <View style={styles.tabContainer}>
          <View style={styles.tabBar}>
            <Pressable 
              style={[styles.tabButton, activeTab === 'classes' && styles.tabButtonActive]}
              onPress={() => setActiveTab('classes')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'classes' && styles.tabButtonTextActive]}>
                Classes ({classrooms.length})
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.tabButton, activeTab === 'exams' && styles.tabButtonActive]}
              onPress={() => setActiveTab('exams')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'exams' && styles.tabButtonTextActive]}>
                Exams ({exams.length})
              </Text>
            </Pressable>
          </View>

          {/* TAB CONTENT */}
          <View style={styles.tabContentBlock}>
            {activeTab === 'classes' ? (
              classrooms.length === 0 ? <Text style={styles.emptyText}>No classes scheduled</Text> :
              classrooms.map((item) => (
                <View key={item.id} style={styles.denseDataRow}>
                  <View style={styles.denseLeftBadge}><Text style={styles.badgeText}>{item.standard}-{item.division}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.teacherSubjectMappings?.[0]?.subjects?.[0] || 'General'}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{formatTime(item.startTime)} - {formatTime(item.endTime)} | {item.medium}</Text>
                  </View>
                </View>
              ))
            ) : (
              exams.length === 0 ? <Text style={styles.emptyText}>No scheduled exams found</Text> :
              exams.map((item) => (
                <View key={item.id} style={styles.denseDataRow}>
                  <View style={[styles.denseLeftBadge, { backgroundColor: '#fee2e2' }]}><Text style={[styles.badgeText, { color: '#dc2626' }]}>EXAM</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.examName}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{item.examDate || 'Date Pending'} • {item.examType}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* DETAILS DRAWER MODAL */}
      <Modal visible={!!selectedNotice} animationType="slide" transparent={true} onRequestClose={() => setSelectedNotice(null)}>
        <TouchableWithoutFeedback onPress={() => setSelectedNotice(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{selectedNotice?.noticeName}</Text>
                <Text style={styles.modalDescription}>{selectedNotice?.noticeDescription}</Text>
                <Pressable style={styles.modalActionBtn} onPress={() => setSelectedNotice(null)}>
                  <Text style={styles.modalActionBtnText}>Close</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_LIGHT },
  scrollContainer: { paddingBottom: 16 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerGreeting: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK },
  headerDate: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, marginTop: -2 },
  
  // Dense Micro Snapshot Grid
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingHorizontal: 20, marginBottom: 12 },
  snapshotItem: { width: GRID_ITEM_WIDTH, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  snapIcon: { marginRight: 6 },
  snapTextContainer: { flex: 1 },
  snapshotValue: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK },
  snapshotLabel: { fontSize: 9, fontFamily: 'Poppins-Regular', color: TEXT_MID },

  // Dense Row Quick Actions 
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16, gap: 6 },
  quickActionItem: { flex: 1, backgroundColor: SURFACE_BG, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: CARD_BORDER },
  actionIconBg: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  actionTitle: { fontSize: 11, fontFamily: 'Poppins-Medium', color: TEXT_DARK, textAlign: 'center' },

  sectionSection: { marginBottom: 14 },
  compactSectionTitle: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: TEXT_MID, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 4 },
  
  // Notices Minimal Footprint 
  noticeCard: { backgroundColor: SURFACE_BG, width: NOTICE_CARD_WIDTH, marginRight: 8, borderRadius: 10, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', height: 46 },
  noticeAccentBar: { width: 3, height: '100%', backgroundColor: PRIMARY },
  noticeContent: { flex: 1, paddingHorizontal: 10 },
  noticeTitle: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK },
  noticeDesc: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_MID, marginTop: -2 },

  // Tab Module
  tabContainer: { marginHorizontal: 20, backgroundColor: SURFACE_BG, borderRadius: 14, borderWidth: 1, borderColor: CARD_BORDER, padding: 8, overflow: 'hidden' },
  tabBar: { flexDirection: 'row', backgroundColor: BG_LIGHT, borderRadius: 10, padding: 2, marginBottom: 8 },
  tabButton: { flex: 1, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: SURFACE_BG, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 1 },
  tabButtonText: { fontSize: 12, fontFamily: 'Poppins-Medium', color: TEXT_LIGHT },
  tabButtonTextActive: { color: PRIMARY, fontFamily: 'Poppins-SemiBold' },
  tabContentBlock: { minHeight: 120 },
  
  // Shared Compact Rows
  denseDataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BG_LIGHT },
  denseLeftBadge: { backgroundColor: PRIMARY_LIGHT, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, width: 50, alignItems: 'center', marginRight: 10 },
  badgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', color: PRIMARY },
  rowTitle: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK },
  rowSub: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT },
  emptyText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, textAlign: 'center', marginTop: 24 },

  // Modal Setup
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: SURFACE_BG, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalHandle: { width: 30, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginBottom: 6 },
  modalDescription: { fontSize: 12, fontFamily: 'Poppins-Regular', color: TEXT_MID, lineHeight: 18, marginBottom: 16 },
  modalActionBtn: { backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  modalActionBtnText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#ffffff' }
});

export default TeacherDashboard;