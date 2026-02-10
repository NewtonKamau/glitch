import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseLocationReturn {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

// Default fallback (Nairobi, Kenya)
const FALLBACK_LOCATION: UserLocation = {
  latitude: -1.2921,
  longitude: 36.8219,
};

export function useLocation(watch = false): UseLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  const requestAndGetLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if location services are enabled
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        setError('Location services are disabled');
        Alert.alert(
          'Location Required',
          'GLITCH needs your location to discover nearby quests. Please enable location services.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        setLocation(FALLBACK_LOCATION);
        setLoading(false);
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission denied');
        Alert.alert(
          'Permission Needed',
          'GLITCH needs location access to show quests near you. You can enable it in Settings.',
          [
            { text: 'Use Default Location', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        setLocation(FALLBACK_LOCATION);
        setLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLoc: UserLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(userLoc);

      // Optionally start watching for location updates
      if (watch && !watchSubscription.current) {
        watchSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,   // Update every 10 seconds
            distanceInterval: 50,  // Or when user moves 50 meters
          },
          (loc) => {
            setLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        );
      }
    } catch (err: any) {
      console.error('Location error:', err);
      setError(err.message || 'Failed to get location');
      setLocation(FALLBACK_LOCATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestAndGetLocation();

    return () => {
      // Cleanup watcher on unmount
      if (watchSubscription.current) {
        watchSubscription.current.remove();
        watchSubscription.current = null;
      }
    };
  }, []);

  return {
    location,
    loading,
    error,
    refreshLocation: requestAndGetLocation,
  };
}
