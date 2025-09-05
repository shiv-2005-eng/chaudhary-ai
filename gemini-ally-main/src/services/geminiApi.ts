import { GeminiResponse, ChatMessage } from '@/types/chat';

const GEMINI_API_KEY = 'AIzaSyAtBeGRTzBDVL5HPqhU5loXQtJ4qC_vNhc';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export class GeminiService {
  private static instance: GeminiService;

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private buildConversationContext(conversationHistory: ChatMessage[], currentMessage: string) {
    // Build conversation context with enhanced system prompt and history
    const systemPrompt = `You are Chaudhary AI, an intelligent and helpful voice-enabled AI assistant with advanced summarization capabilities and persistent memory. You can assist with a wide range of topics including technology, education, lifestyle, business, creativity, and everyday problem solving. Your role is to provide clear, accurate, and concise information, explanations, and advice tailored to the user's level of expertise and context.

As Chaudhary AI, you have the ability to:
- Understand voice input from users
- Provide spoken responses through text-to-speech
- Generate concise summaries of your responses
- Maintain context and memory across conversations
- Remember user preferences, previous discussions, and ongoing topics
- Build upon previous conversations to provide more personalized assistance

MEMORY AND CONTEXT CAPABILITIES:
- You remember all previous messages in this conversation session
- You can reference earlier topics, questions, and answers
- You maintain awareness of the user's interests, expertise level, and communication style
- You build upon previous discussions to provide continuity and deeper insights
- You can recall specific details, examples, or solutions mentioned earlier

Always ask clarifying questions if the user's request is vague or incomplete. Adapt your tone to be friendly, professional, and approachable. Support multi-turn conversations by actively using previous context to enhance your responses.

When assisting, provide step-by-step instructions or explanations when appropriate. For complex topics, break down information into easy-to-understand chunks and offer examples. Prioritize helpfulness, correctness, and empathy in all responses.

Remember that your responses may be spoken aloud, so structure them in a way that flows naturally when read by text-to-speech systems.

IMPORTANT: You have access to the complete conversation history below. Actively use this context to:
1. Reference previous topics and build upon them
2. Avoid repeating information already discussed
3. Provide more personalized and relevant responses
4. Maintain conversation continuity and flow
5. Remember user preferences and adapt accordingly`;

    // Limit conversation history to last 15 messages for better context while managing tokens
    const recentHistory = conversationHistory.slice(-15);
    
    // Build the conversation context with proper role mapping
    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }]
      }
    ];

    // Add conversation history with proper role structure
    recentHistory.forEach((message) => {
      contents.push({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }]
      });
    });

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: currentMessage }]
    });

    return contents;
  }

  async generateResponse(message: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
      console.log('Generating response for message:', message);
      console.log('Conversation history length:', conversationHistory.length);
      
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: this.buildConversationContext(conversationHistory, message),
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API error:', errorData);
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      console.log('Gemini API response:', data);
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error('No candidates in response:', data);
        throw new Error('No response generated from Gemini API');
      }

      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('Invalid candidate structure:', candidate);
        throw new Error('Invalid response structure from Gemini API');
      }

      const generatedText = candidate.content.parts[0].text;
      console.log('Generated text:', generatedText);
      return generatedText;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      // Provide a fallback response if API fails
      if (error instanceof Error && error.message.includes('API error')) {
        return "I apologize, but I'm having trouble connecting to my AI service right now. Please try again in a moment, or check your internet connection.";
      }
      
      throw error;
    }
  }
}
