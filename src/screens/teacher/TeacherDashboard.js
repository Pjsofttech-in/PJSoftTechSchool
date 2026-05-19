import React, { Component } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#7b68ee';

export class TeacherDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      notices: [],
      loading: true,
    };
  }

  componentDidMount() {
    this.fetchNotices();
  }

  fetchNotices = async () => {
    try {
      const { user } = useAuthStore.getState();
      const data = await teacherApi.getNotifications(user.email);
      this.setState({ notices: data, loading: false });
    } catch (err) {
      this.setState({ loading: false });
    }
  };

  renderNoticeItem = ({ item }) => (
    <View style={styles.noticeCard}>
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.noticeDate}>{item.createdAt}</Text>
            <Text style={styles.noticeTitle} numberOfLines={1}> • {item.noticeName}</Text>
          </View>
          <Text style={styles.noticeDesc} numberOfLines={2}>{item.noticeDescription}</Text>
        </View>
        <MatIcon name="chevron-right" size={16} color="#D1D1D6" />
      </View>
    </View>
  );

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noticeContainer}>
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Notices</Text>
            <TouchableOpacity hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {this.state.loading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 10 }} />
          ) : (
            <FlatList
              data={this.state.notices}
              renderItem={this.renderNoticeItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SCREEN_WIDTH * 0.8 + 10}
              decelerationRate="fast"
              contentContainerStyle={styles.noticeList}
            />
          )}

          <View style={styles.placeholderSection}>
             <Text style={styles.placeholderText}>Next Module Starts Here</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  noticeContainer: { paddingVertical: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginBottom: 6, backgroundColor: '#fff', elevation: 2, },
  sectionTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#1a1a2e' },
  viewAllText: { fontFamily: 'Poppins-Medium', fontSize: 10, color: PRIMARY },
  noticeList: { paddingLeft: 16, paddingRight: 6 },
  noticeCard: { backgroundColor: '#fff', width: SCREEN_WIDTH * 0.8, marginRight: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, elevation: 2, borderLeftWidth: 3, borderLeftColor: PRIMARY, height: 65, justifyContent: 'center', },
  contentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textContainer: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  noticeDate: { fontFamily: 'Poppins-Bold', fontSize: 9, color: PRIMARY, textTransform: 'uppercase' },
  noticeTitle: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#333', flex: 1 },
  noticeDesc: { fontFamily: 'Poppins-Regular', fontSize: 10, color: '#777' },
  placeholderSection: { marginTop: 12, paddingHorizontal: 16 },
  placeholderText: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#aaa' }
});

export default TeacherDashboard;