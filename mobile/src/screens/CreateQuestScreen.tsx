import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { api } from '../services/api';
import { useLocation } from '../hooks/useLocation';

interface CreateQuestScreenProps {
  token: string;
  onBack: () => void;
  onCreated: (questId: string) => void;
}

const CATEGORIES = [
  { key: 'general', label: '✨ General' },
  { key: 'foodie', label: '🍕 Foodie' },
  { key: 'art', label: '🎨 Art' },
  { key: 'music', label: '🎵 Music' },
  { key: 'chill', label: '😎 Chill' },
  { key: 'adventure', label: '🏔️ Adventure' },
  { key: 'sport', label: '⚽ Sport' },
];

const MAX_VIDEO_DURATION = 15; // seconds

export default function CreateQuestScreen({ token, onBack, onCreated }: CreateQuestScreenProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const { location, loading: locationLoading } = useLocation();
  const videoRef = useRef<Video>(null);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'We need access to your media library to select a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      // Check duration if available
      if (asset.duration && asset.duration > MAX_VIDEO_DURATION * 1000) {
        Alert.alert('Too Long', `Video must be ${MAX_VIDEO_DURATION} seconds or less. Yours is ${Math.ceil(asset.duration / 1000)}s.`);
        return;
      }

      setVideoUri(asset.uri);
      setUploadedVideoUrl(null); // Reset any previous upload
    }
  };

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'We need camera access to record a video.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      setUploadedVideoUrl(null);
    }
  };

  const removeVideo = () => {
    setVideoUri(null);
    setUploadedVideoUrl(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Quest title is required');
      return;
    }

    if (!location) {
      Alert.alert('Location Required', 'We need your location to pin the quest on the map.');
      return;
    }

    setLoading(true);

    try {
      // Upload video first if one is selected
      let videoUrl = uploadedVideoUrl;
      if (videoUri && !uploadedVideoUrl) {
        setUploading(true);
        const uploadResult = await api.uploadVideo(token, videoUri);
        setUploading(false);

        if (uploadResult.error) {
          Alert.alert('Upload Failed', uploadResult.error);
          setLoading(false);
          return;
        }
        videoUrl = uploadResult.videoUrl || null;
        setUploadedVideoUrl(videoUrl);
      }

      // Create the quest with video URL
      const result = await api.createQuest(token, {
        title: title.trim(),
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        category,
        videoUrl: videoUrl || undefined,
      });

      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        Alert.alert('Quest Created! 🎉', 'Your quest is now live for 3 hours.', [
          { text: 'OK', onPress: () => onCreated(result.quest.id) },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Quest</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        {/* Video Section */}
        <Text style={styles.label}>Quest Video (15s max)</Text>
        {videoUri ? (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.videoPreview}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isLooping={false}
              useNativeControls
            />
            <TouchableOpacity style={styles.removeVideoButton} onPress={removeVideo}>
              <Text style={styles.removeVideoText}>✕ Remove</Text>
            </TouchableOpacity>
            {uploadedVideoUrl && (
              <View style={styles.uploadedBadge}>
                <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.videoButtons}>
            <TouchableOpacity style={styles.videoButton} onPress={recordVideo}>
              <Text style={styles.videoButtonIcon}>🎥</Text>
              <Text style={styles.videoButtonText}>Record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoButton} onPress={pickVideo}>
              <Text style={styles.videoButtonIcon}>📁</Text>
              <Text style={styles.videoButtonText}>Choose</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Quest Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="What's the adventure?"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell people what to expect..."
          placeholderTextColor="#666"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                category === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === cat.key && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Quest Info</Text>
          <Text style={styles.infoText}>
            • Your quest will be live for <Text style={styles.infoBold}>3 hours</Text>
          </Text>
          <Text style={styles.infoText}>
            • Video: <Text style={styles.infoBold}>{MAX_VIDEO_DURATION}s max</Text>, MP4 or MOV
          </Text>
          <Text style={styles.infoText}>
            • Location:{' '}
            {locationLoading ? (
              <Text style={styles.infoBold}>Getting GPS...</Text>
            ) : location ? (
              <Text style={styles.infoBold}>
                📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            ) : (
              <Text style={{ color: '#ff4444' }}>Not available</Text>
            )}
          </Text>
          <Text style={styles.infoText}>
            • Up to <Text style={styles.infoBold}>10 people</Text> can join
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (loading || locationLoading || !location) && styles.submitButtonDisabled]}
          onPress={handleCreate}
          disabled={loading || locationLoading || !location}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitButtonText}> Uploading video...</Text>
            </View>
          ) : loading ? (
            <ActivityIndicator color="#fff" />
          ) : locationLoading ? (
            <Text style={styles.submitButtonText}>📍 Getting Location...</Text>
          ) : (
            <Text style={styles.submitButtonText}>🚀 Launch Quest</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backButton: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Video styles
  videoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  videoButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderStyle: 'dashed',
  },
  videoButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  videoButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  videoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeVideoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  removeVideoText: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  uploadedBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  categoryChipActive: {
    backgroundColor: '#2a1a4e',
    borderColor: '#a855f7',
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#a855f7',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  infoTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 22,
  },
  infoBold: {
    color: '#a855f7',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#a855f7',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
