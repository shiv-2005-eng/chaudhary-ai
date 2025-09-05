import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { GeminiService } from '@/services/geminiApi';
import { SummarizationService } from '@/services/summarizationService';
import { ChatStorageService } from '@/services/chatStorageService';
import { ChatMessage } from './ChatMessage';
import { VoiceControls } from './VoiceControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, Mic, Volume2, Trash2, Plus, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const geminiService = GeminiService.getInstance();
  const summarizationService = SummarizationService.getInstance();
  const chatStorageService = ChatStorageService.getInstance();
  const { toast } = useToast();

  // Initialize chat session on component mount
  useEffect(() => {
    const initializeSession = () => {
      let sessionId = chatStorageService.getCurrentSessionId();
      
      if (!sessionId) {
        // Create new session if none exists
        sessionId = chatStorageService.createNewSession();
      }
      
      setCurrentSessionId(sessionId);
      
      // Load messages for current session
      const sessionMessages = chatStorageService.getCurrentMessages();
      setMessages(sessionMessages);
    };

    initializeSession();
  }, []);

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

  // Save conversation history whenever messages change
  useEffect(() => {
    if (messages.length > 0 && currentSessionId) {
      chatStorageService.saveSession(currentSessionId, messages);
    }
  }, [messages, currentSessionId]);

  const handleSendMessage = async (messageText?: string, isVoiceMessage = false) => {
    const messageContent = messageText || input.trim();
    if (!messageContent || isLoading) return;

    // Create new session if this is the first message and no session exists
    let sessionId = currentSessionId;
    if (!sessionId || messages.length === 0) {
      sessionId = chatStorageService.createNewSession();
      setCurrentSessionId(sessionId);
    }

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      isVoiceMessage,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!messageText) setInput('');
    setIsLoading(true);

    try {
      console.log('Sending message to Gemini:', messageContent);
      console.log('Current messages count:', updatedMessages.length);
      console.log('Session ID:', sessionId);
      
      const response = await geminiService.generateResponse(messageContent, updatedMessages);
      console.log('Received response from Gemini:', response);
      
      // Generate summary for the response
      let summary = '';
      try {
        summary = await summarizationService.generateSpokenSummary(response, {
          maxLength: 100,
          style: 'concise'
        });
        console.log('Generated summary:', summary);
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

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      setCurrentResponse(response);
      
      // Save the complete conversation
      chatStorageService.saveSession(sessionId, finalMessages);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      let errorMessage = "I apologize, but I'm having trouble connecting right now. Please try again in a moment.";
      
      if (error instanceof Error) {
        if (error.message.includes('API error')) {
          errorMessage = "I'm experiencing connectivity issues with my AI service. Please check your internet connection and try again.";
        } else if (error.message.includes('No response generated')) {
          errorMessage = "I received an empty response from my AI service. Please try rephrasing your question.";
        } else {
          errorMessage = `I encountered an error: ${error.message}. Please try again.`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      const errorChatMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      
      const finalMessages = [...updatedMessages, errorChatMessage];
      setMessages(finalMessages);
      chatStorageService.saveSession(sessionId, finalMessages);
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

  const handleClearConversation = () => {
    if (currentSessionId) {
      chatStorageService.deleteSession(currentSessionId);
    }
    
    // Create a new session for future messages
    const newSessionId = chatStorageService.createNewSession();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    
    toast({
      title: "Conversation Cleared",
      description: "Your conversation history has been cleared. Starting a new session.",
    });
  };

  const handleNewChat = () => {
    // Save current session if it has messages
    if (messages.length > 0 && currentSessionId) {
      chatStorageService.saveSession(currentSessionId, messages);
    }
    
    // Create new session
    const newSessionId = chatStorageService.createNewSession();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    
    toast({
      title: "New Chat Started",
      description: "Started a new conversation. Previous chat has been saved.",
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <Card className="gradient-card p-6 mb-4 shadow-elegant border-0 animate-fade-in">
        <div className="flex items-center justify-between">
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
          <div className="flex gap-2">
            <Button
              onClick={handleNewChat}
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:border-primary transition-smooth"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            {messages.length > 0 && (
              <Button
                onClick={handleClearConversation}
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:border-destructive transition-smooth"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Chat
              </Button>
            )}
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
                  I can hear your voice, respond with speech, provide concise summaries, and remember our conversation history for better context. 
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
