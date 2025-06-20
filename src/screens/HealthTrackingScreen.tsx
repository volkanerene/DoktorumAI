import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
} from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

type HealthTrackingProps = StackScreenProps<RootStackParamList, 'HealthTracking'>;

interface HealthMetric {
  id: string;
  type: 'weight' | 'bloodPressure' | 'bloodSugar' | 'heartRate' | 'steps' | 'sleep' | 'water';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  date: Date;
  notes?: string;
}

interface MetricConfig {
  type: string;
  name: string;
  icon: string;
  color: string;
  unit: string;
  inputType: 'single' | 'double';
  range?: { min: number; max: number; optimal?: { min: number; max: number } };
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    type: 'weight',
    name: 'Kilo',
    icon: 'monitor-weight',
    color: '#FF6B6B',
    unit: 'kg',
    inputType: 'single',
    range: { min: 40, max: 150 },
  },
  {
    type: 'bloodPressure',
    name: 'Tansiyon',
    icon: 'blood-pressure',
    color: '#4ECDC4',
    unit: 'mmHg',
    inputType: 'double',
    range: { min: 60, max: 200, optimal: { min: 90, max: 140 } },
  },
  {
    type: 'bloodSugar',
    name: 'Kan Şekeri',
    icon: 'diabetes',
    color: '#45B7D1',
    unit: 'mg/dL',
    inputType: 'single',
    range: { min: 50, max: 300, optimal: { min: 70, max: 140 } },
  },
  {
    type: 'heartRate',
    name: 'Nabız',
    icon: 'heart-pulse',
    color: '#F7B731',
    unit: 'bpm',
    inputType: 'single',
    range: { min: 40, max: 200, optimal: { min: 60, max: 100 } },
  },
  {
    type: 'steps',
    name: 'Adım',
    icon: 'walk',
    color: '#5F27CD',
    unit: 'adım',
    inputType: 'single',
    range: { min: 0, max: 30000, optimal: { min: 8000, max: 12000 } },
  },
  {
    type: 'sleep',
    name: 'Uyku',
    icon: 'bed',
    color: '#00D2D3',
    unit: 'saat',
    inputType: 'single',
    range: { min: 0, max: 24, optimal: { min: 7, max: 9 } },
  },
  {
    type: 'water',
    name: 'Su',
    icon: 'water',
    color: '#54A0FF',
    unit: 'ml',
    inputType: 'single',
    range: { min: 0, max: 5000, optimal: { min: 2000, max: 3000 } },
  },
];

