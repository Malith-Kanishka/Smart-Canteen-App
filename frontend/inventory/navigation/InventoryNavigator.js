import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import StockDashboard from '../screens/StockDashboard';
import ProfileScreen from '../../shared/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const InventoryTabs = ({ onSignOut }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#bdc3c7',
      }}
    >
      <Tab.Screen name="Dashboard" component={StockDashboard} options={{ title: 'Stock' }} />
      <Tab.Screen name="Profile" options={{ title: 'Profile' }}>
        {(props) => <ProfileScreen {...props} userRole="inventory" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const InventoryNavigator = ({ onSignOut }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryTabs">
        {(props) => <InventoryTabs {...props} onSignOut={onSignOut} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default InventoryNavigator;
