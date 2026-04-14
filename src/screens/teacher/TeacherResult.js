import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore'; // Ensure this path is correct
import { teacherApi } from '@api/teacherApi';

const PRIMARY = '#7b68ee';

export class TeacherResult extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classrooms: [],
      loading: true,
      error: null,
    };
  }

  componentDidMount() {
    this.fetchClassrooms();
  }

  fetchClassrooms = async () => {
    try {
      // Accessing zustand store state in Class Component
      const { user } = useAuthStore.getState();
      
      const data = await teacherApi.getClassRooms(user.id, user.email);
      this.setState({ classrooms: data, loading: false });
    } catch (err) {
      this.setState({ error: 'Failed to load classrooms', loading: false });
      console.error(err);
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
        onPress={() => {
          // We will implement navigation to the actual result view next
          console.log("View Result for Class ID:", item.id);
        }}
      >
        <Text style={styles.buttonText}>View Result</Text>
        <MatIcon name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  render() {
    const { classrooms, loading, error } = this.state;

    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Classroom</Text>
          <Text style={styles.headerSub}>Available classes for result viewing</Text>
        </View>

        <FlatList
          data={classrooms}
          renderItem={this.renderClassItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={<Text style={styles.emptyText}>No classrooms assigned.</Text>}
        />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  headerSub: { fontSize: 13, color: '#999', marginTop: 4 },
  listPadding: { padding: 16 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  infoSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  badge: { 
    width: 45, height: 45, borderRadius: 12, 
    backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' 
  },
  badgeText: { color: PRIMARY, fontWeight: 'bold', fontSize: 14 },
  textDetails: { marginLeft: 12 },
  classTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  classSub: { fontSize: 12, color: '#666', marginTop: 2 },
  button: { 
    backgroundColor: PRIMARY, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 12,
    gap: 8
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default TeacherResult;