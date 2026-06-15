import React, { Component } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MatIcon from '@react-native-vector-icons/material-design-icons';

const PRIMARY = '#7b68ee';

class TeacherAccountContent extends Component {
  render() {
    const { insets, navigation } = this.props;

    return (
      <View style={styles.container}>
        <View style={[
          styles.header, 
          { paddingTop: Math.max(16, insets.top) } 
        ]}>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </View>

        <ScrollView 
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE PREVIEW */}
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>@</Text>
            </View>
            <Text style={styles.userName}> Please log in again </Text>
            <Text style={styles.userRole}> to access your account. </Text>
          </View>

          {/* SETTINGS MENU */}
          <View style={styles.menuContainer}>
            <Text style={styles.menuLabel}>General</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <MatIcon name="account-outline" size={22} color={PRIMARY} />
                <Text style={styles.menuText}>Personal Details</Text>
              </View>
              <MatIcon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <MatIcon name="lock-outline" size={22} color={PRIMARY} />
                <Text style={styles.menuText}>Change Password</Text>
              </View>
              <MatIcon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          {/* SIGN OUT */}
          <View style={styles.footer}>
             <TouchableOpacity 
                style={styles.logoutBtn} 
                activeOpacity={0.7}
                onPress={() => {/* Handle Logout logic */}}
             >
                <MatIcon name="power" size={20} color="#fff" />
                <Text style={styles.logoutText}> PJSoftTech, Pune </Text>
             </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fe',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a1a2e',
  },
  profileSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ede9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Poppins-SemiBold',
    color: PRIMARY,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a1a2e',
  },
  userRole: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#888',
  },
  menuContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fe',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  logoutBtn: {
    backgroundColor: '#ff5252',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  }
});

export default function TeacherAccount() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <TeacherAccountContent insets={insets} navigation={navigation} />
  );
}