import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
  Linking,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../context/LanguageContext';
import LinearGradient from 'react-native-linear-gradient';
const BG_COLOR = '#09408B';     

type RootStackParamList = {
  NobetciEczaneler: undefined;
};

type NobetciProps = StackScreenProps<RootStackParamList, 'NobetciEczaneler'>;

interface Eczane {
  name: string;
  address: string;
  phone: string;
  distance?: number;
  lat?: number;
  lng?: number;
}

export default function NobetciEczanelerScreen({ navigation }: NobetciProps) {
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [eczaneler, setEczaneler] = useState<Eczane[]>([]);
  const [selectedEczane, setSelectedEczane] = useState<Eczane | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const SERVER_URL = 'https://www.prokoc2.com/api2.php';

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    Geolocation.getCurrentPosition(
      position => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(coords);
        setRegion({
          ...coords,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        fetchEczaneler();
      },
      error => {
        console.log('Location error:', error);
        // Konum alınamasa bile eczaneleri göster
        fetchEczaneler();
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchEczaneler = async () => {
    try {
      // İstanbul için sabit parametre
      const url = `${SERVER_URL}?action=nobetciEczaneler&city=Istanbul`;
      console.log('Fetching URL:', url);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      console.log('Response:', response.data);

      if (response.data.success && response.data.data) {
        let pharmacyData = response.data.data;
        
        // Mesafe hesaplama (eğer konum varsa)
        if (userLocation) {
          pharmacyData = pharmacyData.map((eczane: Eczane) => ({
            ...eczane,
            distance: userLocation && eczane.lat && eczane.lng
              ? calculateDistance(userLocation.latitude, userLocation.longitude, eczane.lat, eczane.lng)
              : undefined
          }));
          
          // Mesafeye göre sırala
          pharmacyData.sort((a: Eczane, b: Eczane) => (a.distance || 999) - (b.distance || 999));
        }
        
        setEczaneler(pharmacyData);
      } else {
        Alert.alert(t('common.error'), response.data.error || t('pharmacy.error'));
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      Alert.alert(t('common.error'), t('pharmacy.connectionError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEczaneler();
  }, []);

  const handleCallPharmacy = (phone: string) => {
    const phoneNumber = phone.replace(/\s/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleGetDirections = (eczane: Eczane) => {
    if (!eczane.lat || !eczane.lng) {
      // Sadece adres ile yönlendirme
      const encodedAddress = encodeURIComponent(eczane.address);
      const url = Platform.select({
        ios: `maps://maps.apple.com/?q=${encodedAddress}`,
        android: `geo:0,0?q=${encodedAddress}`,
      });
      if (url) Linking.openURL(url);
    } else {
      // Koordinatlarla yönlendirme
      const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
      const url = Platform.OS === 'ios'
        ? `${scheme}${eczane.lat},${eczane.lng}?q=${eczane.lat},${eczane.lng}`
        : `${scheme}${eczane.lat},${eczane.lng}?q=${eczane.lat},${eczane.lng}`;
      Linking.openURL(url);
    }
  };

  const renderEczaneItem = ({ item }: { item: Eczane }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => {
        setSelectedEczane(item);
        if (item.lat && item.lng && viewMode === 'list') {
          setRegion({
            latitude: item.lat,
            longitude: item.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setViewMode('map');
        }
      }}
    >
      <View style={styles.listItemContent}>
        <View style={styles.listItemHeader}>
          <MaterialCommunityIcons name="pharmacy" size={24} color="#46B168" />
          <Text style={styles.listItemName}>{item.name}</Text>
        </View>
        <Text style={styles.listItemAddress}>{item.address}</Text>
        {item.distance && (
          <Text style={styles.listItemDistance}>
            <MaterialIcons name="location-on" size={14} color="#666" />
            {' '}{item.distance.toFixed(1)} km uzaklıkta
          </Text>
        )}
        <View style={styles.listItemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCallPharmacy(item.phone)}
          >
            <MaterialIcons name="phone" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('pharmacy.call')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={() => handleGetDirections(item)}
          >
            <MaterialIcons name="directions" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('pharmacy.directions')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
<View style={[styles.container, { backgroundColor: BG_COLOR }]}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>{t('pharmacy.loading')}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
<View style={[styles.container, { backgroundColor: BG_COLOR }]}>
        <SafeAreaView style={styles.container}>
        {/* Header - ProfileScreen tarzı */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('pharmacy.title')}</Text>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            style={styles.viewToggle}
          >
            <MaterialIcons 
              name={viewMode === 'map' ? 'list' : 'map'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {viewMode === 'map' ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region || undefined}
              onRegionChangeComplete={setRegion}
              showsUserLocation
              showsMyLocationButton
            >
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Konumum"
                >
                  <View style={styles.userMarker}>
                    <View style={styles.userMarkerDot} />
                  </View>
                </Marker>
              )}
              {eczaneler.map((eczane, index) => {
                if (eczane.lat && eczane.lng) {
                  return (
                    <Marker
                      key={index}
                      coordinate={{ latitude: eczane.lat, longitude: eczane.lng }}
                      onPress={() => setSelectedEczane(eczane)}
                    >
                      <View style={styles.pharmacyMarker}>
                        <MaterialCommunityIcons name="pharmacy" size={24} color="#fff" />
                      </View>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapView>
            
            {selectedEczane && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedName}>{selectedEczane.name}</Text>
                <Text style={styles.selectedAddress}>{selectedEczane.address}</Text>
                <View style={styles.selectedActions}>
                  <TouchableOpacity
                    style={styles.selectedButton}
                    onPress={() => handleCallPharmacy(selectedEczane.phone)}
                  >
                    <MaterialIcons name="phone" size={20} color="#46B168" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.selectedButton}
                    onPress={() => handleGetDirections(selectedEczane)}
                  >
                    <MaterialIcons name="directions" size={20} color="#2196F3" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={eczaneler}
            renderItem={renderEczaneItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#fff"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="pharmacy" size={64} color="#fff" />
                <Text style={styles.emptyText}>{t('pharmacy.noPharmacy')}</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  viewToggle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: { 
    flex: 1,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(70, 177, 104, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#46B168',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pharmacyMarker: {
    backgroundColor: '#46B168',
    borderRadius: 20,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  selectedInfo: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  selectedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  selectedButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  listItem: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listItemContent: {
    padding: 16,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  listItemAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  listItemDistance: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#46B168',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  directionsButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
});