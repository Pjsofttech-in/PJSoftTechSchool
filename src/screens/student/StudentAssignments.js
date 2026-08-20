import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Image, Modal, TextInput, KeyboardAvoidingView, ToastAndroid } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { studentApi } from '@api/studentApi';

// Theme Configuration
const PRIMARY = '#7b68ee';
const PRIMARY_LIGHT = '#ede9ff';
const PRIMARY_DARK = '#5a4fcf';
const WHITE = '#ffffff';
const GREY_1 = '#f5f4fb';
const GREY_2 = '#e8e6f5';
const TEXT_DARK = '#1a1a2e';
const TEXT_MID = '#555577';
const TEXT_LIGHT = '#9999bb';
const GREEN = '#22c55e';
const RED = '#ef4444';
const ORANGE = '#f97316';

// Helpers
const formatDisplay = dateStr => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
};

const getDaysInfo = dueDateStr => {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: RED, bg: '#fee2e2' };
  if (diff === 0) return { label: 'Due today', color: ORANGE, bg: '#ffedd5' };
  if (diff <= 3) return { label: `${diff}d left`, color: ORANGE, bg: '#ffedd5' };
  return { label: `${diff}d left`, color: GREEN, bg: '#dcfce7' };
};

// SUBMIT MODAL
const SubmitModal = React.memo(({ visible, assignment, onClose, onSubmit, submitting, submitError }) => {
  const [remarks, setRemarks] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleSubmit = () => {
    if (!remarks.trim()) return;
    onSubmit(assignment?.id, remarks.trim(), fileUrl.trim());
  };

  const handleClose = () => {
    setRemarks('');
    setFileUrl('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior="height">
        <View style={styles.submitModal}>
          <View style={styles.submitModalHeader}>
            <View style={styles.submitModalHeaderLeft}>
              <MatIcon name="send-outline" size={18} color={PRIMARY} />
              <Text style={styles.submitModalTitle}>Submit Assignment</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <MatIcon name="close" size={22} color={TEXT_MID} />
            </TouchableOpacity>
          </View>

          {assignment && (
            <View style={styles.submitAssignmentName}>
              <MatIcon name="clipboard-text-outline" size={14} color={PRIMARY} />
              <Text style={styles.submitAssignmentNameText} numberOfLines={2}>
                {assignment.assignmentTitle}
              </Text>
            </View>
          )}

          {submitError && (
            <View style={styles.submitErrorBanner}>
              <MatIcon name="alert-circle-outline" size={14} color={RED} />
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Remarks *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your remarks..."
            placeholderTextColor={TEXT_LIGHT}
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={3}
            editable={!submitting}
          />

          <Text style={styles.inputLabel}>File URL (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textInputSingle]}
            placeholder="Paste file/drive link here..."
            placeholderTextColor={TEXT_LIGHT}
            value={fileUrl}
            onChangeText={setFileUrl}
            autoCapitalize="none"
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.submitBtn, (!remarks.trim() || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!remarks.trim() || submitting}
            activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                <MatIcon name="send" size={16} color={WHITE} />
                <Text style={styles.submitBtnText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ELITE OPTIMIZED ASSIGNMENT CARD
const AssignmentCard = React.memo(({ item, isExpanded, isExpandable, onToggleExpand, onTextMeasured, onImagePress, onSubmitPress }) => {
  const daysInfo = useMemo(() => getDaysInfo(item.dueDate), [item.dueDate]);
  const isSubmitted = item.assignmentStatus === 'Submitted' || item.assignmentStatus === 'Late' || !!item.submitted;

  const handleHiddenTextLayout = useCallback((e) => {
    if (isExpandable !== undefined) return;
    onTextMeasured(item.id, e.nativeEvent.lines.length > 2);
  }, [item.id, isExpandable, onTextMeasured]);

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {item.image ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress(item.image)} style={styles.thumbWrap}>
            <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.thumbOverlay}>
              <MatIcon name="magnify-plus-outline" size={18} color={WHITE} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.thumbWrap, styles.thumbPlaceholder]}>
            <MatIcon name="file-document-outline" size={26} color={PRIMARY} />
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.assignmentTitle}</Text>

          {item.description ? (
            <View>
              {/* Invisible full-width measurement copy: Safely triggers layout on Android then unmounts */}
              {isExpandable === undefined && (
                <Text style={styles.hiddenMeasureText} onTextLayout={handleHiddenTextLayout} pointerEvents="none">
                  {item.description}
                </Text>
              )}

              {/* Stabilized display node */}
              <Text style={styles.cardDesc} numberOfLines={isExpanded ? undefined : 2}>
                {item.description}
              </Text>

              {isExpandable && (
                <TouchableOpacity onPress={() => onToggleExpand(item.id)} style={styles.readMoreBtn} activeOpacity={0.7}>
                  <Text style={styles.readMoreText}>{isExpanded ? 'Read Less' : 'Read More'}</Text>
                  <MatIcon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={PRIMARY} />
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <MatIcon name="calendar-plus" size={11} color={TEXT_LIGHT} />
              <Text style={styles.dateText}>{formatDisplay(item.createdDate)}</Text>
            </View>
            <View style={styles.dateItem}>
              <MatIcon name="calendar-clock" size={11} color={TEXT_LIGHT} />
              <Text style={styles.dateText}>{formatDisplay(item.dueDate)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.teacherRow}>
          <MatIcon name="account-outline" size={12} color={TEXT_LIGHT} />
          <Text style={styles.teacherText} numberOfLines={1}>{item.createdByEmail}</Text>
        </View>
        <View style={styles.footerRight}>
          {daysInfo && (
            <View style={[styles.dueBadge, { backgroundColor: daysInfo.bg }]}>
              <Text style={[styles.dueBadgeText, { color: daysInfo.color }]}>{daysInfo.label}</Text>
            </View>
          )}

          {isSubmitted ? (
            <View style={styles.submittedChip}>
              <MatIcon name="check-circle-outline" size={12} color={GREEN} />
              <Text style={styles.submittedChipText}>Submitted</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.submitChip} activeOpacity={0.8} onPress={() => onSubmitPress(item)}>
              <MatIcon name="send-outline" size={12} color={WHITE} />
              <Text style={styles.submitChipText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

// MAIN SCREEN
const StudentAssignments = () => {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Consolidated Parent Metadata State Object: Unified lookups and atomic renders
  const [descriptionMeta, setDescriptionMeta] = useState({});

  // Submit/History modal states
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [submittedAssignments, setSubmittedAssignments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAssignments = useCallback(async () => {
  try {
    setError(null);
    const student = await studentApi.getStudentById(user?.id, user?.role, user?.email);
    const data = await studentApi.getAssignments(student?.classsRoomId, user?.role, user?.email);
    
    setDescriptionMeta({});

    // Sort latest assignments to the top
    const sortedData = Array.isArray(data) 
      ? [...data].sort((a, b) => b.id - a.id) 
      : [];

    setAssignments(sortedData);
  } catch (e) {
    console.error('[StudentAssignments] fetch error:', e.message);
    setError(e.message || 'Failed to load assignments.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [user]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignments();
  }, [fetchAssignments]);

  const handleSubmitPress = useCallback(assignment => {
    setSelectedAssignment(assignment);
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitModalVisible(true);
  }, []);

  const handleCloseSubmitModal = useCallback(() => {
    setSubmitModalVisible(false);
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(async (assignmentId, remarks, fileUrl) => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      await studentApi.submitAssignment(user?.role, user?.email, assignmentId, user?.id, remarks, fileUrl);
      setSubmitModalVisible(false);

      setAssignments(prev => prev.map(a => (a.id === assignmentId ? { ...a, submitted: true } : a)));
      setSubmitSuccess('Assignment submitted successfully!');
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (e) {
      console.error('[StudentAssignments] submit error:', e.message);
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  const fetchSubmittedAssignments = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await studentApi.getSubmittedAssignments(user?.id, user?.role, user?.email);
      setSubmittedAssignments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[StudentAssignments] history fetch error:', e.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // Combined state dictionary mutations
  const handleToggleExpand = useCallback((id) => {
    setDescriptionMeta(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        expanded: !prev[id]?.expanded
      }
    }));
  }, []);

  const handleTextMeasured = useCallback((id, isExpandable) => {
    setDescriptionMeta(prev => {
      if (prev[id]?.expandable === isExpandable) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          expandable: isExpandable
        }
      };
    });
  }, []);

  const metrics = useMemo(() => {
    let overdue = 0, today = 0, upcoming = 0;
    assignments.forEach(a => {
      const info = getDaysInfo(a.dueDate);
      if (info?.color === RED) overdue++;
      else if (info?.label === 'Due today') today++;
      else if (info?.color === GREEN) upcoming++;
    });
    return { total: assignments.length, overdue, today, upcoming };
  }, [assignments]);

  const renderItem = useCallback(({ item }) => {
    const meta = descriptionMeta[item.id] || {};
    return (
      <AssignmentCard
        item={item}
        isExpanded={!!meta.expanded}
        isExpandable={meta.expandable}
        onToggleExpand={handleToggleExpand}
        onTextMeasured={handleTextMeasured}
        onImagePress={setPreviewImage}
        onSubmitPress={handleSubmitPress}
      />
    );
  }, [descriptionMeta, handleToggleExpand, handleTextMeasured, handleSubmitPress]);

  const keyExtractor = useCallback(item => item.id.toString(), []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading assignments…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="alert-circle-outline" size={48} color={ORANGE} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAssignments}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (assignments.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="clipboard-check-outline" size={56} color={GREY_2} />
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtext}>No assignments have been posted for your class yet. Check back later.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{metrics.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#ffb3b3' }]}>{metrics.overdue}</Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#fde68a' }]}>{metrics.today}</Text>
          <Text style={styles.summaryLabel}>Due Today</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#a8f0c0' }]}>{metrics.upcoming}</Text>
          <Text style={styles.summaryLabel}>Upcoming</Text>
        </View>
      </View>

      {submitSuccess && (
        <View style={styles.successToast}>
          <MatIcon name="check-circle-outline" size={16} color={GREEN} />
          <Text style={styles.successToastText}>{submitSuccess}</Text>
        </View>
      )}

      <FlatList
        data={assignments}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        windowSize={15}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
        }
      />

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.historyButton} onPress={() => { fetchSubmittedAssignments(); setHistoryVisible(true); }}>
          <MatIcon name="history" size={20} color={WHITE} />
          <Text style={styles.historyButtonText}>My Submissions</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <MatIcon name="close-circle" size={32} color={WHITE} />
          </TouchableOpacity>
          {previewImage && <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />}
        </View>
      </Modal>

      <SubmitModal visible={submitModalVisible} assignment={selectedAssignment} onClose={handleCloseSubmitModal} onSubmit={handleSubmit} submitting={submitting} submitError={submitError} />

      <Modal visible={historyVisible} animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <TouchableOpacity onPress={() => setHistoryVisible(false)}>
              <MatIcon name="arrow-left" size={24} color={TEXT_DARK} />
            </TouchableOpacity>
            <Text style={styles.historyTitle}>Submission History</Text>
            <View style={{ width: 24 }} />
          </View>

          {historyLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : (
            <FlatList
              data={submittedAssignments}
              keyExtractor={keyExtractor}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <Text style={styles.historyAssignment}>{item.assignmentTitle}</Text>
                  <Text style={styles.historyRemarks}>{item.remarks}</Text>
                  <Text style={styles.historyDate}>Submitted : {formatDisplay(item.submittedDate)}</Text>
                  <View style={styles.historyFooter}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{item.status || 'Submitted'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editBtn}
                      activeOpacity={0.7}
                      onPress={() => ToastAndroid.showWithGravity('Please continue via the website.', ToastAndroid.LONG, ToastAndroid.BOTTOM)}>
                      <MatIcon name="pencil-outline" size={14} color={WHITE} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GREY_1 },
  summaryCard: { flexDirection: 'row', backgroundColor: PRIMARY, paddingVertical: 14, paddingHorizontal: 8, elevation: 6, shadowColor: PRIMARY_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: WHITE, lineHeight: 22, },
  summaryLabel: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.7)', marginTop: 1, },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4, },
  successToast: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', marginHorizontal: 12, marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderLeftWidth: 3, borderLeftColor: GREEN, },
  successToastText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: GREEN, flex: 1, },
  listContent: { padding: 12, paddingTop: 14, paddingBottom: 20 },
  card: { backgroundColor: WHITE, borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, },
  cardContent: { flexDirection: 'row', padding: 12, gap: 10 },
  thumbWrap: { width: 70, height: 70, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 3, borderTopLeftRadius: 8, },
  thumbPlaceholder: { backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginBottom: 3, },
  cardDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: TEXT_MID, marginBottom: 5, lineHeight: 16, },
  
  hiddenMeasureText: { position: 'absolute', opacity: 0, zIndex: -1, width: '100%',fontSize: 12, fontFamily: 'Poppins-Regular', lineHeight: 16 },
  
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 2, marginBottom: 6, gap: 2, },
  readMoreText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: PRIMARY, },
  datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dateText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: GREY_2, },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8, },
  teacherText: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, flex: 1, },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dueBadgeText: { fontSize: 11, fontFamily: 'Poppins-SemiBold' },
  submitChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 4, },
  submitChipText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: WHITE },
  submittedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: '#bbf7d0', },
  submittedChipText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', color: GREEN },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', },
  previewClose: { position: 'absolute', top: 40, right: 16, zIndex: 10 },
  previewImage: { width: '95%', height: '80%', borderRadius: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', },
  submitModal: { backgroundColor: WHITE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, },
  submitModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, },
  submitModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, },
  submitModalTitle: { fontSize: 15, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  submitAssignmentName: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY_LIGHT, borderRadius: 8, padding: 10, marginBottom: 14, gap: 8, },
  submitAssignmentNameText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: PRIMARY_DARK, flex: 1, },
  submitErrorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 12, gap: 8, borderLeftWidth: 3, borderLeftColor: RED, },
  submitErrorText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: RED, flex: 1, },
  inputLabel: { fontSize: 12, fontFamily: 'Poppins-SemiBold', color: TEXT_MID, marginBottom: 6, },
  textInput: { borderWidth: 1, borderColor: GREY_2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Poppins-Regular', color: TEXT_DARK, backgroundColor: GREY_1, marginBottom: 14, minHeight: 80, textAlignVertical: 'top', },
  textInputSingle: { minHeight: 46 },
  submitBtn: { backgroundColor: PRIMARY, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8, marginTop: 4, },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: WHITE, },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: GREY_1, },
  loadingText: { marginTop: 10, color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, },
  errorText: { color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', marginHorizontal: 32, marginTop: 12, marginBottom: 16, },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 9, borderRadius: 20, },
  retryText: { color: WHITE, fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginTop: 16, marginBottom: 8, },
  emptySubtext: { fontSize: 13, fontFamily: 'Poppins-Regular', color: TEXT_MID, textAlign: 'center', marginHorizontal: 40, lineHeight: 20, },
  historyContainer: { flex: 1, backgroundColor: GREY_1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: WHITE, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  historyTitle: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  historyCard: { backgroundColor: WHITE, marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  historyAssignment: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, },
  historyRemarks: { marginTop: 6, fontSize: 12, fontFamily: 'Poppins-Regular', color: TEXT_MID, },
  historyDate: { marginTop: 8, fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 0.5, borderTopColor: GREY_2, paddingTop: 10 },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, },
  statusText: { color: GREEN, fontSize: 11, fontFamily: 'Poppins-SemiBold', },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  editBtnText: { color: WHITE, fontSize: 11, fontFamily: 'Poppins-SemiBold', },
  bottomContainer: { padding: 12, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: GREY_2 },
  historyButton: { backgroundColor: PRIMARY, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  historyButtonText: { color: WHITE, fontSize: 14, fontFamily: 'Poppins-SemiBold', },
});

export default StudentAssignments;