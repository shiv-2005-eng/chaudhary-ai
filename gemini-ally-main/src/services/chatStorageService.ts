import { ChatMessage } from '@/types/chat';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export class ChatStorageService {
  private static instance: ChatStorageService;
  private readonly STORAGE_KEY = 'chaudhary-ai-sessions';
  private readonly CURRENT_SESSION_KEY = 'chaudhary-ai-current-session';
  private readonly MAX_SESSIONS = 50; // Limit to prevent storage overflow

  static getInstance(): ChatStorageService {
    if (!ChatStorageService.instance) {
      ChatStorageService.instance = new ChatStorageService();
    }
    return ChatStorageService.instance;
  }

  // Generate a title from the first user message
  private generateSessionTitle(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return 'New Chat';
    
    const content = firstUserMessage.content.trim();
    if (content.length <= 50) return content;
    
    // Truncate and add ellipsis
    return content.substring(0, 47) + '...';
  }

  // Get all chat sessions
  getAllSessions(): ChatSession[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const sessions = JSON.parse(stored);
      return sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      return [];
    }
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return localStorage.getItem(this.CURRENT_SESSION_KEY);
  }

  // Set current session ID
  setCurrentSessionId(sessionId: string): void {
    localStorage.setItem(this.CURRENT_SESSION_KEY, sessionId);
  }

  // Get a specific session
  getSession(sessionId: string): ChatSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(session => session.id === sessionId) || null;
  }

  // Get current session messages (for backward compatibility)
  getCurrentMessages(): ChatMessage[] {
    const currentSessionId = this.getCurrentSessionId();
    if (currentSessionId) {
      const session = this.getSession(currentSessionId);
      return session?.messages || [];
    }
    
    // Fallback to old storage method
    try {
      const stored = localStorage.getItem('chaudhary-ai-conversation');
      if (!stored) return [];
      
      const messages = JSON.parse(stored);
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Error loading current messages:', error);
      return [];
    }
  }

  // Save or update a session
  saveSession(sessionId: string, messages: ChatMessage[]): void {
    if (messages.length === 0) return;

    try {
      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex(session => session.id === sessionId);
      
      const sessionData: ChatSession = {
        id: sessionId,
        title: this.generateSessionTitle(messages),
        messages,
        createdAt: existingIndex >= 0 ? sessions[existingIndex].createdAt : new Date(),
        updatedAt: new Date()
      };

      if (existingIndex >= 0) {
        sessions[existingIndex] = sessionData;
      } else {
        sessions.unshift(sessionData); // Add new sessions at the beginning
      }

      // Limit the number of stored sessions
      if (sessions.length > this.MAX_SESSIONS) {
        sessions.splice(this.MAX_SESSIONS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      this.setCurrentSessionId(sessionId);
      
      // Also save to old storage key for backward compatibility
      localStorage.setItem('chaudhary-ai-conversation', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }

  // Create a new session
  createNewSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.setCurrentSessionId(sessionId);
    return sessionId;
  }

  // Delete a session
  deleteSession(sessionId: string): void {
    try {
      const sessions = this.getAllSessions();
      const filteredSessions = sessions.filter(session => session.id !== sessionId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSessions));
      
      // If we deleted the current session, clear the current session ID
      if (this.getCurrentSessionId() === sessionId) {
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
        localStorage.removeItem('chaudhary-ai-conversation');
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  }

  // Clear all sessions
  clearAllSessions(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CURRENT_SESSION_KEY);
    localStorage.removeItem('chaudhary-ai-conversation');
  }

  // Export chat history as JSON
  exportChatHistory(): string {
    const sessions = this.getAllSessions();
    return JSON.stringify(sessions, null, 2);
  }

  // Import chat history from JSON
  importChatHistory(jsonData: string): boolean {
    try {
      const sessions = JSON.parse(jsonData);
      if (!Array.isArray(sessions)) {
        throw new Error('Invalid format: expected array of sessions');
      }
      
      // Validate session structure
      sessions.forEach((session, index) => {
        if (!session.id || !session.messages || !Array.isArray(session.messages)) {
          throw new Error(`Invalid session structure at index ${index}`);
        }
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      return true;
    } catch (error) {
      console.error('Error importing chat history:', error);
      return false;
    }
  }

  // Get storage usage info
  getStorageInfo(): { used: number; total: number; percentage: number } {
    try {
      const used = new Blob([localStorage.getItem(this.STORAGE_KEY) || '']).size;
      const total = 5 * 1024 * 1024; // Approximate localStorage limit (5MB)
      return {
        used,
        total,
        percentage: Math.round((used / total) * 100)
      };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}
