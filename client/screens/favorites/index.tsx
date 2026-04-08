import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { storage, FavoriteItem } from '@/utils/storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    const data = await storage.getFavorites();
    setFavorites(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const handleOpenFavorite = (fav: FavoriteItem) => {
    router.push('/webview', { url: fav.url, title: fav.title });
  };

  const handleDeleteFavorite = (fav: FavoriteItem) => {
    Alert.alert(
      '删除收藏',
      `确定要删除"${fav.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: async () => {
            await storage.removeFavorite(fav.id);
            loadFavorites();
          }
        },
      ]
    );
  };

  const handleSetHomePage = async (fav: FavoriteItem) => {
    await storage.setHomePage(fav.url);
    Alert.alert('设置成功', `"${fav.title}"已设为主页`);
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => (
    <View className="flex-row items-center bg-white rounded-xl p-4 mb-3" style={styles.item}>
      <TouchableOpacity 
        className="flex-row items-center flex-1"
        onPress={() => handleOpenFavorite(item)}
        activeOpacity={0.7}
      >
        <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 items-center justify-center mr-3">
          <FontAwesome6 name="bookmark" size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-800" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-xs text-gray-400 mt-1" numberOfLines={1}>
            {item.url}
          </Text>
          <Text className="text-xs text-gray-300 mt-0.5">
            {new Date(item.addedAt).toLocaleDateString('zh-CN')}
          </Text>
        </View>
      </TouchableOpacity>
      <View className="flex-row items-center">
        <TouchableOpacity 
          className="w-10 h-10 items-center justify-center"
          onPress={() => handleSetHomePage(item)}
        >
          <FontAwesome6 name="house" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-10 h-10 items-center justify-center"
          onPress={() => handleDeleteFavorite(item)}
        >
          <FontAwesome6 name="trash" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
        <FontAwesome6 name="bookmark" size={40} color="#D1D5DB" />
      </View>
      <Text className="text-lg font-medium text-gray-400">暂无收藏</Text>
      <Text className="text-sm text-gray-300 mt-2">浏览网页后点击收藏按钮添加</Text>
    </View>
  );

  return (
    <Screen safeAreaEdges={['top', 'left', 'right', 'bottom']}>
      <View 
        className="flex-1 bg-[--background]"
        style={{ paddingTop: insets.top + 8 }}
      >
        {/* Header */}
        <View className="px-5 pb-4">
          <Text className="text-2xl font-bold text-[--foreground]">我的收藏</Text>
          <Text className="text-sm text-[--muted] mt-1">
            {favorites.length > 0 ? `共 ${favorites.length} 个收藏` : '浏览网页后长按添加收藏'}
          </Text>
        </View>

        {/* 收藏列表 */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400">加载中...</Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              favorites.length === 0 && styles.emptyList
            ]}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyList: {
    flex: 1,
  },
});
