import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Screens
import StudentDashboard from '@screens/student/StudentDashboard';
import StudentAttendance from '@screens/student/StudentAttendance';
import StudentAssignments from '@screens/student/StudentAssignments';
import StudentTimeTable from '@screens/student/StudentTimeTable';
import StudentProfile from '@screens/student/StudentProfile';

const Tab = createMaterialTopTabNavigator();

const tabs = [
  { name: 'Home', activeIcon: 'home', inactiveIcon: 'home-outline' },
  { name: 'Attendance', activeIcon: 'calendar-check', inactiveIcon: 'calendar-check-outline' },
  { name: 'Assignments', activeIcon: 'clipboard-text', inactiveIcon: 'clipboard-text-outline' },
  { name: 'TimeTable', activeIcon: 'timetable', inactiveIcon: 'timetable' },
  { name: 'Profile', activeIcon: 'account-circle', inactiveIcon: 'account-circle-outline' },
];

const AppBar = ({screenName, onHamburgerPress, insets}) => {
  return (
    <View style={[
      styles.appBar, 
      { paddingTop: Math.max(12, insets.top) }
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

const CustomTabBar = ({state, navigation, insets}) => {
  return (
    <View style={[
      styles.tabBar, 
      { paddingBottom: insets.bottom }
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

export default function StudentTopTab() {
  const [currentScreen, setCurrentScreen] = React.useState('Home');
  const navigation = useNavigation();
  
  const insets = useSafeAreaInsets();

  const handleHamburger = () => {
    navigation.openDrawer();
  };

  return (
    <View style={{flex: 1, backgroundColor: '#ffffff'}}>
      <AppBar
        screenName={currentScreen}
        onHamburgerPress={handleHamburger}
        insets={insets}
      />

      {/* Tab Navigator */}
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={props => <CustomTabBar {...props} insets={insets} />}
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
        <Tab.Screen name="Home" component={StudentDashboard} />
        <Tab.Screen name="Attendance" component={StudentAttendance} />
        <Tab.Screen name="Assignments" component={StudentAssignments} />
        <Tab.Screen name="TimeTable" component={StudentTimeTable} />
        <Tab.Screen name="Profile" component={StudentProfile} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#7b68ee',
    paddingHorizontal: 8,
    paddingBottom: 12, 
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
    paddingVertical: 4, 
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