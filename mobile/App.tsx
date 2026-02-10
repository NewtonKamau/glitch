import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import CreateQuestScreen from './src/screens/CreateQuestScreen';
import QuestDetailScreen from './src/screens/QuestDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { api } from './src/services/api';
import { usePushNotifications } from './src/hooks/usePushNotifications';

const AUTH_TOKEN_KEY = '@glitch_token';
const AUTH_USER_KEY = '@glitch_user';

type Screen =
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'explore' }
  | { name: 'createQuest' }
  | { name: 'questDetail'; questId: string }
  | { name: 'chat'; questId: string; questTitle: string }
  | { name: 'profile' };

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'login' });
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [initializing, setInitializing] = useState(true);

  // Restore saved session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const savedUser = await AsyncStorage.getItem(AUTH_USER_KEY);

        if (savedToken && savedUser) {
          // Verify the token is still valid by fetching the profile
          try {
            const profile = await api.getProfile(savedToken);
            if (profile.user) {
              setToken(savedToken);
              setUser(profile.user);
              setScreen({ name: 'explore' });
            } else {
              // Token expired or invalid — clear storage
              await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
            }
          } catch {
            // Network error — use cached user data anyway
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            setScreen({ name: 'explore' });
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // Update push token when logged in
  const { expoPushToken } = usePushNotifications();
  useEffect(() => {
    if (token && expoPushToken) {
      api.updatePushToken(token, expoPushToken).catch((err) => {
        console.error('Failed to update push token:', err);
      });
    }
  }, [token, expoPushToken]);

  const navigate = (nextScreen: Screen) => {
    setScreenHistory((prev) => [...prev, screen]);
    setScreen(nextScreen);
  };

  const goBack = () => {
    setScreenHistory((prev) => {
      const copy = [...prev];
      const lastScreen = copy.pop();
      if (lastScreen) {
        setScreen(lastScreen);
      }
      return copy;
    });
  };

  const handleAuth = async (authToken: string, authUser: any) => {
    setToken(authToken);
    setUser(authUser);
    setScreen({ name: 'explore' });
    setScreenHistory([]);

    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
    } catch (err) {
      console.error('Failed to save auth:', err);
    }
  };

  const handleLogout = async () => {
    setToken(null);
    setUser(null);
    setScreen({ name: 'login' });
    setScreenHistory([]);

    // Clear persisted session
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
    } catch (err) {
      console.error('Failed to clear auth:', err);
    }
  };

  // --- Splash / Loading ---
  if (initializing) {
    return (
      <View style={splashStyles.container}>
        <StatusBar style="light" />
        <Text style={splashStyles.logo}>⚡</Text>
        <Text style={splashStyles.title}>GLITCH</Text>
        <ActivityIndicator size="small" color="#a855f7" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // --- Auth Screens ---
  if (!token) {
    if (screen.name === 'register') {
      return (
        <>
          <StatusBar style="light" />
          <RegisterScreen
            onRegister={handleAuth}
            onSwitchToLogin={() => setScreen({ name: 'login' })}
          />
        </>
      );
    }
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen
          onLogin={handleAuth}
          onSwitchToRegister={() => setScreen({ name: 'register' })}
        />
      </>
    );
  }

  // --- Authenticated Screens ---
  const renderScreen = () => {
    switch (screen.name) {
      case 'explore':
        return (
          <ExploreScreen
            token={token}
            onQuestSelect={(questId) => navigate({ name: 'questDetail', questId })}
            onCreateQuest={() => navigate({ name: 'createQuest' })}
          />
        );

      case 'createQuest':
        return (
          <CreateQuestScreen
            token={token}
            onBack={goBack}
            onCreated={(questId) => {
              setScreen({ name: 'questDetail', questId });
            }}
          />
        );

      case 'questDetail':
        return (
          <QuestDetailScreen
            token={token}
            questId={screen.questId}
            userId={user?.id}
            onBack={goBack}
            onOpenChat={(questId, questTitle) =>
              navigate({ name: 'chat', questId, questTitle })
            }
          />
        );

      case 'chat':
        return (
          <ChatScreen
            token={token}
            questId={screen.questId}
            questTitle={screen.questTitle}
            onBack={goBack}
          />
        );

      case 'profile':
        return (
          <ProfileScreen token={token} user={user} onLogout={handleLogout} />
        );

      default:
        return (
          <ExploreScreen
            token={token}
            onQuestSelect={(questId) => navigate({ name: 'questDetail', questId })}
            onCreateQuest={() => navigate({ name: 'createQuest' })}
          />
        );
    }
  };

  const showTabBar = screen.name === 'explore' || screen.name === 'profile';

  return (
    <>
      <StatusBar style="light" />
      {renderScreen()}

      {/* Bottom Tab Bar */}
      {showTabBar && (
        <View style={tabStyles.container}>
          <TouchableOpacity
            style={tabStyles.tab}
            onPress={() => setScreen({ name: 'explore' })}
          >
            <Text style={[tabStyles.tabIcon, screen.name === 'explore' && tabStyles.tabActive]}>
              🗺️
            </Text>
            <Text style={[tabStyles.tabLabel, screen.name === 'explore' && tabStyles.tabLabelActive]}>
              Explore
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tabStyles.tab}
            onPress={() => setScreen({ name: 'profile' })}
          >
            <Text style={[tabStyles.tabIcon, screen.name === 'profile' && tabStyles.tabActive]}>
              👤
            </Text>
            <Text style={[tabStyles.tabLabel, screen.name === 'profile' && tabStyles.tabLabelActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#a855f7',
    letterSpacing: 4,
  },
});

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0f',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    paddingBottom: 30,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#a855f7',
    fontWeight: '600',
  },
});
