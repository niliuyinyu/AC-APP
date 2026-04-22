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

// ============ 知识问答 API ============

const KB_API_BASE = 'https://kb.nlyy.online';
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || '';
const COZE_BOT_ID = process.env.COZE_BOT_ID || '';
const COZE_API_BASE = 'https://api.coze.cn';

// 知识问答 - 流式响应
app.post('/api/v1/knowledge/chat', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      res.status(400).json({ error: '问题不能为空' });
      return;
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 1. 先调用知识库 API 获取相关内容
    let contextText = '';
    try {
      const kbResponse = await axios.get(`${KB_API_BASE}/search`, {
        params: { q: question, limit: 5 },
        timeout: 5000,
      });
      
      if (kbResponse.data && Array.isArray(kbResponse.data.results)) {
        contextText = kbResponse.data.results
          .map((item: any) => item.content || item.text || '')
          .filter(Boolean)
          .join('\n\n');
      } else if (kbResponse.data && typeof kbResponse.data === 'string') {
        contextText = kbResponse.data;
      } else if (kbResponse.data && kbResponse.data.content) {
        contextText = kbResponse.data.content;
      }
    } catch (kbErr: any) {
      console.log('知识库查询失败，使用无上下文模式:', kbErr.message);
    }

    // 2. 构建提示词
    let userPrompt = question;
    
    if (contextText) {
      userPrompt = `用户问题：${question}\n\n知识库相关内容：\n${contextText}\n\n请根据以上知识库内容回答用户问题。如果知识库内容不相关，请基于你自己的暖通知识回答。`;
    } else {
      userPrompt = `你是一个专业的暖通技术支持助手。用户问：${question}\n\n请基于你的暖通知识（锅炉、水机空调）回答，简洁专业，通俗易懂。`;
    }

    // 3. 调用 Coze API（如果配置了）
    if (COZE_API_TOKEN && COZE_BOT_ID) {
      try {
        const response = await axios.post(
          `${COZE_API_BASE}/v3/chat`,
          {
            bot_id: COZE_BOT_ID,
            user_id: 'app_user',
            stream: true,
            messages: [
              {
                role: 'user',
                content: userPrompt,
                content_type: 'text',
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${COZE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            responseType: 'stream',
          }
        );

        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.code === 0 && parsed.data?.content) {
                    res.write(`data: ${JSON.stringify({ content: parsed.data.content })}\n\n`);
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        });

        response.data.on('end', () => {
          res.write('data: [DONE]\n\n');
          res.end();
        });

        response.data.on('error', (err: Error) => {
          console.error('Coze stream error:', err);
          sendSimulatedResponse(res, question);
        });
      } catch (cozeErr: any) {
        console.error('Coze API error:', cozeErr.message);
        sendSimulatedResponse(res, question);
      }
    } else {
      sendSimulatedResponse(res, question);
    }
  } catch (err: any) {
    console.error('知识问答失败:', err);
    res.write(`data: ${JSON.stringify({ error: '服务错误，请稍后再试' })}\n\n`);
    res.end();
  }
});

// 模拟流式响应
async function sendSimulatedResponse(res: any, question: string) {
  const answer = `您好！关于"${question}"，这是暖通领域的常见问题。

根据暖通行业经验：
1. 锅炉和水机空调的维护保养非常重要
2. 定期检查可以延长设备寿命
3. 如有不确定的问题，建议联系专业售后服务

您还有其他问题吗？`;

  for (let i = 0; i < answer.length; i += 5) {
    const chunk = answer.slice(i, i + 5);
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

// 获取支持的分类
app.get('/api/v1/knowledge/categories', async (req, res) => {
  res.json({
    categories: ['锅炉', '水机空调', '地暖', '暖气片', '新风系统', '常见问题']
  });
});

// ============ 知识问答 API 结束 ============


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
