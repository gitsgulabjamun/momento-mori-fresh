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

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'career' | 'health' | 'personal' | 'financial' | 'relationship';
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  target_date: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'career', label: 'Career', color: '#4CAF50' },
  { value: 'health', label: 'Health', color: '#FF5722' },
  { value: 'personal', label: 'Personal', color: '#2196F3' },
  { value: 'financial', label: 'Financial', color: '#FF9800' },
  { value: 'relationship', label: 'Relationship', color: '#E91E63' },
] as const;

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#FFC107' },
  { value: 'medium', label: 'Medium', color: '#FF9800' },
  { value: 'high', label: 'High', color: '#F44336' },
] as const;

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Goal['category']>('personal');
  const [priority, setPriority] = useState<Goal['priority']>('medium');
  const [targetDate, setTargetDate] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | Goal['status']>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Goal['category']>('all');

  useEffect(() => {
    getUserProfile();
  }, []);

  useEffect(() => {
    if (userProfileId) {
      fetchGoals();
    }
  }, [userProfileId, statusFilter]);

  const getUserProfile = async () => {
    try {
      const profileId = await AsyncStorage.getItem('userProfileId');
      setUserProfileId(profileId);
    } catch (error) {
      console.error('Error getting user profile:', error);
    }
  };

  const fetchGoals = async () => {
    if (!userProfileId) return;

    setLoading(true);
    try {
      const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await fetch(`${BACKEND_URL}/api/goals/${userProfileId}${statusParam}`);
      if (response.ok) {
        const data = await response.json();
        setGoals(data);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!userProfileId) {
      Alert.alert('Error', 'User profile not found');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a goal title');
      return;
    }

    setLoading(true);
    try {
      const goalData = {
        user_id: userProfileId,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        target_date: targetDate || null,
      };

      const response = await fetch(`${BACKEND_URL}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Goal created successfully!');
        resetForm();
        setShowAddForm(false);
        fetchGoals();
      } else {
        Alert.alert('Error', 'Failed to create goal');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert('Error', 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const updateGoalStatus = async (goalId: string, newStatus: Goal['status']) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchGoals();
      } else {
        Alert.alert('Error', 'Failed to update goal status');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal status');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('personal');
    setPriority('medium');
    setTargetDate('');
  };

  const getCategoryColor = (cat: Goal['category']) => {
    const categoryObj = CATEGORIES.find(c => c.value === cat);
    return categoryObj?.color || '#888';
  };

  const getPriorityColor = (pri: Goal['priority']) => {
    const priorityObj = PRIORITIES.find(p => p.value === pri);
    return priorityObj?.color || '#888';
  };

  const getFilteredGoals = () => {
    let filtered = goals;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(goal => goal.category === categoryFilter);
    }
    
    return filtered;
  };

  const renderGoalCard = (goal: Goal) => (
    <View key={goal.id} style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <View style={styles.goalBadges}>
          <View style={[styles.badge, { backgroundColor: getCategoryColor(goal.category) }]}>
            <Text style={styles.badgeText}>{goal.category}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getPriorityColor(goal.priority) }]}>
            <Text style={styles.badgeText}>{goal.priority}</Text>
          </View>
        </View>
      </View>

      {goal.description && (
        <Text style={styles.goalDescription}>{goal.description}</Text>
      )}

      {goal.target_date && (
        <Text style={styles.goalTargetDate}>
          Target: {new Date(goal.target_date).toLocaleDateString()}
        </Text>
      )}

      <View style={styles.goalActions}>
        <TouchableOpacity
          style={[
            styles.statusButton,
            goal.status === 'completed' && styles.statusButtonCompleted,
          ]}
          onPress={() =>
            updateGoalStatus(
              goal.id,
              goal.status === 'completed' ? 'active' : 'completed'
            )
          }
        >
          <Text style={styles.statusButtonText}>
            {goal.status === 'completed' ? 'Reactivate' : 'Complete'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusButton,
            goal.status === 'paused' && styles.statusButtonPaused,
          ]}
          onPress={() =>
            updateGoalStatus(
              goal.id,
              goal.status === 'paused' ? 'active' : 'paused'
            )
          }
        >
          <Text style={styles.statusButtonText}>
            {goal.status === 'paused' ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredGoals = getFilteredGoals();

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>Track your progress and achievements</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filter, statusFilter === 'all' && styles.activeFilter]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterText, statusFilter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filter, statusFilter === 'active' && styles.activeFilter]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterText, statusFilter === 'active' && styles.activeFilterText]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filter, statusFilter === 'completed' && styles.activeFilter]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text style={[styles.filterText, statusFilter === 'completed' && styles.activeFilterText]}>
              Completed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filter, statusFilter === 'paused' && styles.activeFilter]}
            onPress={() => setStatusFilter('paused')}
          >
            <Text style={[styles.filterText, statusFilter === 'paused' && styles.activeFilterText]}>
              Paused
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredGoals.map(renderGoalCard)}
        
        {filteredGoals.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No goals found</Text>
            <Text style={styles.emptyStateSubtext}>Create your first goal to get started</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddForm(!showAddForm)}
      >
        <Text style={styles.addButtonText}>
          {showAddForm ? '×' : '+'}
        </Text>
      </TouchableOpacity>

      {showAddForm && (
        <View style={styles.addForm}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>Create New Goal</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Goal title"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.selector,
                      { borderColor: cat.color },
                      category === cat.value && { backgroundColor: cat.color },
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        category === cat.value && styles.selectorTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {PRIORITIES.map((pri) => (
                  <TouchableOpacity
                    key={pri.value}
                    style={[
                      styles.priorityButton,
                      { borderColor: pri.color },
                      priority === pri.value && { backgroundColor: pri.color },
                    ]}
                    onPress={() => setPriority(pri.value)}
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        priority === pri.value && styles.selectorTextActive,
                      ]}
                    >
                      {pri.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Target date (YYYY-MM-DD) - optional"
              placeholderTextColor="#666"
              value={targetDate}
              onChangeText={setTargetDate}
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  resetForm();
                  setShowAddForm(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.createButtonDisabled]}
                onPress={createGoal}
                disabled={loading}
              >
                <Text style={styles.createButtonText}>
                  {loading ? 'Creating...' : 'Create Goal'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
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
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeFilter: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  filterText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#0C0C0C',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  goalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginRight: 12,
  },
  goalBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  goalDescription: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  goalTargetDate: {
    color: '#D4AF37',
    fontSize: 12,
    marginBottom: 12,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  statusButtonCompleted: {
    backgroundColor: '#4CAF50',
  },
  statusButtonPaused: {
    backgroundColor: '#FF9800',
  },
  statusButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: {
    color: '#0C0C0C',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addForm: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#333',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0C0C0C',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 80,
  },
  selectorContainer: {
    marginBottom: 16,
  },
  selectorLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selector: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  selectorText: {
    color: '#CCC',
    fontSize: 12,
    fontWeight: '600',
  },
  selectorTextActive: {
    color: '#FFF',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#666',
  },
  createButtonText: {
    color: '#0C0C0C',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
