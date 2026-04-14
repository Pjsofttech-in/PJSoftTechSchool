import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const PRIMARY = '#7b68ee';
const SECONDARY = '#4ecdc4';

export class TeacherAssignments extends Component {
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
      console.error('[Assignments] Fetch Error:', err);
      this.setState({ loading: false });
    }
  };

  renderClassItem = ({ item }) => (
    <View style={styles.card}>
      {/* Header Info */}
      <View style={styles.cardHeader}>
        <View style={styles.standardBadge}>
          <Text style={styles.standardText}>{item.standard}</Text>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Division {item.division} ({item.medium})</Text>
          <Text style={styles.subTitle}>Assigned: {item.teacherSubjectMappings[0]?.subjects?.join(', ')}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.btn, styles.viewBtn]}
          onPress={() => console.log("View Assignments for", item.id)}
        >
          <MatIcon name="eye-outline" size={18} color={PRIMARY} />
          <Text style={styles.viewBtnText}>View All</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.addBtn]}
          onPress={() => console.log("Add Assignment for", item.id)}
        >
          <MatIcon name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  render() {
    if (this.state.loading) {
      return (
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Classroom Assignments</Text>
          <Text style={styles.headerSub}>Manage and track student tasks</Text>
        </View>

        <FlatList
          data={this.state.classrooms}
          renderItem={this.renderClassItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  headerSub: { fontSize: 13, color: '#999', marginTop: 4 },
  listContainer: { padding: 16 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  standardBadge: { 
    width: 50, height: 50, borderRadius: 15, 
    backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' 
  },
  standardText: { color: PRIMARY, fontWeight: 'bold', fontSize: 16 },
  titleContainer: { marginLeft: 15 },
  mainTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  subTitle: { fontSize: 12, color: '#666', marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  btn: { 
    flex: 1, 
    flexDirection: 'row', 
    height: 45, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8 
  },
  viewBtn: { borderWidth: 1, borderColor: PRIMARY },
  viewBtnText: { color: PRIMARY, fontWeight: '600', fontSize: 13 },
  addBtn: { backgroundColor: PRIMARY },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

export default TeacherAssignments;