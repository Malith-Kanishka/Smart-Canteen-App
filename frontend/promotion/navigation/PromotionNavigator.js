import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SeasonalPromos from '../screens/SeasonalPromos';
import DailyDiscounts from '../screens/DailyDiscounts';
import ProfileScreen from '../../shared/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const PromotionTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#bdc3c7',
      }}
    >
      <Tab.Screen name="Seasonal" component={SeasonalPromos} options={{ title: 'Seasonal' }} />
      <Tab.Screen name="Daily" component={DailyDiscounts} options={{ title: 'Daily' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const PromotionNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PromotionTabs" component={PromotionTabs} />
    </Stack.Navigator>
  );
};

export default PromotionNavigator;
