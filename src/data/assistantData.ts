// src/data/assistantData.ts

export interface AssistantInfo {
  id: number;
  name: string;
  icon: string;
  color: string;
  library: 'MaterialIcons' | 'MaterialCommunityIcons';
}

export const assistantS: AssistantInfo[] = [
  { id: 1,  name: 'Dermatoloji Asistanı',       icon: 'spa',              color: '#e67e22', library: 'MaterialIcons' },
  { id: 2,  name: 'Kardiyoloji Asistanı',       icon: 'favorite',         color: '#eb5757', library: 'MaterialIcons' },
  { id: 3,  name: 'Çocuk Asistanı',             icon: 'child-care',       color: '#FF6F61', library: 'MaterialIcons' },
  { id: 4,  name: 'Psikoloji Asistanı',         icon: 'psychology',       color: '#9b59b6', library: 'MaterialIcons' },
  { id: 5,  name: 'Diş Asistanı',               icon: 'medical-services', color: '#3498db', library: 'MaterialIcons' },
  { id: 6,  name: 'Diyetisyen Asistanı',        icon: 'restaurant',       color: '#27ae60', library: 'MaterialIcons' },
  { id: 7,  name: 'Nöroloji Asistanı',          icon: 'bolt',             color: '#f1c40f', library: 'MaterialIcons' },
  { id: 8,  name: 'Ortopedi Asistanı',          icon: 'accessibility',    color: '#2ecc71', library: 'MaterialIcons' },
  { id: 9,  name: 'Onkoloji Asistanı',          icon: 'ribbon',           color: '#e74c3c', library: 'MaterialCommunityIcons' },
  { id: 10, name: 'Kadın Doğum Asistanı',       icon: 'local-florist',    color: '#9b59b6', library: 'MaterialIcons' },
  { id: 11, name: 'Endokrinoloji Asistanı',     icon: 'medication',       color: '#FF6F61', library: 'MaterialIcons' },
  { id: 12, name: 'Göz Asistanı',               icon: 'visibility',       color: '#4A90E2', library: 'MaterialIcons' },
  { id: 13, name: 'Üroloji Asistanı',           icon: 'water-drop',       color: '#1abc9c', library: 'MaterialIcons' },
  { id: 14, name: 'KBB Asistanı',               icon: 'hearing',          color: '#FF5722', library: 'MaterialIcons' },
  { id: 15, name: 'Alerji Asistanı',            icon: 'coronavirus',      color: '#f39c12', library: 'MaterialIcons' },
  { id: 16, name: 'Romatoloji Asistanı',        icon: 'hand-heart',       color: '#8e44ad', library: 'MaterialCommunityIcons' },
  { id: 17, name: 'Gastroenteroloji Asistanı',  icon: 'restaurant-menu',  color: '#c0392b', library: 'MaterialIcons' },
  { id: 18, name: 'Göğüs Sağlık Asistanı',      icon: 'air',              color: '#16a085', library: 'MaterialIcons' },
  { id: 19, name: 'Hematoloji Asistanı',        icon: 'blood-bag',        color: '#e74c3c', library: 'MaterialCommunityIcons' },
  { id: 20, name: 'Nefroloji Asistanı',         icon: 'healing',          color: '#2980b9', library: 'MaterialIcons' },
  { id: 21, name: 'Aile Asistanı',              icon: 'family-restroom',  color: '#ADFF2F', library: 'MaterialIcons' },
];