import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FoodMasterMenu from '../screens/FoodMasterMenu';
import ProfileScreen from '../../shared/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FoodMasterTabs = ({ onSignOut }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#bdc3c7',
      }}
    >
      <Tab.Screen name="MenuCatalog" component={FoodMasterMenu} options={{ title: 'Menu' }} />
      <Tab.Screen name="Profile" options={{ title: 'Profile' }}>
        {(props) => <ProfileScreen {...props} userRole="foodmaster" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const FoodMasterNavigator = ({ onSignOut }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FoodMasterTabs">
        {(props) => <FoodMasterTabs {...props} onSignOut={onSignOut} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default FoodMasterNavigator;
