import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT, Region } from 'react-native-maps';
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
  latitude: number;
  longitude: number;
  distance_km: number;
  expires_at: string;
  created_at: string;
}

export default function ExploreScreen({ token, onQuestSelect, onCreateQuest }: MapScreenProps) {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const { location, loading: locationLoading, error: locationError } = useLocation(true);
  const mapRef = useRef<MapView>(null);
  const [searchCoords, setSearchCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

  // Dark Map Style
  const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#263c3f' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b9a76' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#746855' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#515c6d' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#17263c' }],
    },
  ];

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

  const fetchQuests = async (lat?: number, lng?: number) => {
    const targetLat = lat || searchCoords?.latitude || location?.latitude;
    const targetLng = lng || searchCoords?.longitude || location?.longitude;

    if (!targetLat || !targetLng) return;

    try {
      const result = await api.getNearbyQuests(
        token,
        targetLat,
        targetLng,
        50,
        selectedCategory
      );
      if (result.quests) {
        setQuests(result.quests);
        setSearchCoords({ latitude: targetLat, longitude: targetLng });
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShowSearchButton(false);
    }
  };

  // Initialize when location is found
  useEffect(() => {
    if (location && !searchCoords) {
      setSearchCoords(location);
      setLoading(true);
      fetchQuests(location.latitude, location.longitude);
    }
  }, [location]);

  // Refetch when category changes
  useEffect(() => {
    if (searchCoords) {
      fetchQuests();
    }
  }, [selectedCategory]);

  const handleRegionChange = (region: Region) => {
    setCurrentRegion(region);
    // Show search button if moved significantly (e.g., > 1km)
    // For simplicity, just show it if user interacted
    if (!loading) setShowSearchButton(true);
  };

  const handeSearchArea = () => {
    if (currentRegion) {
      setLoading(true);
      fetchQuests(currentRegion.latitude, currentRegion.longitude);
    }
  };

  // Center map when view mode changes to map
  useEffect(() => {
    if (viewMode === 'map' && searchCoords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: searchCoords.latitude,
        longitude: searchCoords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [viewMode]);

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
      foodie: '🍕', art: '🎨', music: '🎵', chill: '😎',
      adventure: '🏔️', sport: '⚽', general: '✨',
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Nearby Quests</Text>
          {location && (
            <Text style={styles.locationIndicator}>
              📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          >
            <Text style={styles.modeButtonText}>
              {viewMode === 'list' ? '🗺️ Map' : '📜 List'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={onCreateQuest}>
            <Text style={styles.createButtonText}>+</Text>
          </TouchableOpacity>
        </View>
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
      ) : viewMode === 'list' ? (
        quests.length === 0 ? (
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
        )
      ) : (
        <View style={styles.mapContainer}>
          {searchCoords && (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: searchCoords.latitude,
                longitude: searchCoords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onRegionChangeComplete={handleRegionChange}
              showsUserLocation={true}
              userInterfaceStyle="dark"
              customMapStyle={mapStyle}
            >
              {quests.map((quest) => (
                <Marker
                  key={quest.id}
                  coordinate={{
                    latitude: quest.latitude,
                    longitude: quest.longitude,
                  }}
                  title={quest.title}
                  description={quest.description || 'No description'}
                >
                  <View style={styles.markerContainer}>
                    <Text style={styles.markerEmoji}>{getCategoryEmoji(quest.category)}</Text>
                  </View>
                  <Callout onPress={() => onQuestSelect(quest.id)}>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{quest.title}</Text>
                      <Text style={styles.calloutSubtitle}>Tap to view details</Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}
          {showSearchButton && (
            <TouchableOpacity style={styles.searchAreaButton} onPress={handeSearchArea}>
              <Text style={styles.searchAreaText}>Search this area</Text>
            </TouchableOpacity>
          )}
        </View>
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
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  locationIndicator: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  modeButton: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#a855f7',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
    marginTop: -2,
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
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    backgroundColor: '#1a1a2e',
    padding: 6,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#a855f7',
    elevation: 4,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  markerEmoji: {
    fontSize: 24,
  },
  calloutContainer: {
    width: 160,
    padding: 8,
    alignItems: 'center',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#a855f7',
    textAlign: 'center',
  },
  searchAreaButton: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  searchAreaText: {
    color: '#a855f7',
    fontWeight: '700',
    fontSize: 14,
  },
});
