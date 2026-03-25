import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import {studentApi} from '@api/studentApi';

// ─── Theme ────────────────────────────────────────────────────────────────────
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
const BLUE = '#3b82f6';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGrade = pct => {
  if (pct >= 90) return {grade: 'A+', color: GREEN};
  if (pct >= 80) return {grade: 'A', color: GREEN};
  if (pct >= 70) return {grade: 'B+', color: BLUE};
  if (pct >= 60) return {grade: 'B', color: BLUE};
  if (pct >= 50) return {grade: 'C', color: ORANGE};
  if (pct >= 35) return {grade: 'D', color: ORANGE};
  return {grade: 'F', color: RED};
};

const getStatusStyle = status => {
  switch (status?.toLowerCase()) {
    case 'pass':
      return {color: GREEN, bg: '#dcfce7', icon: 'check-circle-outline'};
    case 'fail':
      return {color: RED, bg: '#fee2e2', icon: 'close-circle-outline'};
    default:
      return {color: TEXT_LIGHT, bg: GREY_2, icon: 'help-circle-outline'};
  }
};

const getExamTypeColor = type => {
  switch (type?.toLowerCase()) {
    case 'final':      return {color: '#7c3aed', bg: '#ede9fe'};
    case 'semester':   return {color: '#0369a1', bg: '#e0f2fe'};
    case 'unit test':  return {color: '#b45309', bg: '#fef3c7'};
    default:           return {color: TEXT_MID, bg: GREY_2};
  }
};

// ─── Animated Progress Bar ────────────────────────────────────────────────────
const ProgressBar = ({pct, color, index}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedWidth.setValue(0);
    Animated.timing(animatedWidth, {
      toValue: pct,
      duration: 900,
      delay: index * 100,
      useNativeDriver: false,
    }).start();
  }, [pct, animatedWidth, index]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBg}>
      <Animated.View
        style={[styles.progressFill, {width: widthInterpolated, backgroundColor: color}]}
      />
    </View>
  );
};

