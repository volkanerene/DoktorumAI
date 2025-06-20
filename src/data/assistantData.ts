// src/data/assistantData.ts

export interface AssistantInfo {
  id: number;
  name?: string; // For backward compatibility
  nameKey: string; // Translation key for the name
  icon: string;
  color: string;
  library: 'MaterialIcons' | 'MaterialCommunityIcons';
}

export const assistantS: AssistantInfo[] = [
  { id: 1,  nameKey: 'assistants.dermatology',       icon: 'spa',              color: '#e67e22', library: 'MaterialIcons' },
  { id: 2,  nameKey: 'assistants.cardiology',        icon: 'favorite',         color: '#eb5757', library: 'MaterialIcons' },
  { id: 3,  nameKey: 'assistants.pediatrics',        icon: 'child-care',       color: '#FF6F61', library: 'MaterialIcons' },
  { id: 4,  nameKey: 'assistants.psychology',        icon: 'psychology',       color: '#9b59b6', library: 'MaterialIcons' },
  { id: 5,  nameKey: 'assistants.dental',            icon: 'medical-services', color: '#3498db', library: 'MaterialIcons' },
  { id: 6,  nameKey: 'assistants.nutrition',         icon: 'restaurant',       color: '#27ae60', library: 'MaterialIcons' },
  { id: 7,  nameKey: 'assistants.neurology',         icon: 'bolt',             color: '#f1c40f', library: 'MaterialIcons' },
  { id: 8,  nameKey: 'assistants.orthopedics',       icon: 'accessibility',    color: '#2ecc71', library: 'MaterialIcons' },
  { id: 9,  nameKey: 'assistants.oncology',          icon: 'ribbon',           color: '#e74c3c', library: 'MaterialCommunityIcons' },
  { id: 10, nameKey: 'assistants.gynecology',        icon: 'local-florist',    color: '#9b59b6', library: 'MaterialIcons' },
  { id: 11, nameKey: 'assistants.endocrinology',     icon: 'medication',       color: '#FF6F61', library: 'MaterialIcons' },
  { id: 12, nameKey: 'assistants.ophthalmology',     icon: 'visibility',       color: '#4A90E2', library: 'MaterialIcons' },
  { id: 13, nameKey: 'assistants.urology',           icon: 'water-drop',       color: '#1abc9c', library: 'MaterialIcons' },
  { id: 14, nameKey: 'assistants.ent',               icon: 'hearing',          color: '#FF5722', library: 'MaterialIcons' },
  { id: 15, nameKey: 'assistants.allergy',           icon: 'coronavirus',      color: '#f39c12', library: 'MaterialIcons' },
  { id: 16, nameKey: 'assistants.rheumatology',      icon: 'hand-heart',       color: '#8e44ad', library: 'MaterialCommunityIcons' },
  { id: 17, nameKey: 'assistants.gastroenterology',  icon: 'restaurant-menu',  color: '#c0392b', library: 'MaterialIcons' },
  { id: 18, nameKey: 'assistants.pulmonology',       icon: 'air',              color: '#16a085', library: 'MaterialIcons' },
  { id: 19, nameKey: 'assistants.hematology',        icon: 'blood-bag',        color: '#e74c3c', library: 'MaterialCommunityIcons' },
  { id: 20, nameKey: 'assistants.nephrology',        icon: 'healing',          color: '#2980b9', library: 'MaterialIcons' },
  { id: 21, nameKey: 'assistants.family',            icon: 'family-restroom',  color: '#ADFF2F', library: 'MaterialIcons' },
];

// Helper function to get assistant name based on language
export const getAssistantName = (nameKey: string, t: (key: string) => string): string => {
  return t(nameKey);
};

// Get the English name for API calls (always use English names for backend)
export const getAssistantApiName = (nameKey: string): string => {
  const apiNames: Record<string, string> = {
    'assistants.dermatology': 'Dermatology Assistant',
    'assistants.cardiology': 'Cardiology Assistant',
    'assistants.pediatrics': 'Pediatrics Assistant',
    'assistants.psychology': 'Psychology Assistant',
    'assistants.dental': 'Dental Assistant',
    'assistants.nutrition': 'Nutrition Assistant',
    'assistants.neurology': 'Neurology Assistant',
    'assistants.orthopedics': 'Orthopedics Assistant',
    'assistants.oncology': 'Oncology Assistant',
    'assistants.gynecology': 'Gynecology Assistant',
    'assistants.endocrinology': 'Endocrinology Assistant',
    'assistants.ophthalmology': 'Ophthalmology Assistant',
    'assistants.urology': 'Urology Assistant',
    'assistants.ent': 'ENT Assistant',
    'assistants.allergy': 'Allergy Assistant',
    'assistants.rheumatology': 'Rheumatology Assistant',
    'assistants.gastroenterology': 'Gastroenterology Assistant',
    'assistants.pulmonology': 'Pulmonology Assistant',
    'assistants.hematology': 'Hematology Assistant',
    'assistants.nephrology': 'Nephrology Assistant',
    'assistants.family': 'Family Assistant',
  };
  
  return apiNames[nameKey] || 'Family Assistant';
};