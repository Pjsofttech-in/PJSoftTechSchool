import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import useAuthStore from '@store/authStore';

// Navigators
import AuthNavigator from './AuthNavigator';
import TeacherNavigator from './TeacherNavigator';
import StudentNavigator from './StudentNavigator';
// import ParentNavigator from './ParentNavigator';

const RootNavigator = () => {
  const {isAuthenticated, role, isLoading, initAuth} = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return null; // We will replace this with SplashScreen
  }

  const getNavigator = () => {
    switch (role?.toLowerCase()) {
      case 'branch':  return <TeacherNavigator />;
      case 'student': return <StudentNavigator />;
      // case 'parent':  return <ParentNavigator />;
      default:        return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {!isAuthenticated ? <AuthNavigator /> : getNavigator()}
    </NavigationContainer>
  );
};

export default RootNavigator;