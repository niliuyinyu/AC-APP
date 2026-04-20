import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { storage, FavoriteItem, CustomSite } from '@/utils/storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

interface Website {
  id: string;
  name: string;
  url: string;
  description: string;
  icon: string;
  color: string;
}

const WEBSITES: Website[] = [
  {
    id: 'ac',
    name: '空调主机数据',
    url: 'https://ac.nlyy.online',
    description: '空调主机数据整理与分析',
    icon: 'snowflake',
    color: '#0EA5E9',
  },
  {
    id: 'report',
    name: '暖通报告',
    url: 'https://report.nlyy.online',
    description: '暖通相关报告查询',
    icon: 'file-lines',
    color: '#10B981',
  },
  {
    id: '91cost',
    name: '功率数据采集',
    url: 'https://91cost.com',
    description: '空调地暖功率与空气资料',
    icon: 'chart-line',
    color: '#8B5CF6',
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [homePage, setHomePage] = useState<string>('');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [customSites, setCustomSites] = useState<CustomSite[]>([]);

  const loadData = useCallback(async () => {
    const [savedHomePage, savedFavorites, savedCustomSites] = await Promise.all([
      storage.getHomePage(),
      storage.getFavorites(),
      storage.getCustomSites(),
    ]);
    setHomePage(savedHomePage || '');
    setFavorites(savedFavorites);
    setCustomSites(savedCustomSites);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenWeb = (website: Website) => {
    router.push('/webview', { url: website.url, title: website.name });
  };

  const handleOpenFavorite = (fav: FavoriteItem) => {
    router.push('/webview', { url: fav.url, title: fav.title });
  };

  const getHomeWebsite = (): Website | null => {
    // 优先检查预定义网站
    const predefined = WEBSITES.find(w => w.url === homePage);
    if (predefined) return predefined;
    
    // 检查自定义网站
    const custom = customSites.find(s => s.url === homePage);
    if (custom) return {
      id: custom.id,
      name: custom.title,
      url: custom.url,
      description: custom.url,
      icon: (custom.icon as any) || 'globe',
      color: '#F59E0B'
    };
    
    // 检查收藏
    const fav = favorites.find(f => f.url === homePage);
    if (fav) return {
      id: fav.id,
      name: fav.title,
      url: fav.url,
      description: fav.url,
      icon: 'bookmark',
      color: '#EC4899'
    };
    
    // 没有设置主页
    return null;
  };

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <View 
        className="flex-1 bg-[--background]"
        style={{ paddingTop: insets.top + 8 }}
      >
        {/* Header */}
        <View className="px-5 pb-4">
          <Text className="text-2xl font-bold text-[--foreground]">暖通服务</Text>
          <Text className="text-sm text-[--muted] mt-1">空调地暖数据服务平台</Text>
        </View>

        {/* 快速入口 - 主页网站 */}
        {getHomeWebsite() ? (
          <TouchableOpacity
            className="mx-5 rounded-2xl overflow-hidden"
            style={styles.homeCard}
            onPress={() => handleOpenWeb(getHomeWebsite()!)}
            activeOpacity={0.8}
          >
            <View 
              className="h-32 items-center justify-center"
              style={{ backgroundColor: getHomeWebsite()!.color }}
            >
              <FontAwesome6 
                name={getHomeWebsite()!.icon as any} 
                size={48} 
                color="white" 
              />
            </View>
            <View className="bg-white px-4 py-3">
              <View className="flex-row items-center">
                <Text className="text-base font-semibold text-gray-800 flex-1">
                  {getHomeWebsite()!.name}
                </Text>
                <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-blue-600 font-medium">主页</Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 mt-1">{getHomeWebsite()!.description}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="mx-5 rounded-2xl overflow-hidden"
            style={styles.homeCard}
            onPress={() => router.push('/settings')}
            activeOpacity={0.8}
          >
            <View 
              className="h-32 items-center justify-center bg-gray-100"
            >
              <FontAwesome6 name="house" size={48} color="#9CA3AF" />
            </View>
            <View className="bg-white px-4 py-3">
              <View className="flex-row items-center">
                <Text className="text-base font-semibold text-gray-800 flex-1">
                  请设置主页
                </Text>
                <View className="bg-orange-50 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-orange-600 font-medium">点击设置</Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 mt-1">在设置中选择一个网站作为主页</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 网站列表 */}
        <View className="px-5 mt-6">
          <Text className="text-base font-semibold text-[--foreground] mb-3">选择网站</Text>
          <View className="flex-row flex-wrap gap-3">
            {WEBSITES.map((website) => (
              <TouchableOpacity
                key={website.id}
                className="w-[calc(50%-6px)] rounded-2xl p-4"
                style={[
                  styles.card,
                  website.url === homePage && styles.cardActive
                ]}
                onPress={() => handleOpenWeb(website)}
                activeOpacity={0.7}
              >
                <View 
                  className="w-10 h-10 rounded-xl items-center justify-center mb-2"
                  style={{ backgroundColor: website.color + '15' }}
                >
                  <FontAwesome6 
                    name={website.icon as any} 
                    size={20} 
                    color={website.color} 
                  />
                </View>
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                  {website.name}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                  {website.url.replace('https://', '')}
                </Text>
              </TouchableOpacity>
            ))}
            {/* 自定义网站 */}
            {customSites.map((site) => (
              <TouchableOpacity
                key={site.id}
                className="w-[calc(50%-6px)] rounded-2xl p-4"
                style={[
                  styles.card,
                  site.url === homePage && styles.cardActive
                ]}
                onPress={() => handleOpenWeb({ 
                  id: site.id, 
                  name: site.title, 
                  url: site.url, 
                  description: site.url,
                  icon: (site.icon as any) || 'globe',
                  color: '#F59E0B'
                })}
                activeOpacity={0.7}
              >
                <View 
                  className="w-10 h-10 rounded-xl items-center justify-center mb-2"
                  style={{ backgroundColor: '#F59E0B' + '15' }}
                >
                  <FontAwesome6 
                    name={(site.icon as any) || 'globe'} 
                    size={20} 
                    color="#F59E0B" 
                  />
                </View>
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                  {site.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                  {site.url.replace('https://', '').replace('http://', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 收藏列表 */}
        {favorites.length > 0 && (
          <View className="px-5 mt-6">
            <Text className="text-base font-semibold text-[--foreground] mb-3">我的收藏</Text>
            <View className="gap-2">
              {favorites.slice(0, 5).map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  className="flex-row items-center bg-white rounded-xl p-3"
                  style={styles.favItem}
                  onPress={() => handleOpenFavorite(fav)}
                  activeOpacity={0.7}
                >
                  <View className="w-8 h-8 rounded-lg bg-[--accent] items-center justify-center mr-3">
                    <FontAwesome6 name="bookmark" size={14} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                      {fav.title}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                      {fav.url}
                    </Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 底部间距 */}
        <View className="h-24" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeCard: {
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px 0 rgba(14, 165, 233, 0.12)',
      },
    }),
  },
  card: {
    backgroundColor: 'white',
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
  cardActive: {
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },
  favItem: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px 0 rgba(0, 0, 0, 0.04)',
      },
    }),
  },
});
