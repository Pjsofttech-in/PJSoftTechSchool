import React, {useEffect, useState, useCallback} from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Image, Modal, } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import {studentApi} from '@api/studentApi';

// Theme
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
// Format 'YYYY-MM-DD' to 'DD MMM YYYY'
const formatDisplay = dateStr => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
};

// Days remaining from today
const getDaysInfo = dueDateStr => {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)
    return {label: `${Math.abs(diff)}d overdue`, color: RED, bg: '#fee2e2'};
  if (diff === 0)
    return {label: 'Due today', color: ORANGE, bg: '#ffedd5'};
  if (diff <= 3)
    return {label: `${diff}d left`, color: ORANGE, bg: '#ffedd5'};
  return {label: `${diff}d left`, color: GREEN, bg: '#dcfce7'};
};

// Assignment Card
const AssignmentCard = ({item, onImagePress}) => {
  const daysInfo = getDaysInfo(item.dueDate);

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>

        {/* Image thumbnail */}
        {item.image ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onImagePress(item.image)}
            style={styles.thumbWrap}>
            <Image
              source={{uri: item.image}}
              style={styles.thumb}
              resizeMode="cover"
            />
            <View style={styles.thumbOverlay}>
              <MatIcon name="magnify-plus-outline" size={18} color={WHITE} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.thumbWrap, styles.thumbPlaceholder]}>
            <MatIcon name="file-document-outline" size={26} color={PRIMARY} />
          </View>
        )}

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.assignmentTitle}
          </Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Dates row */}
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

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.teacherRow}>
          <MatIcon name="account-outline" size={12} color={TEXT_LIGHT} />
          <Text style={styles.teacherText} numberOfLines={1}>
            {item.createdByEmail}
          </Text>
        </View>
        {daysInfo && (
          <View style={[styles.dueBadge, {backgroundColor: daysInfo.bg}]}>
            <Text style={[styles.dueBadgeText, {color: daysInfo.color}]}>
              {daysInfo.label}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Main Screen
const StudentAssignments = () => {
  const {user} = useAuthStore();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setError(null);
      const data = await studentApi.getAssignments(
        user?.classRoomId,
        user?.role,
        user?.email,
      );
      setAssignments(Array.isArray(data) ? data : []);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  // Counts
  const totalCount = assignments.length;
  const overdueCount = assignments.filter(a => {
    const info = getDaysInfo(a.dueDate);
    return info?.color === RED;
  }).length;
  const dueTodayCount = assignments.filter(a => {
    const info = getDaysInfo(a.dueDate);
    return info?.label === 'Due today';
  }).length;
  const upcomingCount = assignments.filter(a => {
    const info = getDaysInfo(a.dueDate);
    return info?.color === GREEN;
  }).length;

  // Loading
  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading assignments…</Text>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={styles.credential}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="alert-circle-outline" size={48} color={ORANGE} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAssignments}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No data
  if (!loading && !refreshing && assignments.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="clipboard-text-off-outline" size={48} color={GREY_2} />
        <Text style={styles.errorText}>No assignments found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAssignments}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Summary Strip */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalCount}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, {color: '#ffb3b3'}]}>
            {overdueCount}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, {color: '#fde68a'}]}>
            {dueTodayCount}
          </Text>
          <Text style={styles.summaryLabel}>Due Today</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, {color: '#a8f0c0'}]}>
            {upcomingCount}
          </Text>
          <Text style={styles.summaryLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Assignment List */}
      <FlatList
        data={assignments}
        keyExtractor={item => item.id?.toString()}
        renderItem={({item}) => (
          <AssignmentCard
            item={item}
            onImagePress={uri => setPreviewImage(uri)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      />

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setPreviewImage(null)}>
            <MatIcon name="close-circle" size={32} color={WHITE} />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{uri: previewImage}}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: GREY_1},
  // Summary strip
  summaryCard: { flexDirection: 'row', backgroundColor: PRIMARY, paddingVertical: 14, paddingHorizontal: 8, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 6, shadowColor: PRIMARY_DARK, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, },
  summaryItem: { flex: 1, alignItems: 'center'},
  summaryVal: { fontSize: 16, fontFamily: 'Poppins-SemiBold', color: WHITE, lineHeight: 22, },
  summaryLabel: { fontSize: 10, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.7)', marginTop: 1, },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4, },
  // List
  listContent: { padding: 12, paddingTop: 14, paddingBottom: 20 },
  // Assignment card
  card: { backgroundColor: WHITE, borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 4, },
  cardContent: { flexDirection: 'row', padding: 12, gap: 10, },
  // Thumbnail
  thumbWrap: { width: 70, height: 70, borderRadius: 10, overflow: 'hidden', },
  thumb: { width: '100%', height: '100%', },
  thumbOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 3, borderTopLeftRadius: 8, },
  thumbPlaceholder: { backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', },
  // Card info
  cardInfo: { flex: 1},
  cardTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: TEXT_DARK, marginBottom: 3, }, 
  cardDesc: { fontSize: 11, fontFamily: 'Poppins-Regular', color: TEXT_MID, marginBottom: 5, lineHeight: 16, },
  // Dates
  datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 3, },
  dateText: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, },
  // Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2, borderTopWidth: 0.5, borderTopColor: GREY_2, },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8, },
  teacherText: { fontSize: 10, fontFamily: 'Poppins-Regular', color: TEXT_LIGHT, flex: 1, },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, },
  dueBadgeText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', },
  // Image preview modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', },
  modalClose: { position: 'absolute', top: 40, right: 16, zIndex: 10, },
  modalImage: { width: '95%', height: '80%', borderRadius: 12, },
  // Loading / Error
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: GREY_1, },
  loadingText: { marginTop: 10, color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, },
  errorText: { color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', marginHorizontal: 32, marginTop: 12, marginBottom: 16, },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 9, borderRadius: 20, },
  retryText: { color: WHITE, fontFamily: 'Poppins-SemiBold', fontSize: 13, },
});

export default StudentAssignments;