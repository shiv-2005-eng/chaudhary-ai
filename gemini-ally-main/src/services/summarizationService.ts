import { GeminiService } from './geminiApi';

export interface SummarizationOptions {
  maxLength?: number;
  includeKeyPoints?: boolean;
  style?: 'concise' | 'detailed' | 'bullet-points';
}

export class SummarizationService {
  private static instance: SummarizationService;
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = GeminiService.getInstance();
  }

  static getInstance(): SummarizationService {
    if (!SummarizationService.instance) {
      SummarizationService.instance = new SummarizationService();
    }
    return SummarizationService.instance;
  }

  async summarizeText(text: string, options: SummarizationOptions = {}): Promise<string> {
    const {
      maxLength = 150,
      includeKeyPoints = true,
      style = 'concise'
    } = options;

    const prompt = this.buildSummarizationPrompt(text, maxLength, includeKeyPoints, style);
    
    try {
      const summary = await this.geminiService.generateResponse(prompt);
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  private buildSummarizationPrompt(
    text: string, 
    maxLength: number, 
    includeKeyPoints: boolean, 
    style: string
  ): string {
    let styleInstruction = '';
    
    switch (style) {
      case 'concise':
        styleInstruction = 'Provide a concise summary that captures the main points in a clear, brief manner.';
        break;
      case 'detailed':
        styleInstruction = 'Provide a detailed summary that includes important context and nuances.';
        break;
      case 'bullet-points':
        styleInstruction = 'Provide a summary in bullet-point format highlighting the key information.';
        break;
      default:
        styleInstruction = 'Provide a clear and informative summary.';
    }

    const keyPointsInstruction = includeKeyPoints 
      ? ' Also include the most important key points or takeaways.' 
      : '';

    return `Please summarize the following text in approximately ${maxLength} words or less. ${styleInstruction}${keyPointsInstruction}

Text to summarize:
${text}

Summary:`;
  }

  async generateSpokenSummary(text: string, options: SummarizationOptions = {}): Promise<string> {
    // Generate a shorter summary specifically for speech
    const speechOptions = {
      ...options,
      maxLength: options.maxLength ? Math.min(options.maxLength, 100) : 100,
      style: 'concise' as const
    };

    return this.summarizeText(text, speechOptions);
  }
}






