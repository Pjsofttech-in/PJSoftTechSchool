import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const PRIMARY = '#7b68ee';

export class TeacherAttendance extends Component {
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
      console.error('[Attendance] Fetch Error:', err);
      this.setState({ loading: false });
    }
  };

  renderClassItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <MatIcon name="calendar-check" size={24} color={PRIMARY} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.classTitle}>{item.standard} - {item.division}</Text>
          <Text style={styles.classSub}>{item.medium} Medium | {item.year}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MatIcon name="clock-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{item.startTime} - {item.endTime}</Text>
        </View>
        <View style={styles.detailItem}>
          <MatIcon name="map-marker-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{item.branchCode}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => console.log("Navigate to Attendance Logs for ID:", item.id)}
      >
        <Text style={styles.buttonText}>View Attendance Logs</Text>
        <MatIcon name="chevron-right" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  render() {
    if (this.state.loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Attendance Records</Text>
          <Text style={styles.subtitle}>Select a class to view history and daily logs</Text>
        </View>

        <FlatList
          data={this.state.classrooms}
          renderItem={this.renderClassItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No classrooms found.</Text>}
        />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topSection: { padding: 24, backgroundColor: '#fff', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 3 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#777', marginTop: 4 },
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
  actionButton: { 
    backgroundColor: PRIMARY, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 14, 
    borderRadius: 12,
    gap: 8
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' }
});

export default TeacherAttendance;