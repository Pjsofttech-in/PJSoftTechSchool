import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, Dimensions, StatusBar, RefreshControl, TextInput, ToastAndroid, Alert } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { ClassroomFilterBar } from '@components/ClassroomFilterBar';
import { applyClassroomFilters } from '@utils/classroomFilterUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PRIMARY = '#6750A4';
const SURFACE_VARIANT = '#E7E0EC';
const OUTLINE = '#79747E';
const BG_LIGHT = '#f8f9fe';

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

const StudentSubjectRow = React.memo(({ detail, onEdit }) => (
  <View style={[styles.subjectItemRow, detail.isNewRecord && styles.fallbackHighlightRow]}>
    <View style={styles.subjectItemLeft}>
      <Text style={styles.detailText}>
        {detail.subjectName}: <Text style={styles.boldText}>{detail.isNewRecord ? 'Not Assigned' : detail.obtainedMarks}</Text>/{detail.maxMarks}
      </Text>
    </View>
    <Pressable
      android_ripple={CIRCLE_RIPPLE}
      style={[styles.inlineEditIconBtn, detail.isNewRecord && { backgroundColor: '#E8F5E9' }]}
      onPress={() => onEdit(detail.subjectId || detail.id, detail.subjectName, detail.maxMarks, detail.obtainedMarks, detail.isNewRecord)}
    >
      <MatIcon
        name={detail.isNewRecord ? 'plus-circle' : 'pencil'}
        size={detail.isNewRecord ? 18 : 16}
        color={detail.isNewRecord ? '#146C2E' : PRIMARY}
      />
    </Pressable>
  </View>
));

const ClassItemRow = React.memo(({ item, onFetchExams }) => (
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
      onPress={() => onFetchExams(item.id, `${item.standard} - ${item.division}`)}
    >
      <Text style={styles.outlineButtonText}>View Performance & Exams</Text>
      <MatIcon name="arrow-right" size={18} color={PRIMARY} />
    </Pressable>
  </View>
));

const ExamItemRow = React.memo(({ item, onFetchResults }) => (
  <View style={styles.examCard}>
    <View style={styles.examHeader}>
      <View style={[styles.examTypeBadge, getExamBadgeStyles(item.examType).badge]}>
        <Text style={[styles.examTypeText, getExamBadgeStyles(item.examType).text]}>{item.examType || 'Exam'}</Text>
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
));

