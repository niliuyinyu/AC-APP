import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';

interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  specifications: string | null;
  unit: string;
  price: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

const CATEGORIES_PREDEFINED = ['管材', '阀门', '保温材料', '接头', '支架', '其他'];

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 添加/编辑 Modal 状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    specifications: '',
    unit: '个',
    price: '',
    description: '',
  });

  const fetchProducts = useCallback(async () => {
    try {
      const url = selectedCategory 
        ? `${API_BASE}/api/v1/products?category=${encodeURIComponent(selectedCategory)}`
        : `${API_BASE}/api/v1/products`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        // 提取分类
        const cats = [...new Set(data.products.map((p: Product) => p.category))];
        setCategories(cats.sort());
      }
    } catch (err) {
      console.error('获取产品失败:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      category: '',
      specifications: '',
      unit: '个',
      price: '',
      description: '',
    });
    setEditingProduct(null);
  };

  const handleAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      specifications: product.specifications || '',
      unit: product.unit,
      price: product.price || '',
      description: product.description || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.brand || !formData.category) {
      Alert.alert('错误', '请填写产品名称、品牌和分类');
      return;
    }

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct 
        ? `${API_BASE}/api/v1/products/${editingProduct.id}`
        : `${API_BASE}/api/v1/products`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? parseFloat(formData.price) : null,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存失败');
      }

      setModalVisible(false);
      resetForm();
      fetchProducts();
      Alert.alert('成功', editingProduct ? '产品已更新' : '产品已添加');
    } catch (err: any) {
      Alert.alert('错误', err.message);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      '确认删除',
      `确定要删除 "${product.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/api/v1/products/${product.id}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                fetchProducts();
                Alert.alert('成功', '产品已删除');
              }
            } catch (err) {
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <View className="flex-1 bg-[--background]" style={{ paddingTop: insets.top + 8 }}>
        {/* Header */}
        <View className="px-5 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-[--foreground]">辅材产品</Text>
            <Text className="text-sm text-[--muted] mt-1">品牌辅材参考</Text>
          </View>
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: '#0EA5E9' }}
            onPress={handleAdd}
          >
            <FontAwesome6 name="plus" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* 分类筛选 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-4">
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mr-2 ${!selectedCategory ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setSelectedCategory(null)}
          >
            <Text className={!selectedCategory ? 'text-white' : 'text-gray-700'}>全部</Text>
          </TouchableOpacity>
          {[...new Set([...CATEGORIES_PREDEFINED, ...categories])].map((cat) => (
            <TouchableOpacity
              key={cat}
              className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === cat ? 'bg-blue-500' : 'bg-gray-200'}`}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text className={selectedCategory === cat ? 'text-white' : 'text-gray-700'}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 产品列表 */}
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {loading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-400">加载中...</Text>
            </View>
          ) : products.length === 0 ? (
            <View className="items-center justify-center py-20">
              <FontAwesome6 name="box-open" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4">暂无产品</Text>
              <Text className="text-gray-400 text-sm">点击右上角添加产品</Text>
            </View>
          ) : (
            products.map((product) => (
              <TouchableOpacity
                key={product.id}
                className="bg-white rounded-2xl p-4 mb-3 flex-row"
                style={styles.card}
                onPress={() => handleEdit(product)}
                onLongPress={() => handleDelete(product)}
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
                    <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-blue-600">{product.brand}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <View className="bg-gray-100 px-2 py-0.5 rounded">
                      <Text className="text-xs text-gray-600">{product.category}</Text>
                    </View>
                    {product.specifications && (
                      <Text className="text-xs text-gray-400 ml-2" numberOfLines={1}>
                        {product.specifications}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center mt-2 justify-between">
                    {product.price && (
                      <Text className="text-base font-bold text-red-500">
                        ¥{product.price}
                      </Text>
                    )}
                    <Text className="text-xs text-gray-400">单位: {product.unit}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View className="h-20" />
        </ScrollView>

        {/* 添加/编辑 Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl" style={{ maxHeight: '80%' }}>
              <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                <Text className="text-lg font-semibold">
                  {editingProduct ? '编辑产品' : '添加产品'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome6 name="times" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                <Text className="text-sm text-gray-600 mb-1">产品名称 *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-gray-800"
                  placeholder="如：PPR热水管"
                  value={formData.name}
                  onChangeText={(t) => setFormData({ ...formData, name: t })}
                />

                <Text className="text-sm text-gray-600 mb-1">品牌 *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-gray-800"
                  placeholder="如：伟星、日丰"
                  value={formData.brand}
                  onChangeText={(t) => setFormData({ ...formData, brand: t })}
                />

                <Text className="text-sm text-gray-600 mb-1">分类 *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  {[...new Set([...CATEGORIES_PREDEFINED, ...categories])].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      className={`px-3 py-2 rounded-full mr-2 ${formData.category === cat ? 'bg-blue-500' : 'bg-gray-100'}`}
                      onPress={() => setFormData({ ...formData, category: cat })}
                    >
                      <Text className={formData.category === cat ? 'text-white' : 'text-gray-700'}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text className="text-sm text-gray-600 mb-1">规格</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-gray-800"
                  placeholder="如：DN25×4.2"
                  value={formData.specifications}
                  onChangeText={(t) => setFormData({ ...formData, specifications: t })}
                />

                <View className="flex-row">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm text-gray-600 mb-1">单位</Text>
                    <TextInput
                      className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-gray-800"
                      placeholder="个、米、根"
                      value={formData.unit}
                      onChangeText={(t) => setFormData({ ...formData, unit: t })}
                    />
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-sm text-gray-600 mb-1">参考价(元)</Text>
                    <TextInput
                      className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-gray-800"
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={formData.price}
                      onChangeText={(t) => setFormData({ ...formData, price: t })}
                    />
                  </View>
                </View>

                <Text className="text-sm text-gray-600 mb-1">备注</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 mb-4 text-gray-800"
                  placeholder="备注信息"
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={(t) => setFormData({ ...formData, description: t })}
                />

                <TouchableOpacity
                  className="bg-blue-500 rounded-xl py-4 items-center mb-4"
                  onPress={handleSave}
                >
                  <Text className="text-white font-semibold text-base">保存</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
