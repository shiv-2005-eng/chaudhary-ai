import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { GeminiService } from '@/services/geminiApi';
import { SummarizationService } from '@/services/summarizationService';
import { ChatMessage } from './ChatMessage';
import { VoiceControls } from './VoiceControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, Mic, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const geminiService = GeminiService.getInstance();
  const summarizationService = SummarizationService.getInstance();
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string, isVoiceMessage = false) => {
    const messageContent = messageText || input.trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      isVoiceMessage,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInput('');
    setIsLoading(true);

    try {
      const response = await geminiService.generateResponse(messageContent);
      
      // Generate summary for the response
      let summary = '';
      try {
        summary = await summarizationService.generateSpokenSummary(response, {
          maxLength: 100,
          style: 'concise'
        });
      } catch (summaryError) {
        console.warn('Failed to generate summary:', summaryError);
      }
      
      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        summary,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentResponse(response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Failed to get response from Chaudhary AI. Please try again.",
        variant: "destructive",
      });
      
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = (transcript: string) => {
    handleSendMessage(transcript, true);
  };

  const handleSpeakResponse = (text: string) => {
    // This will be handled by the VoiceControls component
    setCurrentResponse(text);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <Card className="gradient-card p-6 mb-4 shadow-elegant border-0 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Chaudhary AI
            </h1>
            <p className="text-muted-foreground">
              Your intelligent voice-enabled companion with advanced summarization
            </p>
          </div>
        </div>
      </Card>

      {/* Messages */}
      <Card className="flex-1 gradient-card border-0 shadow-elegant animate-fade-in">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="h-16 w-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow mb-4">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Welcome to Chaudhary AI!
                </h3>
                <p className="text-muted-foreground max-w-md">
                  I'm your intelligent voice-enabled assistant with advanced summarization capabilities. 
                  I can hear your voice, respond with speech, and provide concise summaries. 
                  Try speaking to me or typing your questions!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                  </div>
                  <Card className="p-4 gradient-card border border-border/20">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Voice Controls */}
      <VoiceControls
        onVoiceInput={handleVoiceInput}
        onSpeakResponse={handleSpeakResponse}
        isProcessing={isLoading}
        currentResponse={currentResponse}
      />

      {/* Input */}
      <Card className="mt-4 p-4 gradient-card border-0 shadow-elegant animate-fade-in">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Chaudhary AI anything..."
            disabled={isLoading}
            className="flex-1 bg-background/50 border-border/20 focus:border-primary/50 transition-smooth"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-primary hover:shadow-glow transition-smooth border-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};