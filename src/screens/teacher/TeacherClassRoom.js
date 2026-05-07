import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Dimensions, Linking, Platform } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#7b68ee';

export class TeacherClassRoom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classrooms: [],
      students: [],
      timetable: [],
      loading: true,
      modalLoading: false,
      isStudentModalVisible: false,
      isScheduleModalVisible: false,
      selectedClassName: ''
    };
  }

  componentDidMount() {
    this.fetchClassrooms();
  }

  fetchClassrooms = async () => {
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getClassRooms(user.id, user.email);
      this.setState({ classrooms: data, loading: false });
    } catch (err) {
      console.error('[ClassRoomHub] Fetch Error:', err);
      this.setState({ loading: false });
    }
  };

  fetchStudents = async (classId, className) => {
    this.setState({ 
      isStudentModalVisible: true, 
      modalLoading: true, 
      selectedClassName: className,
      students: [] 
    });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getStudentsByClass(user.email, classId);
      this.setState({ students: data, modalLoading: false });
    } catch (err) {
      console.error('Fetch Students Error:', err);
      this.setState({ modalLoading: false });
    }
  };

  fetchTimetable = async (classId, className) => {
    this.setState({ 
      isScheduleModalVisible: true, 
      modalLoading: true, 
      selectedClassName: className,
      timetable: [] 
    });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getTimeTableByClassId(user.email, classId);
      this.setState({ timetable: data, modalLoading: false });
    } catch (err) {
      console.error('Fetch Timetable Error:', err);
      this.setState({ modalLoading: false });
    }
  };

  makeCall = (phoneNumber) => {
  if (!phoneNumber) {
    alert('Contact number not available for this student');
    return;
  }
  
  const url = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
  Linking.openURL(url).catch(err => console.error("Couldn't open dialer", err));
};

  renderActionButton = (icon, label, color, onPress) => (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress}>
      <MatIcon name={icon} size={20} color={color} />
      <Text style={[styles.actionLabel, { color: color }]}>{label}</Text>
    </TouchableOpacity>
  );

  renderClassItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.standardCircle}>
          <Text style={styles.standardText}>{item.standard}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.mainTitle}>Division {item.division} | {item.medium}</Text>
          <Text style={styles.subTitle}>{item.startTime} - {item.endTime}</Text>
        </View>
        <View style={styles.branchBadge}>
          <Text style={styles.branchText}>{item.branchCode}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.grid}>
        {this.renderActionButton('numeric-positive-1', 'Marks', '#FF6B6B', () => console.log('Marks', item.id))}
        {this.renderActionButton('calendar-clock', 'Schedule', '#4ECDC4', () => 
          this.fetchTimetable(item.id, `${item.standard} - ${item.division}`)
        )}
        {this.renderActionButton('account-group', 'Students', PRIMARY, () => 
          this.fetchStudents(item.id, `${item.standard} - ${item.division}`)
        )}
      </View>
    </View>
  );

  renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentAvatar}>
        <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.fullName}</Text>
        <Text style={styles.studentSub}>Roll No: {item.rollNo} • {item.gender}</Text>
      </View>
      <TouchableOpacity onPress={() => this.makeCall(item.contact)}>
        <MatIcon name="phone-outline" size={22} color={item.contact ? "#4caf50" : "#ccc"} />
      </TouchableOpacity>
    </View>
  );

  renderDayItem = ({ item }) => {
    // Sort periods numerically by periodNo (1, 2, 3...)
    const sortedPeriods = [...item.scheduledPeriods].sort((a, b) => a.periodNo - b.periodNo);

    return (
      <View style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <MatIcon name="calendar-today" size={18} color={PRIMARY} />
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
              <Text style={styles.periodTeacher}>T: {period.teacherName}</Text>
            </View>
            <View style={styles.periodNumberBadge}>
              <Text style={styles.periodNumberText}>P{period.periodNo}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  renderEmptyState = (icon, message) => (
    <View style={styles.emptyContainer}>
      <MatIcon name={icon} size={80} color="#ccc" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  render() {
    if (this.state.loading) {
      return <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>;
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topBarSub}>Select a class to manage records</Text>
        </View>

        <FlatList
          data={this.state.classrooms}
          renderItem={this.renderClassItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />

        {/* Student List Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.isStudentModalVisible}
          onRequestClose={() => this.setState({ isStudentModalVisible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Students: {this.state.selectedClassName}</Text>
                <TouchableOpacity onPress={() => this.setState({ isStudentModalVisible: false })}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>
              {this.state.modalLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50 }} />
              ) : (
                <FlatList
                  data={this.state.students}
                  renderItem={this.renderStudentItem}
                  ListEmptyComponent={() => this.renderEmptyState("account-search-outline", "No students found in this class")}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Schedule Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={this.state.isScheduleModalVisible}
          onRequestClose={() => this.setState({ isScheduleModalVisible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: SCREEN_HEIGHT * 0.85 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Schedule: {this.state.selectedClassName}</Text>
                <TouchableOpacity onPress={() => this.setState({ isScheduleModalVisible: false })}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>
              {this.state.modalLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50 }} />
              ) : (
                <FlatList
                  data={this.state.timetable}
                  renderItem={this.renderDayItem}
                  ListEmptyComponent={() => this.renderEmptyState("calendar-remove-outline", "No schedule has been created for this class yet.")}
                  keyExtractor={(item, index) => index.toString()}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#fff', elevation: 2 },
  topBarSub: { fontSize: 11, color: '#888', marginTop: 4 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  standardCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  standardText: { color: PRIMARY, fontWeight: 'bold', fontSize: 15 },
  headerText: { marginLeft: 12, flex: 1 },
  mainTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  subTitle: { fontSize: 12, color: '#666' },
  branchBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  branchText: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 10 },
  actionBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 8, backgroundColor: '#fff' },
  actionLabel: { fontSize: 12, fontFamily: 'Poppins-Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: SCREEN_HEIGHT * 0.8, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a2e' },
  studentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 15, marginBottom: 10 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  studentSub: { fontSize: 11, color: '#777' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  dayCard: { backgroundColor: '#fff', borderRadius: 15, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f7ff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
  dayHeaderText: { fontSize: 16, fontWeight: 'bold', color: PRIMARY },
  periodRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  periodTimeBox: { width: 60, alignItems: 'center' },
  periodTimeText: { fontSize: 13, fontWeight: 'bold', color: '#1a1a2e' },
  periodTimeSub: { fontSize: 11, color: '#888' },
  periodInfo: { flex: 1, marginLeft: 15 },
  periodSubject: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  periodTeacher: { fontSize: 11, color: '#666', marginTop: 2 },
  periodNumberBadge: { backgroundColor: '#ede9ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  periodNumberText: { fontSize: 10, color: PRIMARY, fontWeight: 'bold' },
});

export default TeacherClassRoom;