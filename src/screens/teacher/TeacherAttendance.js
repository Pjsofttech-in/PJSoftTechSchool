import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Dimensions } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY = '#7b68ee';
const SUCCESS = '#4caf50';
const DANGER = '#f44336';

export class TeacherAttendance extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classrooms: [],
      attendanceData: [],
      filteredData: [],
      loading: true,
      modalLoading: false,
      isModalVisible: false,
      showTimeDropdown: false,
      showStatusDropdown: false,
      selectedClassId: null,
      selectedClassName: '',
      activeTimeFrame: 'today',
      activeStatus: 'All',
      timeFrameLabels: {
        'today': 'Today',
        '7days': '7 Days',
        '30days': '30 Days',
        '365days': 'Year'
      }
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

  handleViewAttendance = async (classId, className, timeFrame = 'today') => {
    this.setState({ 
      isModalVisible: true, 
      modalLoading: true, 
      selectedClassId: classId,
      selectedClassName: className,
      activeTimeFrame: timeFrame,
      activeStatus: 'All',
      showTimeDropdown: false 
    });

    try {
      const res = await teacherApi.getAttendanceByClass(classId, timeFrame);
      const data = res.content || [];
      this.setState({ attendanceData: data, filteredData: data, modalLoading: false });
    } catch (err) {
      this.setState({ modalLoading: false });
    }
  };

  filterByStatus = (status) => {
    const { attendanceData } = this.state;
    let filtered = status === 'All' ? attendanceData : attendanceData.filter(i => i.status === status);
    this.setState({ activeStatus: status, filteredData: filtered, showStatusDropdown: false });
  };

  getStats = () => {
    const total = this.state.attendanceData.length;
    const present = this.state.attendanceData.filter(i => i.status === 'Present').length;
    const absent = total - present;
    const rate = total > 0 ? ((present / total) * 100).toFixed(0) : 0;
    return { total, present, absent, rate };
  };

  renderStudentItem = ({ item }) => {
    const isPresent = item.status === 'Present';
    return (
      <View style={styles.studentCard}>
        <View style={styles.cardMain}>
          <Text style={styles.rollNoText}>{item.rollNo}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.studentNameText}>{item.studentName}</Text>
            <Text style={styles.dateLabel}>{item.date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPresent ? '#e8f5e9' : '#ffebee' }]}>
            <Text style={[styles.statusText, { color: isPresent ? SUCCESS : DANGER }]}>{item.status}</Text>
          </View>
        </View>

        {isPresent && (
          <View style={styles.presentDetailsRow}>
            <View style={styles.detailBox}><MatIcon name="login" size={12} color="#888" /><Text style={styles.detailValue}>In: {item.loginTime || '--:--'}</Text></View>
            <View style={styles.detailBox}><MatIcon name="logout" size={12} color="#888" /><Text style={styles.detailValue}>Out: {item.logoutTime || '--:--'}</Text></View>
            <View style={styles.detailBox}><MatIcon name="clock-outline" size={12} color={PRIMARY} /><Text style={[styles.detailValue, {color: PRIMARY, fontWeight: 'bold'}]}>{item.workingMinutes}m</Text></View>
          </View>
        )}
      </View>
    );
  };

  render() {
    const stats = this.getStats();
    if (this.state.loading) return <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topSection}>
          <Text style={styles.subtitle}>Manage classroom presence and history</Text>
        </View>

        <FlatList
          data={this.state.classrooms}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}><MatIcon name="calendar-check" size={24} color={PRIMARY} /></View>
                <View style={styles.headerInfo}>
                  <Text style={styles.classTitle}>{item.standard} - {item.division}</Text>
                  <Text style={styles.classSub}>{item.medium} | {item.year}</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}><MatIcon name="clock-outline" size={14} color="#666" /><Text style={styles.detailText}>{item.startTime} - {item.endTime}</Text></View>
                <View style={styles.detailItem}><MatIcon name="map-marker-outline" size={14} color="#666" /><Text style={styles.detailText}>{item.branchCode}</Text></View>
              </View>

              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => this.handleViewAttendance(item.id, `${item.standard} - ${item.division}`)}
              >
                <Text style={styles.buttonText}>View Attendance</Text>
                <MatIcon name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />

        <Modal animationType="slide" transparent={true} visible={this.state.isModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{this.state.selectedClassName}</Text>
                  
                  {/*  DOUBLE DROPDOWN ROW */}
                  <View style={styles.filtersRow}>
                    
                    {/* Timeframe Dropdown */}
                    <View style={{zIndex: 2000}}>
                        <TouchableOpacity style={styles.dropdownChip} onPress={() => this.setState({ showTimeDropdown: !this.state.showTimeDropdown, showStatusDropdown: false })}>
                            <Text style={styles.chipLabel}>Time: </Text>
                            <Text style={styles.chipValue}>{this.state.timeFrameLabels[this.state.activeTimeFrame]}</Text>
                            <MatIcon name="menu-down" size={16} color={PRIMARY} />
                        </TouchableOpacity>
                        {this.state.showTimeDropdown && (
                            <View style={styles.dropdownMenu}>
                                {Object.keys(this.state.timeFrameLabels).map((key) => (
                                    <TouchableOpacity key={key} style={styles.menuItem} onPress={() => this.handleViewAttendance(this.state.selectedClassId, this.state.selectedClassName, key)}>
                                        <Text style={[styles.menuItemText, this.state.activeTimeFrame === key && { color: PRIMARY, fontWeight: 'bold' }]}>{this.state.timeFrameLabels[key]}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Status Dropdown */}
                    <View style={{zIndex: 2000}}>
                        <TouchableOpacity style={[styles.dropdownChip, {marginLeft: 8}]} onPress={() => this.setState({ showStatusDropdown: !this.state.showStatusDropdown, showTimeDropdown: false })}>
                            <Text style={styles.chipLabel}>Status: </Text>
                            <Text style={styles.chipValue}>{this.state.activeStatus}</Text>
                            <MatIcon name="menu-down" size={16} color={PRIMARY} />
                        </TouchableOpacity>
                        {this.state.showStatusDropdown && (
                            <View style={[styles.dropdownMenu, {left: 8}]}>
                                {['All', 'Present', 'Absent'].map((status) => (
                                    <TouchableOpacity key={status} style={styles.menuItem} onPress={() => this.filterByStatus(status)}>
                                        <Text style={[styles.menuItemText, this.state.activeStatus === status && { color: PRIMARY, fontWeight: 'bold' }]}>{status}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                  </View>
                </View>
                <TouchableOpacity onPress={() => this.setState({ isModalVisible: false, showTimeDropdown: false, showStatusDropdown: false })}><MatIcon name="close-circle" size={30} color="#ccc" /></TouchableOpacity>
              </View>

              <View style={styles.statsBar}>
                <View style={styles.statBox}><Text style={styles.statNum}>{stats.total}</Text><Text style={styles.statSub}>Total</Text></View>
                <View style={styles.statBox}><Text style={[styles.statNum, {color: SUCCESS}]}>{stats.present}</Text><Text style={styles.statSub}>Present</Text></View>
                <View style={styles.statBox}><Text style={[styles.statNum, {color: DANGER}]}>{stats.absent}</Text><Text style={styles.statSub}>Absent</Text></View>
                <View style={styles.statBox}><Text style={[styles.statNum, {color: PRIMARY}]}>{stats.rate}%</Text><Text style={styles.statSub}>Rate</Text></View>
              </View>

              {this.state.modalLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50 }} />
              ) : (
                <FlatList data={this.state.filteredData} renderItem={this.renderStudentItem} keyExtractor={(item, index) => index.toString()} contentContainerStyle={{ paddingBottom: 30 }} />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topSection: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#fff', elevation: 2 },
  subtitle: { fontSize: 11, color: '#888', marginTop: 4 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { marginLeft: 16 },
  classTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  classSub: { fontSize: 12, color: '#888' },
  detailsRow: { flexDirection: 'row', gap: 15, marginBottom: 20, paddingLeft: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12, color: '#666' },
  actionButton: { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: SCREEN_HEIGHT * 0.85, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  modalTitle: { fontSize: 19, fontWeight: 'bold', color: '#1a1a2e' },
  filtersRow: { flexDirection: 'row', marginTop: 10 },
  dropdownChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#7b68ee33' },
  chipLabel: { fontSize: 11, color: '#777' },
  chipValue: { fontSize: 11, color: PRIMARY, fontWeight: 'bold', marginRight: 2 },
  dropdownMenu: { position: 'absolute', top: 38, left: 0, backgroundColor: '#fff', borderRadius: 12, width: 130, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, paddingVertical: 5 },
  menuItem: { paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  menuItemText: { fontSize: 13, color: '#444' },

  statsBar: { flexDirection: 'row', backgroundColor: '#f8f9fe', borderRadius: 15, padding: 15, marginBottom: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 17, fontWeight: 'bold', color: '#1a1a2e' },
  statSub: { fontSize: 10, color: '#999', marginTop: 2 },

  studentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  rollNoText: { fontSize: 13, fontWeight: 'bold', color: '#bbb', width: 35 },
  studentNameText: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  dateLabel: { fontSize: 11, color: '#aaa' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  presentDetailsRow: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8f8f8', justifyContent: 'space-between' },
  detailBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailValue: { fontSize: 11, color: '#666' }
});

export default TeacherAttendance;