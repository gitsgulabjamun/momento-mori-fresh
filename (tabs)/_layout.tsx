import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#8B7355',
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#2A2A2A',
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
        headerStyle: {
          backgroundColor: '#1A1A1A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Momento Mori',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'hourglass' : 'hourglass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reflect"
        options={{
          title: 'Reflect',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'journal' : 'journal-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'flag' : 'flag-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
