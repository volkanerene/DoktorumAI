import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

class SpeechService {
  private isListening: boolean = false;
  private language: string = 'tr-TR';

  private onResultCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;
  private onPartialResultCallback?: (text: string) => void;

  constructor() {
    try {
      // Sadece Android'de NativeEventEmitter gerekiyorsa ekle
      if (Platform.OS === 'android' && NativeModules.Voice) {
        const voiceEmitter = new NativeEventEmitter(NativeModules.Voice);
      }

      // Voice event listener'ları
      Voice.onSpeechStart = this.onSpeechStart;
      Voice.onSpeechEnd = this.onSpeechEnd;
      Voice.onSpeechError = this.onSpeechError;
      Voice.onSpeechResults = this.onSpeechResults;
      Voice.onSpeechPartialResults = this.onSpeechPartialResults;
    } catch (error) {
      console.warn('Voice module initialization failed:', error);
    }
  }

  setLanguage(lang: 'tr' | 'en') {
    this.language = lang === 'tr' ? 'tr-TR' : 'en-US';
  }

  async startListening(
    onResult: (text: string) => void,
    onError?: (error: string) => void,
    onPartialResult?: (text: string) => void
  ) {
    try {
      this.isListening = true;
      this.onResultCallback = onResult;
      this.onErrorCallback = onError;
      this.onPartialResultCallback = onPartialResult;

      await Voice.start(this.language);
    } catch (e) {
      console.error('[Voice] Failed to start:', e);
      this.isListening = false;
      onError?.('Failed to start voice recognition');
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (e) {
      console.error('[Voice] Failed to stop:', e);
    }
  }

  async cancelListening() {
    try {
      await Voice.cancel();
      this.isListening = false;
    } catch (e) {
      console.error('[Voice] Failed to cancel:', e);
    }
  }

  async destroy() {
    try {
      await Voice.destroy();
    } catch (e) {
      console.error('[Voice] Failed to destroy:', e);
    }
  }

  isAvailable(): Promise<boolean> {
    return Voice.isAvailable();
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Event handlers
  private onSpeechStart = () => {
    console.log('[Voice] Speech started');
  };

  private onSpeechEnd = () => {
    console.log('[Voice] Speech ended');
    this.isListening = false;
  };

  private onSpeechError = (e: any) => {
    console.error('[Voice] Speech error:', e.error);
    this.isListening = false;
    this.onErrorCallback?.(e.error?.message || 'Speech recognition error');
  };

  private onSpeechResults = (e: any) => {
    console.log('[Voice] Speech results:', e.value);
    if (e.value && e.value.length > 0) {
      this.onResultCallback?.(e.value[0]);
    }
  };

  private onSpeechPartialResults = (e: any) => {
    console.log('[Voice] Partial results:', e.value);
    if (e.value && e.value.length > 0) {
      this.onPartialResultCallback?.(e.value[0]);
    }
  };
}

export default new SpeechService();