export default function HealthTrackingScreen({ route, navigation }: HealthTrackingProps) {
  const { userId } = route.params;
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricConfig>(METRIC_CONFIGS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form states
  const [inputValue, setInputValue] = useState('');
  const [inputValueSecondary, setInputValueSecondary] = useState('');
  const [inputDate, setInputDate] = useState(new Date());
  const [inputNotes, setInputNotes] = useState('');

  // Chart data
  const [chartData, setChartData] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    if (metrics.length > 0) {
      generateChartData();
      generateInsights();
    }
  }, [metrics, selectedMetric, selectedPeriod]);

  const loadMetrics = async () => {
    try {
      const stored = await AsyncStorage.getItem(`health_metrics_${userId}`);
      if (stored) {
        const data: HealthMetric[] = JSON.parse(stored);
        setMetrics(data.map(m => ({ ...m, date: new Date(m.date) })));
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const saveMetrics = async (newMetrics: HealthMetric[]) => {
    try {
      await AsyncStorage.setItem(`health_metrics_${userId}`, JSON.stringify(newMetrics));
      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  };

  const addMetric = () => {
    if (!inputValue) {
      Alert.alert('Eksik Bilgi', 'Lütfen değer girin');
      return;
    }

    const newMetric: HealthMetric = {
      id: Date.now().toString(),
      type: selectedMetric.type as any,
      value: selectedMetric.inputType === 'double' 
        ? { systolic: Number(inputValue), diastolic: Number(inputValueSecondary) }
        : Number(inputValue),
      unit: selectedMetric.unit,
      date: inputDate,
      notes: inputNotes,
    };

    const updated = [...metrics, newMetric].sort((a, b) => b.date.getTime() - a.date.getTime());
    saveMetrics(updated);
    
    setShowAddModal(false);
    resetForm();
    
    // Check if value is out of range
    checkHealthAlerts(newMetric);
  };

  const deleteMetric = (id: string) => {
    Alert.alert(
      'Veriyi Sil',
      'Bu ölçümü silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const updated = metrics.filter(m => m.id !== id);
            saveMetrics(updated);
          },
        },
      ]
    );
  };

  const checkHealthAlerts = (metric: HealthMetric) => {
    const config = METRIC_CONFIGS.find(c => c.type === metric.type);
    if (!config?.range?.optimal) return;

    const value = typeof metric.value === 'number' 
      ? metric.value 
      : metric.value.systolic; // For blood pressure, check systolic

    const { optimal } = config.range;
    
    if (value < optimal.min || value > optimal.max) {
      Alert.alert(
        '⚠️ Sağlık Uyarısı',
        `${config.name} değeriniz normal aralığın dışında. Lütfen doktorunuza danışın.`,
        [
          { text: 'Tamam' },
          { text: 'Doktora Git', onPress: () => navigation.navigate('Chat', { 
            userId, 
            assistantName: 'Aile Asistanı' 
          })}
        ]
      );
    }
  };

  const generateChartData = () => {
    const filteredMetrics = getFilteredMetrics();
    if (filteredMetrics.length === 0) {
      setChartData(null);
      return;
    }

    const labels = filteredMetrics.slice(-7).map(m => {
      const date = new Date(m.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const values = filteredMetrics.slice(-7).map(m => {
      if (typeof m.value === 'number') {
        return m.value;
      } else {
        // For blood pressure, show systolic
        return m.value.systolic;
      }
    });

    setChartData({
      labels,
      datasets: [{
        data: values,
        color: (opacity = 1) => selectedMetric.color,
        strokeWidth: 2,
      }],
    });
  };

  const getFilteredMetrics = () => {
    const now = new Date();
    const filtered = metrics.filter(m => m.type === selectedMetric.type);

    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return filtered.filter(m => m.date >= weekAgo);
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return filtered.filter(m => m.date >= monthAgo);
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return filtered.filter(m => m.date >= yearAgo);
      default:
        return filtered;
    }
  };

  const generateInsights = () => {
    const filteredMetrics = getFilteredMetrics();
    if (filteredMetrics.length === 0) {
      setInsights(['Henüz veri yok. İlk ölçümünüzü ekleyin!']);
      return;
    }

    const newInsights: string[] = [];
    const values = filteredMetrics.map(m => 
      typeof m.value === 'number' ? m.value : m.value.systolic
    );

    // Average
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    newInsights.push(`Ortalama: ${avg.toFixed(1)} ${selectedMetric.unit}`);

    // Trend
    if (values.length >= 2) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.05) {
        newInsights.push('📈 Yükseliş trendi var');
      } else if (secondAvg < firstAvg * 0.95) {
        newInsights.push('📉 Düşüş trendi var');
      } else {
        newInsights.push('➡️ Değerler stabil');
      }
    }

    // Goal achievement for steps
    if (selectedMetric.type === 'steps') {
      const daysAbove8k = values.filter(v => v >= 8000).length;
      const percentage = (daysAbove8k / values.length) * 100;
      newInsights.push(`🎯 Günlerin %${percentage.toFixed(0)}'inde hedefe ulaştınız`);
    }

    setInsights(newInsights);
  };

  const resetForm = () => {
    setInputValue('');
    setInputValueSecondary('');
    setInputDate(new Date());
    setInputNotes('');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMetrics().then(() => setRefreshing(false));
  };

  const renderMetricCard = (config: MetricConfig) => {
    const latestMetric = metrics
      .filter(m => m.type === config.type)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    const value = latestMetric 
      ? (typeof latestMetric.value === 'number' 
          ? latestMetric.value.toString() 
          : `${latestMetric.value.systolic}/${latestMetric.value.diastolic}`)
      : '--';

    return (
      <TouchableOpacity
        key={config.type}
        style={[
          styles.metricCard,
          selectedMetric.type === config.type && styles.metricCardSelected,
        ]}
        onPress={() => setSelectedMetric(config)}
      >
        <LinearGradient
          colors={[config.color, config.color + '99']}
          style={styles.metricGradient}
        >
          <MaterialCommunityIcons name={config.icon} size={32} color="#fff" />
          <Text style={styles.metricName}>{config.name}</Text>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricUnit}>{config.unit}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderGoalProgress = () => {
    const today = new Date();
    const todayMetrics = metrics.filter(m => {
      const metricDate = new Date(m.date);
      return metricDate.toDateString() === today.toDateString();
    });

    const goals = [
      { type: 'steps', target: 10000, icon: 'walk', color: '#5F27CD' },
      { type: 'water', target: 2500, icon: 'water', color: '#54A0FF' },
      { type: 'sleep', target: 8, icon: 'bed', color: '#00D2D3' },
    ];

    return goals.map(goal => {
      const todayValue = todayMetrics.find(m => m.type === goal.type);
      const value = todayValue && typeof todayValue.value === 'number' 
        ? todayValue.value 
        : 0;
      const progress = Math.min(value / goal.target, 1);

      return (
        <View key={goal.type} style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <MaterialCommunityIcons name={goal.icon} size={24} color={goal.color} />
            <Text style={styles.goalTitle}>
              {METRIC_CONFIGS.find(c => c.type === goal.type)?.name}
            </Text>
          </View>
          <View style={styles.goalProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress * 100}%`, backgroundColor: goal.color }
                ]} 
              />
            </View>
            <Text style={styles.goalText}>
              {value}/{goal.target}
            </Text>
          </View>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sağlık Takibi</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Metric Selection */}
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metricsScroll}
        >
          {METRIC_CONFIGS.map(renderMetricCard)}
        </ScrollView>

        {/* Period Selection */}
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period as any)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.periodTextActive,
              ]}>
                {period === 'week' ? 'Hafta' : period === 'month' ? 'Ay' : 'Yıl'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        {chartData ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={width - 32}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: selectedMetric.type === 'weight' ? 1 : 0,
                color: (opacity = 1) => selectedMetric.color,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: selectedMetric.color,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <MaterialCommunityIcons name="chart-line" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Grafik için veri yok</Text>
          </View>
        )}

        {/* Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>📊 İçgörüler</Text>
          {insights.map((insight, index) => (
            <Text key={index} style={styles.insightText}>{insight}</Text>
          ))}
        </View>

        {/* Daily Goals */}
        <View style={styles.goalsContainer}>
          <Text style={styles.goalsTitle}>Günlük Hedefler</Text>
          {renderGoalProgress()}
        </View>

        {/* Recent Entries */}
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>Son Ölçümler</Text>
          {getFilteredMetrics().slice(0, 5).map((metric) => (
            <TouchableOpacity
              key={metric.id}
              style={styles.recentItem}
              onLongPress={() => deleteMetric(metric.id)}
            >
              <View style={styles.recentLeft}>
                <Text style={styles.recentDate}>
                  {new Date(metric.date).toLocaleDateString('tr-TR')}
                </Text>
                <Text style={styles.recentTime}>
                  {new Date(metric.date).toLocaleTimeString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
              <View style={styles.recentRight}>
                <Text style={styles.recentValue}>
                  {typeof metric.value === 'number' 
                    ? metric.value 
                    : `${metric.value.systolic}/${metric.value.diastolic}`}
                </Text>
                <Text style={styles.recentUnit}>{metric.unit}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add Metric Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMetric.name} Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Değer</Text>
              {selectedMetric.inputType === 'single' ? (
                <TextInput
                  style={styles.input}
                  placeholder={`Örn: 70 ${selectedMetric.unit}`}
                  value={inputValue}
                  onChangeText={setInputValue}
                  keyboardType="numeric"
                />
              ) : (
                <View style={styles.doubleInput}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Sistolik"
                    value={inputValue}
                    onChangeText={setInputValue}
                    keyboardType="numeric"
                  />
                  <Text style={styles.separator}>/</Text>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Diastolik"
                    value={inputValueSecondary}
                    onChangeText={setInputValueSecondary}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <Text style={styles.inputLabel}>Tarih ve Saat</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color="#667eea" />
                <Text style={styles.dateText}>
                  {inputDate.toLocaleDateString('tr-TR')} {inputDate.toLocaleTimeString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Not (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Örn: Yemekten önce"
                value={inputNotes}
                onChangeText={setInputNotes}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.saveButton} onPress={addMetric}>
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

{showDatePicker && (
  <DateTimePicker
    value={inputDate}
    mode="datetime"
    display="default"
    onChange={(event, date) => {
      setShowDatePicker(false);
      if (date) setInputDate(date);
    }}
    {...({ is24Hour: true } as any)}
  />
)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  metricsScroll: {
    paddingVertical: 16,
  },
  metricCard: {
    width: 120,
    height: 120,
    marginLeft: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  metricGradient: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  metricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricUnit: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#667eea',
  },
  periodText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#fff',
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyChart: {
    height: 220,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  insightsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  goalsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#666',
    minWidth: 60,
    textAlign: 'right',
  },
  recentContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  recentLeft: {
    flex: 1,
  },
  recentDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  recentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  recentUnit: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  doubleInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfInput: {
    flex: 1,
  },
  separator: {
    fontSize: 20,
    marginHorizontal: 8,
    color: '#666',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});