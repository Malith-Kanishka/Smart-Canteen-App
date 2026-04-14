import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TransactionsList from '../screens/TransactionsList';
import ProfileScreen from '../../shared/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FinanceTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#bdc3c7',
      }}
    >
      <Tab.Screen name="Transactions" component={TransactionsList} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const FinanceNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FinanceTabs" component={FinanceTabs} />
    </Stack.Navigator>
  );
};

export default FinanceNavigator;
