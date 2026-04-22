import express from "express";
import cors from "cors";
import { getSupabaseClient } from "./storage/database/supabase-client";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// ============ 产品相关 API ============

// 获取产品分类列表
app.get('/api/v1/products/categories', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('products')
      .select('category')
      .eq('is_active', true)
      .order('category');
    
    if (error) throw new Error(`查询分类失败: ${error.message}`);
    
    // 去重
    const categories = [...new Set(data?.map(item => item.category) || [])];
    res.json({ categories });
  } catch (err: any) {
    console.error('获取分类失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取产品列表（可选按分类筛选）
app.get('/api/v1/products', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { category } = req.query;
    
    let query = client
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('name');
    
    if (category) {
      query = query.eq('category', category as string);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`查询产品失败: ${error.message}`);
    
    res.json({ products: data });
  } catch (err: any) {
    console.error('获取产品失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 添加新产品
app.post('/api/v1/products', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { name, brand, category, specifications, unit, price, description, image_url } = req.body;
    
    if (!name || !brand || !category) {
      res.status(400).json({ error: '缺少必填字段：name, brand, category' });
      return;
    }
    
    const { data, error } = await client
      .from('products')
      .insert({ 
        name, 
        brand, 
        category, 
        specifications, 
        unit: unit || '个', 
        price, 
        description, 
        image_url 
      })
      .select()
      .single();
    
    if (error) throw new Error(`添加产品失败: ${error.message}`);
    
    res.json({ product: data });
  } catch (err: any) {
    console.error('添加产品失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新产品
app.put('/api/v1/products/:id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { id } = req.params;
    const updates = req.body;
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await client
      .from('products')
      .update(updates)
      .eq('id', parseInt(id))
      .select()
      .single();
    
    if (error) throw new Error(`更新产品失败: ${error.message}`);
    
    res.json({ product: data });
  } catch (err: any) {
    console.error('更新产品失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 删除产品（软删除）
app.delete('/api/v1/products/:id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { id } = req.params;
    
    const { error } = await client
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', parseInt(id));
    
    if (error) throw new Error(`删除产品失败: ${error.message}`);
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('删除产品失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 产品 API 结束 ============


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
