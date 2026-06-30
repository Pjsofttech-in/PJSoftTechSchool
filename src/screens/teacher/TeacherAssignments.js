import React, { Component } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, ActivityIndicator, SafeAreaView, Modal, Dimensions, Image, ScrollView, TextInput, ToastAndroid, KeyboardAvoidingView, StatusBar, RefreshControl, Linking, } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import { ClassroomFilterBar } from '@components/ClassroomFilterBar';
import { applyClassroomFilters } from '@utils/classroomFilterUtils';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#7b68ee';
const RIPPLE_CONFIG = { color: 'rgba(123, 104, 238, 0.15)', borderless: false };
const WHITE_RIPPLE = { color: 'rgba(255, 255, 255, 0.2)', borderless: false };

export class TeacherAssignments extends Component {
  constructor(props) {
    super(props);
    this.state = {
      allClassrooms: [],
      classrooms: [],
      assignments: [],
      loading: true,
      isRefreshing: false,
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
      editingAssignmentId: null,
      existingImageUrl: null,
      isSubmissionsModalVisible: false,
      submissions: [],
      submissionsLoading: false,
      submissionsError: null,
      selectedAssignmentTitle: '',
      activeFilters: {},
      focusedField: null,
    };
  }

  componentDidMount() {
    this.fetchClassrooms(false);
  }

