import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Dimensions } from 'react-native';
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
      loading: true,
      modalLoading: false,
      isModalVisible: false,
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
      this.setState({ loading: false });
    }
  };

  fetchStudents = async (classId, className) => {
    this.setState({ 
      isModalVisible: true, 
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
        {this.renderActionButton('numeric-positive-1', 'Marks', '#FF6B6B', () => {})}
        {this.renderActionButton('calendar-clock', 'Schedule', '#4ECDC4', () => {})}
        {this.renderActionButton('account-group', 'Students', PRIMARY, () => 
          this.fetchStudents(item.id, `${item.standard}-${item.division}`)
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
      <TouchableOpacity onPress={() => console.log('Call', item.contact)}>
        <MatIcon name="phone-outline" size={22} color="#4caf50" />
      </TouchableOpacity>
    </View>
  );

  renderEmptyStudents = () => (
    <View style={styles.emptyContainer}>
      <MatIcon name="account-search-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>No students found in this class</Text>
    </View>
  );

  render() {
    if (this.state.loading) {
      return <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>;
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Classroom Management</Text>
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
          visible={this.state.isModalVisible}
          onRequestClose={() => this.setState({ isModalVisible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Students: {this.state.selectedClassName}</Text>
                <TouchableOpacity onPress={() => this.setState({ isModalVisible: false })}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>

              {this.state.modalLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50 }} />
              ) : (
                <FlatList
                  data={this.state.students}
                  renderItem={this.renderStudentItem}
                  ListEmptyComponent={this.renderEmptyStudents}
                  keyExtractor={(item) => item.id.toString()}
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
  topBar: { padding: 20, backgroundColor: '#fff', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 2 },
  topBarTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  topBarSub: { fontSize: 13, color: '#888', marginTop: 4 },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  actionBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 8, backgroundColor: '#fff' },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: SCREEN_HEIGHT * 0.8, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  studentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 15, marginBottom: 10 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  studentSub: { fontSize: 11, color: '#777' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 16 }
});

export default TeacherClassRoom;