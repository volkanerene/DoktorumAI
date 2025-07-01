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
  Modal,
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
  Asset,
} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { useLanguage } from '../context/LanguageContext';
import LinearGradient from 'react-native-linear-gradient';

/* --------------------------------------------------
   THEME CONSTANTS – tek merkezden tüm renk geçişi
---------------------------------------------------*/
const GRADIENT_PRIMARY = ['#6B75D6', '#46B168'];          // aurora ana geçişi
const COLOR_PRIMARY    = '#6B75D6';                      // ana vurgu (düğmeler vb.)
const COLOR_SECONDARY  = '#46B168';                      // ikincil vurgu
const COLOR_ACCENT     = '#FFB74D';                      // yardımcı vurgu (opsiyonel)
const BG_COLOR = '#09408B';     

const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width } = Dimensions.get('window');

type CekimSonucuScreenProps = StackScreenProps<RootStackParamList, 'CekimSonucu'>;

interface HistoryItem {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt?: string;
  analysis?: RadiologyAnalysis;
}

interface RadiologyAnalysis {
  summary: string;
  findings: Finding[];
  impression: string;
  recommendations: string[];
  urgencyLevel: 'routine' | 'urgent' | 'critical';
  modality?: string;
  bodyPart?: string;
  references: string[];
}

interface Finding {
  location: string;
  description: string;
  significance: 'normal' | 'mild' | 'moderate' | 'severe';
}

const modalityOptions = [
  { id: 'xray',        name: 'Röntgen',   icon: 'radio-button-checked' },
  { id: 'mri',         name: 'MR',        icon: 'blur-circular' },
  { id: 'ct',          name: 'BT',        icon: 'blur-on' },
  { id: 'ultrasound',  name: 'Ultrason',  icon: 'wifi-tethering' },
  { id: 'other',       name: 'Diğer',     icon: 'more-horiz' },
];

const bodyPartOptions = [
  { id: 'head',       name: 'Baş-Boyun',  icon: 'face' },
  { id: 'chest',      name: 'Göğüs',      icon: 'favorite' },
  { id: 'abdomen',    name: 'Karın',      icon: 'restaurant' },
  { id: 'spine',      name: 'Omurga',     icon: 'align-vertical-center' },
  { id: 'extremity',  name: 'Ekstremite', icon: 'accessibility' },
  { id: 'other',      name: 'Diğer',      icon: 'more-horiz' },
];

