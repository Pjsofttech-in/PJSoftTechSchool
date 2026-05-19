import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Dimensions, Image, ScrollView, TextInput, ToastAndroid, KeyboardAvoidingView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#7b68ee';

export class TeacherAssignments extends Component {
  constructor(props) {
    super(props);
    this.state = {
      classrooms: [],
      assignments: [],
      loading: true,
      error: null,             
      modalLoading: false,
      assignmentError: null,        
      isViewModalVisible: false,
      selectedClassName: '',
      previewImage: null,
      isAddModalVisible: false,
      uploading: false,
      newTitle: '',
      newDesc: '',
      newDate: new Date(),
      showDatePicker: false,
      selectedClassId: null,
      selectedImage: null,
      submitAttempted: false,
      // Edit Mode 
      editingAssignmentId: null,
      existingImageUrl: null,
      // Submissions
      isSubmissionsModalVisible: false,
      submissions: [],
      submissionsLoading: false,
      submissionsError: null,
      selectedAssignmentTitle: '',
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
      console.error('[Assignments] Fetch Error:', err);
      this.setState({ loading: false, error: 'Failed to load classrooms. Tap to retry.' });
    }
  };

  fetchAssignments = async (classId, className) => {
    this.setState({
      isViewModalVisible: true,
      modalLoading: true,
      assignmentError: null,
      selectedClassName: className,
      assignments: []
    });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getAssignmentsByClass(user.email, classId);
      this.setState({ assignments: data, modalLoading: false });
    } catch (err) {
      console.error('Fetch Assignments Error:', err);
      this.setState({ modalLoading: false, assignmentError: 'Failed to load assignments. Please try again.' });
    }
  };

  handleEditPress = (item) => {
    this.setState({
      isAddModalVisible: true,
      editingAssignmentId: item.id,
      newTitle: item.assignmentTitle,
      newDesc: item.description,
      newDate: new Date(item.dueDate),
      selectedClassId: item.classRoomId,
      existingImageUrl: item.image,
      selectedImage: null,
      submitAttempted: false,
    });
  };

  closeAddModal = () => {
    this.setState({
      isAddModalVisible: false,
      newTitle: '',
      newDesc: '',
      newDate: new Date(),
      selectedImage: null,
      submitAttempted: false,
      uploading: false,
      editingAssignmentId: null,
      existingImageUrl: null,
    });
  };

  handlePickImage = () => {
    const options = { mediaType: 'photo', quality: 0.8 };
    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        this.setState({ selectedImage: response.assets[0], existingImageUrl: null });
      }
    });
  };

  handleRemoveImage = () => {
    this.setState({ selectedImage: null, existingImageUrl: null });
  };

  fetchSubmissions = async (assignmentId, assignmentTitle) => {
    this.setState({
      isSubmissionsModalVisible: true,
      submissionsLoading: true,
      submissionsError: null,
      submissions: [],
      selectedAssignmentTitle: assignmentTitle,
    });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getSubmissionsByAssignmentId(user.email, assignmentId);
      this.setState({ submissions: data, submissionsLoading: false });
    } catch (err) {
      console.error('Fetch Submissions Error:', err);
      this.setState({ submissionsLoading: false, submissionsError: 'Failed to load submissions. Please try again.' });
    }
  };

  handlePostAssignment = async () => {
    const { newTitle, newDesc, newDate, selectedClassId, selectedImage, editingAssignmentId, existingImageUrl } = this.state;
    const { user } = useAuthStore.getState();

    this.setState({ submitAttempted: true });

    // Validation: Image is required only if it's a new post or if we removed existing image
    if (!newTitle || !newDesc || (!selectedImage && !existingImageUrl)) {
      ToastAndroid.show('Please fill all fields and provide an image', ToastAndroid.SHORT);
      return;
    }

    this.setState({ uploading: true });

    const formData = new FormData();
    const assignmentPayload = {
      assignmentTitle: newTitle,
      description: newDesc,
      dueDate: newDate.toISOString().split('T')[0],
      branchCode: user.branchCode,
      role: 'teacher',
      createdByEmail: user.email,
      teacher: { id: String(user.id) },
      classRoom: { id: selectedClassId },
    };

    formData.append('assignment', JSON.stringify(assignmentPayload));
    
    if (selectedImage) {
      formData.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || 'assignment.jpg',
      });
    }

    try {
      if (editingAssignmentId) {
        // Edit Mode
        await teacherApi.updateAssignment(editingAssignmentId, formData, user.email);
        ToastAndroid.show('Assignment updated successfully!', ToastAndroid.SHORT);
      } else {
        // Create Mode
        await teacherApi.createAssignment(formData, user.email);
        ToastAndroid.show('Assignment posted successfully!', ToastAndroid.LONG);
      }
      this.closeAddModal();
      // Refresh list if view modal is open
      if (this.state.isViewModalVisible) {
        this.fetchAssignments(selectedClassId, this.state.selectedClassName);
      }
    } catch (err) {
      this.setState({ uploading: false });
      ToastAndroid.show('Server error while saving', ToastAndroid.SHORT);
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
        <Text style={styles.assignmentDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.dateRow}>
          <MatIcon name="calendar-clock" size={12} color="#888" />
          <Text style={styles.dateText}>Due: {item.dueDate}</Text>
        </View>
      </View>
      <View style={styles.actionBtnGroup}>
        <TouchableOpacity
          style={[styles.editSmallBtn, { marginBottom: 8 }]}
          onPress={() => this.fetchSubmissions(item.id, item.assignmentTitle)}
        >
          <MatIcon name="account-details-outline" size={18} color={PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editSmallBtn}
          onPress={() => this.handleEditPress(item)}
        >
          <MatIcon name="pencil-outline" size={18} color={PRIMARY} />
        </TouchableOpacity>
      </View>
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
          onPress={() => this.setState({
            isAddModalVisible: true,
            selectedClassId: item.id,
            selectedClassName: `${item.standard}-${item.division}`,
            editingAssignmentId: null,
          })}
        >
          <MatIcon name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  render() {
    if (this.state.error) {
      return (
        <View style={styles.centered}>
          <MatIcon name="wifi-off" size={40} color="#ccc" />
          <Text style={styles.retryText}>{this.state.error}</Text>
          <TouchableOpacity
            style={[styles.btn, styles.addBtn, { marginTop: 20, paddingHorizontal: 24, flex: 0 }]}
            onPress={this.fetchClassrooms}
          >
            <MatIcon name="refresh" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (this.state.loading) {
      return <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>;
    }

    const { submitAttempted, selectedImage, newTitle, newDesc, editingAssignmentId, existingImageUrl } = this.state;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerSub}>Manage and track student tasks</Text>
        </View>

        <FlatList
          data={this.state.classrooms}
          renderItem={this.renderClassItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />

        {/* View Modal */}
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
              ) : this.state.assignmentError ? (
                <View style={styles.emptyBox}>
                  <MatIcon name="alert-circle-outline" size={36} color="#ccc" />
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>{this.state.assignmentError}</Text>
                </View>
              ) : (
                <FlatList
                  data={this.state.assignments}
                  renderItem={this.renderAssignmentItem}
                  keyExtractor={(item) => item.id.toString()}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <MatIcon name="clipboard-text-outline" size={40} color="#ccc" />
                      <Text style={[styles.emptyText, { marginTop: 8 }]}>No assignments yet.</Text>
                      <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>Tap Add New to create one.</Text>
                    </View>
                  }
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Add/Edit Modal */}
        <Modal
          visible={this.state.isAddModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={this.closeAddModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior="padding"
              style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.92 }]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{editingAssignmentId ? 'Edit Assignment' : 'Create Assignment'}</Text>
                  <Text style={styles.modalSubTitle}>Class: {this.state.selectedClassName}</Text>
                </View>
                <TouchableOpacity onPress={this.closeAddModal}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <Text style={styles.label}>
                  Assignment Title <Text style={{ color: 'red' }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    submitAttempted && !newTitle ? { borderColor: '#ff4d4d' } : null,
                  ]}
                  value={this.state.newTitle}
                  onChangeText={(t) => this.setState({ newTitle: t })}
                  placeholder="e.g. Math Quiz"
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>
                  Description <Text style={{ color: 'red' }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { height: 75, textAlignVertical: 'top' },
                    submitAttempted && !newDesc ? { borderColor: '#ff4d4d' } : null,
                  ]}
                  multiline
                  value={this.state.newDesc}
                  onChangeText={(t) => this.setState({ newDesc: t })}
                  placeholder="Enter details..."
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => this.setState({ showDatePicker: true })}
                >
                  <MatIcon name="calendar-clock" size={20} color={PRIMARY} />
                  <Text style={styles.datePickerText}>{this.state.newDate.toDateString()}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>
                  Attachment <Text style={{ color: 'red' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.imagePickBtn,
                    submitAttempted && !selectedImage && !existingImageUrl ? { borderColor: '#ff4d4d' } : null,
                  ]}
                  onPress={this.handlePickImage}
                >
                  {selectedImage || existingImageUrl ? (
                    <View style={{ width: '100%', height: '100%' }}>
                      <Image 
                        source={{ uri: selectedImage ? selectedImage.uri : existingImageUrl }} 
                        style={styles.previewThumb} 
                      />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={this.handleRemoveImage}
                      >
                        <MatIcon name="close-circle" size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MatIcon name="camera-plus-outline" size={30} color="#aaa" />
                      <Text style={styles.imagePlaceholderText}>Pick Image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={this.handlePostAssignment}
                  disabled={this.state.uploading}
                >
                  {this.state.uploading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.submitBtnText}>
                        {editingAssignmentId ? 'Update Assignment' : 'Post Assignment'}
                      </Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          <DatePicker
            modal
            open={this.state.showDatePicker}
            date={this.state.newDate}
            mode="date"
            onConfirm={(date) => this.setState({ showDatePicker: false, newDate: date })}
            onCancel={() => this.setState({ showDatePicker: false })}
          />
        </Modal>

        {/* Full Image Preview Modal */}
        <Modal
          visible={!!this.state.previewImage}
          transparent={true}
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

        {/* Submissions Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.isSubmissionsModalVisible}
          onRequestClose={() => this.setState({ isSubmissionsModalVisible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.85 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.modalTitle}>Submissions</Text>
                  <Text style={styles.modalSubText} numberOfLines={1}>
                    {this.state.selectedAssignmentTitle}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => this.setState({ isSubmissionsModalVisible: false })}>
                  <MatIcon name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>

              {this.state.submissionsLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 50, marginBottom: 50 }} />
              ) : this.state.submissionsError ? (
                <View style={styles.emptyBox}>
                  <MatIcon name="alert-circle-outline" size={36} color="#ccc" />
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>{this.state.submissionsError}</Text>
                </View>
              ) : (
                <FlatList
                  data={this.state.submissions}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <MatIcon name="account-off-outline" size={40} color="#ccc" />
                      <Text style={[styles.emptyText, { marginTop: 8 }]}>No submissions yet.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.submissionItem}>
                      <View style={styles.submissionAvatar}>
                        <Text style={styles.submissionAvatarText}>
                          {item.studentName?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.submissionInfo}>
                        <Text style={styles.submissionName}>{item.studentName}</Text>
                        <Text style={styles.submissionMeta}>Roll No: {item.rollNo} · {item.submittedDate}</Text>
                        {item.remarks ? (
                          <Text style={styles.submissionRemarks} numberOfLines={2}>{item.remarks}</Text>
                        ) : null}
                      </View>
                      <View style={styles.submissionStatusBadge}>
                        <Text style={styles.submissionStatusText}>{item.status}</Text>
                      </View>
                    </View>
                  )}
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
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#fff', elevation: 2 },
  headerSub: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#888', marginTop: 4 },
  retryText: { fontFamily: 'Poppins-Regular', color: '#999', marginTop: 12, textAlign: 'center' },
  listContainer: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  standardBadge: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  standardText: { fontFamily: 'Poppins-Medium', color: PRIMARY, fontSize: 16 },
  titleContainer: { marginLeft: 15 },
  mainTitle: { fontFamily: 'Poppins-Medium', fontSize: 16, color: '#1a1a2e' },
  subTitle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666', marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  viewBtn: { borderWidth: 1, borderColor: PRIMARY },
  viewBtnText: { fontFamily: 'Poppins-Medium', color: PRIMARY, fontSize: 13 },
  addBtn: { backgroundColor: PRIMARY },
  addBtnText: { fontFamily: 'Poppins-Medium', color: '#fff', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Poppins-Medium', fontSize: 18, color: '#1a1a2e' },
  modalSubTitle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#999' },
  assignmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 15, marginBottom: 12 },
  assignmentThumb: { width: 50, height: 50, borderRadius: 10 },
  assignmentInfo: { flex: 1, marginLeft: 12 },
  assignmentTitle: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#333' },
  assignmentDesc: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#777' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dateText: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#888' },
  actionBtnGroup: { marginLeft: 10, alignItems: 'center' },
  editSmallBtn: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: 'Poppins-Medium', fontSize: 14, marginBottom: 5, marginTop: 15, color: '#333' },
  input: { fontFamily: 'Poppins-Regular', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#f9f9f9', color: '#333' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#f9f9f9' },
  datePickerText: { fontFamily: 'Poppins-Regular', color: '#333' },
  imagePickBtn: { marginTop: 10, width: '100%', height: 160, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fcfcfc' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { fontFamily: 'Poppins-Regular', color: '#aaa', fontSize: 12 },
  previewThumb: { width: '100%', height: '100%', borderRadius: 15 },
  removeImageBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12 },
  submitBtn: { backgroundColor: PRIMARY, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  submitBtnText: { fontFamily: 'Poppins-Medium', color: '#fff', fontSize: 16 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  previewClose: { position: 'absolute', top: 50, right: 25, zIndex: 100 },
  scrollViewCentered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
  emptyBox: { alignItems: 'center', marginTop: 30 },
  emptyText: { fontFamily: 'Poppins-Regular', color: '#999' },
  // Submissions
  submissionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 15, marginBottom: 10 },
  submissionAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  submissionAvatarText: { fontFamily: 'Poppins-Medium', color: PRIMARY, fontSize: 15 },
  submissionInfo: { flex: 1, marginLeft: 10 },
  submissionName: { fontFamily: 'Poppins-Medium', fontSize: 13, color: '#1a1a2e' },
  submissionMeta: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#999', marginTop: 2 },
  submissionRemarks: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#777', marginTop: 3 },
  submissionStatusBadge: { backgroundColor: '#e4ffed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  submissionStatusText: { fontFamily: 'Poppins-Medium', fontSize: 11, color: '#2e7d32' },
  modalSubText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#999' },
});

export default TeacherAssignments;