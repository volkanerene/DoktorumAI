module.exports = {
  presets: ['module:@react-native/babel-preset'],
    plugins: [
    /* …başka plugin’lerin varsa önce onları yaz… */
    'react-native-reanimated/plugin',   //  👈  daima en SON
  ],
};
