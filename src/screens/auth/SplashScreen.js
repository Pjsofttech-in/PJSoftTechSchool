import React, {useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, StatusBar} from 'react-native';
import useAuthStore from '@store/authStore';

const SplashScreen = ({navigation}) => {
  const init = useCallback(() => {
    setTimeout(() => {
      const {isAuthenticated} = useAuthStore.getState();
      if (!isAuthenticated) {
        navigation.replace('RoleSelect');
      }
    }, 2000);
  }, [navigation]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a73e8" />
      <Text style={styles.appName}>PJSoftTech</Text>
      <Text style={styles.tagline}>Smart School Management</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Poppins-Bold',
  },
  tagline: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    fontFamily: 'Poppins-Regular',
    marginTop: 8,
  },
});

export default SplashScreen;