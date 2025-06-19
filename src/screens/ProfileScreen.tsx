// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageResizer from 'react-native-image-resizer';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const SERVER_URL = 'https://www.prokoc2.com/api2.php';

// The questions we want to ask
const QUESTIONS: string[] = [
  "Günde kaç saat uyuyorsunuz?",
  "Günde ne kadar su içiyorsunuz?",
  "Haftada kaç saat egzersiz yapıyorsunuz?",
  "Günde kaç porsiyon sebze/meyve tüketiyorsunuz?",
  "Sigara içiyor musunuz?",
  "Alkol tüketiminiz nedir?",
  "Stres seviyenizi nasıl değerlendirirsiniz?",
  "Kan basıncınız normal mi?",
  "Kolesterol seviyeniz normal mi?",
  "Düzenli sağlık kontrollerine gidiyor musunuz?",
  "Kilonuz sağlıklı aralıkta mı?",
  "Günlük yeme alışkanlığınız düzenli mi?",
  "Haftada kaç kez fast-food tüketirsiniz?",
  "Rafine şeker tüketiminiz ne düzeyde?",
  "Düzenli olarak vitamin alıyor musunuz?",
  "Alerjileriniz veya kronik hastalıklarınız var mı?",
  "Çoğunlukla enerjik hissediyor musunuz?",
  "Günde kaç saat masa başında çalışıyorsunuz?",
  "Ruh sağlığınızla ilgili sorunlar yaşıyor musunuz?",
  "Cilt bakım rutini uyguluyor musunuz?",
];

type ProfileScreenProps = StackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ route, navigation }: ProfileScreenProps) {
  const { userId } = route.params;

  // For profile photo URL
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  // For question answers
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''));
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${SERVER_URL}?action=getProfile&user_id=${userId}`);
        if (res.data && res.data.success && res.data.profile) {
          const { profile_photo, answers: storedAnswers } = res.data.profile;
          setProfilePhoto(profile_photo || '');
          if (storedAnswers && Array.isArray(storedAnswers)) {
            setAnswers(storedAnswers);
          }
        }
      } catch (err) {
        console.log("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  // Save the profile to server
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const payload = {
        user_id: userId,
        profile_photo: profilePhoto,
        answers,
      };
      const res = await axios.post(`${SERVER_URL}?action=saveProfile`, payload);
      if (res.data?.success) {
        Alert.alert("Başarılı", "Profiliniz kaydedildi!");
      } else {
        Alert.alert("Hata", res.data?.error || "Bilinmeyen hata.");
      }
    } catch (error) {
      Alert.alert("Hata", "Profil kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: false,
    });
  
    if (result.didCancel) {
      console.log("Kullanıcı fotoğraf seçmeyi iptal etti.");
      return;
    }
  
    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.uri) {
        console.log("Selected asset details:", asset);
        
        try {
          // Resize the image to a maximum width or height of 800px and set quality to 70%
          const resizedImage = await ImageResizer.createResizedImage(
            asset.uri,
            800, // max width
            800, // max height
            'JPEG',
            70,  // quality percentage
            0    // rotation (0 means no rotation)
          );
  
          console.log("Resized image details:", resizedImage);
  
          const formData = new FormData();
          formData.append('photo', {
            uri: resizedImage.uri,
            name: asset.fileName || `photo_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          });
          formData.append('user_id', String(userId)); // Ensure user_id is a string
  
          try {
            setLoading(true);
            const res = await axios.post(`${SERVER_URL}?action=uploadProfilePhoto`, formData);
            console.log("Upload response:", res.data);
            if (res.data.success) {
              setProfilePhoto(res.data.url);
              Alert.alert("Başarılı", "Fotoğraf başarıyla yüklendi.");
            } else {
              Alert.alert(
                "Hata",
                `Fotoğraf yükleme başarısız.\nServer Error: ${res.data.error || "No error message."}\nDebug: ${JSON.stringify(res.data.debug)}`
              );
            }
          } catch (error: any) {
            console.error("Error uploading photo:", error);
            if (error.response) {
              Alert.alert(
                "Hata",
                `Fotoğraf yüklenirken hata oluştu.\nStatus: ${error.response.status}\nData: ${JSON.stringify(error.response.data)}`
              );
            } else {
              Alert.alert("Hata", `Fotoğraf yüklenirken hata oluştu: ${error.message}`);
            }
          } finally {
            setLoading(false);
          }
        } catch (resizeError) {
          console.error("Image resizing error:", resizeError);
          Alert.alert("Hata", "Fotoğraf küçültme işlemi başarısız.");
        }
      } else {
        Alert.alert("Hata", "Fotoğraf URI bulunamadı.");
      }
    } else {
      Alert.alert("Hata", "Fotoğraf seçilemedi.");
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      Alert.alert('Çıkış yapıldı.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'First' }],
      });
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılamadı.');
    }
  };
  // Mevcut handleLogout fonksiyonun hemen altına ekle:
  const handleDeleteAccount = async () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await axios.post(
                `${SERVER_URL}?action=deleteAccount`,
                { user_id: userId }
              );
              if (res.data.success) {
                await AsyncStorage.removeItem('userData');
                Alert.alert('Başarılı', 'Hesabınız silindi.');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'First' }],
                });
              } else {
                Alert.alert('Hata', res.data.error || 'Silme işlemi başarısız.');
              }
            } catch (err: any) {
              Alert.alert('Hata', `Sunucu hatası: ${err.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  // Renders each question with a TextInput
  const renderQuestion = (q: string, index: number) => {
    return (
      <View key={index} style={styles.questionContainer}>
        <Text style={styles.question}>{q}</Text>
        <TextInput
          style={styles.answerInput}
          placeholder="Cevabınız..."
          placeholderTextColor="#888"
          value={answers[index]}
          onChangeText={(text) => {
            const newAnswers = [...answers];
            newAnswers[index] = text;
            setAnswers(newAnswers);
          }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilim</Text>
        {/* Placeholder view for alignment */}
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.profilePhotoContainer}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <Image
              source={{ uri: 'https://via.placeholder.com/200/000/fff?text=Photo' }}
              style={styles.profilePhoto}
            />
          )}
          <TouchableOpacity onPress={handleChangePhoto} style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Fotoğrafı Değiştir</Text>
          </TouchableOpacity>
          {/* Logout button below the photo change button */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <MaterialIcons name="delete-forever" size={20} color="#FF3B30" />
          <Text style={styles.deleteAccountText}>Hesabı Sil</Text>
        </TouchableOpacity>
        </View>

        <View style={styles.questionsList}>
          {QUESTIONS.map((q, i) => renderQuestion(q, i))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-between',
  },  
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
    marginHorizontal: 20,
  },
  deleteAccountText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  backButton: {
    fontSize: 24,
    color: '#fff',
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
    backgroundColor: '#222',
  },
  changePhotoButton: {
    marginTop: 10,
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: '#C00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  questionsList: {
    marginBottom: 20,
  },
  questionContainer: {
    marginBottom: 15,
  },
  question: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  answerInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 8,
    borderRadius: 6,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});