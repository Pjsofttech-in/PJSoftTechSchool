import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';

const roles = [
  {
    id: 'teacher',
    label: 'Continue as Teacher',
    color: '#1a73e8',
  },
  {
    id: 'student',
    label: 'Continue as Student',
    color: '#34a853',
  },
  {
    id: 'parent',
    label: 'Continue as Parent',
    color: '#fa7b17',
  },
];

const RoleSelectScreen = ({navigation}) => {
  const handleRoleSelect = role => {
    navigation.navigate('Login', {role});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Section */}
      <View style={styles.topSection}>
        <Text style={styles.appName}>PJSoftTech</Text>
        <Text style={styles.tagline}>Smart School Management</Text>
      </View>

      {/* Center Illustration */}
      <View style={styles.centerSection}>
        <Text style={styles.illustration}>🏫</Text>
        <Text style={styles.welcomeText}>Welcome!</Text>
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
  topSection: {
    paddingTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#1a73e8',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#5f6368',
    marginTop: 4,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  illustration: {
    fontSize: 80,
    marginBottom: 16,
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
    gap: 12,
  },
  roleButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

export default RoleSelectScreen;