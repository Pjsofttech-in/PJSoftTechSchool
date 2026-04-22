import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Dimensions, Image, ScrollView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#7b68ee';

export class TeacherAssignments extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classrooms: [],
      assignments: [],
      loading: true,
      modalLoading: false,
      isViewModalVisible: false,
      selectedClassName: '',
      previewImage: null 
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

  // Logic for the View All button
  fetchAssignments = async (classId, className) => {
    this.setState({ 
      isViewModalVisible: true, 
      modalLoading: true, 
      selectedClassName: className,
      assignments: [] 
    });
    try {
      const { user } = useAuthStore.getState();
      // API call using classId and user email
      const data = await teacherApi.getAssignmentsByClass(user.email, classId);
      this.setState({ assignments: data, modalLoading: false });
    } catch (err) {
      console.error('Fetch Assignments Error:', err);
      this.setState({ modalLoading: false });
    }
  };

  renderAssignmentItem = ({ item }) => (
    <View style={styles.assignmentItem}>
      {item.image && (
        <TouchableOpacity onPress={() => this.setState({ previewImage: item.image })}>
          <Image source={{ uri: item.image }} style={styles.assignmentThumb} />
        </TouchableOpacity>
      )}
      <View style={styles.assignmentInfo}>
        <Text style={styles.assignmentTitle}>{item.assignmentTitle}</Text>
        <Text style={styles.assignmentDesc} numberOfLines={1}>{item.description}</Text>
        <View style={styles.dateRow}>
          <MatIcon name="calendar-clock" size={12} color="#888" />
          <Text style={styles.dateText}>Due: {item.dueDate}</Text>
        </View>
      </View>
      
      {/* Small Edit Button */}
      <TouchableOpacity 
        style={styles.editSmallBtn} 
        onPress={() => console.log('Edit', item.id)}
      >
        <MatIcon name="pencil-outline" size={18} color={PRIMARY} />
      </TouchableOpacity>
    </View>
  );

  renderClassItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.standardBadge}>
          <Text style={styles.standardText}>{item.standard}</Text>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Division {item.division} ({item.medium})</Text>
          <Text style={styles.subTitle}>Assigned: {item.teacherSubjectMappings[0]?.subjects?.join(', ') || 'General'}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.btn, styles.viewBtn]}
          onPress={() => this.fetchAssignments(item.id, `${item.standard}-${item.division}`)}
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

        {/* Modal: List of Assignments */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.isViewModalVisible}
          onRequestClose={() => this.setState({ isViewModalVisible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assignments: {this.state.selectedClassName}</Text>
                <TouchableOpacity onPress={() => this.setState({ isViewModalVisible: false })}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>

              {this.state.modalLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50 }} />
              ) : (
                <FlatList
                  data={this.state.assignments}
                  renderItem={this.renderAssignmentItem}
                  keyExtractor={(item) => item.id.toString()}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                       <MatIcon name="clipboard-off-outline" size={50} color="#ccc" />
                       <Text style={styles.emptyText}>No assignments found.</Text>
                    </View>
                  }
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Modal 2: Full Screen Image Preview with Zoom */}
        <Modal
          visible={!!this.state.previewImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => this.setState({ previewImage: null })}
        >
          <View style={styles.previewOverlay}>
            <TouchableOpacity
              style={styles.previewClose}
              onPress={() => this.setState({ previewImage: null })}
            >
              <MatIcon name="close-circle" size={35} color="#fff" />
            </TouchableOpacity>
            
            <ScrollView
              maximumZoomScale={5}
              minimumZoomScale={1}
              contentContainerStyle={styles.scrollViewCentered}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              {this.state.previewImage && (
                <Image
                  source={{ uri: this.state.previewImage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
          </View>
        </Modal>
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
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  standardBadge: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  standardText: { color: PRIMARY, fontWeight: 'bold', fontSize: 16 },
  titleContainer: { marginLeft: 15 },
  mainTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  subTitle: { fontSize: 12, color: '#666', marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  viewBtn: { borderWidth: 1, borderColor: PRIMARY },
  viewBtnText: { color: PRIMARY, fontWeight: '600', fontSize: 13 },
  addBtn: { backgroundColor: PRIMARY },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  // Modal & List Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: SCREEN_HEIGHT * 0.8, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a2e' },
  assignmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 15, marginBottom: 12 },
  assignmentThumb: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#eee' },
  assignmentInfo: { flex: 1, marginLeft: 12 },
  assignmentTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  assignmentDesc: { fontSize: 12, color: '#777', marginVertical: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#888' },
  editSmallBtn: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  // Full Preview Styles
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  previewClose: { position: 'absolute', top: 50, right: 25, zIndex: 100 },
  scrollViewCentered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10 }
});

export default TeacherAssignments;