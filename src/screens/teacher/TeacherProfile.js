import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, StatusBar, RefreshControl, SafeAreaView, Dimensions, } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const { width } = Dimensions.get('window');

const PRIMARY = '#6C5CE7';
const ACCENT = '#A8A5FF';
const BG_DARK = '#1E1B4B';
const GREY_BG = '#F8F9FD';
const WHITE = '#FFFFFF';
const TEXT_MAIN = '#111827';
const TEXT_MUTED = '#6B7280';
const CARD_BORDER = '#EEF2F6';

const TeacherProfile = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherData, setTeacherData] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // Formatting dates cleanly
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BG_DARK} />
      
      <ScrollView 
        style={styles.container}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
      >
        <View style={styles.heroWrapper}>
          <View style={styles.patternLayer} />
          
          <View style={styles.profileRow}>
            <View style={styles.avatarFrame}>
              {teacherData?.profilePhoto ? (
                <Image source={{ uri: teacherData.profilePhoto }} style={styles.avatarImage} />
              ) : (
                <MatIcon name="account" size={50} color={PRIMARY} />
              )}
            </View>
            
            <View style={styles.heroMeta}>
              <View style={styles.badgeContainer}>
                <Text style={styles.roleBadge}>{teacherData?.institutionType || 'Faculty'}</Text>
              </View>
              <Text style={styles.teacherName} numberOfLines={2}>
                {teacherData?.teacherName || 'Aakash Kathole'}
              </Text>
              <Text style={styles.teacherEmail} numberOfLines={1}>
                {teacherData?.teacherEmail}
              </Text>
            </View>
          </View>
        </View>

        {/* Layout Grid */}
        <View style={styles.mainContent}>
          
          <View style={styles.statsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.iconWrapper, { backgroundColor: '#EEF2F6' }]}>
                <MatIcon name="history" size={22} color={PRIMARY} />
              </View>
              <Text style={styles.metricValue}>{teacherData?.experience || '0 Years'}</Text>
              <Text style={styles.metricLabel}>Tenure</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.iconWrapper, { backgroundColor: '#EDE9FF' }]}>
                <MatIcon name="school" size={22} color={PRIMARY} />
              </View>
              <Text style={styles.metricValue}>{teacherData?.education || 'Degree'}</Text>
              <Text style={styles.metricLabel}>Education</Text>
            </View>
          </View>

          <View style={styles.dashboardBlock}>
            <Text style={styles.blockTitle}>Active Research</Text>
            <View style={styles.researchBanner}>
              <MatIcon name="shield-star-outline" size={24} color={PRIMARY} />
              <View style={styles.researchTextContainer}>
                <Text style={styles.researchTitle}>{teacherData?.reserch || 'Independent Study'}</Text>
                <Text style={styles.researchSubtitle}>Primary Academic Domain</Text>
              </View>
            </View>
          </View>

          {/* Subjects Taught */}
          {teacherData?.subjects && teacherData.subjects.length > 0 && (
            <View style={styles.dashboardBlock}>
              <Text style={styles.blockTitle}>Assigned Coursework</Text>
              <View style={styles.tagCloud}>
                {teacherData.subjects.map((item) => (
                  <View key={item.id} style={styles.subjectTag}>
                    <View style={styles.tagDot} />
                    <Text style={styles.tagText}>{item.subject}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Informational Rows */}
          <View style={styles.dashboardBlock}>
            <Text style={styles.blockTitle}>Institutional Record</Text>
            
            <View style={styles.ledgerRow}>
              <View style={styles.ledgerLeft}>
                <MatIcon name="barcode-scan" size={18} color={TEXT_MUTED} />
                <Text style={styles.ledgerLabel}>Branch ID</Text>
              </View>
              <Text style={styles.ledgerValue}>{teacherData?.branchCode || 'N/A'}</Text>
            </View>

            <View style={styles.ledgerRow}>
              <View style={styles.ledgerLeft}>
                <MatIcon name="calendar-range" size={18} color={TEXT_MUTED} />
                <Text style={styles.ledgerLabel}>Appointed Date</Text>
              </View>
              <Text style={styles.ledgerValue}>{formatDate(teacherData?.joiningDate)}</Text>
            </View>

            <View style={[styles.ledgerRow, { borderBottomWidth: 0 }]}>
              <View style={styles.ledgerLeft}>
                <MatIcon name="cake-variant" size={18} color={TEXT_MUTED} />
                <Text style={styles.ledgerLabel}>Date of Birth</Text>
              </View>
              <Text style={styles.ledgerValue}>{formatDate(teacherData?.dob)}</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG_DARK },
  container: { flex: 1, backgroundColor: GREY_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: GREY_BG },
  // Hero Section Style Architecture
  heroWrapper: { backgroundColor: BG_DARK, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, position: 'relative', overflow: 'hidden', },
  patternLayer: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(108, 92, 231, 0.15)', },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 20, },
  avatarFrame: { width: 84, height: 84, borderRadius: 28, backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover', },
  heroMeta: { flex: 1, justifyContent: 'center', },
  badgeContainer: { flexDirection: 'row', marginBottom: 6, },
  roleBadge: { fontFamily: 'Poppins-Medium', fontSize: 11, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, backgroundColor: 'rgba(168, 165, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, },
  teacherName: { fontFamily: 'Poppins-Medium', fontSize: 22, color: WHITE, letterSpacing: -0.3, },
  teacherEmail: { fontFamily: 'Poppins-Regular', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', marginTop: 2, },
  // Main UI Body
  mainContent: { paddingHorizontal: 20, marginTop: -24, },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20, },
  metricCard: { flex: 1, backgroundColor: WHITE, borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: CARD_BORDER, elevation: 2, },
  iconWrapper: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10, },
  metricValue: { fontFamily: 'Poppins-Medium', fontSize: 15, color: TEXT_MAIN, textAlign: 'center', },
  metricLabel: { fontFamily: 'Poppins-Regular', fontSize: 12, color: TEXT_MUTED, marginTop: 2, },
  // dashboard sections
  dashboardBlock: { backgroundColor: WHITE, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: CARD_BORDER, elevation: 1, },
  blockTitle: { fontFamily: 'Poppins-Medium', fontSize: 14, color: TEXT_MUTED, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5, },
  // Research Section
  researchBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8F9FD', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#EFEFFA', },
  researchTextContainer: { flex: 1, },
  researchTitle: { fontFamily: 'Poppins-Medium', fontSize: 15, color: TEXT_MAIN, },
  researchSubtitle: { fontFamily: 'Poppins-Regular', fontSize: 12, color: TEXT_MUTED, marginTop: 1, },
  // Tag Cloud
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, },
  subjectTag: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6',paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY, },
  tagText: { fontFamily: 'Poppins-Medium', fontSize: 13, color: TEXT_MAIN, },
  // Ledger List
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', },
  ledgerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, },
  ledgerLabel: { fontFamily: 'Poppins-Regular', fontSize: 14, color: TEXT_MUTED, },
  ledgerValue: { fontFamily: 'Poppins-Medium', fontSize: 14, color: TEXT_MAIN, },
});

export default TeacherProfile;