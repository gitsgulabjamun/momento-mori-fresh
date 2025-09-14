import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get backend URL from environment
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || 'http://localhost:8001';

interface Reflection {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  mood_score: number;
  productivity_score: number;
  gratitude_items: string[];
  lessons_learned: string[];
  goals_progress: string[];
  challenges_faced: string[];
  created_at: string;
}

const DAILY_QUESTIONS = [
  'What are three things you\'re grateful for today?',
  'What did you accomplish today that you\'re proud of?',
  'What\'s your main focus for tomorrow?',
];

const WEEKLY_QUESTIONS = [
  'What were your biggest achievements this week?',
  'What challenges did you overcome?',
  'What lessons did you learn?',
  'What are your priorities for next week?',
];

const MONTHLY_QUESTIONS = [
  'What major goals did you achieve this month?',
  'What habits did you develop or improve?',
  'What would you do differently?',
  'What are your priorities for next month?',
];

export default function ReflectScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // Form states
  const [moodScore, setMoodScore] = useState(3);
  const [productivityScore, setProductivityScore] = useState(3);
  const [responses, setResponses] = useState<string[]>(['', '', '', '']);

  useEffect(() => {
    getUserProfile();
  }, []);

  useEffect(() => {
    if (userProfileId) {
      fetchReflections();
    }
  }, [userProfileId, activeTab]);

  const getUserProfile = async () => {
    try {
      const profileId = await AsyncStorage.getItem('userProfileId');
      setUserProfileId(profileId);
    } catch (error) {
      console.error('Error getting user profile:', error);
    }
  };

  const fetchReflections = async () => {
    if (!userProfileId) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/reflections/${userProfileId}?type=${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        setReflections(data);
      }
    } catch (error) {
      console.error('Error fetching reflections:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReflection = async () => {
    if (!userProfileId) {
      Alert.alert('Error', 'User profile not found');
      return;
    }

    // Validate required responses
    const questions = getQuestionsForType();
    const filledResponses = responses.slice(0, questions.length).filter(r => r.trim());
    
    if (filledResponses.length < questions.length) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    try {
      const reflectionData = {
        user_id: userProfileId,
        type: activeTab,
        mood_score: moodScore,
        productivity_score: productivityScore,
        gratitude_items: activeTab === 'daily' ? [responses[0]] : [],
        lessons_learned: activeTab === 'daily' ? [responses[1]] : responses.slice(0, questions.length),
        goals_progress: activeTab === 'daily' ? [responses[2]] : [],
        challenges_faced: [],
      };

      const response = await fetch(`${BACKEND_URL}/api/reflections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reflectionData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Reflection saved successfully!');
        setResponses(['', '', '', '']);
        setMoodScore(3);
        setProductivityScore(3);
        fetchReflections();
      } else {
        Alert.alert('Error', 'Failed to save reflection');
      }
    } catch (error) {
      console.error('Error submitting reflection:', error);
      Alert.alert('Error', 'Failed to save reflection');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionsForType = () => {
    switch (activeTab) {
      case 'daily':
        return DAILY_QUESTIONS;
      case 'weekly':
        return WEEKLY_QUESTIONS;
      case 'monthly':
        return MONTHLY_QUESTIONS;
      default:
        return DAILY_QUESTIONS;
    }
  };

  const renderScaleSelector = (value: number, setValue: (value: number) => void, title: string) => (
    <View style={styles.scaleContainer}>
      <Text style={styles.scaleTitle}>{title}</Text>
      <View style={styles.scaleButtons}>
        {[1, 2, 3, 4, 5].map((score) => (
          <TouchableOpacity
            key={score}
            style={[
              styles.scaleButton,
              value === score && styles.scaleButtonActive,
            ]}
            onPress={() => setValue(score)}
          >
            <Text
              style={[
                styles.scaleButtonText,
                value === score && styles.scaleButtonTextActive,
              ]}
            >
              {score}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const questions = getQuestionsForType();

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Daily Reflection</Text>
        <Text style={styles.subtitle}>Take time to reflect on your journey</Text>
      </View>

      <View style={styles.tabContainer}>
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'daily' && (
          <>
            {renderScaleSelector(moodScore, setMoodScore, 'How was your mood today? (1-5)')}
            {renderScaleSelector(productivityScore, setProductivityScore, 'How productive were you? (1-5)')}
          </>
        )}

        {questions.map((question, index) => (
          <View key={index} style={styles.questionContainer}>
            <Text style={styles.questionText}>{question}</Text>
            <TextInput
              style={styles.responseInput}
              multiline
              numberOfLines={4}
              value={responses[index] || ''}
              onChangeText={(text) => {
                const newResponses = [...responses];
                newResponses[index] = text;
                setResponses(newResponses);
              }}
              placeholder="Write your thoughts here..."
              placeholderTextColor="#666"
              textAlignVertical="top"
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitReflection}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : 'Save Reflection'}
          </Text>
        </TouchableOpacity>

        {reflections.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Previous Reflections</Text>
            {reflections.map((reflection) => (
              <View key={reflection.id} style={styles.reflectionCard}>
                <Text style={styles.reflectionDate}>
                  {new Date(reflection.date).toLocaleDateString()}
                </Text>
                <Text style={styles.reflectionType}>{reflection.type}</Text>
                {reflection.mood_score && (
                  <Text style={styles.reflectionScore}>
                    Mood: {reflection.mood_score}/5
                  </Text>
                )}
                {reflection.productivity_score && (
                  <Text style={styles.reflectionScore}>
                    Productivity: {reflection.productivity_score}/5
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#D4AF37',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#0C0C0C',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scaleContainer: {
    marginBottom: 24,
  },
  scaleTitle: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  scaleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  scaleButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  scaleButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  scaleButtonTextActive: {
    color: '#0C0C0C',
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  responseInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    color: '#FFF',
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  submitButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContainer: {
    marginTop: 20,
    paddingBottom: 40,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 16,
  },
  reflectionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  reflectionDate: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reflectionType: {
    color: '#888',
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  reflectionScore: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 2,
  },
});
