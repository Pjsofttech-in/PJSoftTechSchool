import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, Dimensions, StatusBar, RefreshControl } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#7b68ee';

const SOLID_RIPPLE = { color: 'rgba(255, 255, 255, 0.2)', borderless: false };
const OUTLINE_RIPPLE = { color: 'rgba(123, 104, 238, 0.15)', borderless: false };
const CIRCLE_RIPPLE = { borderless: true, radius: 20 };
const SPINNER_COLORS = [PRIMARY];

const TeacherResultContent = ({ navigation, insets }) => {
  const user = useAuthStore((state) => state.user);

  // Classroom States
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Exams Modal States
  const [isExamsModalVisible, setIsExamsModalVisible] = useState(false);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsError, setExamsError] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');

  // Results Modal States
  const [isResultsModalVisible, setIsResultsModalVisible] = useState(false);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [selectedExamName, setSelectedExamName] = useState('');

  // Fetch classrooms list
  const fetchClassrooms = useCallback(async (isARefreshCall = false) => {
    if (isARefreshCall) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      if (!user?.id || !user?.email) return;
      const data = await teacherApi.getClassRooms(user.id, user.email);
      setClassrooms(data);
    } catch (err) {
      console.error('[TeacherResult] fetchClassrooms failed:', err);
      setError('Failed to load classrooms. Pull down or tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchClassrooms(false);
  }, [fetchClassrooms]);

  const onRefresh = useCallback(() => {
    fetchClassrooms(true);
  }, [fetchClassrooms]);

  // Fetch Exams
  const fetchExams = useCallback(async (classId, className) => {
    setIsExamsModalVisible(true);
    setExamsLoading(true);
    setExamsError(null);
    setExams([]);
    setSelectedClassId(classId);
    setSelectedClassName(className);
    
    try {
      if (!user?.email) return;
      const data = await teacherApi.getExamByClassId(user.email, classId);
      setExams(data);
    } catch (err) {
      console.error('[TeacherResult] fetchExams failed:', err);
      setExamsError('Failed to load exams. Please try again.');
    } finally {
      setExamsLoading(false);
    }
  }, [user?.email]);

  // Fetch Results
  const fetchResults = useCallback(async (examId, examName) => {
    setIsResultsModalVisible(true);
    setResultsLoading(true);
    setResultsError(null);
    setResults([]);
    setSelectedExamName(examName);
    
    try {
      if (!user?.email || !selectedClassId) return;
      const data = await teacherApi.getResultByClassroom(user.email, selectedClassId, examId);
      setResults(data);
    } catch (err) {
      console.error('[TeacherResult] fetchResults failed:', err);
      setResultsError('Failed to load results. Please try again.');
    } finally {
      setResultsLoading(false);
    }
  }, [user?.email, selectedClassId]);

  const getExamTypeBadgeStyle = (type) => {
    if (type === 'Final') return styles.badgeFinal;
    if (type === 'Semester') return styles.badgeSemester;
    return styles.badgeUnit;
  };

  const getExamTypeTextStyle = (type) => {
    if (type === 'Final') return styles.textFinal;
    if (type === 'Semester') return styles.textSemester;
    return styles.textUnit;
  };

  // Item Renderers
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

      <Pressable 
        android_ripple={OUTLINE_RIPPLE}
        style={styles.outlineActionButton} 
        onPress={() => fetchExams(item.id, `${item.standard} - ${item.division}`)}
      >
        <Text style={styles.outlineButtonText}>View Result</Text>
        <MatIcon name="arrow-right" size={18} color={PRIMARY} />
      </Pressable>
    </View>
  ), [fetchExams]);

  const renderExamItem = useCallback(({ item }) => (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <View style={[styles.examTypeBadge, getExamTypeBadgeStyle(item.examType)]}>
          <Text style={[styles.examTypeText, getExamTypeTextStyle(item.examType)]}>
            {item.examType}
          </Text>
        </View>
        <View style={styles.flexTextContainer}>
          <Text style={styles.examName}>{item.examName}</Text>
          <View style={styles.examDateRow}>
            <MatIcon name="calendar-clock" size={12} color="#888" />
            <Text style={styles.examDate}>{item.examDate}</Text>
          </View>
        </View>
      </View>

      <View style={styles.subjectsRow}>
        {item.subjects?.map((sub) => (
          <View key={sub.id} style={styles.subjectChip}>
            <Text style={styles.subjectChipText}>{sub.subjectName} ({sub.maxMarks}M)</Text>
          </View>
        ))}
      </View>

      <Pressable
        android_ripple={SOLID_RIPPLE}
        style={styles.showResultBtn}
        onPress={() => fetchResults(item.id, item.examName)}
      >
        <MatIcon name="chart-bar" size={16} color="#fff" />
        <Text style={styles.showResultBtnText}>Show Result</Text>
      </Pressable>
    </View>
  ), [fetchResults]);

  const renderResultItem = useCallback(({ item }) => {
    const notAttempted = item.overAllStatus === 'Not Attempted';
    const passed = item.overAllStatus === 'Pass';

    return (
      <View style={styles.resultItem}>
        <View style={styles.resultLeft}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>
              {item.studentName?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.flexTextContainer}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            {!notAttempted && (
              <Text style={styles.marksText}>
                {item.totalObtained}/{item.totalMax} · {item.percentage}%
              </Text>
            )}
            {item.details && item.details.length > 0 && (
              <View style={styles.detailsList}>
                {item.details.map((d, i) => (
                  <Text key={i} style={styles.detailText}>
                    {d.subjectName}: {d.obtainedMarks}/{d.maxMarks}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={[
          styles.statusBadge,
          notAttempted ? styles.statusNA : passed ? styles.statusPass : styles.statusFail
        ]}>
          <Text style={[
            styles.statusText,
            notAttempted ? styles.statusNAText : passed ? styles.statusPassText : styles.statusFailText
          ]}>
            {notAttempted ? 'N/A' : item.overAllStatus}
          </Text>
        </View>
      </View>
    );
  }, []);

  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <MatIcon name="wifi-off" size={40} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          android_ripple={SOLID_RIPPLE}
          style={[styles.showResultBtn, styles.retryBtnOffset]}
          onPress={() => fetchClassrooms(false)}
        >
          <MatIcon name="refresh" size={18} color="#fff" />
          <Text style={styles.showResultBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      <View style={[styles.appbar, { paddingTop: Math.max(12, insets.top) }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          android_ripple={CIRCLE_RIPPLE}
        >
          <MatIcon name="arrow-left" size={22} color={PRIMARY} />
        </Pressable>
        <Text style={styles.appbartitle}>Result Assessment</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Assigned Classes</Text>
      </View>
      
      <FlatList
        data={classrooms}
        renderItem={renderClassItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listPadding, { paddingBottom: insets.bottom + 16 }]}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MatIcon name="school-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No classrooms assigned.</Text>
          </View>
        }
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

      {/* Exams Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isExamsModalVisible}
        onRequestClose={() => setIsExamsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { maxHeight: SCREEN_HEIGHT * 0.85, paddingBottom: insets.bottom + 20 }
          ]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Exams</Text>
                <Text style={styles.modalSub}>Class: {selectedClassName}</Text>
              </View>
              <Pressable android_ripple={CIRCLE_RIPPLE} onPress={() => setIsExamsModalVisible(false)}>
                <MatIcon name="close-circle" size={28} color="#ccc" />
              </Pressable>
            </View>

            {examsLoading ? (
              <View style={styles.modalCenteredPadding}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : examsError ? (
              <View style={styles.emptyBox}>
                <MatIcon name="alert-circle-outline" size={36} color="#ccc" />
                <Text style={[styles.emptyText, styles.marginTopTiny]}>{examsError}</Text>
              </View>
            ) : (
              <FlatList
                data={exams}
                renderItem={renderExamItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.bottomListPadding}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MatIcon name="clipboard-text-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>No exams found for this class.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isResultsModalVisible}
        onRequestClose={() => setIsResultsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { maxHeight: SCREEN_HEIGHT * 0.90, paddingBottom: insets.bottom + 20 }
          ]}>
            <View style={styles.modalHeader}>
              <View style={styles.flexAndRightMargin}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedExamName}</Text>
                <Text style={styles.modalSub}>Class: {selectedClassName}</Text>
              </View>
              <Pressable android_ripple={CIRCLE_RIPPLE} onPress={() => setIsResultsModalVisible(false)}>
                <MatIcon name="close-circle" size={28} color="#ccc" />
              </Pressable>
            </View>

            {resultsLoading ? (
              <View style={styles.modalCenteredPadding}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : resultsError ? (
              <View style={styles.emptyBox}>
                <MatIcon name="alert-circle-outline" size={36} color="#ccc" />
                <Text style={[styles.emptyText, styles.marginTopTiny]}>{resultsError}</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                renderItem={renderResultItem}
                keyExtractor={(item, index) => (item.id ? item.id.toString() : `na-${index}`)}
                contentContainerStyle={styles.bottomListPadding}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MatIcon name="account-off-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>No results found.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#999', marginTop: 12, textAlign: 'center' },
  retryBtnOffset: { marginTop: 20, paddingHorizontal: 24 },
  
  appbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#ffffff', gap: 12 },
  backBtn: { padding: 4, borderRadius: 8, backgroundColor: '#ede9ff' },
  appbartitle: { flex: 1, fontSize: 17, fontFamily: 'Poppins-SemiBold', color: '#1a1a2e', fontWeight: 'bold' },
  
  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, color: '#666', fontFamily: 'Poppins-Medium', letterSpacing: 0.3 },
  listPadding: { padding: 14, paddingTop: 8 },

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
  
  outlineActionButton: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 11, borderRadius: 8, gap: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: PRIMARY },
  outlineButtonText: { fontFamily: 'Poppins-SemiBold', color: PRIMARY, fontSize: 14, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  modalSub: { fontSize: 12, color: '#999', marginTop: 2 },
  modalCenteredPadding: { marginTop: 50, marginBottom: 50 },
  bottomListPadding: { paddingBottom: 20 },
  flexAndRightMargin: { flex: 1, marginRight: 10 },
  flexTextContainer: { flex: 1, marginLeft: 12 },
  marginTopTiny: { marginTop: 8 },

  examCard: { backgroundColor: '#f8f9fe', borderRadius: 15, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  examHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  examTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  examTypeText: { fontSize: 11, fontWeight: '600' },
  examName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  examDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  examDate: { fontSize: 11, color: '#888' },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  subjectChip: { backgroundColor: '#ede9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  subjectChipText: { fontSize: 11, color: PRIMARY, fontWeight: '500' },
  showResultBtn: { backgroundColor: PRIMARY, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, gap: 8, overflow: 'hidden' },
  showResultBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  
  badgeFinal: { backgroundColor: '#ffe4e4' },
  badgeSemester: { backgroundColor: '#e4f0ff' },
  badgeUnit: { backgroundColor: '#e8ffe4' },
  textFinal: { color: '#e53935' },
  textSemester: { color: '#1e88e5' },
  textUnit: { color: '#43a047' },

  resultItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8f9fe', padding: 12, borderRadius: 15, marginBottom: 10, justifyContent: 'space-between', borderWidth: 1, borderColor: '#f0f0f0' },
  resultLeft: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  studentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { color: PRIMARY, fontWeight: 'bold', fontSize: 15 },
  studentName: { fontSize: 13, fontWeight: 'bold', color: '#1a1a2e' },
  marksText: { fontSize: 12, color: '#666', marginTop: 2 },
  detailsList: { marginTop: 4 },
  detailText: { fontSize: 11, color: '#999', marginTop: 1 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginTop: 2 },
  statusPass: { backgroundColor: '#e4ffed' },
  statusFail: { backgroundColor: '#ffe4e4' },
  statusNA: { backgroundColor: '#f0f0f0' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusPassText: { color: '#2e7d32' },
  statusFailText: { color: '#c62828' },
  statusNAText: { color: '#999' },
  
  emptyBox: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 13, textAlign: 'center' },
});

export default function TeacherResult() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <SafeAreaProvider>
      <TeacherResultContent navigation={navigation} insets={insets} />
    </SafeAreaProvider>
  );
}