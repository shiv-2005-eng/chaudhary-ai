import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { VoiceService, VoiceRecognitionResult } from '@/services/voiceService';
import { useToast } from '@/hooks/use-toast';

interface VoiceControlsProps {
  onVoiceInput: (transcript: string) => void;
  onSpeakResponse: (text: string) => void;
  isProcessing?: boolean;
  currentResponse?: string;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  onVoiceInput,
  onSpeakResponse,
  isProcessing = false,
  currentResponse = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [permissionRequested, setPermissionRequested] = useState(false);
  
  const voiceService = VoiceService.getInstance();
  const { toast } = useToast();

  useEffect(() => {
    setVoiceSupported(voiceService.isVoiceRecognitionSupported());
    setSpeechSupported(voiceService.isSpeechSynthesisSupported());
  }, []);

  const handleStartListening = async () => {
    if (!voiceSupported) {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Please use text input instead.",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await voiceService.startListening({
        onResult: (result: VoiceRecognitionResult) => {
          if (result.isFinal) {
            setInterimTranscript('');
            onVoiceInput(result.transcript);
          } else {
            setInterimTranscript(result.transcript);
          }
        },
        onError: (error: string) => {
          setIsListening(false);
          setInterimTranscript('');
          toast({
            title: "Voice Recognition Error",
            description: error,
            variant: "destructive",
          });
        },
        onStart: () => {
          setIsListening(true);
          setInterimTranscript('');
        },
        onEnd: () => {
          setIsListening(false);
          setInterimTranscript('');
        }
      });

      if (!success) {
        toast({
          title: "Failed to Start Voice Recognition",
          description: "Please check your microphone permissions and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      toast({
        title: "Voice Recognition Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStopListening = () => {
    voiceService.stopListening();
    setIsListening(false);
    setInterimTranscript('');
  };

  const handleSpeakResponse = async () => {
    if (!currentResponse) return;

    if (!speechSupported) {
      toast({
        title: "Text-to-Speech Not Supported",
        description: "Your browser doesn't support text-to-speech.",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true);
      await voiceService.speak(currentResponse, {
        rate: 0.9,
        pitch: 1,
        volume: 0.8
      });
      setIsSpeaking(false);
    } catch (error) {
      setIsSpeaking(false);
      toast({
        title: "Speech Error",
        description: "Failed to speak the response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleVoiceEnabled = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    if (isListening) {
      handleStopListening();
    }
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
    }
  };

  const requestPermission = async () => {
    try {
      const hasPermission = await voiceService.requestMicrophonePermission();
      setPermissionRequested(true);
      if (hasPermission) {
        toast({
          title: "Permission Granted",
          description: "Microphone access has been granted. You can now use voice features.",
          variant: "default",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Microphone access was denied. Please allow microphone access in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request microphone permission. Please check your browser settings.",
        variant: "destructive",
      });
    }
  };

  if (!voiceSupported && !speechSupported) {
    return null;
  }

  return (
    <Card className="p-4 gradient-card border-0 shadow-elegant">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
          Voice Controls
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleVoiceEnabled}
          className={isVoiceEnabled ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-red-500/10 border-red-500/20 text-red-600"}
        >
          {isVoiceEnabled ? "Voice On" : "Voice Off"}
        </Button>
      </div>

      <div className="flex gap-3 items-center">
        {/* Permission Request Button */}
        {voiceSupported && isVoiceEnabled && !permissionRequested && (
          <div className="flex items-center gap-2">
            <Button
              onClick={requestPermission}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              <Mic className="h-4 w-4 mr-1" />
              Allow Microphone
            </Button>
            <span className="text-sm text-muted-foreground">
              Click to enable voice features
            </span>
          </div>
        )}

        {/* Voice Input Controls */}
        {voiceSupported && isVoiceEnabled && permissionRequested && (
          <div className="flex items-center gap-2">
            <Button
              onClick={isListening ? handleStopListening : handleStartListening}
              disabled={isProcessing}
              className={`${
                isListening 
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse-voice" 
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              } transition-smooth`}
              size="sm"
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {isListening ? "Listening..." : "Tap to speak"}
            </span>
          </div>
        )}

        {/* Speech Output Controls */}
        {speechSupported && isVoiceEnabled && currentResponse && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSpeakResponse}
              disabled={isProcessing}
              className={`${
                isSpeaking 
                  ? "bg-orange-500 hover:bg-orange-600 text-white animate-speak" 
                  : "bg-green-500 hover:bg-green-600 text-white"
              } transition-smooth`}
              size="sm"
            >
              {isSpeaking ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {isSpeaking ? "Speaking..." : "Speak response"}
            </span>
          </div>
        )}
      </div>

      {/* Interim Transcript Display */}
      {interimTranscript && (
        <div className="mt-3 p-3 bg-background/50 rounded-lg border border-border/20">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              Listening
            </Badge>
            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          </div>
          <p className="text-sm text-muted-foreground italic">
            "{interimTranscript}"
          </p>
        </div>
      )}

      {/* Instructions */}
      {voiceSupported && isVoiceEnabled && !permissionRequested && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>First time using voice?</strong> Click "Allow Microphone" to enable voice recognition. 
            Your browser will ask for microphone permission - please allow it to use voice features.
          </p>
        </div>
      )}

      {/* Status Indicators */}
      <div className="mt-3 flex gap-2">
        {voiceSupported && (
          <Badge variant="outline" className="text-xs">
            🎤 Voice Input
          </Badge>
        )}
        {speechSupported && (
          <Badge variant="outline" className="text-xs">
            🔊 Speech Output
          </Badge>
        )}
        {!isVoiceEnabled && (
          <Badge variant="destructive" className="text-xs">
            Voice Disabled
          </Badge>
        )}
        {permissionRequested && (
          <Badge variant="default" className="text-xs bg-green-500">
            ✅ Microphone Ready
          </Badge>
        )}
      </div>
    </Card>
  );
};
