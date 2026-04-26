import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Modal } from 'react-native';
import Constants from 'expo-constants';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

// APP 当前版本（从 app.config.ts 的 version 字段读取）
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

interface VersionInfo {
  version: string;
  downloadUrl: string;
  forceUpdate: boolean;
}

export default function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/version`);
      const data: VersionInfo = await res.json();
      
      if (data.version && isNewerVersion(data.version, CURRENT_VERSION)) {
        setUpdateInfo(data);
        setShowModal(true);
      }
    } catch (error) {
      console.log('检查更新失败:', error);
    }
  }

  function isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newVal = newParts[i] || 0;
      const currentVal = currentParts[i] || 0;
      if (newVal > currentVal) return true;
      if (newVal < currentVal) return false;
    }
    return false;
  }

  async function handleDownload() {
    if (!updateInfo?.downloadUrl) return;
    
    setIsDownloading(true);
    try {
      await Linking.openURL(updateInfo.downloadUrl);
    } catch (error) {
      console.error('打开下载链接失败:', error);
    }
    setIsDownloading(false);
  }

  function handleClose() {
    // 如果是强制更新，不允许关闭
    if (updateInfo?.forceUpdate) return;
    setShowModal(false);
  }

  if (!updateInfo) return null;

  return (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚀</Text>
          </View>
          
          <Text style={styles.title}>发现新版本</Text>
          <Text style={styles.version}>V{updateInfo.version}</Text>
          
          <Text style={styles.description}>
            发现了新版本，请及时更新以获得更好的体验。
          </Text>

          <TouchableOpacity
            style={[styles.button, updateInfo.forceUpdate && styles.forceButton]}
            onPress={handleDownload}
          >
            <Text style={styles.buttonText}>
              {isDownloading ? '正在打开...' : '立即更新'}
            </Text>
          </TouchableOpacity>

          {!updateInfo.forceUpdate && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeText}>稍后再说</Text>
            </TouchableOpacity>
          )}

          {updateInfo.forceUpdate && (
            <Text style={styles.forceHint}>
              此版本为必须更新，无法取消
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '85%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  forceButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    padding: 8,
  },
  closeText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  forceHint: {
    marginTop: 16,
    fontSize: 12,
    color: '#EF4444',
  },
});
