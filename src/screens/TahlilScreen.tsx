import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { 
  launchImageLibrary, 
  launchCamera, 
  CameraOptions, 
  ImageLibraryOptions, 
  Asset 
} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { useLanguage } from '../context/LanguageContext';


const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width } = Dimensions.get('window');

type TahlilScreenProps = StackScreenProps<RootStackParamList, 'Tahlil'>;

interface HistoryItem {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt?: string;
  analysis?: AnalysisResult;
}

interface AnalysisResult {
  summary: string;
  values: TestValue[];
  recommendations: string[];
  warnings: string[];
  references: string[];
}

interface TestValue {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low';
}

export default function TahlilScreen({ route, navigation }: TahlilScreenProps) {
  const { userId } = route.params;
  const [selectedFile, setSelectedFile] = useState<Asset | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showTips, setShowTips] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchHistory();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchHistory = async () => {
    try {
      const url = `${SERVER_URL}?action=getHistoryBySpecialty&user_id=${userId}&specialty=Tahlil`;
      const response = await axios.get(url);
      if (response.data.success) {
        const processedHistory = response.data.history.map((item: any) => {
          try {
            const parsed = JSON.parse(item.message);
            if (parsed.analysis) {
              return { ...item, analysis: parsed.analysis };
            }
          } catch (e) {}
          return item;
        });
        setHistory(processedHistory);
      }
    } catch (error) {
      console.log('Geçmiş alınırken hata:', error);
    }
  };

  const handleUploadFromGallery = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.9,
      includeBase64: true,
    };
    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        setSelectedFile(response.assets[0]);
        setShowTips(false);
      }
    });
  };

  const handleTakePhoto = () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.9,
      includeBase64: true,
    };
    launchCamera(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        setSelectedFile(response.assets[0]);
        setShowTips(false);
      }
    });
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf],
      });
      // PDF handling için özel işlem gerekebilir
      Alert.alert('PDF Desteği', 'PDF dosyaları yakında desteklenecek.');
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Hata', 'Dosya seçilirken bir hata oluştu.');
      }
    }
  };

  const handleSend = async () => {
    if (!selectedFile || !selectedFile.base64) {
      Alert.alert('Uyarı', 'Lütfen tahlil sonucunuzu yükleyin.');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        user_id: userId,
        specialty: "Tahlil",
        user_image: selectedFile.base64,
        fileName: selectedFile.fileName || `tahlil_${Date.now()}.jpg`,
        caption: caption || "[Tahlil Sonucu]",
        language,
      };
      
      const response = await axios.post(`${SERVER_URL}?action=analyzeTahlil`, data);
      if (response.data.success) {
        Alert.alert(
          'Analiz Tamamlandı', 
          'Tahlil sonucunuz başarıyla analiz edildi.',
          [{ text: 'Tamam', onPress: () => fetchHistory() }]
        );
        setSelectedFile(null);
        setCaption('');
        setShowTips(true);
      } else {
        Alert.alert('Hata', response.data.error || 'Analiz yapılamadı.');
      }
    } catch (error: any) {
      Alert.alert('Bağlantı Hatası', 'Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const renderTestValue = (value: TestValue) => (
    <View style={styles.testValueCard} key={value.name}>
      <View style={styles.testValueHeader}>
        <Text style={styles.testValueName}>{value.name}</Text>
        <View style={[
          styles.testValueStatus,
          value.status === 'normal' ? styles.statusNormal :
          value.status === 'high' ? styles.statusHigh : styles.statusLow
        ]}>
          <Text style={styles.statusText}>
            {value.status === 'normal' ? 'Normal' :
             value.status === 'high' ? 'Yüksek' : 'Düşük'}
          </Text>
        </View>
      </View>
      <View style={styles.testValueDetails}>
        <Text style={styles.testValue}>{value.value} {value.unit}</Text>
        <Text style={styles.referenceRange}>Referans: {value.referenceRange}</Text>
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const isUser = item.role === 'user';
    
    let content = item.message;
    let imageUrl = null;
    try {
      const parsed = JSON.parse(item.message);
      if (parsed.type === 'image') {
        content = parsed.caption;
        imageUrl = parsed.url;
      }
    } catch (e) {}

    if (isUser) {
      return (
        <View style={styles.userMessage}>
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
          )}
          <Text style={styles.userMessageText}>{content}</Text>
          <Text style={styles.messageTime}>{item.createdAt}</Text>
        </View>
      );
    }

    // Assistant message with analysis
    if (item.analysis) {
      const { analysis } = item;
      return (
        <View style={styles.assistantMessage}>
          <View style={styles.analysisContainer}>
            <Text style={styles.analysisSummary}>{analysis.summary}</Text>
            
            {analysis.values && analysis.values.length > 0 && (
              <View style={styles.testValuesSection}>
                <Text style={styles.sectionTitle}>Tahlil Değerleri</Text>
                {analysis.values.map(renderTestValue)}
              </View>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionTitle}>Öneriler</Text>
                {analysis.recommendations.map((rec, idx) => (
                  <Text key={idx} style={styles.recommendation}>• {rec}</Text>
                ))}
              </View>
            )}

            {analysis.warnings && analysis.warnings.length > 0 && (
              <View style={styles.warningsSection}>
                <Text style={styles.warningTitle}>⚠️ Uyarılar</Text>
                {analysis.warnings.map((warn, idx) => (
                  <Text key={idx} style={styles.warning}>{warn}</Text>
                ))}
              </View>
            )}

            {analysis.references && analysis.references.length > 0 && (
              <View style={styles.referencesSection}>
                <Text style={styles.sectionTitle}>Kaynaklar</Text>
                {analysis.references.map((ref, idx) => (
                  <Text key={idx} style={styles.reference}>[{idx + 1}] {ref}</Text>
                ))}
              </View>
            )}
          </View>
          <Text style={styles.messageTime}>{item.createdAt}</Text>
        </View>
      );
    }

    return (
      <View style={styles.assistantMessage}>
        <Text style={styles.assistantMessageText}>{content}</Text>
        <Text style={styles.messageTime}>{item.createdAt}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tahlil Analizi</Text>
          <TouchableOpacity style={styles.infoButton}>
            <MaterialIcons name="info-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Upload Section */}
          <Animated.View style={[styles.uploadSection, { opacity: fadeAnim }]}>
            {selectedFile ? (
              <View style={styles.selectedFileContainer}>
                <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => {
                    setSelectedFile(null);
                    setShowTips(true);
                  }}
                >
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadContainer}>
                <MaterialCommunityIcons name="flask-outline" size={64} color="#59FFD5" />
                <Text style={styles.uploadTitle}>Tahlil Sonucunuzu Yükleyin</Text>
                <Text style={styles.uploadSubtitle}>
                  Fotoğraf çekin veya galeriden seçin
                </Text>
                
                <View style={styles.uploadButtons}>
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={handleTakePhoto}
                  >
                    <MaterialIcons name="camera-alt" size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>Fotoğraf Çek</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={handleUploadFromGallery}
                  >
                    <MaterialIcons name="photo-library" size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>Galeriden Seç</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.uploadButton, styles.pdfButton]}
                    onPress={handlePickDocument}
                  >
                    <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>PDF Yükle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedFile && (
              <View style={styles.captionContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Varsa ek bilgi ekleyin (opsiyonel)"
                  placeholderTextColor="#999"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>{caption.length}/200</Text>
              </View>
            )}

            {selectedFile && (
              <TouchableOpacity 
                style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <MaterialIcons name="analytics" size={24} color="#000" />
                    <Text style={styles.sendButtonText}>Analiz Et</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Tips Section */}
          {showTips && !selectedFile && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 İpuçları</Text>
              <View style={styles.tipCard}>
                <MaterialIcons name="camera-alt" size={20} color="#59FFD5" />
                <Text style={styles.tipText}>
                  Net fotoğraf çekin, tüm değerler görünür olmalı
                </Text>
              </View>
              <View style={styles.tipCard}>
                <MaterialIcons name="lightbulb-outline" size={20} color="#59FFD5" />
                <Text style={styles.tipText}>
                  İyi aydınlatılmış ortamda çekim yapın
                </Text>
              </View>
              <View style={styles.tipCard}>
                <MaterialIcons name="security" size={20} color="#59FFD5" />
                <Text style={styles.tipText}>
                  Verileriniz güvenle işlenir ve saklanmaz
                </Text>
              </View>
            </View>
          )}

          {/* History Section */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Geçmiş Analizler</Text>
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <MaterialCommunityIcons name="history" size={48} color="#666" />
                <Text style={styles.emptyHistoryText}>
                  Henüz tahlil analizi yapmadınız
                </Text>
              </View>
            ) : (
              <FlatList
                data={history}
                renderItem={renderHistoryItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                inverted
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  infoButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  uploadSection: {
    padding: 16,
  },
  uploadContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#59FFD5',
    borderStyle: 'dashed',
  },
  uploadTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadSubtitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
  },
  uploadButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: '#59FFD5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  pdfButton: {
    backgroundColor: '#FF6B6B',
  },
  uploadButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedFileContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: { 
    width: width - 32, 
    height: 250, 
    borderRadius: 12,
    marginBottom: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  captionContainer: {
    marginTop: 16,
  },
  captionInput: { 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 80,
  },
  charCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  sendButton: { 
    backgroundColor: '#59FFD5', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  tipsSection: {
    padding: 16,
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipCard: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  tipText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  historySection: { 
    flex: 1, 
    backgroundColor: '#0a0a0a', 
    padding: 16,
  },
  historyTitle: { 
    color: '#fff', 
    fontSize: 20, 
    marginBottom: 16,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyHistoryText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#59FFD5',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessageText: {
    color: '#000',
    fontSize: 14,
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '90%',
  },
  assistantMessageText: {
    color: '#fff',
    fontSize: 14,
  },
  analysisContainer: {
    marginVertical: 8,
  },
  analysisSummary: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#59FFD5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
  },
  testValuesSection: {
    marginVertical: 12,
  },
  testValueCard: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  testValueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testValueName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  testValueStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusNormal: {
    backgroundColor: '#4CAF50',
  },
  statusHigh: {
    backgroundColor: '#FF5252',
  },
  statusLow: {
    backgroundColor: '#FFB74D',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  testValueDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testValue: {
    color: '#fff',
    fontSize: 14,
  },
  referenceRange: {
    color: '#999',
    fontSize: 12,
  },
  recommendationsSection: {
    marginVertical: 12,
  },
  recommendation: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  warningsSection: {
    backgroundColor: '#3a2a2a',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  warningTitle: {
    color: '#FFB74D',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  warning: {
    color: '#FFB74D',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  referencesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  reference: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  messageTime: { 
    color: '#666', 
    fontSize: 10,
    marginTop: 4,
  },
});