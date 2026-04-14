import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const PRIMARY = '#7b68ee';

export class TeacherClassRoom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classrooms: [],
      loading: true,
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

  // Helper to render the small action buttons
  renderActionButton = (icon, label, color, onPress) => (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress}>
      <MatIcon name={icon} size={20} color={color} />
      <Text style={[styles.actionLabel, { color: color }]}>{label}</Text>
    </TouchableOpacity>
  );

  renderClassItem = ({ item }) => (
    <View style={styles.card}>
      {/* Top Section: Class Identity */}
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

      {/* Bottom Section: 2x2 Action Grid */}
      <View style={styles.grid}>
        {this.renderActionButton('numeric-positive-1', 'Marks', '#FF6B6B', () => console.log('Marks', item.id))}
        {this.renderActionButton('calendar-clock', 'Schedule', '#4ECDC4', () => console.log('Schedule', item.id))}
        {this.renderActionButton('account-group', 'Students', '#45B7D1', () => console.log('Students', item.id))}
        {this.renderActionButton('clipboard-check', 'Attendance', '#7b68ee', () => console.log('Attendance', item.id))}
      </View>
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
  actionBtn: { 
    width: '48%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    borderRadius: 12, 
    borderWidth: 1,
    gap: 8,
    backgroundColor: '#fff' 
  },
  actionLabel: { fontSize: 12, fontWeight: '600' }
});

export default TeacherClassRoom;