export default function CekimSonucuScreen({ route, navigation }: CekimSonucuScreenProps) {
  const { userId } = route.params;
  const [selectedFile, setSelectedFile] = useState<Asset | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedModality, setSelectedModality] = useState<string>('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const { t, language } = useLanguage();
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchHistory();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* --------------------------------------
     API – geçmiş, gönderim vb.
  ---------------------------------------*/
  const fetchHistory = async () => {
    try {
      const url = `${SERVER_URL}?action=getHistoryBySpecialty&user_id=${userId}&specialty=CekimSonucu`;
      const response = await axios.get(url);
      if (response.data.success) {
        const processed = response.data.history.map((item: any) => {
          try {
            const parsed = JSON.parse(item.message);
            if (parsed.analysis) return { ...item, analysis: parsed.analysis };
          } catch {}
          return item;
        });
        setHistory(processed);
      }
    } catch (err) {
      console.log('Geçmiş alınırken hata:', err);
    }
  };

  /* --------------------------------------
     GÖRÜNTÜ SEÇİMİ
  ---------------------------------------*/
  const handleUploadFromGallery = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
      includeBase64: true,
    };
    launchImageLibrary(options, (response) => {
      if (response.assets?.length) {
        setSelectedFile(response.assets[0]);
      }
    });
  };

  const handleTakePhoto = () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 1,
      includeBase64: true,
    };
    launchCamera(options, (response) => {
      if (response.assets?.length) {
        setSelectedFile(response.assets[0]);
      }
    });
  };

  const handlePickDocument = async () => {
    try {
      await DocumentPicker.pick({ type: [DocumentPicker.types.pdf, DocumentPicker.types.images] });
      Alert.alert('Bilgi', 'PDF desteği yakında eklenecek.');
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) Alert.alert('Hata', 'Dosya seçilirken bir hata oluştu.');
    }
  };

  /* --------------------------------------
     GÖNDERİM
  ---------------------------------------*/
  const handleSend = async () => {
    if (!selectedFile?.base64) {
      Alert.alert('Uyarı', 'Lütfen görüntünüzü yükleyin.');
      return;
    }
    if (!selectedModality || !selectedBodyPart) {
      Alert.alert('Uyarı', 'Lütfen görüntü tipini ve vücut bölgesini seçin.');
      return;
    }
    setLoading(true);
    try {
      const meta = { modality: selectedModality, bodyPart: selectedBodyPart, additionalInfo: caption };
      const payload = {
        user_id: userId,
        specialty: 'CekimSonucu',
        user_image: selectedFile.base64,
        fileName: selectedFile.fileName || `radiology_${Date.now()}.jpg`,
        caption: JSON.stringify(meta),
        language,
      };
      const res = await axios.post(`${SERVER_URL}?action=analyzeCekim`, payload);
      if (res.data.success) {
        Alert.alert('Analiz Tamamlandı', 'Görüntünüz başarıyla analiz edildi.', [
          { text: 'Tamam', onPress: () => { fetchHistory(); resetForm(); } },
        ]);
      } else {
        Alert.alert('Hata', res.data.error || 'Analiz yapılamadı.');
      }
    } catch {
      Alert.alert('Bağlantı Hatası', 'Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setCaption('');
    setSelectedModality('');
    setSelectedBodyPart('');
  };

  /* --------------------------------------
     RENDER yardımcıları
  ---------------------------------------*/
  const renderFinding = (finding: Finding, idx: number) => {
    const map: Record<Finding['significance'], string> = {
      normal: '#4CAF50',
      mild: '#FFC107',
      moderate: '#FF9800',
      severe: '#F44336',
    };
    return (
      <View key={idx} style={[styles.findingCard, { borderLeftColor: map[finding.significance] }]}>
        <View style={styles.findingHeader}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.findingLocation}>{finding.location}</Text>
        </View>
        <Text style={styles.findingDescription}>{finding.description}</Text>
      </View>
    );
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    if (item.role === 'user') {
      let img; try { img = JSON.parse(item.message); } catch {}
      return (
        <View style={styles.userMessage}>
          {img?.url && <Image source={{ uri: img.url }} style={styles.thumbnailImage} />}
          <Text style={styles.userMessageText}>Görüntü analizi istendi</Text>
        </View>
      );
    }
    if (item.analysis) {
      const { analysis } = item;
      const urgColors = { routine: COLOR_SECONDARY, urgent: '#FF9800', critical: '#F44336' };
      const expanded = expandedAnalysis === item.id;
      return (
        <TouchableOpacity
          style={styles.assistantMessage}
          activeOpacity={0.9}
          onPress={() => setExpandedAnalysis(expanded ? null : item.id)}
        >
    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
            {/* Header */}
            <View style={styles.analysisHeader}>
              <View style={styles.analysisHeaderLeft}>
                <MaterialIcons name={modalityOptions.find(m => m.id === analysis.modality)?.icon || 'image'} size={24} color="#fff" />
                <View>
                  <Text style={styles.analysisTitle}>{analysis.modality?.toUpperCase()} - {analysis.bodyPart}</Text>
                  <View style={[styles.urgencyBadge, { backgroundColor: urgColors[analysis.urgencyLevel] }]}>
                    <Text style={styles.urgencyText}>{analysis.urgencyLevel === 'routine' ? 'Rutin' : analysis.urgencyLevel === 'urgent' ? 'Acil' : 'Kritik'}</Text>
                  </View>
                </View>
              </View>
              <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color="#fff" />
            </View>
            <Text style={styles.analysisSummary} numberOfLines={expanded ? undefined : 2}>{analysis.summary}</Text>
            {expanded && (
              <Animated.View style={{ opacity: fadeAnim }}>
                {analysis.findings?.length ? (<View style={styles.section}>
                  <Text style={styles.sectionTitle}>📋 Bulgular</Text>
                  {analysis.findings.map(renderFinding)}
                </View>) : null}
                {analysis.impression && (<View style={styles.section}>
                  <Text style={styles.sectionTitle}>💭 Yorum</Text>
                  <Text style={styles.impressionText}>{analysis.impression}</Text>
                </View>)}
                {analysis.recommendations?.length ? (<View style={styles.section}>
                  <Text style={styles.sectionTitle}>💡 Öneriler</Text>
                  {analysis.recommendations.map((r, i) => (
                    <View key={i} style={styles.recommendationItem}>
                      <MaterialIcons name="check-circle" size={16} color="#fff" />
                      <Text style={styles.recommendationText}>{r}</Text>
                    </View>))}
                </View>) : null}
                {analysis.references?.length ? (<View style={styles.section}>
                  <Text style={styles.sectionTitle}>📚 Kaynaklar</Text>
                  {analysis.references.map((ref, i) => <Text key={i} style={styles.reference}>[{i + 1}] {ref}</Text>)}
                </View>) : null}
              </Animated.View>)}
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  };

  /* --------------------------------------
     MODAL (bilgi)
  ---------------------------------------*/
  const InfoModal = () => (
    <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowInfoModal(false)}>
        <View style={styles.infoModalContent}>
          <Text style={styles.infoModalTitle}>Görüntü Analizi Hakkında</Text>
          <Text style={styles.infoModalText}>• Yüksek kaliteli görüntüler yükleyin{`n`}• Tüm kişisel bilgileri kapatın{`n`}• Görüntü tipini doğru seçin{`n`}• Ek bilgi varsa açıklama ekleyin{`n`}• Sonuçlar sadece bilgilendirme amaçlıdır</Text>
          <TouchableOpacity style={styles.infoModalButton} onPress={() => setShowInfoModal(false)}>
            <Text style={styles.infoModalButtonText}>Anladım</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  /* --------------------------------------
     UI
  ---------------------------------------*/
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* HEADER */}
    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Görüntü Analizi</Text>
          <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.infoButton}>
            <MaterialIcons name="info-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} style={styles.content}>
          {/* Upload Section */}
          <Animated.View style={[styles.uploadSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {selectedFile ? (<View style={styles.selectedFileContainer}>
              <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeButton} onPress={resetForm}>
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              {/* Metadata */}
              <View style={styles.metadataSection}>
                <Text style={styles.metadataTitle}>Görüntü Tipi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionsRow}>
                    {modalityOptions.map(o => (<TouchableOpacity key={o.id} style={[styles.optionButton, selectedModality === o.id && styles.optionButtonSelected]} onPress={() => setSelectedModality(o.id)}>
                      <MaterialIcons name={o.icon} size={24} color={selectedModality === o.id ? '#fff' : '#666'} />
                      <Text style={[styles.optionText, selectedModality === o.id && styles.optionTextSelected]}>{o.name}</Text>
                    </TouchableOpacity>))}
                  </View>
                </ScrollView>
                <Text style={styles.metadataTitle}>Vücut Bölgesi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionsRow}>
                    {bodyPartOptions.map(o => (<TouchableOpacity key={o.id} style={[styles.optionButton, selectedBodyPart === o.id && styles.optionButtonSelected]} onPress={() => setSelectedBodyPart(o.id)}>
                      <MaterialIcons name={o.icon} size={24} color={selectedBodyPart === o.id ? '#fff' : '#666'} />
                      <Text style={[styles.optionText, selectedBodyPart === o.id && styles.optionTextSelected]}>{o.name}</Text>
                    </TouchableOpacity>))}
                  </View>
                </ScrollView>
              </View>
            </View>) : (/* EMPTY STATE */ <View style={styles.uploadContainer}>
              <MaterialCommunityIcons name="image-search" size={64} color={COLOR_PRIMARY} />
              <Text style={styles.uploadTitle}>Görüntünüzü Yükleyin</Text>
              <Text style={styles.uploadSubtitle}>MR, Röntgen, BT veya Ultrason görüntüsü</Text>
              <View style={styles.uploadButtons}>
                <TouchableOpacity style={[styles.uploadButton, { backgroundColor: COLOR_PRIMARY }]} onPress={handleTakePhoto}>
                  <MaterialIcons name="camera-alt" size={24} color="#fff" />
                  <Text style={styles.uploadButtonText}>Fotoğraf Çek</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.uploadButton, { backgroundColor: COLOR_SECONDARY }]} onPress={handleUploadFromGallery}>
                  <MaterialIcons name="photo-library" size={24} color="#fff" />
                  <Text style={styles.uploadButtonText}>Galeriden Seç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.uploadButton, { backgroundColor: COLOR_ACCENT }]} onPress={handlePickDocument}>
                  <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
                  <Text style={styles.uploadButtonText}>PDF/DICOM</Text>
                </TouchableOpacity>
              </View>
            </View>)}

            {/* Caption & Send */}
            {selectedFile && (<>
              <View style={styles.captionContainer}>
                <TextInput style={styles.captionInput} placeholder="Ek bilgi (şikayet, önceki tanılar vb.)" placeholderTextColor="#999" value={caption} onChangeText={setCaption} multiline maxLength={500} />
                <Text style={styles.charCount}>{caption.length}/500</Text>
              </View>
              <TouchableOpacity style={[styles.sendButton, (!selectedModality || !selectedBodyPart) && styles.sendButtonIncomplete, loading && styles.sendButtonDisabled]} disabled={loading || !selectedModality || !selectedBodyPart} onPress={handleSend}>
                {loading ? <ActivityIndicator color="#fff" /> : (<><MaterialIcons name="search" size={24} color="#fff" /><Text style={styles.sendButtonText}>Analiz Et</Text></>)}
              </TouchableOpacity>
            </>)}
          </Animated.View>

          {/* History */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Geçmiş Analizler</Text>
            {history.length === 0 ? (<View style={styles.emptyHistory}>
              <MaterialCommunityIcons name="image-off" size={48} color="#666" />
              <Text style={styles.emptyHistoryText}>Henüz görüntü analizi yapmadınız</Text>
            </View>) : (<FlatList data={history} renderItem={renderHistoryItem} keyExtractor={i => i.id} scrollEnabled={false} inverted />)}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Info Modal */}
      <InfoModal />
    </SafeAreaView>
  );
}

