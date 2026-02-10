import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { api } from '../services/api';
import { useLocation } from '../hooks/useLocation';

interface MapScreenProps {
  token: string;
  onQuestSelect: (questId: string) => void;
  onCreateQuest: () => void;
}

interface QuestItem {
  id: string;
  title: string;
  description: string;
  creator_username: string;
  category: string;
  participant_count: string;
  max_participants: number;
  distance_km: number;
  expires_at: string;
  created_at: string;
}

export default function MapScreen({ token, onQuestSelect, onCreateQuest }: MapScreenProps) {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { location, loading: locationLoading, error: locationError, refreshLocation } = useLocation(true);

  const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'general', label: '✨ General' },
    { key: 'foodie', label: '🍕 Foodie' },
    { key: 'art', label: '🎨 Art' },
    { key: 'music', label: '🎵 Music' },
    { key: 'chill', label: '😎 Chill' },
    { key: 'adventure', label: '🏔️ Adventure' },
    { key: 'sport', label: '⚽ Sport' },
  ];

  const fetchQuests = async () => {
    if (!location) return;
    try {
      const result = await api.getNearbyQuests(
        token,
        location.latitude,
        location.longitude,
        50,
        selectedCategory // Pass selected category
      );
      if (result.quests) {
        setQuests(result.quests);
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (location) {
      setLoading(true); // Show loading when category changes
      fetchQuests();
    }
  }, [location, selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuests();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      foodie: '🍕',
      art: '🎨',
      music: '🎵',
      chill: '😎',
      adventure: '🏔️',
      sport: '⚽',
      general: '✨',
    };
    return map[category] || '✨';
  };

  const renderQuest = ({ item }: { item: QuestItem }) => (
    <TouchableOpacity style={styles.questCard} onPress={() => onQuestSelect(item.id)}>
      <View style={styles.questHeader}>
        <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
        <View style={styles.questInfo}>
          <Text style={styles.questTitle}>{item.title}</Text>
          <Text style={styles.questCreator}>by @{item.creator_username}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{getTimeRemaining(item.expires_at)}</Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.questDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.questFooter}>
        <Text style={styles.distanceText}>
          📍 {item.distance_km < 1
            ? `${Math.round(item.distance_km * 1000)}m away`
            : `${item.distance_km.toFixed(1)}km away`}
        </Text>
        <Text style={styles.participantText}>
          👥 {item.participant_count}/{item.max_participants}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Nearby Quests</Text>
          {location && (
            <Text style={styles.locationIndicator}>
              📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              {locationError ? ' (approximate)' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.createButton} onPress={onCreateQuest}>
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.filterChip,
                selectedCategory === cat.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory === cat.key && styles.filterTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {locationLoading || loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.emptyText}>
            {locationLoading ? 'Getting your location...' : 'Loading quests...'}
          </Text>
        </View>
      ) : quests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No quests nearby</Text>
          <Text style={styles.emptyText}>Be the first to create one!</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onCreateQuest}>
            <Text style={styles.emptyButtonText}>Create a Quest</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={quests}
          renderItem={renderQuest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a855f7"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#0a0a0f',
  },
  filterContainer: {
    backgroundColor: '#0a0a0f',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  filterChipActive: {
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
  },
  filterText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  locationIndicator: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  questCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  questCreator: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: '#2a1a3e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '600',
  },
  questDescription: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  distanceText: {
    color: '#888',
    fontSize: 13,
  },
  participantText: {
    color: '#888',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
