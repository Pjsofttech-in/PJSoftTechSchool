import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, Dimensions, StatusBar, RefreshControl, TextInput, ToastAndroid } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PRIMARY = '#6750A4'; 
const SURFACE_VARIANT = '#E7E0EC';
const OUTLINE = '#79747E';
const BG_LIGHT = '#FEF7FF';

const SOLID_RIPPLE = { color: 'rgba(103, 80, 164, 0.12)', borderless: false };
const CIRCLE_RIPPLE = { borderless: true, radius: 24 };
const SPINNER_COLORS = [PRIMARY];

const getExamBadgeStyles = (type) => {
  switch (type) {
    case 'Final': return { badge: styles.badgeFinal, text: styles.textFinal };
    case 'Semester': return { badge: styles.badgeSemester, text: styles.textSemester };
    default: return { badge: styles.badgeUnit, text: styles.textUnit };
  }
};

const SubjectChips = React.memo(({ subjects }) => (
  <View style={styles.subjectsRow}>
    {subjects?.map((sub, idx) => (
      <View key={sub.id || idx} style={styles.subjectChip}>
        <Text style={styles.subjectChipText}>{sub.subjectName || sub} ({sub.maxMarks || '?'}M)</Text>
      </View>
    ))}
  </View>
));

// Individual subject row
const StudentSubjectRow = React.memo(({ detail, teacherSubjectNames, onEdit }) => {
  const targetId = detail.subjectId; 

  const isTeacherSubject = teacherSubjectNames.some(
    name => name?.trim().toLowerCase() === detail.subjectName?.trim().toLowerCase()
  );

  return (
    <View style={styles.subjectItemRow}>
      <View style={styles.subjectItemLeft}>
        <Text style={[styles.detailText, isTeacherSubject && styles.highlightedSubjectText]}>
          {detail.subjectName}: <Text style={styles.boldText}>{detail.obtainedMarks}</Text>/{detail.maxMarks}
        </Text>
        {isTeacherSubject && <Text style={styles.editableTag}>Assigned to you</Text>}
      </View>
      
      {isTeacherSubject ? (
        <Pressable 
          android_ripple={CIRCLE_RIPPLE} 
          style={styles.inlineEditIconBtn}
          onPress={() => onEdit(targetId, detail.subjectName, detail.maxMarks, detail.obtainedMarks)}
        >
          <MatIcon name="pencil" size={16} color={PRIMARY} />
        </Pressable>
      ) : (
        <View style={styles.viewOnlyBadge}>
          <Text style={styles.viewOnlyText}>View Only</Text>
        </View>
      )}
    </View>
  );
});

const ClassItemRow = React.memo(({ item, onFetchExams, userEmail }) => {
  const mapping = item.teacherSubjectMappings?.find(t => t.teacherEmail === userEmail);
  const teacherSubjectNames = mapping?.subjects ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.standardCircle}>
          <Text style={styles.standardText}>{item.standard}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.mainTitle}>Division {item.division} • {item.medium}</Text>
          <View style={styles.timeRow}>
            <MatIcon name="clock-outline" size={14} color={OUTLINE} />
            <Text style={styles.subTitle}>{item.startTime} - {item.endTime}</Text>
          </View>
        </View>
        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>{item.year}</Text>
        </View>
      </View>

      <Pressable 
        android_ripple={SOLID_RIPPLE}
        style={styles.outlineActionButton} 
        onPress={() => onFetchExams(item.id, `${item.standard} - ${item.division}`, teacherSubjectNames)}
      >
        <Text style={styles.outlineButtonText}>View Performance & Exams</Text>
        <MatIcon name="arrow-right" size={18} color={PRIMARY} />
      </Pressable>
    </View>
  );
});

