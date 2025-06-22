import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../i18n/translations';

type OnboardingScreenProps = StackScreenProps<RootStackParamList, 'Onboarding'>;
const SERVER_URL = 'https://www.prokoc2.com/api2.php';

interface UserHealthData {
  birthDate: Date;
  surgeries?: string[]; 
  gender: 'male' | 'female' | 'other';
  importantDiseases: string[]; // String array olarak değiştir
  medications: string[]; // String array olarak değiştir
  hadSurgery: boolean;
  surgeryDetails: string;
  height?: string;
  weight?: string;
  bloodType?: string;
  allergies?: string;
}

interface StepDefinition {
  
  title: string;
  type:
    | 'date'
    | 'select'
    | 'boolean'
    | 'text'
    | 'number'
    | 'disease-select'
    | 'medication-select'
    | 'surgery-select';
  field: keyof UserHealthData;
  /* opsiyoneller */
  options?: { value: string; label: string }[];
  placeholder?: string;
  multiline?: boolean;
  unit?: string;
}

const DISEASE_MEDICATION_MAP: Record<string, string[]> = {
  diabetes: ['metformin', 'glifor', 'glucophage', 'insulin'],
  hypertension: ['beloc', 'micardis', 'coversyl', 'norvasc'],
  heartDisease: ['aspirin', 'plavix', 'coraspin'],
  depression: ['prozac', 'cipralex', 'lustral'],
  anxiety: ['xanax', 'cipralex'],
  thyroid: ['levotiron', 'euthyrox'],
  reflux: ['nexium', 'lansor', 'omeprol'],
  gastritis: ['nexium', 'lansor', 'gaviscon'],
  hyperlipidemia: ['atorvastatin', 'rosuvastatin', 'simvastatin'],
  atrialFibrillation: ['xarelto', 'coumadin', 'pradaxa'],
  heartFailure: ['furosemide', 'carvedilol', 'entresto'],

  // Solunum
  copd: ['spiriva', 'symbicort', 'ventolin'],
  pneumonia: ['augmentin', 'rocephin', 'azithromycin'],

  // Endokrin & Metabolik
  hyperthyroidism: ['propycil', 'thyromazole'],
  hypothyroidism: ['levotiron', 'euthyrox'],
  obesity: ['orlistat', 'liraglutide'],

  // Gastroenteroloji
  ibs: ['duspatil', 'buscopan'],
  ulcer: ['pantpas', 'nexium'],
  liverDisease: ['ursofalk'],

  // Nöroloji
  stroke: ['plavix', 'aspirin'],
  migraine: ['sumatriptan', 'maxalt'],
  ms: ['gilenya', 'rebif'],

  // Romatoloji / Kas‐iskelet
  osteoarthritis: ['parol', 'naprosyn'],
  rheumatoidArthritis: ['methotrexate', 'arava'],
  gout: ['colchicine', 'allopurinol'],

  // Dermatoloji / Alerji
  psoriasis: ['methotrexate', 'enbrel'],
  eczema: ['elidel', 'protopic'],
  rhinitis: ['aerius', 'claritine'],

  // Hematoloji
  anemia: ['ferroSanol', 'b12vit'],

  // Diğer
  osteoporosis: ['calcimax', 'fosamax'],
  asthma: ['ventolin', 'pulmicort'],
  sleepApnea: ['modafinil']     // (ilaç yerine CPAP kullanılsa da ekledim)
};

