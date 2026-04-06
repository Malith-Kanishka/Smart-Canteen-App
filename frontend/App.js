import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import shared screens
import LoginScreen from './shared/screens/LoginScreen';
import SplashScreen from './shared/screens/SplashScreen';

// Import role-based navigators
import AdminNavigator from './admin/navigation/AdminNavigator';
import FoodMasterNavigator from './foodmaster/navigation/FoodMasterNavigator';
import InventoryNavigator from './inventory/navigation/InventoryNavigator';
import PromotionNavigator from './promotion/navigation/PromotionNavigator';
import OrderNavigator from './order/navigation/OrderNavigator';
import FinanceNavigator from './finance/navigation/FinanceNavigator';
import FeedbackNavigator from './feedback/navigation/FeedbackNavigator';
import CustomerNavigator from './customer/navigation/CustomerNavigator';
import UnauthorizedScreen from './shared/screens/UnauthorizedScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.payload.token,
            userRole: action.payload.role,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.payload.token,
            userRole: action.payload.role,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
            userRole: null,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
      userRole: null,
    }
  );

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('userRole');
        if (token && role) {
          dispatch({ type: 'RESTORE_TOKEN', payload: { token, role } });
        } else {
          dispatch({ type: 'RESTORE_TOKEN', payload: { token: null, role: null } });
        }
      } catch (e) {
        console.error('Failed to restore token:', e);
        dispatch({ type: 'RESTORE_TOKEN', payload: { token: null, role: null } });
      }
    };

    bootstrapAsync();
  }, []);

  if (state.isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.userToken == null ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                animationEnabled: false,
              }}
            />
            <Stack.Screen
              name="Unauthorized"
              component={UnauthorizedScreen}
            />
          </>
        ) : (
          <>
            {state.userRole === 'admin' && (
              <Stack.Screen
                name="Admin"
                component={AdminNavigator}
                options={{ animationEnabled: false }}
              />
            )}
            {state.userRole === 'foodmaster' && (
              <Stack.Screen
                name="FoodMaster"
                component={FoodMasterNavigator}
                options={{ animationEnabled: false }}
              />
            )}
            {state.userRole === 'inventory' && (
              <Stack.Screen
                name="Inventory"
                component={InventoryNavigator}
                options={{ animationEnabled: false }}
              />
            )}
            {state.userRole === 'promotion' && (
              <Stack.Screen
                name="Promotion"
                component={PromotionNavigator}
                options={{ animationEnabled: false }}
              />
            )}
            {state.userRole === 'order' && (
              <Stack.Screen
                name="Order"
                component={OrderNavigator}
                options={{ animationEnabled: false }}
              />
            )}
            {state.userRole === 'finance' && (
              <Stack.Screen
                name="Finance"
                component={FinanceNavigator}
                options={{ animationEnabled: false }}
              />
            )}
            {state.userRole === 'feedback' && (
              <Stack.Screen
                name="Feedback"
                component={FeedbackNavigator}
                options={{ animationEnabled: false }}
              />
            )}
            {state.userRole === 'customer' && (
              <Stack.Screen
                name="Customer"
                component={CustomerNavigator}
                options={{ animationEnabled: false }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
