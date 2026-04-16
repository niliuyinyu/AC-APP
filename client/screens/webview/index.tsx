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
  Dimensions,
} from 'react-native';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Screen } from '@/components/Screen';
import { storage } from '@/utils/storage';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

// 移动端User Agent
const MOBILE_USER_AGENT = Platform.select({
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  web: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});

// 注入JS - 拦截window.open，让所有链接在WebView内打开
const INTERCEPT_JS = `
(function() {
  // 拦截 window.open
  window.open = function(url, name, specs) {
    if (url && url !== 'about:blank' && url !== '') {
      window.location.href = url;
    }
    return null;
  };
  
  // 拦截所有链接点击
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    
    if (target && target.href) {
      var href = target.href;
      
      if (!href || href === '#' || href === 'javascript:void(0)' || 
          href === 'javascript:;' || href.startsWith('javascript:')) {
        return;
      }
      
      if (href.startsWith('#')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'navigate',
        url: href
      }));
    }
  }, true);
  
  // 拦截表单提交
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action) {
      e.preventDefault();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'navigate',
        url: form.action
      }));
    }
  }, true);
  
  // 注入样式优化
  var style = document.createElement('style');
  style.textContent = \`
    * {
      -webkit-tap-highlight-color: transparent !important;
    }
    body { 
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }
    input, textarea, select {
      -webkit-user-select: auto !important;
      user-select: auto !important;
    }
    table { 
      width: 100% !important; 
      max-width: 100% !important;
    }
    td, th { 
      padding: 6px !important; 
    }
    input, select, textarea {
      font-size: 16px !important;
      min-height: 44px !important;
    }
  \`;
  document.head.appendChild(style);
  
  if (!document.querySelector('meta[name="viewport"]')) {
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes';
    document.head.appendChild(meta);
  }
})();
true;
`;

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
  const [isLandscape, setIsLandscape] = useState(false);

  // 切换横屏/竖屏
  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch (error) {
      console.log('Orientation error:', error);
    }
  };

  // 初始检查收藏状态
  React.useEffect(() => {
    storage.isFavorite(currentUrlState).then((isFav) => {
      setIsFavorite(isFav);
    });

    // 组件卸载时恢复竖屏
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
    };
  }, []);

  // 处理JS发送的消息
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'navigate') {
        webViewRef.current?.injectJavaScript(`window.location.href = "${data.url}"; true;`);
      }
    } catch (e) {
      // 忽略
    }
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
      }
    } else {
      setFavTitle(currentTitleState);
      setShowAddFavorite(true);
    }
    setShowMenu(false);
  };

  const confirmAddFavorite = async () => {
    if (!favTitle.trim()) return;
    await storage.addFavorite({
      title: favTitle.trim(),
      url: currentUrlState,
    });
    setIsFavorite(true);
    setShowAddFavorite(false);
  };

  const handleSetHomePage = async () => {
    await storage.setHomePage(currentUrlState);
    setShowMenu(false);
  };

  return (
    <Screen safeAreaEdges={['top', 'left', 'right', 'bottom']}>
      <View className={`flex-1 bg-[--background] ${isLandscape ? 'flex-row' : ''}`}>
        {/* Header */}
        <View 
          className="bg-white border-b border-gray-100"
          style={{ 
            paddingTop: insets.top,
            width: isLandscape ? 50 : '100%',
            height: isLandscape ? '100%' : undefined,
          }}
        >
          <View className={`flex-row items-center ${isLandscape ? 'flex-col justify-center h-full px-1' : 'h-12 px-2'}`}>
            <TouchableOpacity 
              className={`items-center justify-center ${isLandscape ? 'w-10 h-14' : 'w-10 h-12'}`}
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

            {!isLandscape && (
              <View className="flex-1 px-2">
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                  {currentTitleState}
                </Text>
              </View>
            )}

            {/* 横屏按钮 */}
            <TouchableOpacity 
              className={`items-center justify-center ${isLandscape ? 'w-10 h-14' : 'w-10 h-12'}`}
              onPress={toggleOrientation}
            >
              <FontAwesome6 
                name={isLandscape ? 'arrows-to-dot' : 'expand'} 
                size={18} 
                color="#374151" 
              />
            </TouchableOpacity>
          </View>

          {!isLandscape && (
            <View className="h-0.5 bg-gray-100">
              <View 
                className="h-full bg-[--accent]" 
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          )}
        </View>

        {/* 竖屏时的标题 */}
        {!isLandscape && (
          <View className="flex-row items-center px-3 py-2 bg-gray-50">
            <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
              {currentTitleState}
            </Text>
          </View>
        )}

        {/* 下拉菜单 */}
        {!isLandscape && showMenu && (
          <TouchableOpacity 
            className="absolute right-2 top-14 bg-white rounded-xl shadow-lg py-2 z-50"
            style={{ width: 160 }}
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
          </TouchableOpacity>
        )}

        {/* WebView */}
        <View className="flex-1">
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            style={{ flex: 1 }}
            userAgent={MOBILE_USER_AGENT}
            onNavigationStateChange={handleNavigationStateChange}
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
            onMessage={handleMessage}
            allowsBackForwardNavigationGestures={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            {...(Platform.OS === 'ios' ? {
              allowsInlineMediaPlayback: true,
              bounces: true,
            } : {})}
            {...(Platform.OS === 'android' ? {
              thirdPartyCookiesEnabled: true,
              cacheEnabled: true,
              loadWithOverviewMode: true,
              useWideViewPort: true,
            } : {})}
            injectedJavaScript={INTERCEPT_JS}
            startInLoadingState={true}
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text className="mt-3 text-sm text-gray-500">加载中...</Text>
              </View>
            )}
          />
        </View>

        {/* 底部导航栏 - 竖屏时显示 */}
        {!isLandscape && (
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
              onPress={toggleOrientation}
            >
              <FontAwesome6 name="expand" size={20} color="#374151" />
              <Text className="text-xs mt-1 text-gray-600">横屏</Text>
            </TouchableOpacity>
          </View>
        )}

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
