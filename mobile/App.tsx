import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import CreateQuestScreen from './src/screens/CreateQuestScreen';
import QuestDetailScreen from './src/screens/QuestDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';

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

  const handleAuth = (authToken: string, authUser: any) => {
    setToken(authToken);
    setUser(authUser);
    setScreen({ name: 'explore' });
    setScreenHistory([]);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setScreen({ name: 'login' });
    setScreenHistory([]);
  };

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