/* ================================================================ */
export default function OnboardingScreen({ route, navigation }: OnboardingScreenProps) {
  const { userId, userName } = route.params;
  const [surgerySearch, setSurgerySearch]               = useState('');
const [showOtherSurgeryInput, setShowOtherSurgeryInput] = useState(false);
const [otherSurgery, setOtherSurgery]                 = useState('');
  const { t, language } = useLanguage();
  const [diseaseSearch, setDiseaseSearch] = useState('');
  const [medicationSearch, setMedicationSearch] = useState('');
  const [showOtherDiseaseInput, setShowOtherDiseaseInput] = useState(false);
  const [showOtherMedicationInput, setShowOtherMedicationInput] = useState(false);
  const [otherDisease, setOtherDisease] = useState('');
  const [otherMedication, setOtherMedication] = useState('');
  /* ---------- STATE ---------- */
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading]        = useState(false);

  // Modal tarih seçici için
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate]             = useState<Date>(new Date());
const filteredSurgeries = useMemo(() => {
  const list = Object.keys(translations[language].onboarding.surgeriesDict);
  if (!surgerySearch) return list;
  return list.filter(k =>
    t(`onboarding.surgeriesDict.${k}`).toLowerCase().includes(surgerySearch.toLowerCase())
  );
}, [surgerySearch, language, t]);
  const [formData, setFormData] = useState<UserHealthData>({
    birthDate: new Date(2000, 0, 1),
    gender: 'male',
    importantDiseases: [], // Array olarak başlat
    medications: [], // Array olarak başlat
    hadSurgery: false,
    surgeryDetails: '',
    surgeries: [],
    height: '',
    weight: '',
    bloodType: '',
    allergies: '',
  });
    const filteredDiseases = useMemo(() => {
    const diseases = Object.keys(translations[language].onboarding.diseasesDict);
    if (!diseaseSearch) return diseases;
    
    return diseases.filter(key => 
      t(`onboarding.diseasesDict.${key}`).toLowerCase().includes(diseaseSearch.toLowerCase())
    );
  }, [diseaseSearch, language, t]);

    // İlaç listesini filtrele ve öneri yap
  const filteredMedications = useMemo(() => {
    const medications = Object.keys(translations[language].onboarding.medicationsDict);
    
    // Seçilen hastalıklara göre önerilen ilaçları bul
    const suggestedMeds = new Set<string>();
    formData.importantDiseases.forEach(disease => {
      const meds = DISEASE_MEDICATION_MAP[disease] || [];
      meds.forEach(med => suggestedMeds.add(med));
    });
    
    if (!medicationSearch) {
      // Önce önerilen ilaçları, sonra diğerlerini göster
      return [
        ...Array.from(suggestedMeds),
        ...medications.filter(m => !suggestedMeds.has(m))
      ];
    }
        return medications.filter(key => 
      t(`onboarding.medicationsDict.${key}`).toLowerCase().includes(medicationSearch.toLowerCase())
    );
  }, [medicationSearch, formData.importantDiseases, language, t]);
  const renderSurgerySelect = () => (
  <View style={styles.multiSelectContainer}>
    <TextInput
      style={styles.searchInput}
      placeholder={t('onboarding.searchSurgery')}
      placeholderTextColor="#999"
      value={surgerySearch}
      onChangeText={setSurgerySearch}
    />

    <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
      {filteredSurgeries.map(key => {
        const selected = (formData.surgeries || []).includes(key);
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.multiSelectOption,
              selected && styles.multiSelectOptionSelected,
            ]}
            onPress={() => {
              let arr = [...(formData.surgeries || [])];
              if (selected) arr = arr.filter(k => k !== key);
              else          arr.push(key);
              setFormData({ ...formData, surgeries: arr });
            }}
          >
            <Text style={[
              styles.multiSelectText,
              selected && styles.multiSelectTextSelected,
            ]}>
              {t(`onboarding.surgeriesDict.${key}`)}
            </Text>
            {selected && <MaterialIcons name="check" size={20} color="#fff" />}
          </TouchableOpacity>
        );
      })}

      {/* Diğer */}
      <TouchableOpacity
        style={[
          styles.multiSelectOption,
          showOtherSurgeryInput && styles.multiSelectOptionSelected,
        ]}
        onPress={() => setShowOtherSurgeryInput(!showOtherSurgeryInput)}
      >
        <Text style={[
          styles.multiSelectText,
          showOtherSurgeryInput && styles.multiSelectTextSelected,
        ]}>
          {t('onboarding.other')}
        </Text>
      </TouchableOpacity>
    </ScrollView>

    {showOtherSurgeryInput && (
      <TextInput
        style={styles.otherInput}
        placeholder={t('onboarding.otherSurgeryPlaceholder')}
        placeholderTextColor="#999"
        value={otherSurgery}
        onChangeText={setOtherSurgery}
        onEndEditing={() => {
          if (otherSurgery.trim()) {
            setFormData({
              ...formData,
              surgeries: [...(formData.surgeries || []), `other:${otherSurgery}`],
            });
            setOtherSurgery('');
          }
        }}
      />
    )}

    {(formData.surgeries || []).length > 0 && (
      <View style={styles.selectedItems}>
        {formData.surgeries!.map((itm, i) => (
          <View key={i} style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>
              {itm.startsWith('other:') ? itm.replace('other:', '') : t(`onboarding.surgeriesDict.${itm}`)}
            </Text>
            <TouchableOpacity onPress={() => {
              const arr = formData.surgeries!.filter((_, idx) => idx !== i);
              setFormData({ ...formData, surgeries: arr });
            }}>
              <MaterialIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    )}
  </View>
);
      // Hastalık seçimi için custom render
      
  const renderDiseaseSelect = () => (
    <View style={styles.multiSelectContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder={t('onboarding.searchDisease')}
        placeholderTextColor="#999"
        value={diseaseSearch}
        onChangeText={setDiseaseSearch}
      />
      
      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {filteredDiseases.map(diseaseKey => {
          const isSelected = formData.importantDiseases.includes(diseaseKey);
          const isSuggested = false; // İlaç seçiminde kullanacağız
          
          return (
            <TouchableOpacity
              key={diseaseKey}
              style={[
                styles.multiSelectOption,
                isSelected && styles.multiSelectOptionSelected,
                isSuggested && styles.multiSelectOptionSuggested,
              ]}
              onPress={() => {
                const diseases = [...formData.importantDiseases];
                if (isSelected) {
                  const index = diseases.indexOf(diseaseKey);
                  diseases.splice(index, 1);
                } else {
                  diseases.push(diseaseKey);
                }
                setFormData({ ...formData, importantDiseases: diseases });
              }}
            >
              <Text style={[
                styles.multiSelectText,
                isSelected && styles.multiSelectTextSelected
              ]}>
                {t(`onboarding.diseasesDict.${diseaseKey}`)}
              </Text>
              {isSelected && (
                <MaterialIcons name="check" size={20} color="#667eea" />
              )}
            </TouchableOpacity>
          );
        })}
        
        {/* Diğer seçeneği */}
        <TouchableOpacity
          style={[
            styles.multiSelectOption,
            showOtherDiseaseInput && styles.multiSelectOptionSelected
          ]}
          onPress={() => setShowOtherDiseaseInput(!showOtherDiseaseInput)}
        >
          <Text style={[
            styles.multiSelectText,
            showOtherDiseaseInput && styles.multiSelectTextSelected
          ]}>
            {t('onboarding.other')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {showOtherDiseaseInput && (
        <TextInput
          style={styles.otherInput}
          placeholder={t('onboarding.otherDiseasePlaceholder')}
          placeholderTextColor="#999"
          value={otherDisease}
          onChangeText={setOtherDisease}
          onEndEditing={() => {
            if (otherDisease.trim()) {
              setFormData({
                ...formData,
                importantDiseases: [...formData.importantDiseases, `other:${otherDisease}`]
              });
              setOtherDisease('');
            }
          }}
        />
      )}
      
      {/* Seçilen hastalıklar */}
      {formData.importantDiseases.length > 0 && (
        <View style={styles.selectedItems}>
          {formData.importantDiseases.map((disease, index) => (
            <View key={index} style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>
                {disease.startsWith('other:') 
                  ? disease.replace('other:', '') 
                  : t(`onboarding.diseasesDict.${disease}`)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const diseases = formData.importantDiseases.filter((_, i) => i !== index);
                  setFormData({ ...formData, importantDiseases: diseases });
                }}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
  // İlaç seçimi için custom render
  const renderMedicationSelect = () => (
    <View style={styles.multiSelectContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder={t('onboarding.searchMedication')}
        placeholderTextColor="#999"
        value={medicationSearch}
        onChangeText={setMedicationSearch}
      />
      
      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {filteredMedications.map(medKey => {
          const isSelected = formData.medications.includes(medKey);
          const isSuggested = formData.importantDiseases.some(disease => 
            DISEASE_MEDICATION_MAP[disease]?.includes(medKey)
          );
          
          return (
            <TouchableOpacity
              key={medKey}
              style={[
                styles.multiSelectOption,
                isSelected && styles.multiSelectOptionSelected,
                isSuggested && !isSelected && styles.multiSelectOptionSuggested,
              ]}
              onPress={() => {
                const meds = [...formData.medications];
                if (isSelected) {
                  const index = meds.indexOf(medKey);
                  meds.splice(index, 1);
                } else {
                  meds.push(medKey);
                }
                setFormData({ ...formData, medications: meds });
              }}
            >
              <Text style={[
                styles.multiSelectText,
                isSelected && styles.multiSelectTextSelected,
                isSuggested && !isSelected && styles.multiSelectTextSuggested,
              ]}>
                {t(`onboarding.medicationsDict.${medKey}`)}
                {isSuggested && !isSelected && ' ⭐'}
              </Text>
              {isSelected && (
                <MaterialIcons name="check" size={20} color="#667eea" />
              )}
            </TouchableOpacity>
          );
        })}
        
        {/* Diğer seçeneği */}
        <TouchableOpacity
          style={[
            styles.multiSelectOption,
            showOtherMedicationInput && styles.multiSelectOptionSelected
          ]}
          onPress={() => setShowOtherMedicationInput(!showOtherMedicationInput)}
        >
          <Text style={[
            styles.multiSelectText,
            showOtherMedicationInput && styles.multiSelectTextSelected
          ]}>
            {t('onboarding.other')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {showOtherMedicationInput && (
        <TextInput
          style={styles.otherInput}
          placeholder={t('onboarding.otherMedicationPlaceholder')}
          placeholderTextColor="#999"
          value={otherMedication}
          onChangeText={setOtherMedication}
          onEndEditing={() => {
            if (otherMedication.trim()) {
              setFormData({
                ...formData,
                medications: [...formData.medications, `other:${otherMedication}`]
              });
              setOtherMedication('');
            }
          }}
        />
      )}
      
      {/* Seçilen ilaçlar */}
      {formData.medications.length > 0 && (
        <View style={styles.selectedItems}>
          {formData.medications.map((med, index) => (
            <View key={index} style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>
                {med.startsWith('other:') 
                  ? med.replace('other:', '') 
                  : t(`onboarding.medicationsDict.${med}`)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const meds = formData.medications.filter((_, i) => i !== index);
                  setFormData({ ...formData, medications: meds });
                }}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
  /* ---------- STEP DEFINITIONS (çevrim-içi) ---------- */
const requiredSteps: StepDefinition[] = [
  { title: t('onboarding.birthDate'),        type: 'date',  field: 'birthDate' },

  { title: t('onboarding.gender'),
    type: 'select',
    field: 'gender',
    options: [
      { value: 'male',   label: t('onboarding.male')   },
      { value: 'female', label: t('onboarding.female') },
      { value: 'other',  label: t('onboarding.other')  },
    ],
  },

  { title: t('onboarding.importantDiseases'), type: 'disease-select',    field: 'importantDiseases' },
  { title: t('onboarding.medications'),       type: 'medication-select', field: 'medications' },
  { title: t('onboarding.surgeryHistory'),    type: 'boolean',           field: 'hadSurgery' },
];

const optionalSteps: StepDefinition[] = [
  { title: t('onboarding.height'),  type: 'number', field: 'height',  placeholder: '170', unit: 'cm' },
  { title: t('onboarding.weight'),  type: 'number', field: 'weight',  placeholder: '70',  unit: 'kg' },
  { title: t('onboarding.bloodType'),
    type: 'select',
    field: 'bloodType',
    options: [
      { value: '',   label: '-'  }, { value: 'A+', label: 'A+' }, { value: 'A-',  label: 'A-' },
      { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' },
      { value: 'AB-',label: 'AB-'}, { value: '0+', label: '0+'}, { value: '0-',  label: '0-' },
    ],
  },
  { title: t('onboarding.allergies'),
    type: 'text',
    field: 'allergies',
    placeholder: t('onboarding.allergiesPlaceholder'),
    multiline: true,
  },
];

  /* ---------- STEP BUILD ---------- */
const allSteps: StepDefinition[] = [...requiredSteps];

if (formData.hadSurgery) {
  allSteps.push({
    title: t('onboarding.surgeries'),
    type:  'surgery-select',
    field: 'surgeries',
  });
  // İstersen ameliyat ayrıntısı adımını da ekle
  allSteps.push({
    title: t('onboarding.surgeryDetails'),
    type:  'text',
    field: 'surgeryDetails',
    placeholder: t('onboarding.surgeryDetailsPlaceholder'),
    multiline: true,
  });
}
  allSteps.push(...optionalSteps);
  const currentStepData = allSteps[currentStep] as StepDefinition;
  const isLastStep      = currentStep === allSteps.length - 1;
  const isOptionalStep  = currentStep >= requiredSteps.length + (formData.hadSurgery ? 1 : 0);

  /* ---------- HELPERS ---------- */
  const openBirthDatePicker = () => {
    setTempDate(formData.birthDate);
    setShowDatePicker(true);
  };

  const validateCurrentStep = () => {
    const field = currentStepData.field as keyof UserHealthData;
    const value = formData[field];
    
    if (currentStepData.type === 'boolean') return true;
    
    // Array değerleri için kontrol
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    return value !== '' && value !== undefined && value !== null;
  };
React.useEffect(() => {
  if (currentStep >= allSteps.length) {
    setCurrentStep(allSteps.length - 1);
  }
}, [allSteps.length, currentStep]);
  const handleNext = () => {
    if (!isOptionalStep && !validateCurrentStep()) {
      Alert.alert(t('common.error'), t('onboarding.requiredFields'));
      return;
    }
    if (isLastStep) handleComplete();
    else            setCurrentStep(currentStep + 1);
  };

  const handleSkip = () => {
    if (isOptionalStep) handleComplete();
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Array'leri string'e çevir backend için
      const healthData = {
        ...formData,
        importantDiseases: formData.importantDiseases.join(', '),
        medications: formData.medications.join(', '),
        surgeries:         (formData.surgeries || []).join(', '),
      };
      
      const res = await axios.post(`${SERVER_URL}?action=saveHealthData`, {
        user_id: userId,
        health_data: healthData,
      });
      
      if (res.data.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Subscription', params: { userId, userName } }],
        });
      } else {
        Alert.alert(t('common.error'), res.data.error || t('common.error'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('auth.serverError'));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- RENDER STEP ---------- */
  const renderStepContent = () => {
    switch (currentStepData.type) {
      /* ---------- DATE ---------- */
            case 'disease-select':
        return renderDiseaseSelect();
        case 'surgery-select':
  return renderSurgerySelect();
      case 'medication-select':
        return renderMedicationSelect();
      case 'date':
        return (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.dateButton} onPress={openBirthDatePicker}>
              <MaterialIcons name="calendar-today" size={24} color="#666" />
              <Text style={styles.dateText}>{formData.birthDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {/* Ortalanmış modal picker (iOS & Android) */}
            <Modal visible={showDatePicker} transparent animationType="fade">
              <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.pickerCard}>
                      <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={new Date()}
                        minimumDate={new Date(1920, 0, 1)}
                        onChange={(_, date) => date && setTempDate(date)}
                        style={{ alignSelf: 'center' }}
                      />
                      <View style={styles.pickerActions}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.pickerCancel}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setFormData({ ...formData, birthDate: tempDate });
                            setShowDatePicker(false);
                          }}
                        >
                          <Text style={styles.pickerConfirm}>{t('common.ok')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>
        );

      /* ---------- SELECT ---------- */
      case 'select':
        return (
          <View style={styles.optionsContainer}>
            {currentStepData.options!.map((o: any) => (
              <TouchableOpacity
                key={o.value}
                style={[
                  styles.optionButton,
                  formData[currentStepData.field as keyof UserHealthData] === o.value && styles.optionButtonSelected,
                ]}
                onPress={() => setFormData({ ...formData, [currentStepData.field]: o.value })}
              >
                <Text style={[
                  styles.optionText,
                  formData[currentStepData.field as keyof UserHealthData] === o.value && styles.optionTextSelected,
                ]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      /* ---------- BOOLEAN ---------- */
      case 'boolean':
        return (
          <View style={styles.booleanContainer}>
            {['yes','no'].map((answer, idx) => {
              const val = idx === 0;
              const selected = formData.hadSurgery === val;
              return (
                <TouchableOpacity
                  key={answer}
                  style={[styles.booleanButton, selected && styles.booleanButtonSelected]}
                  onPress={() => setFormData({ ...formData, hadSurgery: val })}
                >
                  <Text style={[styles.booleanText, selected && styles.booleanTextSelected]}>
                    {val ? t('common.yes') : t('common.no')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      /* ---------- TEXT / NUMBER ---------- */
      case 'text':
      case 'number':
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, currentStepData.multiline && styles.textInputMultiline]}
              placeholder={currentStepData.placeholder}
              placeholderTextColor="#999"
              value={String(formData[currentStepData.field as keyof UserHealthData] || '')}
              onChangeText={txt => setFormData({ ...formData, [currentStepData.field]: txt })}
              keyboardType={currentStepData.type === 'number' ? 'numeric' : 'default'}
              multiline={!!currentStepData.multiline}
              numberOfLines={currentStepData.multiline ? 4 : 1}
            />
            {currentStepData.unit && <Text style={styles.unitText}>{currentStepData.unit}</Text>}
          </View>
        );

      default:
        return null;
    }
  };

  /* ---------- UI ---------- */
  return (
  <LinearGradient colors={['#6B75D6', '#46B168']} style={styles.gradient}>
    <SafeAreaView style={styles.container}>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* HEADER + PROGRESS ------------------------------------------------ */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('onboarding.title')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${((currentStep + 1) / allSteps.length) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{currentStep + 1} / {allSteps.length}</Text>
              </View>
            </View>

            {/* STEP CONTENT ----------------------------------------------------- */}
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>{currentStepData.title}</Text>
              {isOptionalStep && <Text style={styles.optionalText}>{t('onboarding.optionalInfo')}</Text>}
              {renderStepContent()}
            </View>

            {/* BUTTONS ---------------------------------------------------------- */}
            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(currentStep - 1)}>
                  <MaterialIcons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}

              <View style={styles.rightButtons}>
                {isOptionalStep && !isLastStep && (
                  <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipButtonText}>{t('common.skip')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#667eea" />
                  ) : (
                    <>
                      <Text style={styles.nextButtonText}>
                        {isLastStep ? t('onboarding.complete') : t('common.next')}
                      </Text>
                      {!isLastStep && <MaterialIcons name="arrow-forward" size={20} color="#667eea" />}
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
     
    </SafeAreaView>
     </LinearGradient>
  );
}

const additionalStyles = StyleSheet.create({
  multiSelectContainer: {
    marginTop: 20,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  optionsList: {
    maxHeight: 250,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 8,
  },
  multiSelectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  multiSelectOptionSelected: {
    backgroundColor: '#667eea',
  },
  multiSelectOptionSuggested: {
    backgroundColor: '#FFF3CD',
  },
  multiSelectText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  multiSelectTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  multiSelectTextSuggested: {
    color: '#856404',
  },
  selectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedChipText: {
    color: '#fff',
    fontSize: 14,
  },
  otherInput: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    marginTop: 8,
  },
});

const styles = StyleSheet.create({
  ...additionalStyles,
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
    modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 24,
  },
  pickerCancel: {
    fontSize: 16,
    color: '#667eea',
  },
  pickerConfirm: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
});