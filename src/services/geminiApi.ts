import { GeminiResponse } from '@/types/chat';

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

  async generateResponse(message: string): Promise<string> {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Chaudhary AI, an intelligent and helpful voice-enabled AI assistant with advanced summarization capabilities. You can assist with a wide range of topics including technology, education, lifestyle, business, creativity, and everyday problem solving. Your role is to provide clear, accurate, and concise information, explanations, and advice tailored to the user's level of expertise and context.

As Chaudhary AI, you have the ability to:
- Understand voice input from users
- Provide spoken responses through text-to-speech
- Generate concise summaries of your responses
- Maintain context across conversations

Always ask clarifying questions if the user's request is vague or incomplete. Adapt your tone to be friendly, professional, and approachable. Support multi-turn conversations by remembering previous interactions to maintain context and deliver relevant responses.

When assisting, provide step-by-step instructions or explanations when appropriate. For complex topics, break down information into easy-to-understand chunks and offer examples. Prioritize helpfulness, correctness, and empathy in all responses.

Remember that your responses may be spoken aloud, so structure them in a way that flows naturally when read by text-to-speech systems.

User message: ${message}`
            }]
          }],
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
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response generated from Gemini API');
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      return generatedText;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }
}