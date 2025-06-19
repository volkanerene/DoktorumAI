import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-community/voice';

class SpeechService {
  private isListening: boolean = false;
  private language: string = 'tr-TR';
  
  constructor() {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechPartialResults = this.onSpeechPartialResults;
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
      console.error(e);
      this.isListening = false;
      onError?.('Failed to start voice recognition');
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (e) {
      console.error(e);
    }
  }

  async cancelListening() {
    try {
      await Voice.cancel();
      this.isListening = false;
    } catch (e) {
      console.error(e);
    }
  }

  async destroy() {
    try {
      await Voice.destroy();
    } catch (e) {
      console.error(e);
    }
  }

  isAvailable(): Promise<boolean> {
    return Voice.isAvailable();
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Callbacks
  private onResultCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;
  private onPartialResultCallback?: (text: string) => void;

  private onSpeechStart = (e: any) => {
    console.log('Speech started');
  };

  private onSpeechEnd = (e: any) => {
    console.log('Speech ended');
    this.isListening = false;
  };

  private onSpeechError = (e: SpeechErrorEvent) => {
    console.log('Speech error:', e.error);
    this.isListening = false;
    this.onErrorCallback?.(e.error?.message || 'Speech recognition error');
  };

  private onSpeechResults = (e: SpeechResultsEvent) => {
    console.log('Speech results:', e.value);
    if (e.value && e.value.length > 0) {
      this.onResultCallback?.(e.value[0]);
    }
  };

  private onSpeechPartialResults = (e: SpeechResultsEvent) => {
    console.log('Speech partial results:', e.value);
    if (e.value && e.value.length > 0) {
      this.onPartialResultCallback?.(e.value[0]);
    }
  };
}

export default new SpeechService();