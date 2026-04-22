import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';

interface Product {
  id: string;
  name: string;
  brand: string;
  specifications: string;
  unit: string;
  material: string;
  features: string;
  image_url: string | null;
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/products`);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        setBrands(data.brands || []);
      }
    } catch (err) {
      console.error('获取产品失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  const filteredProducts = selectedBrand
    ? products.filter(p => p.brand === selectedBrand)
    : products;

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <View className="flex-1 bg-[--background]" style={{ paddingTop: insets.top + 8 }}>
        {/* Header */}
        <View className="px-5 pb-4">
          <Text className="text-2xl font-bold text-[--foreground]">辅材产品</Text>
          <Text className="text-sm text-[--muted] mt-1">品牌辅材参考 · 数据来源：飞书多维表格</Text>
        </View>

        {/* 品牌筛选 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-4">
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mr-2 ${!selectedBrand ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setSelectedBrand(null)}
          >
            <Text className={!selectedBrand ? 'text-white' : 'text-gray-700'}>全部品牌</Text>
          </TouchableOpacity>
          {brands.map((brand) => (
            <TouchableOpacity
              key={brand}
              className={`px-4 py-2 rounded-full mr-2 ${selectedBrand === brand ? 'bg-blue-500' : 'bg-gray-200'}`}
              onPress={() => setSelectedBrand(brand)}
            >
              <Text className={selectedBrand === brand ? 'text-white' : 'text-gray-700'}>{brand}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 产品列表 */}
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#0EA5E9" />
              <Text className="text-gray-400 mt-4">加载中...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View className="items-center justify-center py-20">
              <FontAwesome6 name="box-open" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4">暂无产品</Text>
              <Text className="text-gray-400 text-sm mt-1">请在飞书多维表格中添加数据</Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <View
                key={product.id}
                className="bg-white rounded-2xl p-4 mb-3 flex-row"
                style={styles.card}
              >
                <View 
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#F3F4F6' }}
                >
                  <FontAwesome6 name="cube" size={24} color="#6B7280" />
                </View>
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text className="text-base font-semibold text-gray-800 flex-1" numberOfLines={1}>
                      {product.name}
                    </Text>
                    {product.brand && (
                      <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                        <Text className="text-xs text-blue-600">{product.brand}</Text>
                      </View>
                    )}
                  </View>
                  
                  {product.specifications && (
                    <View className="flex-row items-center mt-1">
                      <View className="bg-gray-100 px-2 py-0.5 rounded">
                        <Text className="text-xs text-gray-600">{product.specifications}</Text>
                      </View>
                    </View>
                  )}

                  <View className="flex-row flex-wrap mt-2 gap-1">
                    {product.material && (
                      <View className="bg-gray-50 px-2 py-0.5 rounded">
                        <Text className="text-xs text-gray-500">材质: {product.material}</Text>
                      </View>
                    )}
                    {product.unit && (
                      <View className="bg-gray-50 px-2 py-0.5 rounded">
                        <Text className="text-xs text-gray-500">单位: {product.unit}</Text>
                      </View>
                    )}
                  </View>

                  {product.features && (
                    <Text className="text-xs text-gray-400 mt-2" numberOfLines={2}>
                      {product.features}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
          <View className="h-20" />
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
