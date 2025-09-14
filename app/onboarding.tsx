import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const BACKEND_URL = 'https://mortality-app.preview.emergentagent.com';

// Country life expectancy data based on 2025 WHO statistics
const LIFE_EXPECTANCY_BY_COUNTRY: { [key: string]: number } = {
  'US': 79, 'CA': 82, 'GB': 81, 'DE': 81, 'FR': 82, 'IT': 83, 'ES': 83,
  'JP': 85, 'KR': 85, 'AU': 84, 'NZ': 82, 'CH': 84, 'SE': 83, 'NO': 82,
  'DK': 81, 'NL': 82, 'BE': 82, 'AT': 82, 'FI': 81, 'IE': 82, 'IN': 70,
  'CN': 77, 'BR': 76, 'RU': 73, 'MX': 75, 'AR': 77, 'CL': 80, 'ZA': 64,
  'DEFAULT': 78
};

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [birthDate, setBirthDate] = useState('');
  const [lifeExpectancy, setLifeExpectancy] = useState('');
  const [estimatedLifeExpectancy, setEstimatedLifeExpectancy] = useState(78);
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [useCustomExpectancy, setUseCustomExpectancy] = useState(false);

  useEffect(() => {
    detectCountry();
  }, []);

  const detectCountry = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (geocode.length > 0) {
          const countryCode = geocode[0].isoCountryCode || 'DEFAULT';
          setCountry(countryCode);
          const expectedAge = LIFE_EXPECTANCY_BY_COUNTRY[countryCode] || LIFE_EXPECTANCY_BY_COUNTRY['DEFAULT'];
          setEstimatedLifeExpectancy(expectedAge);
        }
      } else {
        setEstimatedLifeExpectancy(LIFE_EXPECTANCY_BY_COUNTRY['DEFAULT']);
      }
    } catch (error) {
      console.error('Error detecting country:', error);
      setEstimatedLifeExpectancy(LIFE_EXPECTANCY_BY_COUNTRY['DEFAULT']);
    }
  };

  const validateBirthDate = (dateString: string): boolean => {
    if (!dateString) return false;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const now = new Date();
    
    return date.getTime() === new Date(dateString).getTime() && date <= now;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateBirthDate(birthDate)) {
        Alert.alert('Invalid Date', 'Please enter a valid birth date in YYYY-MM-DD format (e.g., 1990-12-25)');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      
      const finalLifeExpectancy = useCustomExpectancy && lifeExpectancy 
        ? parseInt(lifeExpectancy) 
        : estimatedLifeExpectancy;

      if (finalLifeExpectancy < 20 || finalLifeExpectancy > 120) {
        Alert.alert('Invalid Life Expectancy', 'Please enter a life expectancy between 20 and 120 years.');
        setLoading(false);
        return;
      }

      // Create user profile
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birth_date: birthDate,
          life_expectancy: finalLifeExpectancy,
          name: 'User',
          country: country,
        }),
      });

      if (response.ok) {
        const profile = await response.json();
        await AsyncStorage.setItem('userProfileId', profile.id);
        await AsyncStorage.setItem('onboardingCompleted', 'true');
        
        router.replace('/(tabs)');
      } else {
        const errorText = await response.text();
        Alert.alert('Error', `Failed to create profile: ${errorText}`);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="calendar-outline" size={64} color="#D4AF37" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>When were you born?</Text>
      <Text style={styles.stepDescription}>
        We need your birth date to calculate your life statistics and create your personal mortality awareness.
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Birth Date</Text>
        <TextInput
          style={styles.textInput}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD (e.g., 1990-12-25)"
          placeholderTextColor="#666"
          keyboardType="numeric"
          maxLength={10}
        />
        <Text style={styles.inputHelper}>Enter in YYYY-MM-DD format</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Ionicons name="trending-up-outline" size={64} color="#D4AF37" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Life Expectancy</Text>
      <Text style={styles.stepDescription}>
        Based on your location{country && ` (${country})`}, we estimate your life expectancy at {estimatedLifeExpectancy} years.
      </Text>
      
      <View style={styles.expectancyContainer}>
        <TouchableOpacity
          style={[styles.expectancyOption, !useCustomExpectancy && styles.expectancyOptionSelected]}
          onPress={() => setUseCustomExpectancy(false)}
        >
          <Ionicons 
            name={!useCustomExpectancy ? "radio-button-on" : "radio-button-off"} 
            size={24} 
            color="#D4AF37" 
          />
          <View style={styles.expectancyText}>
            <Text style={styles.expectancyTitle}>Use Estimated ({estimatedLifeExpectancy} years)</Text>
            <Text style={styles.expectancySubtitle}>Based on your country's average</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.expectancyOption, useCustomExpectancy && styles.expectancyOptionSelected]}
          onPress={() => setUseCustomExpectancy(true)}
        >
          <Ionicons 
            name={useCustomExpectancy ? "radio-button-on" : "radio-button-off"} 
            size={24} 
            color="#D4AF37" 
          />
          <View style={styles.expectancyText}>
            <Text style={styles.expectancyTitle}>Set Custom Age</Text>
            <Text style={styles.expectancySubtitle}>Enter your own estimate</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {useCustomExpectancy && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={lifeExpectancy}
            onChangeText={setLifeExpectancy}
            placeholder="e.g., 85"
            placeholderTextColor="#666"
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.inputHelper}>Enter age between 20-120 years</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Momento Mori</Text>
          <Text style={styles.headerSubtitle}>Life Awareness Setup</Text>
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, currentStep >= 1 && styles.progressDotActive]} />
            <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressDot, currentStep >= 2 && styles.progressDotActive]} />
          </View>
        </View>
        
        {currentStep === 1 ? renderStep1() : renderStep2()}
        
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Ionicons name="chevron-back" size={24} color="#D4AF37" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.nextButtonText}>Setting up...</Text>
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === 2 ? 'Complete Setup' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#000" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
  header: {
    padding: 32,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#D4AF37',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2A2A2A',
  },
  progressDotActive: {
    backgroundColor: '#D4AF37',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#D4AF37',
  },
  stepContainer: {
    padding: 32,
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 24,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    fontSize: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    textAlign: 'center',
  },
  inputHelper: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  expectancyContainer: {
    width: '100%',
    marginBottom: 24,
  },
  expectancyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  expectancyOptionSelected: {
    borderColor: '#D4AF37',
    backgroundColor: '#1A1A1A',
  },
  expectancyText: {
    marginLeft: 16,
  },
  expectancyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expectancySubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButtonText: {
    color: '#D4AF37',
    fontSize: 16,
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});
