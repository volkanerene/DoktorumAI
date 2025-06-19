import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Alert,
  TouchableOpacity,
  FlatList,
  Linking,
  RefreshControl,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Geocoder from 'react-native-geocoding';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
  workingHours?: string;
}

// Harita için özel tema
const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8ec3b9' }],
  },
  // ... daha fazla stil eklenebilir
];

export default function NobetciEczanelerScreen({ navigation }: NobetciProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [eczaneler, setEczaneler] = useState<Eczane[]>([]);
  const [selectedEczane, setSelectedEczane] = useState<Eczane | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const SERVER_URL = 'https://www.prokoc2.com/api2.php';
  const city = 'Istanbul';

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Konum İzni Gerekli',
        'En yakın eczaneleri gösterebilmek için konum izni vermeniz gerekiyor.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Ayarları Aç', onPress: () => Linking.openSettings() }
        ]
      );
      setLoading(false);
      return;
    }

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
        fetchEczaneler(coords);
      },
      error => {
        Alert.alert('Konum Hatası', 'Konumunuz alınamadı. Lütfen konum servislerinizi kontrol edin.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Konum İzni',
          message: 'Yakındaki nöbetçi eczaneleri gösterebilmek için konumunuza ihtiyacımız var.',
          buttonNeutral: 'Daha Sonra',
          buttonNegative: 'İptal',
          buttonPositive: 'İzin Ver',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchEczaneler = async (coords?: { latitude: number; longitude: number }) => {
    try {
      const url = `${SERVER_URL}?action=nobetciEczaneler&city=${city}`;
      const response = await axios.get(url);

      if (response.data.success) {
        const data: Eczane[] = response.data.data;
        
        // Geocoding ve mesafe hesaplama
        Geocoder.init('AIzaSyD0uByEyQqliZsigyf2k8O95q_tpnP_SaM', { language: 'tr' });
        const geocodedData: Eczane[] = [];
        
        for (const item of data) {
          try {
            const geo = await Geocoder.from(item.address);
            if (geo.results.length > 0) {
              const location = geo.results[0].geometry.location;
              const distance = coords && userLocation
                ? calculateDistance(coords.latitude, coords.longitude, location.lat, location.lng)
                : undefined;
              
              geocodedData.push({
                ...item,
                lat: location.lat,
                lng: location.lng,
                distance,
                workingHours: '09:00 - 09:00', // Nöbetçi eczaneler 24 saat açık
              });
            }
          } catch (err) {
            geocodedData.push(item);
          }
        }
        
        // Mesafeye göre sırala
        const sortedData = geocodedData.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        setEczaneler(sortedData);
      } else {
        Alert.alert('Hata', response.data.error || 'Eczane verisi alınamadı.');
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userLocation) {
      fetchEczaneler(userLocation);
    }
  }, [userLocation]);

  const handleCallPharmacy = (phone: string) => {
    const phoneNumber = phone.replace(/\s/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleGetDirections = (lat: number, lng: number) => {
    const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
    const url = Platform.OS === 'ios'
      ? `${scheme}${lat},${lng}?q=${lat},${lng}`
      : `${scheme}${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const renderEczaneItem = ({ item }: { item: Eczane }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => {
        setSelectedEczane(item);
        if (item.lat && item.lng) {
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
          <MaterialCommunityIcons name="pharmacy" size={24} color="#4CAF50" />
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
            <Text style={styles.actionButtonText}>Ara</Text>
          </TouchableOpacity>
          {item.lat && item.lng && (
            <TouchableOpacity
              style={[styles.actionButton, styles.directionsButton]}
              onPress={() => handleGetDirections(item.lat!, item.lng!)}
            >
              <MaterialIcons name="directions" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Yol Tarifi</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Nöbetçi eczaneler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Nöbetçi Eczaneler</Text>
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
            customMapStyle={mapStyle}
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
                  <MaterialIcons name="phone" size={20} color="#4CAF50" />
                </TouchableOpacity>
                {selectedEczane.lat && selectedEczane.lng && (
                  <TouchableOpacity
                    style={styles.selectedButton}
                    onPress={() => handleGetDirections(selectedEczane.lat!, selectedEczane.lng!)}
                  >
                    <MaterialIcons name="directions" size={20} color="#2196F3" />
                  </TouchableOpacity>
                )}
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
              tintColor="#4CAF50"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="pharmacy" size={64} color="#666" />
              <Text style={styles.emptyText}>Nöbetçi eczane bulunamadı</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  viewToggle: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    backgroundColor: 'rgba(66, 165, 245, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#42A5F5',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pharmacyMarker: {
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#fff',
    borderRadius: 12,
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
    backgroundColor: '#fff',
    borderRadius: 12,
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
    backgroundColor: '#4CAF50',
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
    color: '#666',
  },
});