// ─── Subject Row ──────────────────────────────────────────────────────────────
const SubjectRow = ({subject}) => {
  const s = getStatusStyle(subject.status);
  const pct = subject.maxMarks > 0
    ? Math.round((subject.obtainedMarks / subject.maxMarks) * 100)
    : 0;
  const g = getGrade(pct);

  return (
    <View style={styles.subjectRow}>
      <View style={styles.subjectInfo}>
        <Text style={styles.subjectName} numberOfLines={1}>
          {subject.subjectName}
        </Text>
        <Text style={styles.subjectMarks}>
          {subject.obtainedMarks}/{subject.maxMarks}
          <Text style={styles.subjectPassing}> (pass: {subject.passingMarks})</Text>
        </Text>
      </View>
      <View style={styles.subjectRight}>
        <Text style={[styles.gradeText, {color: g.color}]}>{g.grade}</Text>
        <View style={[styles.miniStatusBadge, {backgroundColor: s.bg}]}>
          <Text style={[styles.miniStatusText, {color: s.color}]}>
            {subject.status}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Result Card ──────────────────────────────────────────────────────────────
const ResultCard = ({result, index}) => {
  const [open, setOpen] = useState(false);
  const s = getStatusStyle(result.overAllStatus);
  const et = getExamTypeColor(result.examType);
  const g = getGrade(result.percentage);

  return (
    <View style={styles.resultCard}>

      {/* ── Card Header ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.resultCardHeader}
        onPress={() => setOpen(o => !o)}>

        {/* Left — grade circle */}
        <View style={[styles.gradeCircle, {borderColor: g.color}]}>
          <Text style={[styles.gradeCircleText, {color: g.color}]}>{g.grade}</Text>
        </View>

        {/* Middle — exam info */}
        <View style={styles.resultCardMid}>
          <Text style={styles.examName} numberOfLines={1}>
            {result.examName?.trim()}
          </Text>
          <View style={styles.examMetaRow}>
            <View style={[styles.examTypeBadge, {backgroundColor: et.bg}]}>
              <Text style={[styles.examTypeText, {color: et.color}]}>
                {result.examType}
              </Text>
            </View>
            <Text style={styles.examMarks}>
              {result.totalObtained}/{result.totalMax}
            </Text>
          </View>
        </View>

        {/* Right — % + status + chevron */}
        <View style={styles.resultCardRight}>
          <Text style={[styles.pctText, {color: g.color}]}>
            {result.percentage?.toFixed(1)}%
          </Text>
          <View style={[styles.statusBadge, {backgroundColor: s.bg}]}>
            <Text style={[styles.statusText, {color: s.color}]}>
              {result.overAllStatus}
            </Text>
          </View>
          <MatIcon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={TEXT_LIGHT}
            style={{marginTop: 4}}
          />
        </View>
      </TouchableOpacity>

      {/* ── Progress bar ── */}
      <View style={styles.progressWrap}>
        <ProgressBar pct={result.percentage} color={g.color} index={index} />
        <Text style={styles.progressPct}>{result.percentage?.toFixed(0)}%</Text>
      </View>

      {/* ── Subject details — collapsed by default ── */}
      {open && (
        <View style={styles.subjectList}>
          <View style={styles.subjectHeader}>
            <Text style={styles.subjectHeaderText}>Subject</Text>
            <Text style={styles.subjectHeaderText}>Marks</Text>
            <Text style={styles.subjectHeaderText}>Grade / Status</Text>
          </View>
          {result.details?.map((subject, i) => (
            <SubjectRow key={`${subject.subjectId}-${i}`} subject={subject} />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const StudentResult = () => {
  const {user} = useAuthStore();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      setError(null);
      setResults([]);
      const data = await studentApi.getStudentResults(
        user?.id,
        user?.role,
        user?.email,
      );
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[StudentResult] fetch error:', e.message);
      setError(e.message || 'Failed to load results.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchResults();
  };

  // ── Overall summary ──
  const totalExams = results.length;
  const passedExams = results.filter(
    r => r.overAllStatus?.toLowerCase() === 'pass',
  ).length;
  const avgPct =
    results.length > 0
      ? (
          results.reduce((s, r) => s + (r.percentage ?? 0), 0) / results.length
        ).toFixed(2)
      : '0';
  const bestPct =
    results.length > 0
      ? Math.max(...results.map(r => r.percentage ?? 0)).toFixed(1)
      : '0';

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading results…</Text>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="alert-circle-outline" size={48} color={ORANGE} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchResults}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── No data ──
  if (!loading && !refreshing && results.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
        <MatIcon name="clipboard-text-off-outline" size={48} color={GREY_2} />
        <Text style={styles.errorText}>No results found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchResults}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* ── Summary Strip ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalExams}</Text>
          <Text style={styles.summaryLabel}>Exams</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, {color: '#a8f0c0'}]}>
            {passedExams}/{totalExams}
          </Text>
          <Text style={styles.summaryLabel}>Passed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, {color: '#c4b5fd'}]}>{avgPct}%</Text>
          <Text style={styles.summaryLabel}>Avg %</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, {color: '#fde68a'}]}>{bestPct}%</Text>
          <Text style={styles.summaryLabel}>Best %</Text>
        </View>
      </View>

      {/* ── Result list ── */}
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
        {results.map((result, index) => (
          <ResultCard key={result.id ?? index} result={result} index={index} />
        ))}
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: GREY_1},

  // Summary strip
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 6,
    shadowColor: PRIMARY_DARK,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  summaryItem: {flex: 1, alignItems: 'center'},
  summaryVal: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: WHITE,
    lineHeight: 20,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },

  // Scroll
  scroll: {padding: 12, paddingTop: 14},

  // Result card
  resultCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: PRIMARY,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
    gap: 10,
  },

  // Grade circle
  gradeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREY_1,
  },
  gradeCircleText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },

  // Card middle
  resultCardMid: {flex: 1},
  examName: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: TEXT_DARK,
    marginBottom: 3,
  },
  examMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  examTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  examTypeText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
  },
  examMarks: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: TEXT_LIGHT,
  },

  // Card right
  resultCardRight: {
    alignItems: 'center',
    gap: 3,
  },
  pctText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
  },

  // Progress bar
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: GREY_2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    color: TEXT_MID,
    minWidth: 28,
    textAlign: 'right',
  },

  // Subject list
  subjectList: {
    borderTopWidth: 0.5,
    borderTopColor: GREY_2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: GREY_1,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: GREY_2,
    marginBottom: 4,
  },
  subjectHeaderText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    color: TEXT_LIGHT,
    flex: 1,
    textAlign: 'center',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: GREY_2,
  },
  subjectInfo: {flex: 1.5},
  subjectName: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: TEXT_DARK,
  },
  subjectMarks: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: TEXT_MID,
    marginTop: 1,
  },
  subjectPassing: {
    color: TEXT_LIGHT,
    fontSize: 10,
  },
  subjectRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  gradeText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniStatusText: {
    fontSize: 9,
    fontFamily: 'Poppins-SemiBold',
  },

  // Loading / Error
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREY_1,
  },
  loadingText: {
    marginTop: 10,
    color: TEXT_MID,
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
  },
  errorText: {
    color: TEXT_MID,
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 32,
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderRadius: 20,
  },
  retryText: {
    color: WHITE,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  bottomPad: {height: 20},
});

export default StudentResult;