const ExamItemRow = React.memo(({ item, onFetchResults }) => {
  const badgeStyle = getExamBadgeStyles(item.examType);

  return (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <View style={[styles.examTypeBadge, badgeStyle.badge]}>
          <Text style={[styles.examTypeText, badgeStyle.text]}>{item.examType || 'Exam'}</Text>
        </View>
        <View style={styles.flexTextContainer}>
          <Text style={styles.examName}>{item.examName}</Text>
          <View style={styles.examDateRow}>
            <MatIcon name="calendar-clock" size={12} color={OUTLINE} />
            <Text style={styles.examDate}>{item.examDate || 'No date scheduled'}</Text>
          </View>
        </View>
      </View>

      <SubjectChips subjects={item.subjects || []} />

      <Pressable
        android_ripple={SOLID_RIPPLE}
        style={styles.showResultBtn}
        onPress={() => onFetchResults(item.id, item.examName)}
      >
        <MatIcon name="chart-bar" size={16} color="#fff" />
        <Text style={styles.showResultBtnText}>Open Grade Roster</Text>
      </Pressable>
    </View>
  );
});

const ResultItemRow = React.memo(({ item, onOpenSingleSubjectAssign, onOpenHistory, teacherSubjectNames }) => {
  const notAttempted = item.overAllStatus === 'Not Attempted';
  const passed = item.overAllStatus === 'Pass';

  const handleSubjectEditPress = (subId, subName, maxM, currM) => {
    onOpenSingleSubjectAssign(item, subId, subName, maxM, currM);
  };

  return (
    <View style={styles.resultItem}>
      <View style={styles.resultMainRow}>
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
                Aggregated Score: <Text style={styles.boldText}>{item.totalObtained}/{item.totalMax}</Text> ({item.percentage}%)
              </Text>
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

      <View style={styles.subjectBreakdownContainer}>
        {item.details && item.details.length > 0 ? (
          item.details.map((detail, idx) => (
            <StudentSubjectRow 
              key={idx} 
              detail={detail} 
              teacherSubjectNames={teacherSubjectNames} 
              onEdit={handleSubjectEditPress} 
            />
          ))
        ) : (
          <Text style={styles.noSubjectWarning}>No marks records populated for this student.</Text>
        )}
      </View>

      <View style={styles.inlineActionRow}>
        <Pressable 
          android_ripple={SOLID_RIPPLE} 
          style={styles.inlineButton}
          onPress={() => onOpenHistory(item)}
        >
          <MatIcon name="trending-up" size={16} color={PRIMARY} />
          <Text style={styles.inlineButtonText}>View Performance History</Text>
        </Pressable>
      </View>
    </View>
  );
});

const BatchHeader = React.memo(() => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Your Assigned Academic Batches</Text>
  </View>
));

