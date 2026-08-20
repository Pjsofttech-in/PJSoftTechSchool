import React, {useEffect, useState, useCallback} from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, } from 'react-native';
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

// Helper Components

const InfoRow = ({label, value}) =>
  value != null && value !== '' && value !== 0 ? (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  ) : null;

const Grid2 = ({label1, value1, label2, value2}) => {
  const has1 = value1 != null && value1 !== '' && value1 !== 0;
  const has2 = value2 != null && value2 !== '' && value2 !== 0;
  if (!has1 && !has2) return null;
  return (
    <View style={styles.gridRow}>
      {has1 && (
        <View style={styles.gridCell}>
          <Text style={styles.infoLabel}>{label1}</Text>
          <Text style={styles.infoValue}>{String(value1)}</Text>
        </View>
      )}
      {has2 && (
        <View style={styles.gridCell}>
          <Text style={styles.infoLabel}>{label2}</Text>
          <Text style={styles.infoValue}>{String(value2)}</Text>
        </View>
      )}
    </View>
  );
};

const Badge = ({label}) =>
  label ? (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  ) : null;

const SectionCard = ({title, icon, children, defaultOpen = true}) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = React.Children.toArray(children).some(child => child);
  if (!hasContent) return null;
  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.cardHeader}
        onPress={() => setOpen(o => !o)}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardIconWrap}>
            <MatIcon name={icon} size={15} color={PRIMARY} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <MatIcon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={PRIMARY}
        />
      </TouchableOpacity>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
};

// Main Screen 