const ResultItemRow = React.memo(({ item, onOpenSingleSubjectAssign, onOpenHistory }) => {
  const notAttempted = item.overAllStatus === 'Not Attempted' || !item.details || item.details.length === 0;
  const passed = item.overAllStatus === 'Pass';

  const handleSubjectEditPress = (subId, subName, maxM, currM, isNewRecord) => {
    onOpenSingleSubjectAssign(item, subId, subName, maxM, currM, isNewRecord);
  };

  return (
    <View style={styles.resultItem}>
      <View style={styles.resultMainRow}>
        <View style={styles.resultLeft}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>
              {item.studentName?.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.flexTextContainer}>
            <Text style={styles.studentName}>{item.studentName?.trim()}</Text>
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

  const [currentExamSubjectsStructure, setCurrentExamSubjectsStructure] = useState([]);

  const selectedClassIdRef = useRef(null);
  const currentExamSubjectsRef = useRef([]);

  const [allClassrooms, setAllClassrooms] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [filterResetKey, setFilterResetKey] = useState(0);

  const [isExamsModalVisible, setIsExamsModalVisible] = useState(false);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState('');

  const [isResultsModalVisible, setIsResultsModalVisible] = useState(false);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedExamName, setSelectedExamName] = useState('');

  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetSubjectConfig, setTargetSubjectConfig] = useState({ id: null, name: '', maxMarks: 0, isNewRecord: false });
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
      
      setAllClassrooms(data);
      
      const filtered = applyClassroomFilters(data, activeFilters);
      setClassrooms(filtered);
    } catch (err) {
      setError('Failed to load assigned classrooms.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.email, activeFilters]);

  useEffect(() => {
    fetchClassrooms(false);
  }, [fetchClassrooms]);

  const handleFilterApply = (filters) => {
    setActiveFilters(filters);
    setClassrooms(applyClassroomFilters(allClassrooms, filters));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setClassrooms(allClassrooms);
    setFilterResetKey(prev => prev + 1);
  };

  const fetchExams = useCallback(async (classId, className) => {
    setIsExamsModalVisible(true);
    setExamsLoading(true);
    setExams([]);
    selectedClassIdRef.current = classId;
    setSelectedClassName(className);
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
      if (!user?.email || !selectedClassIdRef.current) return;

      const examSubjects = await teacherApi.getSubjectbyExamId(user.email, examId);
      const activeStructure = Array.isArray(examSubjects) ? examSubjects : [];
      
      setCurrentExamSubjectsStructure(activeStructure);
      currentExamSubjectsRef.current = activeStructure;

      const data = await teacherApi.getResultByClassroom(user.email, selectedClassIdRef.current, examId);

      const dynamicRoster = Array.isArray(data) ? data.map(student => {
        let studentDetails = student.details ? [...student.details] : [];

        activeStructure.forEach(examSub => {
          const subjectExists = studentDetails.some(
            d => Number(d.subjectId) === Number(examSub.id)
          );
          if (!subjectExists) {
            studentDetails.push({
              subjectId: examSub.id,
              subjectName: examSub.subjectName,
              obtainedMarks: '',
              maxMarks: examSub.maxMarks || 100,
              isNewRecord: true,
            });
          }
        });

        return { ...student, details: studentDetails };
      }) : [];

      setResults(dynamicRoster);

    } catch (err) {
      ToastAndroid.show('Failed to sync current roster configurations.', ToastAndroid.SHORT);
    } finally {
      setResultsLoading(false);
    }
  }, [user?.email]);

  const openSingleSubjectAssign = useCallback((student, subjectId, subjectName, maxMarks, currentMarks, isNewRecord) => {
    setSelectedStudent(student);
    setTargetSubjectConfig({ id: subjectId, name: subjectName, maxMarks, isNewRecord: isNewRecord ?? false });
    setSingleMarksInput(currentMarks?.toString() || '');
    setIsAssignModalVisible(true);
  }, []);

  const submitSingleSubjectMarks = async () => {
    const validSubjectId = targetSubjectConfig.id;
    if (!validSubjectId && validSubjectId !== 0) {
      Alert.alert('Error', 'Subject ID mapping parameter missing.');
      return;
    }

    const validStudentId = selectedStudent?.studentId || selectedStudent?.id;
    if (!validStudentId) {
      Alert.alert('Error', 'Student data reference missing.');
      return;
    }

    if (singleMarksInput === '') {
      Alert.alert('Validation', 'Please enter obtained marks.');
      return;
    }

    const obtainedMarks = Number(singleMarksInput);

    if (obtainedMarks > targetSubjectConfig.maxMarks) {
      Alert.alert('Validation', `Marks cannot exceed maximum of ${targetSubjectConfig.maxMarks}.`);
      return;
    }

    try {
      setAssignLoading(true);

      await teacherApi.submitMarkByTeacher(user.email, {
        studentId: validStudentId,
        examId: selectedExamId,
        subjectId: validSubjectId,
        obtainedMarks: obtainedMarks,
      });

      ToastAndroid.show('Marks successfully saved!', ToastAndroid.SHORT);
      setIsAssignModalVisible(false);

      await fetchResults(selectedExamId, selectedExamName);
    } catch (err) {
      Alert.alert('Failed to Submit', err.message || 'An unexpected error occurred.');
    } finally {
      setAssignLoading(false);
    }
  };

  const openStudentHistory = useCallback(async (student) => {
    const validStudentId = student?.studentId || student?.id;
    if (!validStudentId) {
      ToastAndroid.show('Invalid student selection identifier.', ToastAndroid.SHORT);
      return;
    }
    setSelectedStudent(student);
    setIsHistoryModalVisible(true);
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      if (!user?.email) return;
      const responseData = await teacherApi.getResultByStudentAndAcademicYear(user.email, validStudentId);
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
    <ClassItemRow item={item} onFetchExams={fetchExams} />
  ), [fetchExams]);

  const dynamicExamRenderer = useCallback(({ item }) => (
    <ExamItemRow item={item} onFetchResults={fetchResults} />
  ), [fetchResults]);

  const dynamicResultRenderer = useCallback(({ item }) => (
    <ResultItemRow
      item={item}
      onOpenSingleSubjectAssign={openSingleSubjectAssign}
      onOpenHistory={openStudentHistory}
    />
  ), [openSingleSubjectAssign, openStudentHistory]);

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
        <Text style={styles.appbartitle}>Classroom Overview</Text>
      </View>

      <ClassroomFilterBar
        key={filterResetKey}
        email={user?.email}
        onApply={handleFilterApply}
      />

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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchClassrooms(true)}
              colors={SPINNER_COLORS}
              tintColor={PRIMARY}
            />
          }
        />
      )}

      {/* Exams Modal */}
      <Modal animationType="slide" transparent={true} visible={isExamsModalVisible} onRequestClose={() => setIsExamsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top, paddingBottom: insets.bottom, }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Classroom Exams</Text>
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
          <View style={[styles.modalContent, { paddingTop: insets.top, paddingBottom: insets.bottom, }]}>
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
                keyExtractor={(item, index) => (item.studentId || item.id || index).toString()}
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
            <Text style={styles.dialogTitle}>{targetSubjectConfig.isNewRecord ? 'Assign Marks' : 'Update Marks'}</Text>
            <Text style={styles.dialogSub}>{selectedStudent?.studentName?.trim()}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject: {targetSubjectConfig.name} (Max: {targetSubjectConfig.maxMarks})</Text>
              <TextInput
                style={styles.textInputAndroid}
                keyboardType="decimal-pad"
                placeholder="Obtained Marks"
                value={singleMarksInput}
                onChangeText={(text) => {
                  let formatted = text.replace(/[^0-9.]/g, '');
                  const parts = formatted.split('.');
                  if (parts.length > 2) formatted = parts[0] + '.' + parts.slice(1).join('');
                  if (parts[1] && parts[1].length > 2) formatted = parts[0] + '.' + parts[1].slice(0, 2);
                  setSingleMarksInput(formatted);
                }}
              />
            </View>

            <View style={styles.dialogActions}>
              <Pressable style={styles.dialogBtn} android_ripple={SOLID_RIPPLE} onPress={() => setIsAssignModalVisible(false)}>
                <Text style={[styles.dialogBtnText, { color: OUTLINE }]}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dialogBtn} android_ripple={SOLID_RIPPLE} onPress={submitSingleSubjectMarks} disabled={assignLoading}>
                {assignLoading
                  ? <ActivityIndicator size="small" color={PRIMARY} />
                  : <Text style={styles.dialogBtnText}>{targetSubjectConfig.isNewRecord ? 'Assign' : 'Update'}</Text>
                }
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
                <Text style={styles.modalSub}>{selectedStudent?.studentName?.trim()}</Text>
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
  modalOverlay: { flex: 1, backgroundColor: '#fff', },
  modalContent: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingHorizontal: 16, paddingTop: 0 },
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
  boldText: { fontFamily: 'Poppins-SemiBold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusNA: { backgroundColor: '#F5F5F5' },
  statusPass: { backgroundColor: '#E8F5E9' },
  statusFail: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 12, fontFamily: 'Poppins-SemiBold' },
  statusNAText: { color: '#757575' },
  statusPassText: { color: '#2E7D32' },
  statusFailText: { color: '#C62828' },
  subjectBreakdownContainer: { backgroundColor: '#FAFAFA', padding: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: SURFACE_VARIANT },
  subjectItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  fallbackHighlightRow: { backgroundColor: '#F8F9FA', paddingHorizontal: 4 },
  subjectItemLeft: { flex: 1 },
  detailText: { fontSize: 13, color: '#49454F', fontFamily: 'Poppins-Regular' },
  inlineEditIconBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  noSubjectWarning: { fontSize: 12, color: '#BA1A1A', textAlign: 'center', paddingVertical: 4, fontFamily: 'Poppins-Regular' },
  inlineActionRow: { padding: 8, backgroundColor: '#FFF' },
  inlineButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  inlineButtonText: { fontSize: 13, color: PRIMARY, fontFamily: 'Poppins-Medium' },
  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 13, color: OUTLINE, marginTop: 8, textAlign: 'center', fontFamily: 'Poppins-Regular' },
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialogCard: { backgroundColor: '#fff', borderRadius: 28, padding: 24, width: '100%', maxWidth: 320 },
  dialogTitle: { fontSize: 24, color: '#1C1B1F', fontFamily: 'Poppins-Regular' },
  dialogSub: { fontSize: 14, color: '#49454F', marginTop: 4, fontFamily: 'Poppins-Regular' },
  inputGroup: { marginTop: 24 },
  inputLabel: { fontSize: 12, color: PRIMARY, fontFamily: 'Poppins-Medium' },
  textInputAndroid: { borderBottomWidth: 1, borderColor: PRIMARY, paddingVertical: 4, fontSize: 16, color: '#1C1B1F', marginTop: 4 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
  dialogBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  dialogBtnText: { fontSize: 14, color: PRIMARY, fontFamily: 'Poppins-Medium' },
  historyContainer: { minHeight: 300 },
  historyPadding: { marginTop: 16 },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLeftColumn: { alignItems: 'center', marginRight: 12 },
  timelineNode: { width: 12, height: 12, borderRadius: 6, backgroundColor: PRIMARY },
  timelineLine: { flex: 1, width: 2, backgroundColor: SURFACE_VARIANT, marginTop: 4, marginBottom: 4 },
  timelineBody: { flex: 1, paddingTop: 0 },
  timelineTitle: { fontSize: 14, color: '#1C1B1F', fontFamily: 'Poppins-Medium' },
  timelineMeta: { fontSize: 12, color: '#49454F', marginTop: 2, fontFamily: 'Poppins-Regular' },
});

export default function TeacherResult() {
  return (
    <SafeAreaProvider>
      <TeacherResultContent />
    </SafeAreaProvider>
  );
}