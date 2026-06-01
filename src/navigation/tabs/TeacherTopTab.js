import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import {useNavigation} from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import TeacherDashboard from '@screens/teacher/TeacherDashboard';
import TeacherClassRoom from '@screens/teacher/TeacherClassRoom';
import TeacherAttendance from '@screens/teacher/TeacherAttendance';
import TeacherAssignments from '@screens/teacher/TeacherAssignments';
import TeacherProfile from '@screens/teacher/TeacherProfile';

const Tab = createMaterialTopTabNavigator();

const tabs = [
  { name: 'Home', activeIcon: 'home', inactiveIcon: 'home-outline' },
  { name: 'ClassRoom', activeIcon: 'google-classroom', inactiveIcon: 'google-classroom' },
  { name: 'Attendance', activeIcon: 'calendar-check', inactiveIcon: 'calendar-check-outline' },
  { name: 'Assignments', activeIcon: 'clipboard-text', inactiveIcon: 'clipboard-text-outline' },
  { name: 'Profile', activeIcon: 'account-circle', inactiveIcon: 'account-circle-outline' },
];

const AppBar = ({screenName, onHamburgerPress}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[
      styles.appBar, 
      { 
        paddingTop: insets.top, 
        height: 56 + insets.top 
      }
    ]}>
      <TouchableOpacity
        onPress={onHamburgerPress}
        style={styles.hamburger}
        activeOpacity={0.7}>
        <MatIcon name="menu" size={18} color="#202124" />
      </TouchableOpacity>
      <Text style={styles.screenName}>{screenName}</Text>
    </View>
  );
};

const CustomTabBar = ({state, navigation}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBar, 
      { 
        paddingBottom: insets.bottom, 
        height: 56 + insets.bottom 
      }
    ]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = tabs.find(t => t.name === route.name);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}>
            <View
              style={[
                styles.iconWrapper,
                isFocused && styles.iconWrapperActive,
                {width: 44, height: 44, borderRadius: 22, overflow: 'hidden'},
              ]}>
              <MatIcon
                name={isFocused ? tab.activeIcon : tab.inactiveIcon}
                size={26}
                color={isFocused ? '#000' : '#8e8e8e'}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#7b68ee',
    paddingHorizontal: 8,
    elevation: 0,
  },
  hamburger: {
    padding: 8,
    borderRadius: 20,
  },
  screenName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#202124',
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#7b68ee',
    elevation: 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#efefef',
  },
});

function TeacherTopTabContent() {
  const [currentScreen, setCurrentScreen] = React.useState('Home');
  const navigation = useNavigation();

  const handleHamburger = () => {
    navigation.openDrawer();
  };

  return (
    <View style={{flex: 1, backgroundColor: '#ffffff'}}>
      {/* App Bar */}
      <AppBar
        screenName={currentScreen}
        onHamburgerPress={handleHamburger}
      />

      {/* Tab Navigator */}
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          swipeEnabled: true,
          animationEnabled: true,
        }}
        screenListeners={{
          state: e => {
            const index = e.data.state.index;
            const name = e.data.state.routes[index].name;
            setCurrentScreen(name);
          },
        }}>
        <Tab.Screen name="Home" component={TeacherDashboard} />
        <Tab.Screen name="ClassRoom" component={TeacherClassRoom} />
        <Tab.Screen name="Attendance" component={TeacherAttendance} />
        <Tab.Screen name="Assignments" component={TeacherAssignments} />
        <Tab.Screen name="Profile" component={TeacherProfile} />
      </Tab.Navigator>
    </View>
  );
}

export default function TeacherTopTab() {
  return (
    <SafeAreaProvider>
      <TeacherTopTabContent />
    </SafeAreaProvider>
  );
}