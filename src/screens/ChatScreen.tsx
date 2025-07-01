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
  StatusBar,
} from 'react-native';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import { assistantS, getAssistantName, getAssistantApiName } from '../data/assistantData';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import SpeechService from '../services/SpeechService';
import NotificationService from '../services/NotificationService';
import ImageCropPicker from 'react-native-image-crop-picker';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
  ImageLibraryOptions,
  MediaType,
} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';

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
  type?: 'text' | 'image' | 'voice';
  imageUrl?: string;
  voiceUrl?: string;
  specialistRecommendation?: string[];
}

interface MessageAnalysis {
  summary?: string;
  symptoms?: string[];
  recommendations?: string[];
  warnings?: string[];
  references?: Reference[];
  urgencyLevel?: 'low' | 'medium' | 'high';
  suggestedSpecialists?: string[];
}

interface Reference {
  index: number;
  source: string;
  url?: string;
}
// dosyanın üstünde bir yerde:
const AuroraBackground = () => (
  <>
    <LinearGradient
      colors={['rgba(107,117,214,0.55)', 'rgba(107,117,214,0)']}
      style={[styles.auroraBlob, { top: -90, left: -120, width: 260, height: 260, transform:[{rotate:'25deg'}] }]}
      start={{x:0.2, y:0}}
      end={{x:1, y:1}}
    />
    <LinearGradient
      colors={['rgba(70,177,104,0.50)', 'rgba(70,177,104,0)']}
      style={[styles.auroraBlob, { top: -40, right: -130, width: 220, height: 220, transform:[{rotate:'-20deg'}] }]}
      start={{x:1, y:0}}
      end={{x:0, y:1}}
    />
    <LinearGradient
      colors={['rgba(200,255,0,0.45)', 'rgba(200,255,0,0)']}
      style={[styles.auroraBlob, { bottom: -70, left: '30%', width: 280, height: 280, transform:[{rotate:'15deg'}] }]}
      start={{x:0, y:1}}
      end={{x:1, y:0}}
    />
  </>
);
export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { userId, assistantName } = route.params;
  const { t, language } = useLanguage();
  const { 
    isPremium, 
    canSendMessage, 
    canSendImage, 
    incrementMessageCount,
    dailyMessageCount,
    dailyMessageLimit 
  } = useSubscription();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showReferences, setShowReferences] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState<Reference[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const isHealthAssistant = assistantName === 'Family Assistant' || 
                           assistantName === 'Aile Asistanı' ||
                           !assistantName;

  const getAssistantInfo = (name: string) => {
    const assistant = assistantS.find(a => 
      getAssistantApiName(a.nameKey) === name
    );
    if (assistant) {
      return {
        icon: assistant.icon,
        color: assistant.color,
        library: assistant.library,
        nameKey: assistant.nameKey,
      };
    }
    return {
      icon: 'account-question',
      color: '#FF6F61',
      library: 'MaterialCommunityIcons' as const,
      nameKey: 'assistants.family',
    };
  };
  
  const { icon, color, library, nameKey } = getAssistantInfo(assistantName || 'Family Assistant');
  const displayName = getAssistantName(nameKey, t);

  useEffect(() => {
    fetchMessages();
    animateIn();
    
    // Set language for speech service
    SpeechService.setLanguage(language);
    
    // Show welcome message if it's health assistant and no messages
    if (isHealthAssistant && messages.length === 0) {
      showWelcomeMessage();
    }
    
    return () => {
      SpeechService.destroy();
    };
  }, []);

  useEffect(() => {
    // Schedule notifications based on chat history
    if (messages.length > 0) {
      NotificationService.schedulePersonalizedNotifications(userId, messages);
    }
  }, [messages]);

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

  const showWelcomeMessage = () => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      sender: 'assistant',
      text: t('chat.welcomeMessage'),
      createdAt: formatTime(new Date().toISOString()),
    };
    setMessages([welcomeMsg]);
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
            } else if (parsed.type === 'voice') {
              msg.type = 'voice';
              msg.voiceUrl = parsed.url;
              msg.text = parsed.transcript;
            } else if (parsed.analysis) {
              msg.analysis = parsed.analysis;
              msg.text = parsed.text || it.message;
              msg.specialistRecommendation = parsed.specialistRecommendation;
            }
          } catch (e) {}

          return msg;
        });
        setMessages(transformed);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    } catch (e) {
      console.log('Error fetching messages:', e);
    }
  };

  const formatTime = (dt: string) => {
    if (!dt) return '';
    const date = new Date(dt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleSend = async () => {
    // Check subscription limits
    if (!canSendMessage) {
      setShowUpgradeModal(true);
      return;
    }

    if (!userId) {
      Alert.alert(t('common.error'), 'User ID not found.');
      return;
    }
    
    if (selectedImage) {
      if (!canSendImage) {
        Alert.alert(t('common.warning'), t('chat.imageNotAllowed'));
        setShowUpgradeModal(true);
        return;
      }
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
    setShowQuickActions(false);
    
    // Increment message count for free users
    if (!isPremium) {
      await incrementMessageCount();
    }
    
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    try {
      const { data } = await axios.post(`${SERVER_URL}?action=sendMessage`, {
        user_id: userId,
        specialty: assistantName || 'Family Assistant',
        user_message: userMessage,
        language,
        is_health_assistant: isHealthAssistant,
      });

      if (data.success) {
        // Parse the response for structured data
        let analysis: MessageAnalysis | undefined;
        let responseText = data.assistant_reply;
        let specialistRecommendation: string[] | undefined;
        
        try {
          const parsed = JSON.parse(data.assistant_reply);
          if (parsed.analysis) {
            analysis = parsed.analysis;
            responseText = parsed.text || data.assistant_reply;
            specialistRecommendation = parsed.specialistRecommendation;
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
                  specialistRecommendation,
                }
              : m,
          ),
        );
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      Alert.alert(t('common.error'), e.message || 'Failed to send message.');
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

  const handleVoiceMessage = async () => {
    if (!canSendMessage) {
      setShowUpgradeModal(true);
      return;
    }

    const available = await SpeechService.isAvailable();
    if (!available) {
Alert.alert(t('common.error'), t('chat.voiceNotAvailable'));
      return;
    }

    if (isListening) {
      await SpeechService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      await SpeechService.startListening(
        (text) => {
          setUserMessage(text);
          setIsListening(false);
          // Auto send after voice input
          setTimeout(() => handleSend(), 500);
        },
        (error) => {
          Alert.alert(t('common.error'), error);
          setIsListening(false);
        },
        (partialText) => {
          setUserMessage(partialText);
        }
      );
    }
  };

  const sendImageMessage = async () => {
    if (!selectedImage) return;

    const now = new Date();
    const caption = userMessage.trim() || '[Image]';

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

    // Increment message count
    if (!isPremium) {
      await incrementMessageCount();
    }

    try {
      const data = {
        user_id: userId,
        specialty: assistantName || 'Family Assistant',
        user_image: selectedImage.base64,
        fileName: selectedImage.fileName || 'image.jpg',
        caption,
        language,
      };
      const { data: res } = await axios.post(`${SERVER_URL}?action=sendImage`, data);

      if (res.success) {
        let analysis: MessageAnalysis | undefined;
        let responseText = res.assistant_reply;
        let specialistRecommendation: string[] | undefined;
        
        try {
          const parsed = JSON.parse(res.assistant_reply);
          if (parsed.analysis) {
            analysis = parsed.analysis;
            responseText = parsed.text || res.assistant_reply;
            specialistRecommendation = parsed.specialistRecommendation;
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
                  specialistRecommendation,
                }
              : m,
          ),
        );
      } else {
        throw new Error(res.error || 'Server error');
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      Alert.alert(t('common.error'), e.message || 'Failed to send image.');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePickFromGallery = () => {
    if (!canSendImage) {
      setShowUpgradeModal(true);
      return;
    }

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
    if (!canSendImage) {
      setShowUpgradeModal(true);
      return;
    }

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
        base64: (image as any).data,
      } as any);
    } catch (e: any) {
      if (e.code !== 'E_PICKER_CANCELLED') {
Alert.alert(t('common.error'), t('chat.uploadError'));
      }
    }
  };

  const handleSpecialistRecommendation = (specialistNameKey: string) => {
    const apiName = getAssistantApiName(specialistNameKey);
    navigation.replace('Chat', { userId, assistantName: apiName });
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
              <Text style={styles.loadingText}>{t('chat.analyzing')}</Text>
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
              
              {item.type === 'voice' && (
                <View style={styles.voiceIndicator}>
                  <MaterialIcons name="mic" size={16} color={isUser ? '#fff' : color} />
                  <Text style={[styles.voiceText, { color: isUser ? '#fff' : '#666' }]}>
                    {t('chat.voiceMessage')}
                  </Text>
                </View>
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
                        {item.analysis.urgencyLevel === 'high' ? '⚠️ ' + t('image.urgency.critical') :
                         item.analysis.urgencyLevel === 'medium' ? '⚡ ' + t('image.urgency.urgent') : 
                         '✓ ' + t('image.urgency.routine')}
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
                        {t('lab.references')} ({item.analysis.references.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

{item.specialistRecommendation && item.specialistRecommendation.length > 0 && (
  <View style={styles.specialistContainer}>
    <Text style={styles.specialistTitle}>{t('chat.goToSpecialist')}</Text>
    <View style={styles.specialistButtons}>
      {item.specialistRecommendation.map((specialistKey, idx) => {
        const specialist = assistantS.find(a => a.nameKey === specialistKey);
        if (!specialist) return null;
        
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.specialistButton, { backgroundColor: specialist.color }]}
            onPress={() => handleSpecialistRecommendation(specialistKey)}
          >
            {specialist.library === 'MaterialIcons' ? (
              <MaterialIcons name={specialist.icon} size={20} color="#fff" />
            ) : (
              <MaterialCommunityIcons name={specialist.icon} size={20} color="#fff" />
            )}
            <Text style={styles.specialistButtonText}>
              {getAssistantName(specialist.nameKey, t)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
    {/* HEADER */}
    <View style={styles.headerWrapper}>
      {/* aurora efekt katmanı */}
      <AuroraBackground />

      {/* gerçek içerik */}
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerText}>{displayName}</Text>
          <Text style={styles.headerSubtext}>
            {t('chat.online')} • {t('chat.responding')}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
        <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >

      {/* ────────────── Mesaj Listesi ────────────── */}
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
              {displayName} {t('chat.startChat')}
            </Text>
            <Text style={styles.emptySubtitle}>{t('chat.askQuestions')}</Text>
          </View>
        }
      />

      {/* ───────────── Hızlı Aksiyonlar ───────────── */}
      {showQuickActions && isHealthAssistant && messages.length <= 1 && (
        <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
          <QuickActionButton
            icon="lightbulb-outline"
            text={t('chat.symptoms')}
            onPress={() => setUserMessage(t('chat.symptoms') + ' ')}
          />
          <QuickActionButton
            icon="history"
            text={t('chat.labResult')}
            onPress={() => setUserMessage(t('chat.labResult'))}
          />
          <QuickActionButton
            icon="help-outline"
            text={t('chat.generalQuestion')}
            onPress={() => setUserMessage(t('chat.generalQuestion') + ' ')}
          />
        </Animated.View>
      )}

      {/* ─────────── Seçili Görsel Önizleme ─────────── */}
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

      {/* ─────────── Mesaj Limiti Uyarısı ─────────── */}
      {!isPremium && dailyMessageCount >= dailyMessageLimit - 1 && (
        <View style={styles.limitWarning}>
          <Text style={styles.limitWarningText}>
            {t('chat.messageLimitReached').replace(
              '{count}',
              `${dailyMessageLimit - dailyMessageCount}`,
            )}
          </Text>
        </View>
      )}

      {/* ────────────────── Giriş Alanı ────────────────── */}
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

          <TouchableOpacity
            onPress={handleVoiceMessage}
            disabled={loading}
            style={[
              styles.inputButton,
              isListening && styles.inputButtonActive,
            ]}
          >
            <MaterialIcons
              name={isListening ? 'mic' : 'mic-none'}
              size={24}
              color={isListening ? '#FF0000' : '#666'}
            />
            {isListening && <Animated.View style={styles.listeningIndicator} />}
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor="#999"
            value={userMessage}
            onChangeText={setUserMessage}
            editable={!loading && !isListening}
            multiline
            maxLength={1000}
            onFocus={() => setShowQuickActions(false)}
            onBlur={() => messages.length === 0 && setShowQuickActions(true)}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              !userMessage.trim() && !selectedImage && styles.sendButtonDisabled,
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

        <Text style={styles.disclaimer}>{t('chat.disclaimer')}</Text>
      </View>
    </KeyboardAvoidingView>

    {/* ─────────────── Kaynak/Referans Modal ─────────────── */}
    <Modal
      visible={showReferences}
      transparent
      animationType="slide"
      onRequestClose={() => setShowReferences(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('lab.references')}</Text>
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

    {/* ─────────────── Premium Yükseltme Modal ─────────────── */}
    <Modal
      visible={showUpgradeModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUpgradeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.upgradeModalContent}>
          <MaterialIcons name="workspace-premium" size={64} color="#FFD700" />
          <Text style={styles.upgradeTitle}>
            {!canSendMessage
              ? t('chat.messageLimitReached')
              : t('chat.imageNotAllowed')}
          </Text>
          <Text style={styles.upgradeSubtitle}>{t('subscription.subtitle')}</Text>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              setShowUpgradeModal(false);
              navigation.navigate('Subscription', { userId, userName: '' });
            }}
          >
            <Text style={styles.upgradeButtonText}>{t('chat.upgradeNow')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterButton}
            onPress={() => setShowUpgradeModal(false)}
          >
            <Text style={styles.laterButtonText}>{t('subscription.notNow')}</Text>
          </TouchableOpacity>
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

  },
    headerGradient: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerButton: {
    padding: 4,
  },
  headerWrapper: {
  backgroundColor: '#000',      // geçişler altta transparan bitsin diye koyu tut
  paddingBottom: 12,
},
headerContent: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
},
auroraBlob: {
  position: 'absolute',
  borderRadius: 9999,
  opacity: 0.8,
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
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceText: {
    marginLeft: 4,
    fontSize: 12,
    fontStyle: 'italic',
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
specialistContainer: {
  marginTop: 12,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: 'rgba(0,0,0,0.1)',
},
specialistTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
  marginBottom: 8,
},
specialistButtons: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
specialistButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  gap: 6,
},
specialistButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '500',
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
  limitWarning: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  limitWarningText: {
    color: '#E65100',
    fontSize: 12,
    textAlign: 'center',
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
  upgradeModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 12,
  },
  laterButtonText: {
    color: '#666',
    fontSize: 14,
  },
  inputButtonActive: {
  backgroundColor: 'rgba(255, 0, 0, 0.1)',
  borderRadius: 20,
},
listeningIndicator: {
  position: 'absolute',
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#FF0000',
  top: 4,
  right: 4,
},
});