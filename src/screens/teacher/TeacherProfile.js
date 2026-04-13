import React, {useEffect, useState, useCallback} from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import {teacherApi} from '@api/teacherApi';

// Colors
const PRIMARY = '#7b68ee';
const WHITE = '#ffffff';
const GREY_BG = '#f5f4fb';
const TEXT_DARK = '#1a1a2e';
const TEXT_MID = '#555577';
const TEXT_LIGHT = '#9999bb';

const TeacherProfile = () => {
  const {user} = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherData, setTeacherData] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      // API handles the 'teacher' role hardcoding internally
      const data = await teacherApi.getTeacherById(user?.id, user?.email);
      setTeacherData(data);
    } catch (e) {
      console.error('[TeacherProfile] Error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchProfile();}} tintColor={PRIMARY} />}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {teacherData?.profilePhoto ? (
            <Image source={{ uri: teacherData.profilePhoto }} style={styles.avatar} />
          ) : (
            <MatIcon name="account-circle" size={80} color={WHITE} />
          )}
        </View>
        <Text style={styles.name}>{teacherData?.teacherName || 'Ramesh Mali'}</Text>
        <Text style={styles.email}>{teacherData?.teacherEmail}</Text>
      </View>

      <View style={styles.content}>
        {/* Row: Experience & Education */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MatIcon name="briefcase-clock-outline" size={24} color={PRIMARY} />
            <Text style={styles.statVal}>{teacherData?.experience || '16 Years'}</Text>
            <Text style={styles.statLab}>Experience</Text>
          </View>
          <View style={styles.statCard}>
            <MatIcon name="school-outline" size={24} color={PRIMARY} />
            <Text style={styles.statVal}>{teacherData?.education || 'Msc Maths'}</Text>
            <Text style={styles.statLab}>Education</Text>
          </View>
        </View>

        {/* Research Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Research</Text>
          <View style={styles.infoBox}>
            <MatIcon name="book-open-page-variant-outline" size={20} color={TEXT_MID} />
            <Text style={styles.infoText}>{teacherData?.reserch || 'PhD in Trignometry'}</Text>
          </View>
        </View>

        {/* Subjects Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjects Taught</Text>
          <View style={styles.subjectList}>
            {teacherData?.subjects?.map((item) => (
              <View key={item.id} style={styles.tag}>
                <MatIcon name="check-decagram-outline" size={14} color={PRIMARY} />
                <Text style={styles.tagText}>{item.subject}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Institution Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Institution Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Institution Type:</Text>
            <Text style={styles.detailValue}>{teacherData?.institutionType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Branch Code:</Text>
            <Text style={styles.detailValue}>{teacherData?.branchCode}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Joining Date:</Text>
            <Text style={styles.detailValue}>{teacherData?.joiningDate}</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GREY_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: PRIMARY, paddingTop: 40, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: WHITE, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatar: { width: '100%', height: '100%' },
  name: { fontSize: 22, fontWeight: 'bold', color: WHITE },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: WHITE, padding: 16, borderRadius: 20, alignItems: 'center', elevation: 3 },
  statVal: { fontSize: 14, fontWeight: 'bold', color: TEXT_DARK, marginTop: 5 },
  statLab: { fontSize: 11, color: TEXT_LIGHT },
  section: { backgroundColor: WHITE, padding: 16, borderRadius: 20, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: TEXT_DARK, marginBottom: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9f9ff', padding: 12, borderRadius: 12 },
  infoText: { fontSize: 14, color: TEXT_MID },
  subjectList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ede9ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  tagText: { color: PRIMARY, fontSize: 12, fontWeight: '600' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { color: TEXT_LIGHT, fontSize: 13 },
  detailValue: { color: TEXT_DARK, fontSize: 13, fontWeight: '500' }
});

export default TeacherProfile;