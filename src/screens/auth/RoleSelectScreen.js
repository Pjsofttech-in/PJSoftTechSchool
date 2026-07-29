import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';

const roles = [
  {
    id: 'teacher',
    label: 'Continue as Teacher',
    color: '#1a73e8',
    icon: 'human-male-board',
  },
  {
    id: 'student',
    label: 'Continue as Student',
    color: '#1a73e8',
    icon: 'account-school',
  },
  {
    id: 'parent',
    label: 'Continue as Parent',
    color: '#1a73e8',
    icon: 'account-child',
  },
];

const RoleSelectScreen = ({navigation}) => {
  const handleRoleSelect = role => {
    navigation.navigate('Login', {role});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a73e8" />

      {/* Top Section */}
      <View style={styles.header}>
        <MatIcon name="school" size={42} color='#ffffff' />
        <Text style={styles.appName}>PJSoftTech</Text>
        <Text style={styles.tagline}>Smart School Management</Text>
      </View>

      {/* Center Illustration */}
      <View style={styles.centerSection}>
        <MatIcon
          name="school"
          size={72}
          color="#1a73e8"
          style={styles.schoolIcon}
        />
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.subText}>
          Please select your role to continue
        </Text>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomSection}>
        {roles.map(role => (
          <TouchableOpacity
            key={role.id}
            style={[styles.roleButton, {backgroundColor: role.color}]}
            onPress={() => handleRoleSelect(role.id)}
            activeOpacity={0.85}>
            <MatIcon
              name={role.icon}
              size={22}
              color='#ffffff'
            />
            <Text style={styles.roleButtonText}>{role.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#1a73e8',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    gap: 8,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#ffffff',
    opacity: 0.85,
    marginTop: 4,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  schoolIcon: {
    marginBottom: 18
  },
  welcomeText: {
    fontSize: 26,
    fontFamily: 'Poppins-SemiBold',
    color: '#202124',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5f6368',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 10,
  },
  roleButton: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  roleButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

export default RoleSelectScreen;