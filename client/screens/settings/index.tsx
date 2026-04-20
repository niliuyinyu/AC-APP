import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, ScrollView, TextInput, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { storage, CustomSite, FavoriteItem } from '@/utils/storage';

interface Website {
  id: string;
  name: string;
  url: string;
  icon: string;
  color: string;
}

const WEBSITES: Website[] = [
  {
    id: 'ac',
    name: '空调主机数据',
    url: 'https://ac.nlyy.online',
    icon: 'snowflake',
    color: '#0EA5E9',
  },
  {
    id: 'report',
    name: '暖通报告',
    url: 'https://report.nlyy.online',
    icon: 'file-lines',
    color: '#10B981',
  },
  {
    id: '91cost',
    name: '功率数据采集',
    url: 'https://91cost.com',
    icon: 'chart-line',
    color: '#8B5CF6',
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [homePage, setHomePage] = useState<string>('https://ac.nlyy.online');
  const [showHomeSelector, setShowHomeSelector] = useState(false);
  const [customSites, setCustomSites] = useState<CustomSite[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteTitle, setNewSiteTitle] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');

  const loadHomePage = useCallback(async () => {
    const [data, sites, favs] = await Promise.all([
      storage.getHomePage(),
      storage.getCustomSites(),
      storage.getFavorites(),
    ]);
    setHomePage(data);
    setCustomSites(sites);
    setFavorites(favs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomePage();
    }, [loadHomePage])
  );

  const handleSetHomePage = async (url: string) => {
    await storage.setHomePage(url);
    setHomePage(url);
    setShowHomeSelector(false);
    Alert.alert('设置成功', '主页已更新');
  };

  const handleAddCustomSite = async () => {
    if (!newSiteTitle.trim()) {
      Alert.alert('提示', '请输入网站名称');
      return;
    }
    if (!newSiteUrl.trim()) {
      Alert.alert('提示', '请输入网站地址');
      return;
    }
    
    let url = newSiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    await storage.addCustomSite({ title: newSiteTitle.trim(), url });
    const sites = await storage.getCustomSites();
    setCustomSites(sites);
    setNewSiteTitle('');
    setNewSiteUrl('');
    setShowAddSite(false);
    Alert.alert('添加成功', '自定义网站已添加');
  };

  const handleDeleteCustomSite = (site: CustomSite) => {
    Alert.alert(
      '删除网站',
      `确定要删除"${site.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await storage.removeCustomSite(site.id);
            const sites = await storage.getCustomSites();
            setCustomSites(sites);
          },
        },
      ]
    );
  };

  const getHomeWebsiteName = () => {
    const website = WEBSITES.find(w => w.url === homePage);
    const customSite = customSites.find(s => s.url === homePage);
    const fav = favorites.find(f => f.url === homePage);
    return website?.name || customSite?.title || fav?.title || '未设置';
  };

  return (
    <Screen safeAreaEdges={['top', 'left', 'right', 'bottom']}>
      <ScrollView 
        className="flex-1 bg-[--background]"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="px-5 pb-4">
          <Text className="text-2xl font-bold text-[--foreground]">设置</Text>
          <Text className="text-sm text-[--muted] mt-1">个性化配置</Text>
        </View>

        {/* 主页设置 */}
        <View className="px-5">
          <Text className="text-sm font-medium text-gray-500 mb-3">主页设置</Text>
          <TouchableOpacity
            className="bg-white rounded-2xl p-4"
            style={styles.card}
            onPress={() => setShowHomeSelector(!showHomeSelector)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 items-center justify-center mr-3">
                <FontAwesome6 name="house" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-800">主页网站</Text>
                <Text className="text-sm text-gray-400 mt-1">{getHomeWebsiteName()}</Text>
              </View>
              <FontAwesome6 
                name={showHomeSelector ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color="#9CA3AF" 
              />
            </View>
          </TouchableOpacity>

          {/* 网站选择列表 */}
          {showHomeSelector && (
            <View className="bg-white rounded-2xl mt-3 overflow-hidden" style={styles.card}>
              {/* 不设置主页选项 */}
              <TouchableOpacity
                className="flex-row items-center p-4 border-b border-gray-100"
                onPress={() => handleSetHomePage('')}
                activeOpacity={0.7}
              >
                <View 
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: '#6B728015' }}
                >
                  <FontAwesome6 name="circle-xmark" size={18} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">不设置主页</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">首页显示提示信息</Text>
                </View>
                {homePage === '' && (
                  <FontAwesome6 name="check" size={18} color="#0EA5E9" />
                )}
              </TouchableOpacity>

              {/* 预定义网站 */}
              {WEBSITES.map((website, index) => (
                <TouchableOpacity
                  key={website.id}
                  className={`flex-row items-center p-4 ${index > 0 ? 'border-t border-gray-100' : 'border-t border-gray-100'}`}
                  onPress={() => handleSetHomePage(website.url)}
                  activeOpacity={0.7}
                >
                  <View 
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: website.color + '15' }}
                  >
                    <FontAwesome6 name={website.icon as any} size={18} color={website.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">{website.name}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{website.url}</Text>
                  </View>
                  {homePage === website.url && (
                    <FontAwesome6 name="check" size={18} color="#0EA5E9" />
                  )}
                </TouchableOpacity>
              ))}

              {/* 自定义网站 */}
              {customSites.map((site, index) => (
                <TouchableOpacity
                  key={site.id}
                  className="flex-row items-center p-4 border-t border-gray-100"
                  onPress={() => handleSetHomePage(site.url)}
                  activeOpacity={0.7}
                >
                  <View 
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: '#F59E0B' + '15' }}
                  >
                    <FontAwesome6 name={(site.icon as any) || 'globe'} size={18} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">{site.title}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{site.url}</Text>
                  </View>
                  {homePage === site.url && (
                    <FontAwesome6 name="check" size={18} color="#0EA5E9" />
                  )}
                </TouchableOpacity>
              ))}

              {/* 收藏网站 */}
              {favorites.length > 0 && (
                <>
                  <View className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <Text className="text-xs text-gray-500 font-medium">收藏</Text>
                  </View>
                  {favorites.map((fav, index) => (
                    <TouchableOpacity
                      key={fav.id}
                      className="flex-row items-center p-4 border-t border-gray-100"
                      onPress={() => handleSetHomePage(fav.url)}
                      activeOpacity={0.7}
                    >
                      <View 
                        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: '#EC489915' }}
                      >
                        <FontAwesome6 name="bookmark" size={18} color="#EC4899" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-800">{fav.title}</Text>
                        <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{fav.url}</Text>
                      </View>
                      {homePage === fav.url && (
                        <FontAwesome6 name="check" size={18} color="#0EA5E9" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
        </View>

        {/* 自定义网站管理 */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-medium text-gray-500">自定义网站</Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setShowAddSite(true)}
            >
              <FontAwesome6 name="plus" size={14} color="#0EA5E9" />
              <Text className="text-sm text-blue-500 ml-1">添加</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white rounded-2xl overflow-hidden" style={styles.card}>
            {customSites.length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-sm text-gray-400">暂无自定义网站</Text>
              </View>
            ) : (
              customSites.map((site, index) => (
                <View
                  key={site.id}
                  className={`flex-row items-center p-4 ${index > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <View 
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: '#F59E0B' + '15' }}
                  >
                    <FontAwesome6 name={(site.icon as any) || 'globe'} size={18} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">{site.title}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{site.url}</Text>
                  </View>
                  <TouchableOpacity
                    className="w-8 h-8 items-center justify-center"
                    onPress={() => handleDeleteCustomSite(site)}
                  >
                    <FontAwesome6 name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* 功能说明 */}
        <View className="px-5 mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-3">功能说明</Text>
          <View className="bg-white rounded-2xl p-4" style={styles.card}>
            <View className="gap-4">
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
                  <FontAwesome6 name="bookmark" size={16} color="#0EA5E9" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">收藏功能</Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    在网页中点击底部收藏按钮，或点击右上角菜单添加收藏
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center mr-3">
                  <FontAwesome6 name="house" size={16} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">主页设置</Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    设置APP打开时默认显示的网站，也可在收藏中长按设置
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center mr-3">
                  <FontAwesome6 name="arrows-rotate" size={16} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">刷新与导航</Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    使用底部导航栏进行前进、后退、刷新操作
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3">
                  <FontAwesome6 name="up-right-from-square" size={16} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">外部打开</Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    点击右上角菜单可选择在系统浏览器中打开当前页面
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 版本信息 */}
        <View className="px-5 mt-6">
          <Text className="text-sm font-medium text-gray-500 mb-3">关于</Text>
          <View className="bg-white rounded-2xl p-4" style={styles.card}>
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 items-center justify-center mr-3">
                <FontAwesome6 name="temperature-half" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-800">暖通服务</Text>
                <Text className="text-xs text-gray-400 mt-1">版本 1.0.0</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-300 mt-4">
              专为空调地暖行业打造的数据服务平台，支持手机端优化浏览
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 添加自定义网站弹窗 */}
      <Modal
        visible={showAddSite}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddSite(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 items-center justify-center"
          activeOpacity={1}
          onPress={() => setShowAddSite(false)}
        >
          <TouchableOpacity 
            className="bg-white rounded-2xl mx-8 w-80 overflow-hidden"
            activeOpacity={1}
          >
            <View className="px-5 py-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-800">添加自定义网站</Text>
            </View>
            <View className="px-5 py-4">
              <Text className="text-sm text-gray-500 mb-2">网站名称</Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 mb-4"
                value={newSiteTitle}
                onChangeText={setNewSiteTitle}
                placeholder="例如：我的网站"
                placeholderTextColor="#9CA3AF"
              />
              <Text className="text-sm text-gray-500 mb-2">网站地址</Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                value={newSiteUrl}
                onChangeText={setNewSiteUrl}
                placeholder="https://example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <View className="px-5 pb-4 flex-row gap-3">
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                onPress={() => {
                  setShowAddSite(false);
                  setNewSiteTitle('');
                  setNewSiteUrl('');
                }}
              >
                <Text className="text-gray-600 font-medium">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl bg-[--accent] items-center"
                onPress={handleAddCustomSite}
              >
                <Text className="text-white font-medium">添加</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
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
});
