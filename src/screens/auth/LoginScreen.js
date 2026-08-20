import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import {authApi} from '@api/authApi';
import useAuthStore from '@store/authStore';

const LoginScreen = ({route}) => {
  const {role} = route.params;
  const {login} = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const roleConfig = {
    teacher: {
      title: 'Teacher Login',
      subtitle: 'Welcome back, Teacher!',
      color: '#6495ED',
      icon: 'human-male-board',
    },
    student: {
      title: 'Student Login',
      subtitle: 'Welcome back, Student!',
      color: '#6495ED',
      icon: 'account-school',
    },
    parent: {
      title: 'Parent Login',
      subtitle: 'Welcome back, Parent!',
      color: '#6495ED',
      icon: 'account-child',
    },
  };

  const config = roleConfig[role];

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    if (!validate()) return;
    setApiError('');
    setLoading(true);

    try {
      let response;
      if (role === 'teacher') {
        response = await authApi.teacherLogin({email, password});
      } else if (role === 'student') {
        response = await authApi.studentLogin({email, password});
      }
       else if (role === 'parent') {
         response = await authApi.parentLogin({email, password});
       }

      const {token, data} = response.data;
      login(token, data, data.role);

    } catch (error) {
      setApiError(
        error?.response?.data?.message ||
        error?.message ||
        'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={config.color} />

      {/* Header */}
      <View style={[styles.header, {backgroundColor: config.color}]}>
        <MatIcon name={config.icon} size={40} color="#ffffff" />
        <Text style={styles.headerTitle}>{config.title}</Text>
        <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
      </View>

      {/* Form */}
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <ScrollView
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled">

          {/* API Error */}
          {apiError ? (
            <View style={styles.errorBanner}>
              <MatIcon name="alert-circle" size={16} color="#c5221f" />
              <Text style={styles.errorBannerText}>{apiError}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <View
              style={[
                styles.inputContainer,
                errors.email && styles.inputError,
              ]}>
              <MatIcon name="email-outline" size={20} color="#80868b" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#80868b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (errors.email) setErrors({...errors, email: ''});
                }}
              />
            </View>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <View
              style={[
                styles.inputContainer,
                errors.password && styles.inputError,
              ]}>
              <MatIcon name="lock-outline" size={20} color="#80868b" />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#80868b"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (errors.password) setErrors({...errors, password: ''});
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}>
                <MatIcon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color="#80868b"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              {backgroundColor: config.color},
              loading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MatIcon name="login" size={20} color="#ffffff" />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 8,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 25,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#ffffff',
    opacity: 0.85,
  },
  formContainer: {
    padding: 24,
    paddingTop: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce8e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ea4335',
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#c5221f',
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#202124',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#dadce0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#202124',
  },
  inputError: {
    borderColor: '#ea4335',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#ea4335',
    marginTop: 6,
    marginLeft: 4,
  },
  loginButton: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

export default LoginScreen;