import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  FAVORITES: '@app_favorites',
  HOME_PAGE: '@app_home_page',
};

export interface FavoriteItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  addedAt: number;
}

export interface StorageData {
  favorites: FavoriteItem[];
  homePage: string;
}

const DEFAULT_HOME_PAGE = 'https://ac.nlyy.online';

export const storage = {
  // 获取所有收藏
  async getFavorites(): Promise<FavoriteItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取收藏失败:', error);
      return [];
    }
  },

  // 添加收藏
  async addFavorite(item: Omit<FavoriteItem, 'id' | 'addedAt'>): Promise<FavoriteItem[]> {
    try {
      const favorites = await this.getFavorites();
      const newItem: FavoriteItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        addedAt: Date.now(),
      };
      const updated = [newItem, ...favorites];
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('添加收藏失败:', error);
      return [];
    }
  },

  // 删除收藏
  async removeFavorite(id: string): Promise<FavoriteItem[]> {
    try {
      const favorites = await this.getFavorites();
      const updated = favorites.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('删除收藏失败:', error);
      return [];
    }
  },

  // 检查是否已收藏
  async isFavorite(url: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some(item => item.url === url);
  },

  // 获取主页设置
  async getHomePage(): Promise<string> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HOME_PAGE);
      return data || DEFAULT_HOME_PAGE;
    } catch (error) {
      console.error('获取主页设置失败:', error);
      return DEFAULT_HOME_PAGE;
    }
  },

  // 设置主页
  async setHomePage(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HOME_PAGE, url);
    } catch (error) {
      console.error('设置主页失败:', error);
    }
  },

  // 清除所有数据
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.FAVORITES, STORAGE_KEYS.HOME_PAGE]);
    } catch (error) {
      console.error('清除数据失败:', error);
    }
  },
};
