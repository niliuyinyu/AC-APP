import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import RNSSE from 'react-native-sse';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是暖通知识助手，可以回答锅炉、水机空调等相关问题。有什么可以帮你的吗？',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(async () => {
    const question = inputText.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    const assistantMessageId = (Date.now() + 1).toString();
    setCurrentStreamingId(assistantMessageId);

    // 添加一个空的助手消息
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: '' },
    ]);

    try {
      const sse = new RNSSE(`${API_BASE}/api/v1/knowledge/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      let fullContent = '';

      sse.addEventListener('message', (event) => {
        if (event.data === '[DONE]') {
          sse.close();
          setIsLoading(false);
          setCurrentStreamingId(null);
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            fullContent += data.content;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            );
            scrollToBottom();
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      });

      sse.addEventListener('error', (event) => {
        console.error('SSE error:', event);
        sse.close();
        setIsLoading(false);
        setCurrentStreamingId(null);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: '抱歉，发生了错误，请稍后再试。' }
              : msg
          )
        );
      });

      sse.addEventListener('close', () => {
        setIsLoading(false);
        setCurrentStreamingId(null);
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setCurrentStreamingId(null);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `抱歉，发生了错误：${error.message}` }
            : msg
        )
      );
    }
  }, [inputText, isLoading, scrollToBottom]);

  const handleClear = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '对话已清空。有什么可以帮你的吗？',
      },
    ]);
  };

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1 bg-[--background]"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ paddingTop: insets.top + 8 }}>
          {/* Header */}
          <View className="px-5 pb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-[--foreground]">知识问答</Text>
              <Text className="text-sm text-[--muted] mt-1">暖通知识库 AI 助手</Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 rounded-full items-center justify-center bg-gray-100"
              onPress={handleClear}
            >
              <FontAwesome6 name="trash-alt" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={`mb-4 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 rounded-br-md'
                      : 'bg-white rounded-bl-md'
                  }`}
                  style={
                    message.role === 'assistant'
                      ? {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 4,
                          elevation: 1,
                        }
                      : undefined
                  }
                >
                  <Text
                    className={`text-base leading-6 ${
                      message.role === 'user' ? 'text-white' : 'text-gray-800'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {message.content || (currentStreamingId === message.id ? '' : '')}
                  </Text>
                  {currentStreamingId === message.id && isLoading && (
                    <ActivityIndicator
                      size="small"
                      color={message.role === 'user' ? '#fff' : '#0EA5E9'}
                      className="mt-2 self-start"
                    />
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View
            className="px-5 pb-5 pt-3 bg-[--background]"
            style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}
          >
            <View className="flex-row items-end bg-white rounded-2xl px-4 py-2" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <TextInput
                className="flex-1 text-gray-800 text-base py-2 max-h-24"
                placeholder="输入你的问题..."
                placeholderTextColor="#9CA3AF"
                multiline
                value={inputText}
                onChangeText={setInputText}
                editable={!isLoading}
              />
              <TouchableOpacity
                className={`ml-3 w-10 h-10 rounded-full items-center justify-center ${
                  isLoading || !inputText.trim() ? 'bg-gray-200' : 'bg-blue-500'
                }`}
                onPress={handleSend}
                disabled={isLoading || !inputText.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                  <FontAwesome6 name="paper-plane" size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-center text-[--muted] mt-2">
              AI 助手仅供参考，如有疑问请咨询专业人员
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