/* --------------------------------------------------
   STYLES – temaya uyumlu hale getirildi
---------------------------------------------------*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, elevation: 4 },
  backButton: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '600', flex: 1, textAlign: 'center' },
  infoButton: { padding: 4 },
  content: { flex: 1 },
  uploadSection: { padding: 16 },
  uploadContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', elevation: 2 },
  uploadTitle: { color: '#333', fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  uploadSubtitle: { color: '#666', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  uploadButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 8, elevation: 2 },
  uploadButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  selectedFileContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2 },
  previewImage: { width: width - 64, height: 250, borderRadius: 12, marginBottom: 16 },
  removeButton: { position: 'absolute', top: 24, right: 24, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 8 },
  metadataSection: { marginTop: 8 },
  metadataTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12, marginTop: 16 },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optionButton: { backgroundColor: '#f5f5f5', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionButtonSelected: { backgroundColor: COLOR_PRIMARY },
  optionText: { color: '#666', fontSize: 14, fontWeight: '500' },
  optionTextSelected: { color: '#fff' },
  captionContainer: { marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2 },
  captionInput: { color: '#333', fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  charCount: { color: '#999', fontSize: 12, textAlign: 'right', marginTop: 4 },
  sendButton: { backgroundColor: COLOR_PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 16, gap: 8, elevation: 3 },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonIncomplete: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  historySection: { backgroundColor: '#f5f5f5', padding: 16 },
  historyTitle: { color: '#333', fontSize: 20, marginBottom: 16, fontWeight: '600' },
  emptyHistory: { alignItems: 'center', paddingVertical: 48 },
  emptyHistoryText: { color: '#666', fontSize: 16, marginTop: 12 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: COLOR_PRIMARY, padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%' },
  userMessageText: { color: '#fff', fontSize: 14 },
  thumbnailImage: { width: 110, height: 110, borderRadius: 8, marginBottom: 8 },
  assistantMessage: { alignSelf: 'flex-start', marginBottom: 12, maxWidth: '90%' },
  analysisGradient: { borderRadius: 16, padding: 16 },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  analysisHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  analysisTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  urgencyBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  urgencyText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  analysisSummary: { color: '#fff', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  section: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  findingCard: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8, marginBottom: 8 },
  findingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  findingLocation: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 4, flex: 1 },
  findingDescription: { color: '#fff', fontSize: 14, lineHeight: 20 },
  impressionText: { color: '#fff', fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  recommendationText: { color: '#fff', fontSize: 14, lineHeight: 20, flex: 1 },
  reference: { color: '#fff', fontSize: 12, marginBottom: 4, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  infoModalContent: { backgroundColor: '#fff', marginHorizontal: 32, borderRadius: 20, padding: 24, maxWidth: 400 },
  infoModalTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 16, textAlign: 'center' },
  infoModalText: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 24 },
  infoModalButton: { backgroundColor: COLOR_PRIMARY, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  infoModalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
