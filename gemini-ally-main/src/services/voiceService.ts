export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceServiceCallbacks {
  onResult?: (result: VoiceRecognitionResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class VoiceService {
  private static instance: VoiceService;
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private isSpeaking = false;
  private callbacks: VoiceServiceCallbacks = {};

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeRecognition();
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private initializeRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.callbacks.onStart?.();
        };

        this.recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          const isFinal = result.isFinal;

          this.callbacks.onResult?.({
            transcript,
            confidence,
            isFinal
          });
        };

        this.recognition.onerror = (event: any) => {
          this.isListening = false;
          console.error('Speech recognition error:', event.error);
          
          // Handle specific error types
          let errorMessage = event.error;
          if (event.error === 'not-allowed') {
            errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
          } else if (event.error === 'no-speech') {
            errorMessage = 'No speech detected. Please try speaking again.';
          } else if (event.error === 'audio-capture') {
            errorMessage = 'No microphone found. Please check your microphone connection.';
          } else if (event.error === 'network') {
            errorMessage = 'Network error. Please check your internet connection.';
          }
          
          this.callbacks.onError?.(errorMessage);
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.callbacks.onEnd?.();
        };
      }
    }
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async startListening(callbacks: VoiceServiceCallbacks = {}): Promise<boolean> {
    if (!this.recognition) {
      callbacks.onError?.('Speech recognition not supported in this browser');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    // Request microphone permission first
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      callbacks.onError?.('Microphone permission is required for voice recognition. Please allow microphone access and try again.');
      return false;
    }

    this.callbacks = callbacks;
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      callbacks.onError?.('Failed to start speech recognition. Please try again.');
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice options
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      
      if (options.voice) {
        utterance.voice = options.voice;
      } else {
        // Try to find a good English voice
        const voices = this.synthesis.getVoices();
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.default
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis ? this.synthesis.getVoices() : [];
  }

  isVoiceRecognitionSupported(): boolean {
    return !!(this.recognition);
  }

  isSpeechSynthesisSupported(): boolean {
    return !!(this.synthesis);
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
