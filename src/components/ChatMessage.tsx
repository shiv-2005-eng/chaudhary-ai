import { ChatMessage as ChatMessageType } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Mic, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full gap-3 animate-slide-up',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 bg-gradient-primary shadow-glow">
          <AvatarFallback className="bg-transparent text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <Card
        className={cn(
          'max-w-[80%] p-4 transition-smooth hover:shadow-elegant',
          isUser
            ? 'bg-gradient-primary text-primary-foreground border-0 shadow-glow'
            : 'gradient-card border border-border/20'
        )}
      >
        {/* Voice message indicator */}
        {message.isVoiceMessage && (
          <div className="mb-2 flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              <Mic className="h-3 w-3 mr-1" />
              Voice Message
            </Badge>
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          <p className={cn(
            'whitespace-pre-wrap leading-relaxed',
            isUser ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {message.content}
          </p>
        </div>

        {/* Summary for assistant messages */}
        {!isUser && message.summary && (
          <div className="mt-3 p-3 bg-background/50 rounded-lg border border-border/20">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium text-blue-600">Summary</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              {message.summary}
            </p>
          </div>
        )}

        <div className={cn(
          'mt-2 text-xs opacity-70',
          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </Card>
      
      {isUser && (
        <Avatar className="h-8 w-8 bg-secondary">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};