  fetchClassrooms = async (isBackgroundRefresh = false) => {
    if (isBackgroundRefresh) {
      this.setState({ isRefreshing: true, error: null });
    } else {
      this.setState({ loading: true, error: null });
    }

    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getClassRooms(user.id, user.email);
      const filtered = applyClassroomFilters(data, this.state.activeFilters);
      this.setState({ 
        allClassrooms: data, 
        classrooms: filtered, 
        loading: false, 
        isRefreshing: false 
      });
    } catch (err) {
      console.error('[Assignments] Fetch Error:', err);
      this.setState({ 
        loading: false, 
        isRefreshing: false, 
        error: 'Failed to load classrooms. Pull down to retry.' 
      });
    }
  };

  handleRefresh = () => {
    this.fetchClassrooms(true);
  };

  handleFilterApply = (filters) => {
    const filtered = applyClassroomFilters(this.state.allClassrooms, filters);
    this.setState({ activeFilters: filters, classrooms: filtered });
  };

  fetchAssignments = async (classId, className) => {
    this.setState({ isViewModalVisible: true, modalLoading: true, assignmentError: null, selectedClassName: className, assignments: [] });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getAssignmentsByClass(user.email, classId);
      this.setState({ assignments: data, modalLoading: false });
    } catch (err) {
      console.error('Fetch Assignments Error:', err);
      this.setState({ modalLoading: false, assignmentError: 'Failed to load assignments.' });
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
      isAddModalVisible: false, newTitle: '', newDesc: '', newDate: new Date(),
      selectedImage: null, submitAttempted: false, uploading: false,
      editingAssignmentId: null, existingImageUrl: null, focusedField: null
    });
  };

  handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.assets && response.assets.length > 0) {
        this.setState({ selectedImage: response.assets[0], existingImageUrl: null });
      }
    });
  };

  handleRemoveImage = () => { this.setState({ selectedImage: null, existingImageUrl: null }); };

  fetchSubmissions = async (assignmentId, assignmentTitle) => {
    this.setState({ isSubmissionsModalVisible: true, submissionsLoading: true, submissionsError: null, submissions: [], selectedAssignmentTitle: assignmentTitle });
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getSubmissionsByAssignmentId(user.email, assignmentId);
      this.setState({ submissions: data, submissionsLoading: false });
    } catch (err) {
      this.setState({ submissionsLoading: false, submissionsError: 'Failed to load submissions.' });
    }
  };

  handleViewAttachment = async (url) => {
    if (!url) {
      ToastAndroid.show(
        'Attachment not available',
        ToastAndroid.SHORT,
      );
      return;
    }
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      ToastAndroid.show(
        'Unable to open attachment',
        ToastAndroid.SHORT,
      );
    }
  };

  handlePostAssignment = async () => {
    const { newTitle, newDesc, newDate, selectedClassId, selectedImage, editingAssignmentId, existingImageUrl } = this.state;
    const { user } = useAuthStore.getState();
    this.setState({ submitAttempted: true });

    // Validation Only Title, Description, and Due Date are mandatory Image is optional.
    if (!newTitle || !newDesc || !newDate) {
      ToastAndroid.show('Please fix errors above', ToastAndroid.SHORT);
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
      formData.append('image', { uri: selectedImage.uri, type: selectedImage.type || 'image/jpeg', name: selectedImage.fileName || 'assignment.jpg' });
    }

    try {
      if (editingAssignmentId) {
        await teacherApi.updateAssignment(editingAssignmentId, formData, user.email);
        ToastAndroid.show('Assignment updated', ToastAndroid.SHORT);
      } else {
        await teacherApi.createAssignment(formData, user.email);
        ToastAndroid.show('Assignment posted successfully', ToastAndroid.SHORT);
      }
      this.closeAddModal();
      if (this.state.isViewModalVisible) this.fetchAssignments(selectedClassId, this.state.selectedClassName);
    } catch (err) {
      this.setState({ uploading: false });
      ToastAndroid.show('Server connection error', ToastAndroid.SHORT);
    }
  };

  renderAssignmentItem = ({ item }) => (
    <View style={styles.assignmentItem}>
      {item.image && (
        <Pressable onPress={() => this.setState({ previewImage: item.image })}>
          <Image source={{ uri: item.image }} style={styles.assignmentThumb} />
        </Pressable>
      )}
      <View style={styles.assignmentInfo}>
        <Text style={styles.assignmentTitle}>{item.assignmentTitle}</Text>
        <Text style={styles.assignmentDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.dateRow}>
          <MatIcon name="calendar-clock" size={14} color="#666" />
          <Text style={styles.dateText}>Due: {item.dueDate}</Text>
        </View>
      </View>
      <View style={styles.actionBtnGroup}>
        <Pressable android_ripple={RIPPLE_CONFIG} style={[styles.editSmallBtn, { marginBottom: 8 }]} onPress={() => this.fetchSubmissions(item.id, item.assignmentTitle)}>
          <MatIcon name="account-details-outline" size={18} color={PRIMARY} />
        </Pressable>
        <Pressable android_ripple={RIPPLE_CONFIG} style={styles.editSmallBtn} onPress={() => this.handleEditPress(item)}>
          <MatIcon name="pencil-outline" size={18} color={PRIMARY} />
        </Pressable>
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
          <Text style={styles.subTitle} numberOfLines={1}>
            Assigned: {item.teacherSubjectMappings[0]?.subjects?.join(', ') || 'General'}
          </Text>
        </View>
      </View>
      
      <View style={styles.buttonRow}>
        <Pressable android_ripple={RIPPLE_CONFIG} style={[styles.btn, styles.viewBtn]} onPress={() => this.fetchAssignments(item.id, `${item.standard}-${item.division}`)}>
          <MatIcon name="eye-outline" size={18} color={PRIMARY} />
          <Text style={styles.viewBtnText}>View All</Text>
        </Pressable>
        <Pressable android_ripple={WHITE_RIPPLE} style={[styles.btn, styles.addBtn]} onPress={() => this.setState({ isAddModalVisible: true, selectedClassId: item.id, selectedClassName: `${item.standard}-${item.division}`, editingAssignmentId: null })}>
          <MatIcon name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add New</Text>
        </Pressable>
      </View>
    </View>
  );

  render() {
    const { user } = useAuthStore.getState();
    const { submitAttempted, selectedImage, newTitle, newDesc, editingAssignmentId, existingImageUrl, focusedField, error, loading, classrooms } = this.state;

    if (error) {
      return (
        <ScrollView 
          contentContainerStyle={[styles.container, styles.centered]}
          refreshControl={
            <RefreshControl refreshing={this.state.isRefreshing} onRefresh={this.handleRefresh} colors={[PRIMARY]} />
          }
        >
          <MatIcon name="wifi-off" size={40} color="#bbb" />
          <Text style={styles.retryText}>{error}</Text>
          <Text style={{ fontFamily: 'Poppins-Regular', fontSize: 11, color: '#aaa', marginTop: 4 }}>Swipe down to refresh</Text>
        </ScrollView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#f4f5f9" barStyle="dark-content" />
        <ClassroomFilterBar email={user.email} onApply={this.handleFilterApply} />

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
        ) : (
          <FlatList
            data={classrooms}
            renderItem={this.renderClassItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl 
                refreshing={this.state.isRefreshing} 
                onRefresh={this.handleRefresh} 
                colors={[PRIMARY]}
                progressBackgroundColor="#fff"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <MatIcon name="clipboard-remove-outline" size={48} color="#bbb" />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>No classrooms matched filters.</Text>
              </View>
            }
          />
        )}

        {/* View Assignments Modal Container */}
        <Modal animationType="slide" visible={this.state.isViewModalVisible} onRequestClose={() => this.setState({ isViewModalVisible: false })}>
          <View style={styles.fullscreenModalContainer}>
            <View style={styles.androidActionBar}>
              <Pressable android_ripple={{ borderless: true, radius: 24 }} style={styles.actionIconPadding} onPress={() => this.setState({ isViewModalVisible: false })}>
                <MatIcon name="arrow-left" size={24} color="#1a1a2e" />
              </Pressable>
              <Text style={styles.actionBarTitle}>{this.state.selectedClassName} Assignments</Text>
            </View>
            
            {this.state.modalLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : (
              <FlatList
                data={this.state.assignments}
                renderItem={this.renderAssignmentItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MatIcon name="clipboard-text-outline" size={48} color="#ccc" />
                    <Text style={[styles.emptyText, { marginTop: 12 }]}>No assignments created yet.</Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>

        {/* Add / Edit Sheet Setup */}
        <Modal visible={this.state.isAddModalVisible} animationType="slide" onRequestClose={this.closeAddModal}>
          <View style={styles.fullscreenModalContainer}>
            <View style={styles.androidActionBar}>
              <Pressable android_ripple={{ borderless: true, radius: 24 }} style={styles.actionIconPadding} onPress={this.closeAddModal}>
                <MatIcon name="close" size={24} color="#1a1a2e" />
              </Pressable>
              <Text style={styles.actionBarTitle}>{editingAssignmentId ? 'Edit Assignment' : 'Create Assignment'}</Text>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
                
                <Text style={styles.label}>Assignment Title *</Text>
                <TextInput 
                  style={[
                    styles.input, 
                    focusedField === 'title' && styles.focusedInput,
                    submitAttempted && !newTitle ? styles.errorInput : null
                  ]} 
                  value={newTitle} 
                  onFocus={() => this.setState({ focusedField: 'title' })}
                  onBlur={() => this.setState({ focusedField: null })}
                  onChangeText={(t) => this.setState({ newTitle: t })} 
                  placeholder="e.g. Workbook Chapter 3" 
                  placeholderTextColor="#aaa" 
                />
                {submitAttempted && !newTitle && <Text style={styles.inlineErrorText}>Title required</Text>}
                
                <Text style={styles.label}>Description *</Text>
                <TextInput 
                  style={[
                    styles.input, 
                    { height: 100, textAlignVertical: 'top' }, 
                    focusedField === 'desc' && styles.focusedInput,
                    submitAttempted && !newDesc ? styles.errorInput : null
                  ]} 
                  multiline 
                  value={newDesc} 
                  onFocus={() => this.setState({ focusedField: 'desc' })}
                  onBlur={() => this.setState({ focusedField: null })}
                  onChangeText={(t) => this.setState({ newDesc: t })} 
                  placeholder="Enter detailed submission requirements..." 
                  placeholderTextColor="#aaa" 
                />
                {submitAttempted && !newDesc && <Text style={styles.inlineErrorText}>Description required</Text>}
                
                <Text style={styles.label}>Due Date *</Text>
                <Pressable android_ripple={RIPPLE_CONFIG} style={styles.datePickerBtn} onPress={() => this.setState({ showDatePicker: true })}>
                  <MatIcon name="calendar-clock" size={20} color={PRIMARY} />
                  <Text style={styles.datePickerText} >{this.state.newDate.toDateString()}</Text>
                </Pressable>
                
                <Text style={styles.label}>Attachment Reference (Optional)</Text>
                <Pressable 
                  android_ripple={RIPPLE_CONFIG}
                  style={styles.imagePickBtn} 
                  onPress={this.handlePickImage}
                >
                  {selectedImage || existingImageUrl ? (
                    <View style={{ width: '100%', height: '100%' }}>
                      <Image source={{ uri: selectedImage ? selectedImage.uri : existingImageUrl }} style={styles.previewThumb} />
                      <Pressable style={styles.removeImageBtn} onPress={this.handleRemoveImage}>
                        <MatIcon name="close-circle" size={24} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MatIcon name="camera-plus-outline" size={32} color={PRIMARY} />
                      <Text style={styles.imagePlaceholderText}>Upload Image Sheet</Text>
                    </View>
                  )}
                </Pressable>
                
                <Pressable android_ripple={WHITE_RIPPLE} style={styles.submitBtn} onPress={this.handlePostAssignment} disabled={this.state.uploading}>
                  {this.state.uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editingAssignmentId ? 'Update Assignment' : 'Post Assignment'}</Text>}
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
          <DatePicker modal open={this.state.showDatePicker} date={this.state.newDate} mode="date" onConfirm={(date) => this.setState({ showDatePicker: false, newDate: date })} onCancel={() => this.setState({ showDatePicker: false })} />
        </Modal>

        {/* Full Image Preview Modal */}
        <Modal visible={!!this.state.previewImage} transparent onRequestClose={() => this.setState({ previewImage: null })}>
          <View style={styles.previewOverlay}>
            <Pressable style={styles.previewClose} onPress={() => this.setState({ previewImage: null })}>
              <MatIcon name="close-circle" size={35} color="#fff" />
            </Pressable>
            <ScrollView maximumZoomScale={5} minimumZoomScale={1} contentContainerStyle={styles.scrollViewCentered}>
              {this.state.previewImage && <Image source={{ uri: this.state.previewImage }} style={styles.fullImage} resizeMode="contain" />}
            </ScrollView>
          </View>
        </Modal>

        {/* Submissions Modal */}
        <Modal animationType="slide" visible={this.state.isSubmissionsModalVisible} onRequestClose={() => this.setState({ isSubmissionsModalVisible: false })}>
          <View style={styles.fullscreenModalContainer}>
            <View style={styles.androidActionBar}>
              <Pressable android_ripple={{ borderless: true, radius: 24 }} style={styles.actionIconPadding} onPress={() => this.setState({ isSubmissionsModalVisible: false })}>
                <MatIcon name="arrow-left" size={24} color="#1a1a2e" />
              </Pressable>
              <View>
                <Text style={styles.actionBarTitle}>Submissions</Text>
                <Text style={styles.actionBarSubTitle} numberOfLines={1}>{this.state.selectedAssignmentTitle}</Text>
              </View>
            </View>
            
            {this.state.submissionsLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
            ) : (
              <FlatList
                data={this.state.submissions}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<View style={styles.emptyBox}><MatIcon name="account-off-outline" size={48} color="#ccc" /><Text style={[styles.emptyText, { marginTop: 12 }]}>No student submissions yet.</Text></View>}
                renderItem={({ item }) => (
                  <View style={styles.submissionItem}>
                    <View style={styles.submissionAvatar}><Text style={styles.submissionAvatarText}>{item.studentName?.charAt(0).toUpperCase()}</Text></View>
                    <View style={styles.submissionInfo}>
                      <Text style={styles.submissionName}>{item.studentName}</Text>
                      <Text style={styles.submissionMeta}>Roll No: {item.rollNo} · {item.submittedDate}</Text>
                      {item.remarks ? <Text style={styles.submissionRemarks} numberOfLines={2}>{item.remarks}</Text> : null}
                      {item.fileUrl ? (
                      <Pressable
                      onPress={() => this.handleViewAttachment(item.fileUrl)}
                      android_ripple={RIPPLE_CONFIG}
                      style={styles.attachmentRow}
                      >
                      <MatIcon
                      name="paperclip"
                      size={14}
                      color={PRIMARY}
                      />
                      <Text style={styles.attachmentText}>
                      View Attachment
                      </Text>
                      </Pressable>
                    ) : null}
                    </View>
                    <View style={styles.submissionStatusBadge}><Text style={styles.submissionStatusText}>{item.status}</Text></View>
                  </View>
                )}
              />
            )}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryText: { fontFamily: 'Poppins-Regular', color: '#777', marginTop: 12, textAlign: 'center' },
  listContainer: { padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  standardBadge: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  standardText: { fontFamily: 'Poppins-Medium', color: PRIMARY, fontSize: 15 },
  titleContainer: { marginLeft: 12, flex: 1 },
  mainTitle: { fontFamily: 'Poppins-Medium', fontSize: 15, color: '#1a1a2e' },
  subTitle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666', marginTop: 1 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6, overflow: 'hidden' },
  viewBtn: { borderWidth: 1, borderColor: PRIMARY },
  viewBtnText: { fontFamily: 'Poppins-Medium', color: PRIMARY, fontSize: 13 },
  addBtn: { backgroundColor: PRIMARY },
  addBtnText: { fontFamily: 'Poppins-Medium', color: '#fff', fontSize: 13 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontFamily: 'Poppins-Regular', color: '#888', textAlign: 'center' },
  fullscreenModalContainer: { flex: 1, backgroundColor: '#fff' },
  androidActionBar: { height: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff', elevation: 2, paddingHorizontal: 4 },
  actionIconPadding: { padding: 12, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionBarTitle: { fontFamily: 'Poppins-Medium', fontSize: 18, color: '#1a1a2e', marginLeft: 8 },
  actionBarSubTitle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666', marginLeft: 8, marginTop: -2, marginRight: 40 },
  assignmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdfdfd', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  assignmentThumb: { width: 50, height: 50, borderRadius: 6 },
  assignmentInfo: { flex: 1, marginLeft: 12 },
  assignmentTitle: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#333' },
  assignmentDesc: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#777' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dateText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#666' },
  actionBtnGroup: { marginLeft: 10, alignItems: 'center' },
  editSmallBtn: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  label: { fontFamily: 'Poppins-Medium', fontSize: 13, marginBottom: 6, marginTop: 16, color: '#222' },
  input: { fontFamily: 'Poppins-Regular', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, backgroundColor: '#fafafa', color: '#333', fontSize: 14 },
  focusedInput: { borderColor: PRIMARY, backgroundColor: '#fff' },
  errorInput: { borderColor: '#ff4d4d', backgroundColor: '#fff8f8' },
  inlineErrorText: { fontFamily: 'Poppins-Regular', color: '#ff4d4d', fontSize: 11, marginTop: 4, marginLeft: 2 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, backgroundColor: '#fafafa' },
  datePickerText: { fontFamily: 'Poppins-Regular', color: '#333' },
  imagePickBtn: { marginTop: 4, width: '100%', height: 140, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', overflow: 'hidden' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { fontFamily: 'Poppins-Regular', color: '#666', fontSize: 12, marginTop: 4 },
  previewThumb: { width: '100%', height: '100%', borderRadius: 8 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 2 },
  submitBtn: { backgroundColor: PRIMARY, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 32, marginBottom: 20, overflow: 'hidden', elevation: 2 },
  submitBtnText: { fontFamily: 'Poppins-Medium', color: '#fff', fontSize: 15 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,1)' },
  previewClose: { position: 'absolute', top: 20, right: 20, zIndex: 100 },
  scrollViewCentered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
  submissionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcfcfc', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  submissionAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ede9ff', justifyContent: 'center', alignItems: 'center' },
  submissionAvatarText: { fontFamily: 'Poppins-Medium', color: PRIMARY, fontSize: 14 },
  submissionInfo: { flex: 1, marginLeft: 10 },
  submissionName: { fontFamily: 'Poppins-Medium', fontSize: 13, color: '#1a1a2e' },
  submissionMeta: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#888', marginTop: 1 },
  submissionRemarks: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#666', marginTop: 3 },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#ede9ff', },
  attachmentText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: PRIMARY, marginLeft: 4, },
  submissionStatusBadge: { backgroundColor: '#e4ffed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  submissionStatusText: { fontFamily: 'Poppins-Medium', fontSize: 11, color: '#2e7d32' },
});

export default TeacherAssignments;