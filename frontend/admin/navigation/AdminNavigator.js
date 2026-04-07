import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminDashboard from '../screens/AdminDashboard';
import StaffManagement from '../screens/StaffManagement';
import CustomerManagement from '../screens/CustomerManagement';
import ProfileScreen from '../../shared/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AdminTabs = ({ onSignOut }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#bdc3c7',
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Staff" component={StaffManagement} />
      <Tab.Screen name="Customers" component={CustomerManagement} />
      <Tab.Screen name="SecurityProfile">
        {(props) => <ProfileScreen {...props} userRole="admin" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const AdminNavigator = ({ onSignOut }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs">
        {(props) => <AdminTabs {...props} onSignOut={onSignOut} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AdminNavigator;
