import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const BACKEND_URL = 'https://mortality-app.preview.emergentagent.com';

interface UserProfile {
  id: string;
  birth_date: string;
  life_expectancy: number;
  name: string;
  country?: string;
}

interface MortalityStats {
  days_lived: number;
  days_remaining: number;
  weeks_lived: number;
  weeks_remaining: number;
  life_percentage: number;
  current_age: number;
  expected_death_date: string;
}

interface Quote {
  id: string;
  text: string;
  author: string;
}

export default function HomeScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mortalityStats, setMortalityStats] = useState<MortalityStats | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const storedProfileId = await AsyncStorage.getItem('userProfileId');
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      
      if (storedProfileId && onboardingCompleted === 'true') {
        const success = await fetchUserData(storedProfileId);
        if (!success) {
          await AsyncStorage.removeItem('userProfileId');
          await AsyncStorage.removeItem('onboardingCompleted');
          router.replace('/onboarding');
        }
      } else {
        router.replace('/onboarding');
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      setError('Failed to load user data. Please try again.');
      setLoading(false);
    }
  };

  const fetchUserData = async (profileId: string): Promise<boolean> => {
    try {
      const [profileResponse, mortalityResponse, quoteResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/profile/${profileId}`),
        fetch(`${BACKEND_URL}/api/mortality/${profileId}`),
        fetch(`${BACKEND_URL}/api/quotes/daily`)
      ]);

      if (profileResponse.ok && mortalityResponse.ok && quoteResponse.ok) {
        const [profileData, mortalityData, quoteData] = await Promise.all([
          profileResponse.json(),
          mortalityResponse.json(),
          quoteResponse.json()
        ]);

        setUserProfile(profileData);
        setMortalityStats(mortalityData);
        setQuote(quoteData);
        setError(null);
        return true;
      } else {
        console.error('Failed to fetch user data');
        return false;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const profileId = await AsyncStorage.getItem('userProfileId');
    if (profileId) {
      await fetchUserData(profileId);
    }
  };

  const refreshQuote = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/quotes/daily`);
      if (response.ok) {
        const quoteData = await response.json();
        setQuote(quoteData);
      }
    } catch (error) {
      console.error('Error refreshing quote:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="hourglass" size={48} color="#D4AF37" />
        <Text style={styles.loadingText}>Calculating your mortality...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeUser}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D4AF37']}
            tintColor="#D4AF37"
          />
        }
      >
        {/* Quote Section */}
        {quote && (
          <View style={styles.quoteContainer}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteTitle}>Daily Wisdom</Text>
              <TouchableOpacity onPress={refreshQuote} style={styles.refreshButton}>
                <Ionicons name="refresh" size={20} color="#D4AF37" />
              </TouchableOpacity>
            </View>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>
        )}

        {/* Mortality Stats */}
        {mortalityStats && userProfile && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Your Life Statistics</Text>
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{mortalityStats.days_lived.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Days Lived</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{mortalityStats.days_remaining.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Days Remaining</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Life Progress: {mortalityStats.life_percentage.toFixed(1)}%</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(mortalityStats.life_percentage, 100)}%` }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.additionalStats}>
              <Text style={styles.additionalStatText}>
                Current Age: {mortalityStats.current_age} years
              </Text>
              <Text style={styles.additionalStatText}>
                Life Expectancy: {userProfile.life_expectancy} years
              </Text>
            </View>
          </View>
        )}

        {/* Life Calendar */}
        {mortalityStats && userProfile && (
          <View style={styles.calendarContainer}>
            <Text style={styles.calendarTitle}>Life in Weeks</Text>
            <Text style={styles.calendarSubtitle}>
              Each dot represents one week of your life
            </Text>
            
            <View style={styles.calendar}>
              {Array.from({ length: 20 }, (_, rowIndex) => (
                <View key={rowIndex} style={styles.calendarRow}>
                  <Text style={styles.yearLabel}>{rowIndex + 1}</Text>
                  <View style={styles.weekRow}>
                    {Array.from({ length: 52 }, (_, weekIndex) => {
                      const weekNumber = rowIndex * 52 + weekIndex + 1;
                      const isLived = weekNumber <= mortalityStats.weeks_lived;
                      const isCurrent = weekNumber === mortalityStats.weeks_lived + 1;
                      const isRemaining = weekNumber > mortalityStats.weeks_lived + 1;
                      
                      return (
                        <View
                          key={weekIndex}
                          style={[
                            styles.weekDot,
                            isLived && styles.weekDotLived,
                            isCurrent && styles.weekDotCurrent,
                            isRemaining && styles.weekDotRemaining,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
            
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.weekDot, styles.weekDotLived]} />
                <Text style={styles.legendText}>Lived</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.weekDot, styles.weekDotCurrent]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.weekDot, styles.weekDotRemaining]} />
                <Text style={styles.legendText}>Remaining</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0C0C0C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0C0C0C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quoteContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 4,
  },
  quoteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'right',
  },
  statsContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
  },
  additionalStats: {
    alignItems: 'center',
  },
  additionalStatText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  calendarContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  calendarTitle: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  calendarSubtitle: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  calendar: {
    alignItems: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  yearLabel: {
    color: '#CCCCCC',
    fontSize: 10,
    width: 20,
    textAlign: 'center',
    marginRight: 8,
  },
  weekRow: {
    flexDirection: 'row',
    flex: 1,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 1,
  },
  weekDotLived: {
    backgroundColor: '#D4AF37',
  },
  weekDotCurrent: {
    backgroundColor: '#FF6B6B',
  },
  weekDotRemaining: {
    backgroundColor: '#4A4A4A',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    color: '#CCCCCC',
    fontSize: 12,
  },
});
