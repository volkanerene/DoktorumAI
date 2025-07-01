import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// utils/authNavigation.ts
export const navigateAfterAuth = async (
  navigation,
  userId: string,
  userName: string,
) => {
  // ① Profil var mı?
  const { data: profileRes } = await axios.get(
    `${SERVER_URL}?action=getProfile&user_id=${userId}`,
  );
  const answers = profileRes?.profile?.answers ?? {};
  const needsOnboarding = !(answers.birthDate && answers.gender);

  // ② Subscription sayfası daha önce gösterildi mi?
  const subscriptionShown = await AsyncStorage.getItem(
    `subscription_shown_${userId}`,
  );

  // ③ Yönlendir
  if (needsOnboarding) {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Onboarding', params: { userId, userName } }],
    });
  } else if (!subscriptionShown) {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Subscription', params: { userId, userName } }],
    });
  } else {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { userId, userName } }],
    });
  }
};