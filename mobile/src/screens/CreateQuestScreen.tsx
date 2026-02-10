import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';

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

export default function CreateQuestScreen({ token, onBack, onCreated }: CreateQuestScreenProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Quest title is required');
      return;
    }

    setLoading(true);
    try {
      // Use default location for now (Nairobi). In production, use device GPS.
      const result = await api.createQuest(token, {
        title: title.trim(),
        description: description.trim(),
        latitude: -1.2921,
        longitude: 36.8219,
        category,
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
            • Location will be set to your <Text style={styles.infoBold}>current position</Text>
          </Text>
          <Text style={styles.infoText}>
            • Up to <Text style={styles.infoBold}>10 people</Text> can join
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
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
