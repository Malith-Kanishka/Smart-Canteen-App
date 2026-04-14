import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import KitchenDisplay from '../screens/KitchenDisplay';
import ProfileScreen from '../../shared/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const OrderTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#bdc3c7',
      }}
    >
      <Tab.Screen name="Kitchen" component={KitchenDisplay} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const OrderNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderTabs" component={OrderTabs} />
    </Stack.Navigator>
  );
};

export default OrderNavigator;
