import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

// 更新提示组件
function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true);
      }
    } catch (error) {
      console.log('检查更新失败:', error);
    }
  }

  async function downloadAndReload() {
    try {
      setIsDownloading(true);
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.log('下载更新失败:', error);
      setIsDownloading(false);
    }
  }

  if (!updateAvailable) return null;

  return (
    <View style={styles.updateBanner}>
      <View style={styles.updateContent}>
        <Text style={styles.updateText}>发现新版本可用</Text>
        <Text style={styles.updateSubtext}>点击更新以获取最新功能</Text>
      </View>
      <TouchableOpacity
        style={[styles.updateButton, isDownloading && styles.updateButtonDisabled]}
        onPress={downloadAndReload}
        disabled={isDownloading}
      >
        <Text style={styles.updateButtonText}>
          {isDownloading ? '更新中...' : '立即更新'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  return (
    <Provider>
      <UpdateBanner />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="(tabs)" options={{ title: "" }} />
        <Stack.Screen name="webview" options={{ title: "" }} />
      </Stack>
      <Toast />
    </Provider>
  );
}

const styles = StyleSheet.create({
  updateBanner: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateContent: {
    flex: 1,
  },
  updateText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  updateSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  updateButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#0EA5E9',
    fontSize: 13,
    fontWeight: '600',
  },
});
