# 暖通服务 APP 需求开发文档

## 一、项目概述

### 1.1 项目背景
为暖通行业从业者提供一站式移动办公平台，集成数据查询、报告查看、设备管理、知识库等功能。

### 1.2 目标用户
- 暖通工程师
- 空调系统运维人员
- 暖通设计师
- 项目管理人员

### 1.3 技术架构
- **前端框架**: React Native + Expo SDK 54
- **路由管理**: Expo Router (Tab + Stack)
- **样式方案**: TailwindCSS (UniWind)
- **Web容器**: react-native-webview
- **后端服务**: Express.js + Node.js
- **数据库**: PostgreSQL
- **热更新**: EAS Update
- **自动化部署**: GitHub Actions

---

## 二、功能模块

### 2.1 首页模块

#### 2.1.1 快速入口
- 预置 3 个核心网站快速访问：
  - 空调主机数据 (`ac.nlyy.online`)
  - 暖通报告 (`report.nlyy.online`)
  - 功率数据采集 (`91cost.com`)
- 支持自定义网站入口

#### 2.1.2 自动跳转
- 启动时检测用户设置的主页
- 若已设置主页，自动跳转到该网站
- 若未设置，显示首页快速入口

#### 2.1.3 网站卡片展示
- 显示网站名称、图标、URL
- 支持长按编辑/删除
- 支持拖动排序

### 2.2 WebView 浏览器模块

#### 2.2.1 核心功能
- 内嵌浏览器加载网页
- 支持前进/后退导航
- 支持刷新页面
- 支持横屏模式

#### 2.2.2 WebView 配置（专业级）

**Android 配置：**
```javascript
{
  // 第三方 Cookie 支持（Next.js 站点必需）
  thirdPartyCookiesEnabled: true,
  
  // 禁用 WebView 缓存（解决 304 空内容渲染异常）
  cacheEnabled: false,
  cacheMode: 'LOAD_DEFAULT',
  
  // 自适应屏幕
  loadWithOverviewMode: true,
  useWideViewPort: true,
  
  // 混合内容支持
  mixedContentMode: 'always',
  
  // WebSettings 完整配置
  databaseEnabled: true,
  geolocationEnabled: true,
  domStorageEnabled: true,
  defaultTextEncodingName: 'UTF-8',
  allowUniversalAccessFromFileURLs: true,
  allowFileAccessFromFileURLs: true,
}
```

**iOS 配置：**
```javascript
{
  allowsInlineMediaPlayback: true,
  bounces: true,
  mediaCaptures: 'allowed',
}
```

#### 2.2.3 错误处理
- 30秒超时保护
- HTTP 错误状态码检测（400+）
- 加载失败时显示错误提示
- 提供"用系统浏览器打开"选项

#### 2.2.4 User-Agent 伪装
- 伪装成 Chrome 浏览器
- 绕过 WebView 检测机制
- 支持 Coze 等平台托管网站

#### 2.2.5 导航栏
- 返回按钮
- 前进按钮
- 刷新按钮
- 横屏按钮
- 主页按钮（跳转首页）

### 2.3 收藏模块
- 收藏常用网站
- 管理收藏列表
- 快速访问收藏网站

### 2.4 辅材管理模块
- 集成飞书多维表格
- 展示辅材产品信息
- 支持产品搜索和筛选

### 2.5 问答模块
- AI 智能问答
- 知识库检索
- 对话式交互

### 2.6 设置模块

#### 2.6.1 主页设置
- 设置启动时自动打开的网站
- 支持自定义 URL

#### 2.6.2 自定义网站管理
- 添加自定义网站
- 编辑网站信息
- 删除网站

#### 2.6.3 版本管理
- 显示当前版本号
- 检查更新功能
- 支持热更新

---

## 三、Tab 导航结构

```
底部 Tab 导航：
├── 首页 (Home) - 快速入口
├── 收藏 (Favorites) - 收藏网站
├── 辅材 (Products) - 飞书产品管理
├── 问答 (Chat) - AI 问答
└── 设置 (Settings) - 系统设置
```

---

## 四、后端 API 设计

### 4.1 版本管理 API
```
GET  /api/v1/versions/latest    - 获取最新版本信息
POST /api/v1/versions           - 创建新版本（自动递增）
```

### 4.2 产品管理 API
```
GET  /api/v1/products           - 获取产品列表
GET  /api/v1/products/:id       - 获取产品详情
```

### 4.3 知识库 API
```
POST /api/v1/knowledge/query    - 知识库查询
POST /api/v1/chat/completions   - AI 对话
```

---

## 五、热更新机制

### 5.1 更新流程
```
Git Push → GitHub Actions → 自动构建 → EAS Update → 用户收到更新
```

### 5.2 更新包大小
- **热更新包**: 1-5MB（JS Bundle）
- **首次安装 APK**: ~90MB（包含 React Native 引擎）

### 5.3 版本策略
- 每次 Git Push 自动递增版本号
- 热更新无需重新安装 APK
- 用户打开 APP 自动检查更新

---

## 六、性能优化

### 6.1 WebView 优化
- 禁用缓存避免 304 问题
- 开启第三方 Cookie
- User-Agent 伪装
- 超时保护机制

### 6.2 构建优化
- 仅保留 arm64-v8a 架构
- 启用 Hermes 引擎
- 开启 New Architecture

### 6.3 内存优化
- 及时清理 WebView 缓存
- 组件卸载时释放资源

---

## 七、部署配置

### 7.1 GitHub Actions
```yaml
- 自动检测代码变更
- 自动递增版本号
- 自动发布热更新
- 失败时通知开发者
```

### 7.2 EAS 配置
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "splits": { "abi": ["arm64-v8a"] }
      }
    }
  },
  "updates": {
    "channel": "production"
  }
}
```

---

## 八、项目信息

| 配置项 | 值 |
|--------|-----|
| 项目名称 | 暖通服务 |
| Slug | hvav |
| Project ID | eeecb53d-09cd-4c52-989a-b775a118f80d |
| 包名 | com.anonymous.x0 |
| 当前版本 | 0.1.1 |

---

## 九、已知问题与解决方案

### 9.1 网站加载问题
**问题**: ac.nlyy.online 等网站在 WebView 中加载失败

**原因**:
1. 网站有多层 iframe 嵌套
2. Coze 平台检测 WebView 环境
3. 304 缓存导致空内容渲染

**解决方案**:
1. 开启第三方 Cookie
2. 禁用 WebView 缓存
3. User-Agent 伪装成 Chrome
4. 提供"用系统浏览器打开"备选方案

### 9.2 APK 体积问题
**问题**: 首次安装 APK 约 90MB

**原因**: React Native + Expo 框架固有开销

**解决方案**:
1. 仅保留 arm64-v8a 架构
2. 热更新包仅 1-5MB
3. 用户无需频繁重装

---

## 十、后续优化方向

1. **离线缓存**: 支持网站离线访问
2. **推送通知**: 重要消息推送
3. **多语言**: 支持中英文切换
4. **主题切换**: 深色/浅色模式
5. **手势操作**: 左右滑动切换网站
6. **书签管理**: 网页内书签功能

---

## 十一、联系方式

- 开发者: 常悟
- 项目仓库: https://github.com/niliuyinyu/AC-APP
- Expo 控制台: https://expo.dev/accounts/niliuyinyu/projects/hvav

---

*文档版本: v1.0*
*最后更新: 2026-05-28*
