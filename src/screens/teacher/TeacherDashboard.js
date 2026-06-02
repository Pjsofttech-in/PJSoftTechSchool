import React, { Component } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator, TouchableOpacity, SafeAreaView, Modal, ScrollView, TouchableWithoutFeedback } from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import useAuthStore from '@store/authStore';
import { teacherApi } from '@api/teacherApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#7b68ee';
const CARD_WIDTH = SCREEN_WIDTH * 0.82;

export class TeacherDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      notices: [],
      loading: true,
      selectedNotice: null,
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

  openNotice = (notice) => {
    this.setState({ selectedNotice: notice });
  };

  closeNotice = () => {
    this.setState({ selectedNotice: null });
  };

  renderNoticeItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.noticeCard} 
      onPress={() => this.openNotice(item)}
      activeOpacity={0.7}
    >
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.noticeDate}>{item.createdAt}</Text>
            <Text style={styles.noticeTitle} numberOfLines={1}> • {item.noticeName}</Text>
          </View>
          <Text style={styles.noticeDesc} numberOfLines={2}>{item.noticeDescription}</Text>
        </View>
        <MatIcon name="chevron-right" size={18} color="#A1A1A6" />
      </View>
    </TouchableOpacity>
  );

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noticeContainer}>
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Notices</Text>
            <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {this.state.loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator color={PRIMARY} size="small" />
            </View>
          ) : (
            <FlatList
              data={this.state.notices}
              renderItem={this.renderNoticeItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + 12} 
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.noticeList}
            />
          )}

          <View style={styles.placeholderSection}>
             <Text style={styles.placeholderText}>Next Module Starts Here</Text>
          </View>
        </View>

        {/* The Slide-Up Notice Modal Display UI */}
        <Modal
        visible={!!this.state.selectedNotice}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={this.closeNotice}
        >
          <TouchableWithoutFeedback onPress={this.closeNotice}>
            <View style={styles.modalOverlay}>
              
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHandle} /> 
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalDate}>{this.state.selectedNotice?.createdAt}</Text>
                    <Text style={styles.modalTitle}>{this.state.selectedNotice?.noticeName}</Text>
                    <Text style={styles.modalDesc}>{this.state.selectedNotice?.noticeDescription}</Text>
                  </ScrollView>
                  
                  <TouchableOpacity style={styles.closeButton} onPress={this.closeNotice}>
                    <Text style={styles.closeButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
              
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fe' },
  noticeContainer: { paddingVertical: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#1a1a2e' },
  viewAllText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: PRIMARY },
  loaderContainer: { height: 80, justifyContent: 'center', alignItems: 'center' },
  noticeList: { paddingLeft: 16, paddingRight: 4 },
  noticeCard: { backgroundColor: '#fff', width: CARD_WIDTH, marginRight: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, borderLeftWidth: 4, borderLeftColor: PRIMARY, minHeight: 74, justifyContent: 'center' },
  contentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textContainer: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  noticeDate: { fontFamily: 'Poppins-SemiBold', fontSize: 10, color: PRIMARY, textTransform: 'uppercase' },
  noticeTitle: { fontFamily: 'Poppins-Medium', fontSize: 13, color: '#333', flex: 1 },
  noticeDesc: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#666', lineHeight: 15 },
  placeholderSection: { marginTop: 24, paddingHorizontal: 16 },
  placeholderText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#aaa' },
  // Modal Notice
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'flex-end', },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10, maxHeight: '75%', },
  modalHandle: { width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 3, alignSelf: 'center', marginBottom: 15, },
  modalDate: { fontFamily: 'Poppins-SemiBold', fontSize: 11, color: PRIMARY, textTransform: 'uppercase', marginBottom: 4 },
  modalTitle: { fontFamily: 'Poppins-Bold', fontSize: 18, color: '#1a1a2e', marginBottom: 12 },
  modalDesc: { fontFamily: 'Poppins-Regular', fontSize: 13, color: '#444', lineHeight: 20 },
  closeButton: { backgroundColor: '#f1f1f5', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 15, },
  closeButtonText: { fontFamily: 'Poppins-Medium', fontSize: 13, color: '#333' },
});

export default TeacherDashboard;