import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  StatusBar,
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

// 生成横屏CSS - viewport宽度调整，点击准确
const generateLandscapeCSS = () => {
  return `
(function() {
  var style = document.getElementById('mobile-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'mobile-style';
    document.head.appendChild(style);
  }
  
  // 横屏时使用屏幕高度作为viewport宽度（约1.5倍屏幕高度）
  var screenHeight = window.innerHeight || 600;
  var targetWidth = Math.floor(screenHeight * 1.5);
  
  style.textContent = \`
    * { -webkit-tap-highlight-color: transparent !important; touch-action: manipulation !important; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      overflow: auto !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
      -webkit-user-select: none !important;
      user-select: none !important;
    }
    input, textarea, select {
      -webkit-user-select: auto !important;
      user-select: auto !important;
    }
    /* 隐藏顶部导航（取消注释启用） */
    /*
    header, .header, [class*="header"], .navbar, [class*="navbar"], .top-bar, .topbar, nav, .nav {
      display: none !important;
    }
    */
    /* 底部工具栏（取消注释启用） */
    /*
    footer, .footer, [class*="footer"], .bottom-bar, .toolbar, [class*="toolbar"], .tab-bar, .tabs {
      display: none !important;
    }
    */
    table { 
      width: 100% !important; 
      max-width: 100% !important;
      font-size: 14px !important;
    }
    td, th { 
      padding: 6px !important; 
      font-size: 13px !important;
    }
    input, select, textarea { 
      font-size: 16px !important; 
      min-height: 44px !important; 
    }
  \`;
  
  // 设置viewport宽度和缩放
  var viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.content = 'width=' + targetWidth + ', initial-scale=0.4, maximum-scale=0.4, minimum-scale=0.4, user-scalable=no';
  } else {
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=' + targetWidth + ', initial-scale=0.4, maximum-scale=0.4, minimum-scale=0.4, user-scalable=no';
    document.head.appendChild(meta);
  }
  
  // 滚动到顶部
  var scrollTimer = setTimeout(function() {
    window.scrollTo(0, 0);
    clearTimeout(scrollTimer);
  }, 200);
})();
true;
`;
};

// 生成竖屏CSS
const generatePortraitCSS = () => {
  return `
(function() {
  var style = document.getElementById('mobile-style');
  if (style) {
    style.textContent = '';
  }
  
  var viewport = document.querySelector('meta[name="viewport"]');
  var newContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no';
  if (viewport) {
    viewport.content = newContent;
  } else {
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = newContent;
    document.head.appendChild(meta);
  }
  
  var scrollTimer = setTimeout(function() {
    window.scrollTo(0, 0);
    clearTimeout(scrollTimer);
  }, 100);
})();
true;
`;
};

