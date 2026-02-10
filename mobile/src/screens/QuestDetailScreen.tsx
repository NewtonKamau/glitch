import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';

interface QuestDetailScreenProps {
  token: string;
  questId: string;
  userId: string;
  onBack: () => void;
  onOpenChat: (questId: string, questTitle: string) => void;
}

export default function QuestDetailScreen({
  token,
  questId,
  userId,
  onBack,
  onOpenChat,
}: QuestDetailScreenProps) {
  const [quest, setQuest] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const fetchQuest = async () => {
    try {
      const result = await api.getQuest(token, questId);
      if (result.quest) {
        setQuest(result.quest);
        setParticipants(result.participants || []);
      }
    } catch (err) {
      console.error('Failed to fetch quest:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuest();
  }, [questId]);

  const isCreator = quest?.creator_id === userId;
  const isParticipant = participants.some((p) => p.id === userId);
  const hasAccess = isCreator || isParticipant;

  const handleJoin = async () => {
    setJoining(true);
    try {
      const result = await api.joinQuest(token, questId);
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        Alert.alert('Joined! 🎉', 'You are now part of this quest.');
        fetchQuest();
      }
    } catch (err) {
      Alert.alert('Error', 'Could not join quest');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    Alert.alert('Leave Quest', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.leaveQuest(token, questId);
            fetchQuest();
          } catch (err) {
            Alert.alert('Error', 'Could not leave quest');
          }
        },
      },
    ]);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      foodie: '🍕', art: '🎨', music: '🎵', chill: '😎',
      adventure: '🏔️', sport: '⚽', general: '✨',
    };
    return map[category] || '✨';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  if (!quest) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Quest not found</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quest Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quest Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>{getCategoryEmoji(quest.category)}</Text>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.questCreator}>Created by @{quest.creator_username}</Text>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>⏱ {getTimeRemaining(quest.expires_at)}</Text>
          </View>
        </View>

        {/* Description */}
        {quest.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{quest.description}</Text>
          </View>
        ) : null}

        {/* Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Participants ({participants.length}/{quest.max_participants})
          </Text>
          {participants.length === 0 ? (
            <Text style={styles.noParticipants}>No one has joined yet. Be the first!</Text>
          ) : (
            participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantInitial}>
                    {p.username?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.participantName}>@{p.username}</Text>
                {p.id === quest.creator_id && (
                  <View style={styles.creatorTag}>
                    <Text style={styles.creatorTagText}>Creator</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        {hasAccess && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => onOpenChat(questId, quest.title)}
          >
            <Text style={styles.chatButtonText}>💬 Chat</Text>
          </TouchableOpacity>
        )}

        {isCreator ? (
          <View style={styles.creatorBadgeBar}>
            <Text style={styles.creatorBadgeText}>✨ You created this quest</Text>
          </View>
        ) : isParticipant ? (
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
            <Text style={styles.leaveButtonText}>Leave Quest</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, joining && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>⚡ Join Quest</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backButton: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    color: '#a855f7',
    fontSize: 16,
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  errorText: {
    color: '#888',
    fontSize: 18,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  questTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  questCreator: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  timeBadge: {
    backgroundColor: '#2a1a3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  timeText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  descriptionText: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 24,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  noParticipants: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantInitial: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  participantName: {
    color: '#ddd',
    fontSize: 15,
    flex: 1,
  },
  creatorTag: {
    backgroundColor: '#2a1a4e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  creatorTagText: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '600',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 36,
    backgroundColor: '#0a0a0f',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    gap: 12,
  },
  chatButton: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#a855f7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  leaveButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a1a1e',
  },
  leaveButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  creatorBadgeBar: {
    flex: 1,
    backgroundColor: '#2a1a4e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  creatorBadgeText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '600',
  },
});
