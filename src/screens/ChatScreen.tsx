import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Linking,
} from 'react-native';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import { assistantS } from '../data/assistantData';
import ImageCropPicker from 'react-native-image-crop-picker';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
  ImageLibraryOptions,
  MediaType,
} from 'react-native-image-picker';

const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width, height } = Dimensions.get('window');

type ChatScreenProps = StackScreenProps<RootStackParamList, 'Chat'>;

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt?: string;
  isLoading?: boolean;
  analysis?: MessageAnalysis;
  type?: 'text' | 'image';
  imageUrl?: string;
}

interface MessageAnalysis {
  summary?: string;
  symptoms?: string[];
  recommendations?: string[];
  warnings?: string[];
  references?: Reference[];
  urgencyLevel?: 'low' | 'medium' | 'high';
}

interface Reference {
  index: number;
  source: string;
  url?: string;
}

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { userId, assistantName } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState<Reference[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const getAssistantInfo = (name: string) => {
    const doc = assistantS.find(
      (d) => d.name.toLowerCase() === name.toLowerCase(),
    );
    if (doc) return doc;
    return {
      icon: 'account-question',
      color: '#FF6F61',
      library: 'MaterialCommunityIcons' as const,
    };
  };
  
  const { icon, color, library } = getAssistantInfo(assistantName || 'Asistan');

  useEffect(() => {
    fetchMessages();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
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

  const fetchMessages = async () => {
    if (!userId || !assistantName) return;
    try {
      const url = `${SERVER_URL}?action=getHistoryBySpecialty&user_id=${userId}&specialty=${assistantName}`;
      const { data } = await axios.get(url);
      if (data.success) {
        const transformed: ChatMessage[] = data.history.map((it: any) => {
          const msg: ChatMessage = {
            id: String(it.id),
            sender: it.role === 'assistant' ? 'assistant' : 'user',
            text: it.message,
            createdAt: formatTime(it.created_at),
          };

          // Parse analysis data if present
          try {
            const parsed = JSON.parse(it.message);
            if (parsed.type === 'image') {
              msg.type = 'image';
              msg.imageUrl = parsed.url;
              msg.text = parsed.caption;
            } else if (parsed.analysis) {
              msg.analysis = parsed.analysis;
              msg.text = parsed.text || it.message;
            }
          } catch (e) {}

          return msg;
        });
        setMessages(transformed);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    } catch (e) {
      console.log('Mesaj geçmişi alınamadı:', e);
    }
  };

  const formatTime = (dt: string) => {
    if (!dt) return '';
    const date = new Date(dt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (!userId) {
      Alert.alert('Hata', 'Kullanıcı ID bulunamadı.');
      return;
    }
    
    if (selectedImage) {
      await sendImageMessage();
      return;
    }
    
    if (!userMessage.trim()) {
      return;
    }

    const now = new Date();
    const userMsgObj: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMessage,
      createdAt: formatTime(now.toISOString()),
    };

    const placeholderId = `${Date.now()}-loading`;
    const loadingBubble: ChatMessage = {
      id: placeholderId,
      sender: 'assistant',
      text: '',
      isLoading: true,
      createdAt: '',
    };
    
    setMessages((prev) => [...prev, userMsgObj, loadingBubble]);
    setUserMessage('');
    setLoading(true);
    
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    try {
      const { data } = await axios.post(`${SERVER_URL}?action=sendMessage`, {
        user_id: userId,
        specialty: assistantName || 'Genel',
        user_message: userMessage,
      });

      if (data.success) {
        // Parse the response for structured data
        let analysis: MessageAnalysis | undefined;
        let responseText = data.assistant_reply;
        
        try {
          const parsed = JSON.parse(data.assistant_reply);
          if (parsed.analysis) {
            analysis = parsed.analysis;
            responseText = parsed.text || data.assistant_reply;
          }
        } catch (e) {
          // Response is plain text, extract references if any
          const references = extractReferences(responseText);
          if (references.length > 0) {
            analysis = { references };
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  text: responseText,
                  isLoading: false,
                  createdAt: formatTime(now.toISOString()),
                  analysis,
                }
              : m,
          ),
        );
      } else {
        throw new Error(data.error || 'Sunucu hatası');
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      Alert.alert('Hata', e.message || 'Mesaj gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const extractReferences = (text: string): Reference[] => {
    const references: Reference[] = [];
    const regex = /\[(\d+)\]\s*([^[]+?)(?=\[|$)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      references.push({
        index: parseInt(match[1]),
        source: match[2].trim(),
      });
    }
    
    return references;
  };

  const sendImageMessage = async () => {
    if (!selectedImage) return;

    const now = new Date();
    const caption = userMessage.trim() || '[Görsel Gönderildi]';

    const userImgMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: caption,
      type: 'image',
      imageUrl: selectedImage.uri,
      createdAt: formatTime(now.toISOString()),
    };

    const placeholderId = `${Date.now()}-loading`;
    const loadingBubble: ChatMessage = {
      id: placeholderId,
      sender: 'assistant',
      text: '',
      isLoading: true,
    };

    setMessages((prev) => [...prev, userImgMsg, loadingBubble]);
    setSelectedImage(null);
    setUserMessage('');
    setLoading(true);

    try {
      const data = {
        user_id: userId,
        specialty: assistantName || 'Genel',
        user_image: selectedImage.base64,
        fileName: selectedImage.fileName || 'image.jpg',
        caption,
      };
      const { data: res } = await axios.post(`${SERVER_URL}?action=sendImage`, data);

      if (res.success) {
        let analysis: MessageAnalysis | undefined;
        let responseText = res.assistant_reply;
        
        try {
          const parsed = JSON.parse(res.assistant_reply);
          if (parsed.analysis) {
            analysis = parsed.analysis;
            responseText = parsed.text || res.assistant_reply;
          }
        } catch (e) {}

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  text: responseText,
                  isLoading: false,
                  createdAt: formatTime(now.toISOString()),
                  analysis,
                }
              : m,
          ),
        );
      } else {
        throw new Error(res.error || 'Sunucu hatası');
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      Alert.alert('Hata', e.message || 'Görsel gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePickFromGallery = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: true,
    };
    launchImageLibrary(options, (response) => {
      if (response.assets?.length) {
        setSelectedImage(response.assets[0]);
      }
    });
  };

  const handleCameraCapture = async () => {
    try {
      const image = await ImageCropPicker.openCamera({
        width: 800,
        height: 800,
        cropping: false,
        includeBase64: true,
      });
      setSelectedImage({
        uri: image.path,
        width: image.width,
        height: image.height,
        mime: image.mime,
        fileName: image.filename || `image_${Date.now()}.jpg`,
        base64: image.data,
      } as any);
    } catch (e: any) {
      if (e.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Kamera Hatası', 'Fotoğraf çekilemedi.');
      }
    }
  };

  const showReferenceModal = (references: Reference[]) => {
    setSelectedReferences(references);
    setShowReferences(true);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.sender === 'user';
    const showAvatar = index === 0 || messages[index - 1]?.sender !== item.sender;

    return (
      <Animated.View
        style={[
          styles.messageWrapper,
          isUser ? styles.userMessageWrapper : styles.assistantMessageWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {!isUser && showAvatar && (
          <View style={[styles.avatar, { backgroundColor: color }]}>
            {library === 'MaterialIcons' ? (
              <MaterialIcons name={icon} size={20} color="#fff" />
            ) : (
              <MaterialCommunityIcons name={icon} size={20} color="#fff" />
            )}
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
          !isUser && showAvatar && styles.messageWithAvatar,
        ]}>
          {item.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={isUser ? '#fff' : color} size="small" />
              <Text style={styles.loadingText}>Analiz ediliyor...</Text>
            </View>
          ) : (
            <>
              {item.type === 'image' && item.imageUrl && (
                <TouchableOpacity>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              
              <Text style={[
                styles.messageText,
                { color: isUser ? '#fff' : '#000' }
              ]}>
                {item.text}
              </Text>

              {item.analysis && (
                <View style={styles.analysisContainer}>
                  {item.analysis.urgencyLevel && (
                    <View style={[
                      styles.urgencyBadge,
                      item.analysis.urgencyLevel === 'high' && styles.urgencyHigh,
                      item.analysis.urgencyLevel === 'medium' && styles.urgencyMedium,
                      item.analysis.urgencyLevel === 'low' && styles.urgencyLow,
                    ]}>
                      <Text style={styles.urgencyText}>
                        {item.analysis.urgencyLevel === 'high' ? '⚠️ Acil' :
                         item.analysis.urgencyLevel === 'medium' ? '⚡ Orta' : '✓ Düşük'}
                      </Text>
                    </View>
                  )}

                  {item.analysis.warnings && item.analysis.warnings.length > 0 && (
                    <View style={styles.warningBox}>
                      <MaterialIcons name="warning" size={16} color="#FF6B6B" />
                      {item.analysis.warnings.map((warning, idx) => (
                        <Text key={idx} style={styles.warningText}>{warning}</Text>
                      ))}
                    </View>
                  )}

                  {item.analysis.references && item.analysis.references.length > 0 && (
                    <TouchableOpacity
                      style={styles.referencesButton}
                      onPress={() => showReferenceModal(item.analysis!.references!)}
                    >
                      <MaterialIcons name="library-books" size={16} color="#666" />
                      <Text style={styles.referencesButtonText}>
                        Kaynakları Göster ({item.analysis.references.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {item.createdAt && (
                <Text style={styles.messageTime}>{item.createdAt}</Text>
              )}
            </>
          )}
        </View>
      </Animated.View>
    );
  };

  const QuickActionButton = ({ icon, text, onPress }: any) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color="#666" />
      <Text style={styles.quickActionText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: color }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerText}>{assistantName || 'Asistan'}</Text>
            <Text style={styles.headerSubtext}>Çevrimiçi • Yanıtlıyor</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: color + '20' }]}>
                {library === 'MaterialIcons' ? (
                  <MaterialIcons name={icon} size={48} color={color} />
                ) : (
                  <MaterialCommunityIcons name={icon} size={48} color={color} />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {assistantName} ile Sohbete Başlayın
              </Text>
              <Text style={styles.emptySubtitle}>
                Sağlık sorularınızı sorun, tahlil sonuçlarınızı paylaşın
              </Text>
            </View>
          }
        />

        {/* Quick Actions */}
        {showQuickActions && (
          <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
            <QuickActionButton
              icon="lightbulb-outline"
              text="Semptomlarım var"
              onPress={() => setUserMessage('Şu semptomlarım var: ')}
            />
            <QuickActionButton
              icon="history"
              text="Tahlil sonucu"
              onPress={() => setUserMessage('Tahlil sonucumu yorumlayabilir misin?')}
            />
            <QuickActionButton
              icon="help-outline"
              text="Genel soru"
              onPress={() => setUserMessage('Merak ettiğim konu: ')}
            />
          </Animated.View>
        )}

        {/* Selected image preview */}
        {selectedImage && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              style={styles.removeImageButton}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              onPress={handleCameraCapture} 
              disabled={loading} 
              style={styles.inputButton}
            >
              <MaterialIcons name="camera-alt" size={24} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleImagePickFromGallery} 
              disabled={loading} 
              style={styles.inputButton}
            >
              <MaterialIcons name="photo" size={24} color="#666" />
            </TouchableOpacity>
            
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Mesajınızı yazın..."
              placeholderTextColor="#999"
              value={userMessage}
              onChangeText={setUserMessage}
              editable={!loading}
              multiline
              maxLength={1000}
              onFocus={() => setShowQuickActions(false)}
              onBlur={() => messages.length === 0 && setShowQuickActions(true)}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!userMessage.trim() && !selectedImage) && styles.sendButtonDisabled
              ]}
              onPress={handleSend}
              disabled={loading || (!userMessage.trim() && !selectedImage)}
            >
              <MaterialIcons 
                name="send" 
                size={24} 
                color={userMessage.trim() || selectedImage ? '#fff' : '#999'} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.disclaimer}>
            Bu bilgiler sadece eğitim amaçlıdır. Kesin tanı için doktora başvurun.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* References Modal */}
      <Modal
        visible={showReferences}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReferences(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kaynaklar</Text>
              <TouchableOpacity onPress={() => setShowReferences(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={selectedReferences}
              keyExtractor={(item) => item.index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.referenceItem}
                  onPress={() => item.url && Linking.openURL(item.url)}
                >
                  <Text style={styles.referenceIndex}>[{item.index}]</Text>
                  <Text style={styles.referenceSource}>{item.source}</Text>
                  {item.url && (
                    <MaterialIcons name="open-in-new" size={16} color="#007BFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  chat: { 
    flex: 1,
    backgroundColor: '#fff',
  },
  chatContent: { 
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageContainer: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageWithAvatar: {
    marginLeft: 0,
  },
  assistantMessage: { 
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 4,
  },
  userMessage: { 
    backgroundColor: '#007BFF',
    borderTopRightRadius: 4,
  },
  messageText: { 
    fontSize: 16, 
    lineHeight: 22,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  analysisContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  urgencyHigh: {
    backgroundColor: '#FFEBEE',
  },
  urgencyMedium: {
    backgroundColor: '#FFF3E0',
  },
  urgencyLow: {
    backgroundColor: '#E8F5E9',
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
  },
  referencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  referencesButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputButton: { 
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    color: '#000',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  sendButton: {
    backgroundColor: '#007BFF',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { 
    backgroundColor: '#e0e0e0',
  },
  disclaimer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  previewContainer: { 
    alignItems: 'center', 
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  previewImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 4,
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
    maxHeight: height * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  referenceIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007BFF',
    marginRight: 8,
  },
  referenceSource: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});