import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { storage } from '@/utils/storage';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

// 移动端User Agent
const MOBILE_USER_AGENT = Platform.select({
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  web: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});

export default function WebViewScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const webViewRef = useRef<WebView>(null);
  const params = useSafeSearchParams<{ url: string; title: string }>();
  
  const currentUrl = params.url || 'https://ac.nlyy.online';
  const currentTitle = params.title || '暖通服务';

  const [currentTitleState, setCurrentTitleState] = useState(currentTitle);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddFavorite, setShowAddFavorite] = useState(false);
  const [favTitle, setFavTitle] = useState(currentTitle);
  const [currentUrlState, setCurrentUrlState] = useState(currentUrl);

  // 初始检查收藏状态
  React.useEffect(() => {
    storage.isFavorite(currentUrlState).then((isFav) => {
      setIsFavorite(isFav);
    });
  }, []);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    const newUrl = navState.url;
    setCurrentUrlState(newUrl);
    storage.isFavorite(newUrl).then((isFav) => {
      setIsFavorite(isFav);
    });
  };

  const handleAddFavorite = async () => {
    if (isFavorite) {
      const favorites = await storage.getFavorites();
      const item = favorites.find(f => f.url === currentUrlState);
      if (item) {
        await storage.removeFavorite(item.id);
        setIsFavorite(false);
        Alert.alert('已取消收藏', '该页面已从收藏夹移除');
      }
    } else {
      setFavTitle(currentTitleState);
      setShowAddFavorite(true);
    }
    setShowMenu(false);
  };

  const confirmAddFavorite = async () => {
    if (!favTitle.trim()) {
      Alert.alert('提示', '请输入收藏名称');
      return;
    }
    await storage.addFavorite({
      title: favTitle.trim(),
      url: currentUrlState,
    });
    setIsFavorite(true);
    setShowAddFavorite(false);
    Alert.alert('收藏成功', '该页面已添加到收藏夹');
  };

  const handleSetHomePage = async () => {
    await storage.setHomePage(currentUrlState);
    setShowMenu(false);
    Alert.alert('设置成功', '该页面已设为主页');
  };

  const handleOpenExternal = async () => {
    try {
      await Linking.openURL(currentUrlState);
    } catch (error) {
      console.error('无法打开外部链接:', error);
    }
    setShowMenu(false);
  };

  // 注入CSS优化样式
  const injectCSS = `
    (function() {
      // 检测是否为移动端，如果没有viewport meta则注入
      if (!document.querySelector('meta[name="viewport"]')) {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes';
        document.head.appendChild(meta);
      }
      
      // 优化表格和容器的宽度
      var style = document.createElement('style');
      style.textContent = \`
        body { 
          -webkit-text-size-adjust: 100% !important;
          text-size-adjust: 100% !important;
        }
        table { 
          width: 100% !important; 
          max-width: 100% !important;
          font-size: 14px !important;
        }
        td, th { 
          padding: 8px !important; 
          font-size: 13px !important;
        }
        input, select, textarea {
          font-size: 16px !important;
        }
        * {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      \`;
      document.head.appendChild(style);
    })();
    true;
  `;

  return (
    <Screen safeAreaEdges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-1 bg-[--background]">
        {/* Header */}
        <View 
          className="bg-white border-b border-gray-100"
          style={{ paddingTop: insets.top }}
        >
          <View className="h-12 flex-row items-center px-2">
            {/* 返回按钮 */}
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center"
              onPress={() => {
                if (canGoBack) {
                  webViewRef.current?.goBack();
                } else {
                  router.back();
                }
              }}
            >
              <FontAwesome6 
                name={canGoBack ? 'arrow-left' : 'xmark'} 
                size={18} 
                color="#374151" 
              />
            </TouchableOpacity>

            {/* 标题 */}
            <View className="flex-1 px-2">
              <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                {currentTitleState}
              </Text>
            </View>

            {/* 更多菜单 */}
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center"
              onPress={() => setShowMenu(!showMenu)}
            >
              <FontAwesome6 name="ellipsis-vertical" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* 进度条 */}
          {loading && (
            <View className="h-0.5 bg-gray-100">
              <View 
                className="h-full bg-[--accent]" 
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          )}
        </View>

        {/* 下拉菜单 */}
        {showMenu && (
          <TouchableOpacity 
            className="absolute right-2 top-14 bg-white rounded-xl shadow-lg py-2 z-50"
            style={{ width: 180 }}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          >
            <TouchableOpacity 
              className="flex-row items-center px-4 py-3"
              onPress={handleAddFavorite}
            >
              <FontAwesome6 
                name="bookmark" 
                size={16} 
                color={isFavorite ? '#0EA5E9' : '#6B7280'} 
              />
              <Text className={`ml-3 text-sm ${isFavorite ? 'text-blue-500' : 'text-gray-700'}`}>
                {isFavorite ? '取消收藏' : '添加收藏'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center px-4 py-3"
              onPress={handleSetHomePage}
            >
              <FontAwesome6 name="house" size={16} color="#6B7280" />
              <Text className="ml-3 text-sm text-gray-700">设为主页</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center px-4 py-3"
              onPress={handleOpenExternal}
            >
              <FontAwesome6 name="up-right-from-square" size={16} color="#6B7280" />
              <Text className="ml-3 text-sm text-gray-700">浏览器打开</Text>
            </TouchableOpacity>
            <View className="h-px bg-gray-100 my-1" />
            <View className="px-4 py-2">
              <Text className="text-xs text-gray-400">{currentUrlState}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* WebView - 移动端优化配置 */}
        <View className="flex-1">
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            style={{ flex: 1 }}
            // 移动端User Agent
            userAgent={MOBILE_USER_AGENT}
            // 导航状态变化
            onNavigationStateChange={handleNavigationStateChange}
            // 加载状态
            onLoadStart={() => {
              setLoading(true);
              setProgress(0);
            }}
            onLoadProgress={({ nativeEvent }) => {
              setProgress(nativeEvent.progress);
            }}
            onLoadEnd={() => {
              setLoading(false);
              setProgress(1);
            }}
            // 移动端优化设置
            allowsBackForwardNavigationGestures={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            // 防止跳转到外部浏览器
            onShouldStartLoadWithRequest={(request) => {
              const { url } = request;
              // 允许内部链接
              if (url.startsWith('http://') || url.startsWith('https://')) {
                return true;
              }
              // 其他链接询问是否打开
              Alert.alert(
                '提示',
                '是否在浏览器中打开此链接？',
                [
                  { text: '取消', style: 'cancel' },
                  { text: '打开', onPress: () => Linking.openURL(url) },
                ]
              );
              return false;
            }}
            // iOS特定优化
            {...(Platform.OS === 'ios' ? {
              allowsInlineMediaPlayback: true,
              bounces: true,
              paginationMode: false,
            } : {})}
            // Android特定优化
            {...(Platform.OS === 'android' ? {
              thirdPartyCookiesEnabled: true,
              allowFileAccess: true,
              cacheEnabled: true,
              loadWithOverviewMode: true,
              useWideViewPort: true,
            } : {})}
            // 注入CSS优化
            injectedJavaScript={injectCSS}
            // 加载指示器
            startInLoadingState={true}
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text className="mt-3 text-sm text-gray-500">加载中...</Text>
              </View>
            )}
          />
        </View>

        {/* 底部导航栏 */}
        <View 
          className="bg-white border-t border-gray-100 flex-row items-center justify-center py-2"
          style={{ paddingBottom: insets.bottom + 4 }}
        >
          <TouchableOpacity 
            className="flex-1 items-center py-2"
            onPress={() => webViewRef.current?.goBack()}
            disabled={!canGoBack}
          >
            <FontAwesome6 
              name="chevron-left" 
              size={20} 
              color={canGoBack ? '#374151' : '#D1D5DB'} 
            />
            <Text className={`text-xs mt-1 ${canGoBack ? 'text-gray-600' : 'text-gray-300'}`}>
              返回
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 items-center py-2"
            onPress={() => webViewRef.current?.goForward()}
            disabled={!canGoForward}
          >
            <FontAwesome6 
              name="chevron-right" 
              size={20} 
              color={canGoForward ? '#374151' : '#D1D5DB'} 
            />
            <Text className={`text-xs mt-1 ${canGoForward ? 'text-gray-600' : 'text-gray-300'}`}>
              前进
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 items-center py-2"
            onPress={() => webViewRef.current?.reload()}
          >
            <FontAwesome6 name="rotate-right" size={20} color="#374151" />
            <Text className="text-xs mt-1 text-gray-600">刷新</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 items-center py-2"
            onPress={() => {
              setFavTitle(currentTitleState);
              setShowAddFavorite(true);
            }}
          >
            <FontAwesome6 
              name="bookmark" 
              size={20} 
              color={isFavorite ? '#0EA5E9' : '#374151'} 
            />
            <Text className={`text-xs mt-1 ${isFavorite ? 'text-blue-500' : 'text-gray-600'}`}>
              {isFavorite ? '已收藏' : '收藏'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 添加收藏弹窗 */}
        <Modal
          visible={showAddFavorite}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddFavorite(false)}
        >
          <TouchableOpacity 
            className="flex-1 bg-black/50 items-center justify-center"
            activeOpacity={1}
            onPress={() => setShowAddFavorite(false)}
          >
            <TouchableOpacity 
              className="bg-white rounded-2xl mx-8 w-72 overflow-hidden"
              activeOpacity={1}
            >
              <View className="px-5 py-4 border-b border-gray-100">
                <Text className="text-lg font-semibold text-gray-800">添加收藏</Text>
              </View>
              <View className="px-5 py-4">
                <Text className="text-sm text-gray-500 mb-2">收藏名称</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  value={favTitle}
                  onChangeText={setFavTitle}
                  placeholder="输入收藏名称"
                  placeholderTextColor="#9CA3AF"
                />
                <Text className="text-xs text-gray-400 mt-2">网址：{currentUrlState}</Text>
              </View>
              <View className="px-5 pb-4 flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                  onPress={() => setShowAddFavorite(false)}
                >
                  <Text className="text-gray-600 font-medium">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 py-3 rounded-xl bg-[--accent] items-center"
                  onPress={confirmAddFavorite}
                >
                  <Text className="text-white font-medium">确定</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </Screen>
  );
}