const StudentProfile = () => {
  const {user} = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const data = await studentApi.getStudentById(
        user?.id,
        user?.role,
        user?.email,
      );
      setProfile(data);
    } catch (e) {
      console.error('[StudentProfile] fetchProfile error:', e.message);
      setError(e.message || 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  // Loading 
  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  // Error 
  if (error) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="alert-circle-outline" size={48} color="#f5a623" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No data 
  if (!profile) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="account-off-outline" size={48} color={TEXT_LIGHT} />
        <Text style={styles.errorText}>No profile data found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = profile;
  const addr = p?.address ?? {};
  const rel = p?.religion ?? {};
  const docs = p?.documents ?? {};
  const sports = p?.sports ?? {};
  const add = p?.additionalInfo ?? {};

  const photoUrl = docs.studentPhoto || p?.oldRegisterPhoto || null;
  const initials = p?.fullName
    ? p.fullName
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {photoUrl ? (
              <Image
                source={{uri: photoUrl}}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    p?.status === 'Approved' ? '#4cde80' : '#f5a623',
                },
              ]}
            />
          </View>

          {/* Name & meta */}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={2}>
              {p?.title ? `${p.title}. ` : ''}
              {p?.fullName}
            </Text>
            <Text style={styles.headerSub}>
              {[p?.standardName, p?.mediumName].filter(Boolean).join(' • ')}
            </Text>
            <View style={styles.badgeRow}>
              <Badge label={p?.status} />
              <Badge label={rel?.castCategory} />
              <Badge label={p?.gender} />
            </View>
          </View>
        </View>

        {/* Quick stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>
              {p?.rollNo != null ? `#${p.rollNo}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Roll No</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{p?.age ?? '—'}</Text>
            <Text style={styles.statLabel}>Age</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{p?.academicYear ?? '—'}</Text>
            <Text style={styles.statLabel}>Academic Yr</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{p?.institutionType ?? '—'}</Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
        </View>
      </View>

      {/* Scrollable sections */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }>

        {/* Personal Info */}
        <SectionCard
          title="Personal Info"
          icon="account-outline"
          defaultOpen={true}>
          <Grid2
            label1="Date of Birth"
            value1={p?.dateOfBirth}
            label2="Blood Group"
            value2={p?.bloodGroup}
          />
          <Grid2
            label1="Contact"
            value1={p?.contact}
            label2="Mother Tongue"
            value2={p?.motherTongue}
          />
          <Grid2
            label1="Birth Place"
            value1={p?.birthPlace}
            label2="Birth Country"
            value2={p?.birthCountry}
          />
          <Grid2
            label1="Marital Status"
            value1={p?.maritalStatus}
            label2="Aadhar No"
            value2={p?.aadharNumber}
          />
          <InfoRow label="Email" value={p?.email} />
        </SectionCard>

        {/* Academic Info */}
        <SectionCard
          title="Academic Info"
          icon="school-outline"
          defaultOpen={true}>
          <Grid2
            label1="Registration No"
            value1={p?.registrationNumber}
            label2="Application No"
            value2={p?.applicationNumber}
          />
          <Grid2
            label1="Standard"
            value1={p?.standardName}
            label2="Medium"
            value2={p?.mediumName}
          />
          <Grid2
            label1="Enrollment Date"
            value1={p?.enrollmentDate}
            label2="Approval Date"
            value2={p?.approvalDate}
          />
          <Grid2
            label1="Stream"
            value1={p?.streamName}
            label2="Group"
            value2={p?.groupName}
          />
          <Grid2
            label1="Semester"
            value1={p?.semister}
            label2="Form Status"
            value2={p?.formStatus}
          />
          <Grid2
            label1="UDISE No"
            value1={p?.udiseNo}
            label2="APAAR ID"
            value2={p?.apaarId}
          />
          <InfoRow label="Branch Code" value={p?.branchCode} />
        </SectionCard>

        {/* Address */}
        <SectionCard
          title="Address"
          icon="map-marker-outline"
          defaultOpen={false}>
          <InfoRow label="Address" value={addr.address} />
          <Grid2
            label1="City"
            value1={addr.city}
            label2="District"
            value2={addr.district}
          />
          <Grid2
            label1="Taluka"
            value1={addr.taluka}
            label2="State"
            value2={addr.state}
          />
          <Grid2
            label1="Pincode"
            value1={addr.pincode ? String(addr.pincode) : null}
            label2="Country"
            value2={addr.country}
          />
          <Grid2
            label1="Nationality"
            value1={addr.nationality}
            label2="Landmark"
            value2={addr.landmark}
          />
        </SectionCard>

        {/* Family Info */}
        <SectionCard
          title="Family Info"
          icon="account-multiple-outline"
          defaultOpen={false}>
          <InfoRow label="Father's Name" value={addr.fathersName} />
          <Grid2
            label1="Father's Contact"
            value1={addr.fathersContact}
            label2="Profession"
            value2={addr.fatherProfession}
          />
          <InfoRow label="Mother's Name" value={addr.motherName} />
          <Grid2
            label1="WhatsApp"
            value1={addr.whatsappNumber}
            label2="Income Range"
            value2={addr.incomeRanges}
          />
        </SectionCard>

        {/* Religion & Caste */}
        <SectionCard
          title="Religion & Caste"
          icon="hands-pray"
          defaultOpen={false}>
          <Grid2
            label1="Religion"
            value1={rel.religion}
            label2="Caste Category"
            value2={rel.castCategory}
          />
          <Grid2
            label1="Sub Caste"
            value1={rel.subCaste}
            label2="Minority"
            value2={rel.minority ? 'Yes' : null}
          />
          <InfoRow label="Minority Type" value={rel.minorityType} />
          <InfoRow
            label="Caste Certificate No"
            value={rel.casteCertificateNumber}
          />
          <Grid2
            label1="Caste Validation"
            value1={rel.casteValidation ? 'Yes' : null}
            label2="Validation No"
            value2={rel.casteValidationNumber}
          />
          <Grid2
            label1="Domicile"
            value1={rel.domicileBool ? 'Yes' : null}
            label2="Domicile No"
            value2={rel.domicileNumber}
          />
        </SectionCard>

        {/* Additional Info */}
        <SectionCard
          title="Additional Info"
          icon="information-outline"
          defaultOpen={false}>
          <Grid2
            label1="Handicap"
            value1={add.handicap ? 'Yes' : 'No'}
            label2="Scholarship"
            value2={add.scholarship ? 'Yes' : 'No'}
          />
          {add.scholarship && (
            <InfoRow label="Scholarship Name" value={add.scholarshipName} />
          )}
          <Grid2
            label1="EBC"
            value1={add.ebc ? 'Yes' : 'No'}
            label2="Special %"
            value2={add.specialPercentage}
          />
          <InfoRow label="Disability Type" value={add.disabilityType} />
          <Grid2
            label1="Earthquake Affected"
            value1={add.earthquake ? 'Yes' : null}
            label2="Earthquake No"
            value2={add.earthquakeNumber}
          />
        </SectionCard>

        {/* Sports */}
        <SectionCard
          title="Sports"
          icon="medal-outline"
          defaultOpen={false}>
          <Grid2
            label1="Height"
            value1={sports.height}
            label2="Weight"
            value2={sports.weight}
          />
          <Grid2
            label1="Sport"
            value1={sports.sportsName}
            label2="Participates"
            value2={sports.sportParticipation ? 'Yes' : null}
          />
          <Grid2
            label1="Years Played"
            value1={sports.noOfYearsPlayed}
            label2="Level"
            value2={sports.levelOfParticipation}
          />
          <InfoRow label="Achievement" value={sports.achievement} />
          <InfoRow
            label="International Detail"
            value={sports.internationaldetail}
          />
        </SectionCard>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: GREY_1},
  // Header
  header: { backgroundColor: PRIMARY, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 0, elevation: 6, shadowColor: PRIMARY_DARK, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, },
  avatarWrap: {position: 'relative', marginRight: 12},
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: WHITE, },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: PRIMARY_DARK, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: WHITE, },
  avatarInitials: { color: WHITE, fontSize: 22, fontFamily: 'Poppins-SemiBold', },
  statusDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: PRIMARY, },
  headerInfo: {flex: 1},
  headerName: { color: WHITE, fontSize: 16, fontFamily: 'Poppins-SemiBold', lineHeight: 22, },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Poppins-Regular', marginBottom: 5, },
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, },
  badgeText: { color: WHITE, fontSize: 10, fontFamily: 'Poppins-SemiBold', }, 
  // Stats strip
  statsStrip: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, marginBottom: 14, paddingVertical: 8, },
  statItem: {flex: 1, alignItems: 'center'},
  statVal: { color: WHITE, fontSize: 13, fontFamily: 'Poppins-SemiBold', lineHeight: 18, },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontFamily: 'Poppins-Regular', },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4, },
  // Scroll
  scroll: {padding: 12, paddingTop: 14},
  // Card
  card: { backgroundColor: WHITE, borderRadius: 12, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: PRIMARY, shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 4, },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: PRIMARY_LIGHT, },
  cardHeaderLeft: {flexDirection: 'row', alignItems: 'center', gap: 8},
  cardIconWrap: { width: 26, height: 26, borderRadius: 6, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', },
  cardTitle: { color: PRIMARY_DARK, fontSize: 13, fontFamily: 'Poppins-SemiBold', },
  // Card body
  cardBody: {paddingHorizontal: 12, paddingVertical: 8},
  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: GREY_2, },
  infoLabel: { color: TEXT_LIGHT, fontSize: 11, fontFamily: 'Poppins-Regular', flex: 1, },
  infoValue: { color: TEXT_DARK, fontSize: 11, fontFamily: 'Poppins-SemiBold', flex: 1.4, textAlign: 'right', },
  // Grid
  gridRow: { flexDirection: 'row', gap: 8, marginBottom: 2},
  gridCell: { flex: 1, backgroundColor: GREY_1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 4, },
  // Loading / Error
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: GREY_1, },
  loadingText: { marginTop: 10, color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, },
  errorText: { color: TEXT_MID, fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', marginHorizontal: 32, marginTop: 12, marginBottom: 16, },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 9, borderRadius: 20, },
  retryText: { color: WHITE, fontFamily: 'Poppins-SemiBold', fontSize: 13, },
  bottomPad: {height: 20},
});

export default StudentProfile;