const TeacherResultContent = () => {
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [teacherSubjectNames, setTeacherSubjectNames] = useState([]);

  const [isExamsModalVisible, setIsExamsModalVisible] = useState(false);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');

  const [isResultsModalVisible, setIsResultsModalVisible] = useState(false);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedExamName, setSelectedExamName] = useState('');

  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetSubjectConfig, setTargetSubjectConfig] = useState({ id: null, name: '', maxMarks: 0 });
  const [singleMarksInput, setSingleMarksInput] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchClassrooms = useCallback(async (isARefreshCall = false) => {
    if (isARefreshCall) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      if (!user?.id || !user?.email) return;
      const data = await teacherApi.getClassRooms(user.id, user.email);
      setClassrooms(data);
    } catch (err) {
      setError('Failed to load assigned classrooms.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchClassrooms(false);
  }, [fetchClassrooms]);

  const fetchExams = useCallback(async (classId, className, namesList) => {
    setIsExamsModalVisible(true);
    setExamsLoading(true);
    setExams([]);
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setTeacherSubjectNames(namesList);
    try {
      if (!user?.email) return;
      const data = await teacherApi.getExamByClassId(user.email, classId);
      setExams(data);
    } catch (err) {
      ToastAndroid.show('Failed to sync exams.', ToastAndroid.SHORT);
    } finally {
      setExamsLoading(false);
    }
  }, [user?.email]);

  const fetchResults = useCallback(async (examId, examName) => {
    setIsResultsModalVisible(true);
    setResultsLoading(true);
    setResults([]);
    setSelectedExamId(examId);
    setSelectedExamName(examName);
    try {
      if (!user?.email || !selectedClassId) return;
      const data = await teacherApi.getResultByClassroom(user.email, selectedClassId, examId);
      setResults(data);
    } catch (err) {
      ToastAndroid.show('Failed to sync current roster marks.', ToastAndroid.SHORT);
    } finally {
      setResultsLoading(false);
    }
  }, [user?.email, selectedClassId]);

  const openSingleSubjectAssign = useCallback((student, subjectId, subjectName, maxMarks, currentMarks) => {
    setSelectedStudent(student);
    setTargetSubjectConfig({ id: subjectId, name: subjectName, maxMarks });
    setSingleMarksInput(currentMarks?.toString() || '');
    setIsAssignModalVisible(true);
  }, []);

  const submitSingleSubjectMarks = async () => {
    const obtainedMarks = Number(singleMarksInput || 0);

    if (obtainedMarks > targetSubjectConfig.maxMarks) {
      ToastAndroid.show(
        `${targetSubjectConfig.name} marks cannot exceed ${targetSubjectConfig.maxMarks}`,
        ToastAndroid.LONG
      );
      return;
    }

    try {
      setAssignLoading(true);
      const payload = {
        studentId: selectedStudent.studentId,
        examId: selectedExamId,
        subjectId: targetSubjectConfig.id,
        obtainedMarks: obtainedMarks,
      };

      await teacherApi.submitMarkByTeacher(user.email, payload);
      ToastAndroid.show('Marks successfully updated!', ToastAndroid.SHORT);
      setIsAssignModalVisible(false);
      
      await fetchResults(selectedExamId, selectedExamName);
    } catch (err) {
      ToastAndroid.show(err.message || 'Failed to submit marks', ToastAndroid.LONG);
    } finally {
      setAssignLoading(false);
    }
  };

  const openStudentHistory = useCallback(async (student) => {
    if (!student?.studentId) {
      ToastAndroid.show('Invalid student selection identifier.', ToastAndroid.SHORT);
      return;
    }
    setSelectedStudent(student);
    setIsHistoryModalVisible(true);
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      if (!user?.email) return;
      const responseData = await teacherApi.getResultByStudentAndAcademicYear(user.email, student.studentId);
      if (Array.isArray(responseData)) {
        const formattedRecords = responseData.map(record => ({
          exam: record.examName || 'Assessment Block',
          percentage: `${record.percentage}%`,
          status: record.overAllStatus || 'N/A',
          date: record.examType || 'Term Cycle',
        }));
        setHistoryRecords(formattedRecords);
      }
    } catch (err) {
      ToastAndroid.show(err.message || 'Failed to fetch historical analytics', ToastAndroid.SHORT);
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.email]);

  const dynamicClassRenderer = useCallback(({ item }) => (
    <ClassItemRow item={item} onFetchExams={fetchExams} userEmail={user?.email} />
  ), [fetchExams, user?.email]);

  const dynamicExamRenderer = useCallback(({ item }) => (
    <ExamItemRow item={item} onFetchResults={fetchResults} />
  ), [fetchResults]);

  const dynamicResultRenderer = useCallback(({ item }) => (
    <ResultItemRow 
      item={item} 
      onOpenSingleSubjectAssign={openSingleSubjectAssign} 
      onOpenHistory={openStudentHistory} 
      teacherSubjectNames={teacherSubjectNames} 
    />
  ), [openSingleSubjectAssign, openStudentHistory, teacherSubjectNames]);

  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <MatIcon name="wifi-off" size={40} color={OUTLINE} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable android_ripple={SOLID_RIPPLE} style={styles.errorRetryBtn} onPress={() => fetchClassrooms(false)}>
          <MatIcon name="refresh" size={18} color="#fff" />
          <Text style={styles.showResultBtnText}>Retry connection</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      <View style={[styles.appbar, { paddingTop: Math.max(12, insets.top) }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} android_ripple={CIRCLE_RIPPLE}>
          <MatIcon name="arrow-left" size={24} color={PRIMARY} />
        </Pressable>
        <Text style={styles.appbartitle}>Performance Matrix</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList
          data={classrooms}
          renderItem={dynamicClassRenderer}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listPadding, { paddingBottom: insets.bottom + 16 }]}
          ListHeaderComponent={BatchHeader}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MatIcon name="school-outline" size={44} color={OUTLINE} />
              <Text style={styles.emptyText}>No active classrooms linked to this profile.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchClassrooms} colors={SPINNER_COLORS} tintColor={PRIMARY} />
          }
        />
      )}

      {/* Exams Modal */}
      <Modal animationType="slide" transparent={true} visible={isExamsModalVisible} onRequestClose={() => setIsExamsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.85, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Available Assessment Cycles</Text>
                <Text style={styles.modalSub}>Batch: {selectedClassName}</Text>
              </View>
              <Pressable android_ripple={CIRCLE_RIPPLE} onPress={() => setIsExamsModalVisible(false)}>
                <MatIcon name="close" size={24} color={OUTLINE} />
              </Pressable>
            </View>

            {examsLoading ? (
              <View style={styles.modalCenteredPadding}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : (
              <FlatList
                data={exams}
                renderItem={dynamicExamRenderer}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.bottomListPadding}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MatIcon name="clipboard-text-outline" size={40} color={OUTLINE} />
                    <Text style={styles.emptyText}>No records scheduled for this batch.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Grade Roster Modal */}
      <Modal animationType="slide" transparent={true} visible={isResultsModalVisible} onRequestClose={() => setIsResultsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.92, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedExamName}</Text>
                <Text style={styles.modalSub}>Batch Configuration: {selectedClassName}</Text>
              </View>
              <Pressable android_ripple={CIRCLE_RIPPLE} onPress={() => setIsResultsModalVisible(false)}>
                <MatIcon name="close" size={24} color={OUTLINE} />
              </Pressable>
            </View>

            {resultsLoading ? (
              <View style={styles.modalCenteredPadding}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : (
              <FlatList
                data={results}
                renderItem={dynamicResultRenderer}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={styles.bottomListPadding}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MatIcon name="account-off-outline" size={40} color={OUTLINE} />
                    <Text style={styles.emptyText}>No registered students tracked.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Single Subject Assign Marks Dialog Modal */}
      <Modal animationType="fade" transparent={true} visible={isAssignModalVisible} onRequestClose={() => setIsAssignModalVisible(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Update Subject Marks</Text>
            <Text style={styles.dialogSub}>{selectedStudent?.studentName}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{targetSubjectConfig.name} (Max: {targetSubjectConfig.maxMarks})</Text>
              <TextInput
                style={styles.textInputAndroid}
                keyboardType="numeric"
                placeholder="Enter new obtained mark"
                value={singleMarksInput}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setSingleMarksInput(numericValue);
                }}
              />
            </View>

            <View style={styles.dialogActions}>
              <Pressable style={styles.dialogBtn} android_ripple={SOLID_RIPPLE} onPress={() => setIsAssignModalVisible(false)}>
                <Text style={[styles.dialogBtnText, { color: OUTLINE }]}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dialogBtn} android_ripple={SOLID_RIPPLE} onPress={submitSingleSubjectMarks} disabled={assignLoading}>
                {assignLoading ? <ActivityIndicator size="small" color={PRIMARY} /> : <Text style={styles.dialogBtnText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student History Modal */}
      <Modal animationType="slide" transparent={true} visible={isHistoryModalVisible} onRequestClose={() => setIsHistoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.historyContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Performance History Tracker</Text>
                <Text style={styles.modalSub}>{selectedStudent?.studentName}</Text>
              </View>
              <Pressable android_ripple={CIRCLE_RIPPLE} onPress={() => setIsHistoryModalVisible(false)}>
                <MatIcon name="close" size={24} color={OUTLINE} />
              </Pressable>
            </View>

            {historyLoading ? (
              <View style={styles.modalCenteredPadding}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : (
              <View style={styles.historyPadding}>
                {historyRecords.map((item, idx) => (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineLeftColumn}>
                      <View style={styles.timelineNode} />
                      {idx !== historyRecords.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle}>{item.exam}</Text>
                      <Text style={styles.timelineMeta}>Scored: {item.percentage} • Verified on {item.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default function TeacherResult() {
  return (
    <SafeAreaProvider>
      <TeacherResultContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_LIGHT },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: OUTLINE, marginTop: 12, textAlign: 'center', fontSize: 14, fontFamily: 'Poppins-Regular' },
  errorRetryBtn: { backgroundColor: PRIMARY, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8, marginTop: 20 },
  appbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: SURFACE_VARIANT },
  backBtn: { padding: 6, borderRadius: 24 },
  appbartitle: { flex: 1, fontSize: 20, color: '#1C1B1F', marginLeft: 8, fontFamily: 'Poppins-SemiBold' },
  sectionHeader: { paddingTop: 8, paddingBottom: 12 },
  sectionTitle: { fontSize: 14, color: PRIMARY, letterSpacing: 0.15, fontFamily: 'Poppins-SemiBold' },
  listPadding: { paddingHorizontal: 16, paddingTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SURFACE_VARIANT },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  standardCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE_VARIANT, justifyContent: 'center', alignItems: 'center' },
  standardText: { color: PRIMARY, fontSize: 16, fontFamily: 'Poppins-SemiBold' },
  headerText: { marginLeft: 16, flex: 1 },
  mainTitle: { fontSize: 16, color: '#1C1B1F', fontFamily: 'Poppins-SemiBold' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subTitle: { fontSize: 13, color: '#49454F', fontFamily: 'Poppins-Regular' },
  yearBadge: { backgroundColor: SURFACE_VARIANT, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  yearText: { fontSize: 11, color: '#49454F', fontFamily: 'Poppins-SemiBold' },
  outlineActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: PRIMARY },
  outlineButtonText: { color: PRIMARY, fontSize: 14, fontFamily: 'Poppins-SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 8 },
  dragHandle: { width: 32, height: 4, backgroundColor: OUTLINE, borderRadius: 2, alignSelf: 'center', marginBottom: 16, opacity: 0.4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 18, color: '#1C1B1F', fontFamily: 'Poppins-SemiBold' },
  modalSub: { fontSize: 13, color: '#49454F', marginTop: 4, fontFamily: 'Poppins-Regular' },
  modalCenteredPadding: { paddingVertical: 64, alignItems: 'center' },
  bottomListPadding: { paddingBottom: 32 },
  flexTextContainer: { flex: 1, marginLeft: 12 },
  headerTitleWrap: { flex: 1, marginRight: 8 },
  examCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SURFACE_VARIANT },
  examHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  examTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  examTypeText: { fontSize: 12, fontFamily: 'Poppins-SemiBold' },
  examName: { fontSize: 15, color: '#1C1B1F', fontFamily: 'Poppins-SemiBold' },
  examDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  examDate: { fontSize: 12, color: '#49454F', fontFamily: 'Poppins-Regular' },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  subjectChip: { backgroundColor: BG_LIGHT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: SURFACE_VARIANT },
  subjectChipText: { fontSize: 12, color: PRIMARY, fontFamily: 'Poppins-SemiBold' },
  showResultBtn: { backgroundColor: PRIMARY, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8 },
  showResultBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-SemiBold' },
  badgeFinal: { backgroundColor: '#FAE2E2' },
  badgeSemester: { backgroundColor: '#E0EFFF' },
  badgeUnit: { backgroundColor: '#E3F6E3' },
  textFinal: { color: '#BA1A1A' },
  textSemester: { color: '#0061A4' },
  textUnit: { color: '#146C2E' },
  resultItem: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: SURFACE_VARIANT, overflow: 'hidden' },
  resultMainRow: { flexDirection: 'row', padding: 16, justifyContent: 'space-between', alignItems: 'flex-start' },
  resultLeft: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE_VARIANT, justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { color: PRIMARY, fontSize: 16, fontFamily: 'Poppins-SemiBold' },
  studentName: { fontSize: 14, color: '#1C1B1F', fontFamily: 'Poppins-SemiBold' },
  marksText: { fontSize: 13, color: '#49454F', marginTop: 4, fontFamily: 'Poppins-Regular' },
  subjectBreakdownContainer: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  subjectItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderColor: SURFACE_VARIANT },
  subjectItemLeft: { flex: 1 },
  detailText: { fontSize: 13, color: '#49454F', fontFamily: 'Poppins-Regular' },
  highlightedSubjectText: { color: '#146C2E', fontFamily: 'Poppins-Medium' },
  editableTag: { fontSize: 11, color: '#146C2E', fontFamily: 'Poppins-Regular', marginTop: 2 },
  viewOnlyBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  viewOnlyText: { fontSize: 11, color: OUTLINE, fontFamily: 'Poppins-Medium' },
  inlineEditIconBtn: { padding: 6, borderRadius: 16, backgroundColor: SURFACE_VARIANT },
  boldText: { fontFamily: 'Poppins-SemiBold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPass: { backgroundColor: '#E3F6E3' },
  statusFail: { backgroundColor: '#FAE2E2' },
  statusNA: { backgroundColor: SURFACE_VARIANT },
  statusText: { fontSize: 11, fontFamily: 'Poppins-SemiBold' },
  statusPassText: { color: '#146C2E' },
  statusFailText: { color: '#BA1A1A' },
  statusNAText: { color: '#49454F' },
  inlineActionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: SURFACE_VARIANT, backgroundColor: BG_LIGHT },
  inlineButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  inlineButtonText: { fontSize: 13, color: PRIMARY, fontFamily: 'Poppins-SemiBold' },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: OUTLINE, marginTop: 8, fontSize: 14, textAlign: 'center', fontFamily: 'Poppins-Regular' },
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  dialogCard: { backgroundColor: '#fff', borderRadius: 28, padding: 24, elevation: 6 },
  dialogTitle: { fontSize: 20, color: '#1C1B1F', fontFamily: 'Poppins-SemiBold' },
  dialogSub: { fontSize: 14, color: '#49454F', marginBottom: 16, marginTop: 4, fontFamily: 'Poppins-Regular' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, color: PRIMARY, marginBottom: 4, fontFamily: 'Poppins-SemiBold' },
  textInputAndroid: { borderWidth: 1, borderColor: OUTLINE, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1C1B1F', fontFamily: 'Poppins-Regular' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  dialogBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  dialogBtnText: { fontSize: 14, color: PRIMARY, fontFamily: 'Poppins-SemiBold' },
  historyContainer: { minHeight: 300 },
  historyPadding: { paddingHorizontal: 4 },
  timelineItem: { flexDirection: 'row', minHeight: 56 },
  timelineLeftColumn: { alignItems: 'center', marginRight: 16, width: 16 },
  timelineNode: { width: 12, height: 12, borderRadius: 6, backgroundColor: PRIMARY, marginTop: 6 },
  timelineLine: { width: 2, flex: 1, backgroundColor: SURFACE_VARIANT, marginVertical: 2 },
  timelineBody: { flex: 1, paddingBottom: 16 },
  timelineTitle: { fontSize: 14, color: '#1C1B1F', fontFamily: 'Poppins-SemiBold' },
  timelineMeta: { fontSize: 12, color: '#49454F', marginTop: 2, fontFamily: 'Poppins-Regular' },
  noSubjectWarning: { color: '#BA1A1A', fontSize: 12, fontFamily: 'Poppins-Medium', marginTop: 6, fontStyle: 'italic' },
});