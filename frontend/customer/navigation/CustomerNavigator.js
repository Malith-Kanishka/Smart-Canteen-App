import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BrowseMenu from '../screens/BrowseMenu';
import MyOrders from '../screens/MyOrders';
import MyFeedback from '../screens/MyFeedback';
import ProfileScreen from '../../shared/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const CustomerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#bdc3c7',
      }}
    >
      <Tab.Screen name="Menu" component={BrowseMenu} />
      <Tab.Screen name="MyOrders" component={MyOrders} options={{ title: 'Orders' }} />
      <Tab.Screen name="MyFeedback" component={MyFeedback} options={{ title: 'Feedback' }} />
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} userRole="customer" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const CustomerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
