import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Dimensions, ScrollView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#7b68ee';

class TeacherResultContent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classrooms: [],
      loading: true,
      error: null,

      isExamsModalVisible: false,
      exams: [],
      examsLoading: false,
      examsError: null,
      selectedClassId: null,
      selectedClassName: '',

      isResultsModalVisible: false,
      results: [],
      resultsLoading: false,
      resultsError: null,
      selectedExamId: null,
      selectedExamName: '',
    };
  }

  componentDidMount() {
    this.fetchClassrooms();
  }

  fetchClassrooms = async () => {
    this.setState({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getClassRooms(user.id, user.email);
      this.setState({ classrooms: data, loading: false });
    } catch (err) {
      console.error('[TeacherResult] fetchClassrooms failed:', err);
      this.setState({ error: 'Failed to load classrooms. Tap to retry.', loading: false });
    }
  };

  fetchExams = async (classId, className) => {
    this.setState({
      isExamsModalVisible: true,
      examsLoading: true,
      examsError: null,
      exams: [],
      selectedClassId: classId,
      selectedClassName: className,
    });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getExamByClassId(user.email, classId);
      this.setState({ exams: data, examsLoading: false });
    } catch (err) {
      console.error('[TeacherResult] fetchExams failed:', err);
      this.setState({ examsLoading: false, examsError: 'Failed to load exams. Please try again.' });
    }
  };

  fetchResults = async (examId, examName) => {
    this.setState({
      isResultsModalVisible: true,
      resultsLoading: true,
      resultsError: null,
      results: [],
      selectedExamId: examId,
      selectedExamName: examName,
    });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getResultByClassroom(user.email, this.state.selectedClassId, examId);
      this.setState({ results: data, resultsLoading: false });
    } catch (err) {
      console.error('[TeacherResult] fetchResults failed:', err);
      this.setState({ resultsLoading: false, resultsError: 'Failed to load results. Please try again.' });
    }
  };

  renderClassItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.infoSection}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.standard}</Text>
        </View>
        <View style={styles.textDetails}>
          <Text style={styles.classTitle}>Div {item.division} - {item.medium}</Text>
          <Text style={styles.classSub}>{item.year} | {item.startTime} - {item.endTime}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => this.fetchExams(item.id, `${item.standard}-${item.division}`)}
      >
        <Text style={styles.buttonText}>View Result</Text>
        <MatIcon name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  renderExamItem = ({ item }) => (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <View style={[styles.examTypeBadge, this.getExamTypeBadgeStyle(item.examType)]}>
          <Text style={[styles.examTypeText, this.getExamTypeTextStyle(item.examType)]}>
            {item.examType}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.examName}>{item.examName}</Text>
          <View style={styles.examDateRow}>
            <MatIcon name="calendar-clock" size={12} color="#888" />
            <Text style={styles.examDate}>{item.examDate}</Text>
          </View>
        </View>
      </View>

      <View style={styles.subjectsRow}>
        {item.subjects.map((sub) => (
          <View key={sub.id} style={styles.subjectChip}>
            <Text style={styles.subjectChipText}>{sub.subjectName} ({sub.maxMarks}M)</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.showResultBtn}
        onPress={() => this.fetchResults(item.id, item.examName)}
      >
        <MatIcon name="chart-bar" size={16} color="#fff" />
        <Text style={styles.showResultBtnText}>Show Result</Text>
      </TouchableOpacity>
    </View>
  );

  renderResultItem = ({ item }) => {
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
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            {!notAttempted && (
              <Text style={styles.marksText}>
                {item.totalObtained}/{item.totalMax} · {item.percentage}%
              </Text>
            )}
            {item.details && item.details.length > 0 && (
              <View style={{ marginTop: 4 }}>
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
  };

  getExamTypeBadgeStyle = (type) => {
    if (type === 'Final') return { backgroundColor: '#ffe4e4' };
    if (type === 'Semester') return { backgroundColor: '#e4f0ff' };
    return { backgroundColor: '#e8ffe4' }; // Unit Test
  };

  getExamTypeTextStyle = (type) => {
    if (type === 'Final') return { color: '#e53935' };
    if (type === 'Semester') return { color: '#1e88e5' };
    return { color: '#43a047' };
  };

  render() {
    const { classrooms, loading, error } = this.state;
    const { navigation, insets } = this.props;

    if (error) {
      return (
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <MatIcon name="wifi-off" size={40} color="#ccc" />
          <Text style={{ color: '#999', marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 20, paddingHorizontal: 24 }]}
            onPress={this.fetchClassrooms}
          >
            <MatIcon name="refresh" size={18} color="#fff" />
            <Text style={styles.buttonText}>Retry</Text>
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

    return (
      <View style={styles.container}>

        <View style={[styles.appbar, { paddingTop: Math.max(12, insets.top) }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <MatIcon name="arrow-left" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.appbartitle}>Result</Text>
        </View>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>Available classes for result viewing</Text>
        </View>

        {/* Classrooms List */}
        <FlatList
          data={classrooms}
          renderItem={this.renderClassItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listPadding, { paddingBottom: insets.bottom + 16 }]}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MatIcon name="school-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No classrooms assigned.</Text>
            </View>
          }
        />

        {/* Exams Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.isExamsModalVisible}
          onRequestClose={() => this.setState({ isExamsModalVisible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent, 
              { 
                maxHeight: SCREEN_HEIGHT * 0.85,
                paddingBottom: insets.bottom + 20 
              }
            ]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Exams</Text>
                  <Text style={styles.modalSub}>Class: {this.state.selectedClassName}</Text>
                </View>
                <TouchableOpacity onPress={() => this.setState({ isExamsModalVisible: false })}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>

              {this.state.examsLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50, marginBottom: 50 }} />
              ) : this.state.examsError ? (
                <View style={styles.emptyBox}>
                  <MatIcon name="alert-circle-outline" size={36} color="#ccc" />
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>{this.state.examsError}</Text>
                </View>
              ) : (
                <FlatList
                  data={this.state.exams}
                  renderItem={this.renderExamItem}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={{ paddingBottom: 20 }}
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
          visible={this.state.isResultsModalVisible}
          onRequestClose={() => this.setState({ isResultsModalVisible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent, 
              { 
                maxHeight: SCREEN_HEIGHT * 0.90,
                paddingBottom: insets.bottom + 20
              }
            ]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{this.state.selectedExamName}</Text>
                  <Text style={styles.modalSub}>Class: {this.state.selectedClassName}</Text>
                </View>
                <TouchableOpacity onPress={() => this.setState({ isResultsModalVisible: false })}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>

              {this.state.resultsLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50, marginBottom: 50 }} />
              ) : this.state.resultsError ? (
                <View style={styles.emptyBox}>
                  <MatIcon name="alert-circle-outline" size={36} color="#ccc" />
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>{this.state.resultsError}</Text>
                </View>
              ) : (
                <FlatList
                  data={this.state.results}
                  renderItem={this.renderResultItem}
                  keyExtractor={(item, index) => (item.id ? item.id.toString() : `na-${index}`)}
                  contentContainerStyle={{ paddingBottom: 20 }}
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
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  appbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#ffffff', gap: 12 },
  backBtn: { padding: 4, borderRadius: 8, backgroundColor: '#ede9ff' },
  appbartitle: { flex: 1, fontSize: 17, fontFamily: 'Poppins-SemiBold', color: '#1a1a2e' },
  header: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#fff', elevation: 2 },
  headerSub: { fontSize: 11, color: '#888', marginTop: 4 },
  listPadding: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  infoSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  badge: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: PRIMARY, fontWeight: 'bold', fontSize: 14 },
  textDetails: { marginLeft: 12 },
  classTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  classSub: { fontSize: 12, color: '#666', marginTop: 2 },
  button: { backgroundColor: PRIMARY, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  modalSub: { fontSize: 12, color: '#999', marginTop: 2 },
  examCard: { backgroundColor: '#f9f9f9', borderRadius: 15, padding: 14, marginBottom: 12 },
  examHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  examTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  examTypeText: { fontSize: 11, fontWeight: '600' },
  examName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  examDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  examDate: { fontSize: 11, color: '#888' },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  subjectChip: { backgroundColor: '#ede9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  subjectChipText: { fontSize: 11, color: PRIMARY, fontWeight: '500' },
  showResultBtn: { backgroundColor: PRIMARY, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 12, gap: 8 },
  showResultBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  resultItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 15, marginBottom: 10, justifyContent: 'space-between' },
  resultLeft: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  studentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { color: PRIMARY, fontWeight: 'bold', fontSize: 15 },
  studentName: { fontSize: 13, fontWeight: 'bold', color: '#1a1a2e' },
  marksText: { fontSize: 12, color: '#666', marginTop: 2 },
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