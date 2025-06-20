import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

type OnboardingScreenProps = StackScreenProps<RootStackParamList, 'Onboarding'>;

const SERVER_URL = 'https://www.prokoc2.com/api2.php';

interface UserHealthData {
  birthDate: Date;
  gender: 'male' | 'female' | 'other';
  importantDiseases: string;
  medications: string;
  hadSurgery: boolean;
  surgeryDetails: string;
  // Optional fields
  height?: string;
  weight?: string;
  bloodType?: string;
  allergies?: string;
}

export default function OnboardingScreen({ route, navigation }: OnboardingScreenProps) {
  const { userId, userName } = route.params;
  const { t } = useLanguage();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<UserHealthData>({
    birthDate: new Date(2000, 0, 1),
    gender: 'male',
    importantDiseases: '',
    medications: '',
    hadSurgery: false,
    surgeryDetails: '',
    height: '',
    weight: '',
    bloodType: '',
    allergies: '',
  });

const requiredSteps = [
  {
    title: t('onboarding.birthDate'),
    type: 'date',
    field: 'birthDate',
  },
  {
    title: t('onboarding.gender'),
    type: 'select',
    field: 'gender',
    options: [
      { value: 'male', label: t('onboarding.male') },
      { value: 'female', label: t('onboarding.female') },
      { value: 'other', label: t('onboarding.other') },
    ],
  },
  {
    title: t('onboarding.importantDiseases'),
    type: 'text',
    field: 'importantDiseases',
    placeholder: t('onboarding.importantDiseasesPlaceholder'),
    multiline: true,
  },
  {
    title: t('onboarding.medications'),
    type: 'text',
    field: 'medications',
    placeholder: t('onboarding.medicationsPlaceholder'),
    multiline: true,
  },
  {
    title: t('onboarding.surgeryHistory'),
    type: 'boolean',
    field: 'hadSurgery',
  },
];

  const optionalSteps = [
    {
      title: t('onboarding.height'),
      type: 'number',
      field: 'height',
      placeholder: '170',
      unit: 'cm',
    },
    {
      title: t('onboarding.weight'),
      type: 'number',
      field: 'weight',
      placeholder: '70',
      unit: 'kg',
    },
    {
      title: t('onboarding.bloodType'),
      type: 'select',
      field: 'bloodType',
      options: [
        { value: '', label: '-' },
        { value: 'A+', label: 'A+' },
        { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' },
        { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' },
        { value: 'AB-', label: 'AB-' },
        { value: '0+', label: '0+' },
        { value: '0-', label: '0-' },
      ],
    },
    {
      title: t('onboarding.allergies'),
      type: 'text',
      field: 'allergies',
      placeholder: t('onboarding.allergiesPlaceholder'),
      multiline: true,
    },
  ];

  const allSteps = [...requiredSteps];
  
  // Add surgery details step if user had surgery
  if (formData.hadSurgery && currentStep === 4) {
    allSteps.push({
      title: t('onboarding.surgeryDetails'),
      type: 'text',
      field: 'surgeryDetails',
      placeholder: t('onboarding.surgeryDetailsPlaceholder'),
      multiline: true,
    });
  }
  
  // Add optional steps at the end
  if (currentStep >= requiredSteps.length + (formData.hadSurgery ? 1 : 0)) {
    allSteps.push(...optionalSteps);
  }

  const currentStepData = allSteps[currentStep];
  const isLastStep = currentStep === allSteps.length - 1;
  const isOptionalStep = currentStep >= requiredSteps.length + (formData.hadSurgery ? 1 : 0);

  const handleNext = () => {
    if (!isOptionalStep && !validateCurrentStep()) {
      Alert.alert(t('common.error'), t('onboarding.requiredFields'));
      return;
    }

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    if (isOptionalStep) {
      handleComplete();
    }
  };

  const validateCurrentStep = () => {
    const field = currentStepData.field as keyof UserHealthData;
    const value = formData[field];
    
    if (currentStepData.type === 'boolean') {
      return true; // Boolean fields are always valid
    }
    
    return value !== '' && value !== undefined && value !== null;
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save user health data
      const response = await axios.post(`${SERVER_URL}?action=saveHealthData`, {
        user_id: userId,
        health_data: formData,
      });

      if (response.data.success) {
        // Mark onboarding as completed
        await AsyncStorage.setItem(`onboarding_completed_${userId}`, 'true');
        
        // Navigate to subscription screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Subscription', params: { userId, userName } }],
        });
      } else {
        Alert.alert(t('common.error'), response.data.error || t('common.error'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.type) {
      case 'date':
        return (
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={24} color="#666" />
              <Text style={styles.dateText}>
                {formData.birthDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.birthDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setFormData({ ...formData, birthDate: date });
                  }
                }}
              />
            )}
          </View>
        );

      case 'select':
        return (
          <View style={styles.optionsContainer}>
            {currentStepData.options?.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  formData[currentStepData.field as keyof UserHealthData] === option.value && 
                  styles.optionButtonSelected,
                ]}
                onPress={() => 
                  setFormData({ 
                    ...formData, 
                    [currentStepData.field]: option.value 
                  })
                }
              >
                <Text style={[
                  styles.optionText,
                  formData[currentStepData.field as keyof UserHealthData] === option.value && 
                  styles.optionTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'boolean':
        return (
          <View style={styles.booleanContainer}>
            <TouchableOpacity
              style={[
                styles.booleanButton,
                formData.hadSurgery && styles.booleanButtonSelected,
              ]}
              onPress={() => setFormData({ ...formData, hadSurgery: true })}
            >
              <Text style={[
                styles.booleanText,
                formData.hadSurgery && styles.booleanTextSelected,
              ]}>
                {t('common.yes')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.booleanButton,
                !formData.hadSurgery && styles.booleanButtonSelected,
              ]}
              onPress={() => setFormData({ ...formData, hadSurgery: false })}
            >
              <Text style={[
                styles.booleanText,
                !formData.hadSurgery && styles.booleanTextSelected,
              ]}>
                {t('common.no')}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'text':
      case 'number':
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textInput,
                currentStepData.multiline && styles.textInputMultiline,
              ]}
              placeholder={currentStepData.placeholder}
              placeholderTextColor="#999"
              value={formData[currentStepData.field as keyof UserHealthData] as string}
              onChangeText={(text) => 
                setFormData({ 
                  ...formData, 
                  [currentStepData.field]: text 
                })
              }
              keyboardType={currentStepData.type === 'number' ? 'numeric' : 'default'}
              multiline={currentStepData.multiline}
              numberOfLines={currentStepData.multiline ? 4 : 1}
            />
            {currentStepData.unit && (
              <Text style={styles.unitText}>{currentStepData.unit}</Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('onboarding.title')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((currentStep + 1) / allSteps.length) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {currentStep + 1} / {allSteps.length}
                </Text>
              </View>
            </View>

            {/* Step Content */}
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>{currentStepData.title}</Text>
              {isOptionalStep && (
                <Text style={styles.optionalText}>{t('onboarding.optionalInfo')}</Text>
              )}
              {renderStepContent()}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setCurrentStep(currentStep - 1)}
                >
                  <MaterialIcons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.rightButtons}>
                {isOptionalStep && !isLastStep && (
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                  >
                    <Text style={styles.skipButtonText}>{t('common.skip')}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={handleNext}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.nextButtonText}>
                        {isLastStep ? t('onboarding.complete') : t('common.next')}
                      </Text>
                      {!isLastStep && (
                        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
  },
  stepContainer: {
    flex: 1,
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    marginTop: 20,
  },
  dateButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  dateText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  optionsContainer: {
    marginTop: 20,
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  booleanContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  booleanButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  booleanButtonSelected: {
    backgroundColor: '#fff',
  },
  booleanText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  booleanTextSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
  },
  textInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  unitText: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: '#fff',
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
});