import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { AlertHistoryScreen } from '../screens/alerts/AlertHistoryScreen';
import { ContactsScreen } from '../screens/contacts/ContactsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EmergencyScreen } from '../screens/emergency/EmergencyScreen';
import { InvitesScreen } from '../screens/contacts/InvitesScreen';
import { BlockedUsersScreen } from '../screens/contacts/BlockedUsersScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { PrivacyPolicyScreen } from '../screens/profile/PrivacyPolicyScreen';
import { AlertOverlayScreen } from '../screens/alerts/AlertOverlayScreen';
import { RootStackParamList, MainTabParamList } from './types';
import { COLORS } from '../config/constants';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.secondaryText,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="AlertHistory"
        component={AlertHistoryScreen}
        options={{
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ color }) => <TabIcon label="📋" color={color} />,
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarLabel: 'Contatos',
          tabBarIcon: ({ color }) => <TabIcon label="👥" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

import { Text } from 'react-native';

function TabIcon({ label }: { label: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export function MainStack(): React.JSX.Element {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: 'Perfil' }}
      />
      <Stack.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{ headerTitle: 'Alerta de Emergência' }}
      />
      <Stack.Screen
        name="Invites"
        component={InvitesScreen}
        options={{ headerTitle: 'Convites' }}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ headerTitle: 'Usuários Bloqueados' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerTitle: 'Editar Perfil' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerTitle: 'Política de Privacidade' }}
      />
      <Stack.Screen
        name="AlertOverlay"
        component={AlertOverlayScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
}
