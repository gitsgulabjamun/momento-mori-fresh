import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanGestureHandler,
  State,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || 'http://localhost:8001';

interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

interface MortalityStats {
  days_lived: number;
  days_remaining: number;
  life_percentage: number;
  year_percentage: number;
  month_percentage: number;
  expected_death_date: string;
}

export default function FloatingWidget() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<'countdown' | 'quote'>('countdown');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [mortalityStats, setMortalityStats] = useState<MortalityStats | null>(null);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // Animation values
  const translateX = useRef(new Animated.Value(screenWidth - 120)).current;
  const translateY = useRef(new Animated.Value(screenHeight / 2 - 60)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  // Gesture handling
  const gestureState = useRef({ x: 0, y: 0 });

  useEffect(() => {
    initializeWidget();
  }, []);

  useEffect(() => {
    if (userProfileId) {
      fetchData();
      // Refresh data every minute for countdown
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [userProfileId]);

  const initializeWidget = async () => {
    try {
      const profileId = await AsyncStorage.getItem('userProfileId');
      setUserProfileId(profileId);
    } catch (error) {
      console.error('Error initializing widget:', error);
    }
  };

  const fetchData = async () => {
    if (!userProfileId) return;

    try {
      // Fetch mortality stats
      const mortalityResponse = await fetch(`${BACKEND_URL}/api/mortality/${userProfileId}`);
      if (mortalityResponse.ok) {
        const mortalityData = await mortalityResponse.json();
        setMortalityStats(mortalityData);
      }

      // Fetch daily quote
      const quoteResponse = await fetch(`${BACKEND_URL}/api/quotes/daily`);
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        setQuote(quoteData);
      }
    } catch (error) {
      console.error('Error fetching widget data:', error);
    }
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false }
  );

  const handleGestureStateChange = (event: any) => {
    if (event.nativeEvent.state === State.ENDED) {
      const { translationX: tx, translationY: ty } = event.nativeEvent;
      
      // Snap to edges
      const finalX = tx < screenWidth / 2 ? 20 : screenWidth - 120;
      const finalY = Math.max(100, Math.min(screenHeight - 160, ty));

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: finalX,
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: finalY,
          useNativeDriver: false,
        }),
      ]).start();

      gestureState.current = { x: finalX, y: finalY };
    }
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isMinimized ? 1 : 0.7,
        useNativeDriver: false,
      }),
      Animated.spring(opacity, {
        toValue: isMinimized ? 0.9 : 0.6,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const switchMode = () => {
    setMode(mode === 'countdown' ? 'quote' : 'countdown');
  };

  const formatTimeRemaining = () => {
    if (!mortalityStats) return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

    const now = new Date();
    const deathDate = new Date(mortalityStats.expected_death_date);
    const timeDiff = deathDate.getTime() - now.getTime();

    if (timeDiff <= 0) return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

    const years = Math.floor(timeDiff / (365.25 * 24 * 60 * 60 * 1000));
    const days = Math.floor((timeDiff % (365.25 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeDiff % (60 * 1000)) / 1000);

    return { years, days, hours, minutes, seconds };
  };

  const timeRemaining = formatTimeRemaining();

  const renderCountdownContent = () => {
    if (isMinimized) {
      return (
        <View style={styles.minimizedContent}>
          <Text style={styles.minimizedText}>⏰</Text>
        </View>
      );
    }

    return (
      <View style={styles.countdownContent}>
        <Text style={styles.countdownTitle}>Time Remaining</Text>
        <View style={styles.timeGrid}>
          <View style={styles.timeUnit}>
            <Text style={styles.timeValue}>{timeRemaining.years}</Text>
            <Text style={styles.timeLabel}>Years</Text>
          </View>
          <View style={styles.timeUnit}>
            <Text style={styles.timeValue}>{timeRemaining.days}</Text>
            <Text style={styles.timeLabel}>Days</Text>
          </View>
        </View>
        <View style={styles.timeGrid}>
          <View style={styles.timeUnit}>
            <Text style={styles.timeValue}>{timeRemaining.hours}</Text>
            <Text style={styles.timeLabel}>Hours</Text>
          </View>
          <View style={styles.timeUnit}>
            <Text style={styles.timeValue}>{timeRemaining.minutes}</Text>
            <Text style={styles.timeLabel}>Min</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuoteContent = () => {
    if (isMinimized) {
      return (
        <View style={styles.minimizedContent}>
          <Text style={styles.minimizedText}>💭</Text>
        </View>
      );
    }

    return (
      <View style={styles.quoteContent}>
        <Text style={styles.quoteText} numberOfLines={4}>
          {quote?.text || 'Loading quote...'}
        </Text>
        <Text style={styles.quoteAuthor}>
          — {quote?.author || 'Unknown'}
        </Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
      >
        <Animated.View
          style={[
            styles.widget,
            {
              transform: [
                { translateX },
                { translateY },
                { scale },
              ],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.widgetContainer}
            onPress={toggleMinimized}
            onLongPress={switchMode}
            activeOpacity={0.8}
          >
            {mode === 'countdown' ? renderCountdownContent() : renderQuoteContent()}
            
            {!isMinimized && (
              <View style={styles.controls}>
                <View style={styles.modeIndicator}>
                  <View style={[
                    styles.dot,
                    mode === 'countdown' && styles.activeDot
                  ]} />
                  <View style={[
                    styles.dot,
                    mode === 'quote' && styles.activeDot
                  ]} />
                </View>
                <Text style={styles.instruction}>
                  Tap to {isMinimized ? 'expand' : 'minimize'} • Hold to switch
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  widget: {
    position: 'absolute',
    width: 140,
    minHeight: 120,
    zIndex: 1000,
  },
  widgetContainer: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  minimizedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  minimizedText: {
    fontSize: 24,
  },
  countdownContent: {
    alignItems: 'center',
  },
  countdownTitle: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  timeUnit: {
    alignItems: 'center',
    flex: 1,
  },
  timeValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeLabel: {
    color: '#888',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  quoteContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  quoteText: {
    color: '#FFF',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  quoteAuthor: {
    color: '#D4AF37',
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  controls: {
    marginTop: 8,
    alignItems: 'center',
  },
  modeIndicator: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: '#D4AF37',
  },
  instruction: {
    color: '#666',
    fontSize: 7,
    textAlign: 'center',
  },
});