// 注入JS - 拦截所有跳转并绕过WebView检测
const INTERCEPT_JS = `
(function() {
  // 绕过WebView检测
  Object.defineProperty(navigator, 'userAgent', {
    get: function() {
      return 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    }
  });
  
  // 隐藏WebView特征
  if (window.webkit && window.webkit.messageHandlers) {
    // 伪装成普通浏览器
  }
  
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
      
      // 忽略空链接和锚点
      if (!href || href === '#' || href.startsWith('javascript:')) {
        return;
      }
      
      // 阻止 intent 和其他APP协议
      if (href.startsWith('intent://') || href.startsWith('market://')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // 所有链接都在本WebView内处理
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

  // 获取屏幕尺寸
  const [screenSize, setScreenSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // 超时计时器
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 监听屏幕尺寸变化
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenSize({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  // 切换横屏/竖屏
  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsLandscape(false);
        setTimeout(() => {
          webViewRef.current?.injectJavaScript(generatePortraitCSS());
        }, 150);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
        setTimeout(() => {
          webViewRef.current?.injectJavaScript(generateLandscapeCSS());
        }, 150);
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

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 设置加载超时
  const startTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setLoadError('加载超时，请检查网络或网站是否可访问');
    }, 30000); // 30秒超时
  };

  // 清除超时
  const clearTimeoutTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // 重试加载
  const handleRetry = () => {
    setLoadError(null);
    setLoading(true);
    setProgress(0);
    setRetryCount(prev => prev + 1);
    webViewRef.current?.reload();
  };

  // 处理JS发送的消息
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'navigate') {
        // 使用 WebView 的 injectJavaScript 导航
        webViewRef.current?.injectJavaScript(`window.location.href = "${data.url}"; true;`);
        setTimeout(() => {
          if (isLandscape) {
            webViewRef.current?.injectJavaScript(generateLandscapeCSS());
          }
        }, 500);
      }
    } catch (e) {
      // 忽略
    }
  }, [isLandscape]);

  // 页面加载完成后应用样式
  const handleLoadEnd = () => {
    setLoading(false);
    setProgress(1);
    clearTimeoutTimer();
    setTimeout(() => {
      if (isLandscape) {
        webViewRef.current?.injectJavaScript(generateLandscapeCSS());
      } else {
        webViewRef.current?.injectJavaScript(generatePortraitCSS());
      }
    }, 300);
  };

  // 处理加载错误
  const handleError = (syntheticEvent: any) => {
    setLoading(false);
    setLoadError('网页加载失败，请检查网络或网站是否可访问');
    clearTimeoutTimer();
  };

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
      <StatusBar hidden={isLandscape} barStyle="dark-content" />
      <View className={`flex-1 bg-[--background] ${isLandscape ? 'flex-row' : ''}`}>
        {/* Header */}
        <View 
          className={`bg-white border-gray-100 ${isLandscape ? 'border-r border-b' : 'border-b'}`}
          style={{ 
            paddingTop: isLandscape ? 0 : insets.top,
            width: isLandscape ? 50 : '100%',
          }}
        >
          <View className={`flex-row items-center ${isLandscape ? 'flex-col justify-center h-full px-1' : 'h-12 px-2'}`}>
            {/* 返回按钮 */}
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
                name={canGoBack ? 'arrow-left' : 'home'} 
                size={18} 
                color="#374151" 
              />
            </TouchableOpacity>

            {/* 竖屏时显示标题和首页按钮 */}
            {!isLandscape && (
              <>
                <View className="flex-1 px-2">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                    {currentTitleState}
                  </Text>
                </View>
                {/* 首页按钮 */}
                <TouchableOpacity 
                  className="w-10 h-12 items-center justify-center"
                  onPress={() => router.back()}
                >
                  <FontAwesome6 name="house" size={18} color="#374151" />
                </TouchableOpacity>
              </>
            )}

            {isLandscape ? (
              <>
                {/* 横屏模式：收藏按钮 */}
                <TouchableOpacity 
                  className="items-center justify-center w-10 h-14"
                  onPress={handleAddFavorite}
                >
                  <FontAwesome6 
                    name={isFavorite ? 'bookmark' : 'bookmark'} 
                    size={18} 
                    color={isFavorite ? '#0EA5E9' : '#374151'} 
                  />
                </TouchableOpacity>
                {/* 横屏模式：设为主页按钮 */}
                <TouchableOpacity 
                  className="items-center justify-center w-10 h-14"
                  onPress={handleSetHomePage}
                >
                  <FontAwesome6 name="house" size={18} color="#374151" />
                </TouchableOpacity>
              </>
            ) : null}

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
                className="h-full bg-[--accent}" 
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          )}
        </View>

        {/* 竖屏时的标题栏 */}
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
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url;
              // 允许所有 http/https 链接
              if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('about:')) {
                return true;
              }
              // 阻止其他协议的链接（intent://, tel:, mailto: 等）
              return false;
            }}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => {
              setLoading(true);
              setProgress(0);
              setLoadError(null);
              startTimeout();
            }}
            onLoadProgress={({ nativeEvent }) => {
              setProgress(nativeEvent.progress);
            }}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={(event) => {
              const { statusCode } = event.nativeEvent;
              if (statusCode >= 400) {
                setLoadError(`HTTP 错误: ${statusCode}`);
                setLoading(false);
                clearTimeoutTimer();
              }
            }}
            onMessage={handleMessage}
            allowsBackForwardNavigationGestures={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={isLandscape}
            applicationNameForUserAgent="Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            {...(Platform.OS === 'ios' ? {
              allowsInlineMediaPlayback: true,
              bounces: true,
            } : {})}
            {...(Platform.OS === 'android' ? {
              thirdPartyCookiesEnabled: true,
              // 启用缓存
              cacheEnabled: true,
              // 缓存模式：优先使用缓存
              cacheMode: 'LOAD_CACHE_ELSE_NETWORK',
              loadWithOverviewMode: false,
              useWideViewPort: false,
              // 忽略 SSL 证书错误，允许访问自签名证书的网站
              ignoreSslError: true,
              javaScriptEnabled: true,
              // 允许加载混合内容（HTTP和HTTPS混合）
              mixedContentMode: 'always',
              // 允许访问文件
              allowFileAccess: true,
              // 允许内容访问
              contentAccess: true,
              // 允许访问内容 URL
              allowContentAccess: true,
              // 媒体播放设置
              mediaPlaybackRequiresUserAction: false,
              // 允许后台播放
              allowsInlineMediaPlayback: true,
              // 启用数据库
              databaseEnabled: true,
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

          {/* 错误提示 */}
          {loadError && (
            <View className="absolute inset-0 items-center justify-center bg-gray-50">
              <View className="items-center px-8">
                <FontAwesome6 name="exclamation-circle" size={48} color="#EF4444" />
                <Text className="mt-4 text-base text-gray-700 text-center">{loadError}</Text>
                <Text className="mt-2 text-sm text-gray-500 text-center">{currentUrl}</Text>
                <View className="flex-row mt-6 flex-wrap justify-center">
                  <TouchableOpacity 
                    className="px-6 py-3 bg-gray-200 rounded-full mr-3 mb-2"
                    onPress={() => router.back()}
                  >
                    <Text className="text-gray-700">返回</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="px-6 py-3 bg-blue-500 rounded-full mr-3 mb-2"
                    onPress={handleRetry}
                  >
                    <Text className="text-white">重试</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="px-6 py-3 bg-green-500 rounded-full mb-2"
                    onPress={() => Linking.openURL(currentUrl)}
                  >
                    <Text className="text-white">用浏览器打开</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
              className="bg-white rounded-2xl mx-8 w-80 overflow-hidden px-4"
              activeOpacity={1}
            >
              <View className="py-4 border-b border-gray-100">
                <Text className="text-lg font-semibold text-gray-800 text-center">添加收藏</Text>
              </View>
              <View className="py-4">
                <Text className="text-sm text-gray-500 mb-2">收藏名称</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
                  value={favTitle}
                  onChangeText={setFavTitle}
                  placeholder="输入收藏名称"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View className="pb-4 flex-row gap-4">
                <TouchableOpacity 
                  className="flex-1 py-3 rounded-xl bg-gray-200 items-center"
                  onPress={() => setShowAddFavorite(false)}
                >
                  <Text className="text-gray-700 font-medium text-base">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{ backgroundColor: '#0EA5E9' }}
                  onPress={confirmAddFavorite}
                >
                  <Text className="text-white font-medium text-base">确定</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </Screen>
  );
}
