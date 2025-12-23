# Cloudflare Pages 部署说明

## 问题诊断

原应用在Cloudflare Pages上出现白屏问题的原因：

1. **后端依赖问题**：应用在启动时会尝试连接后端服务器，但在静态托管环境中没有后端
2. **路径配置问题**：Vite配置使用相对路径，但Cloudflare Pages需要根路径
3. **身份验证问题**：登录功能依赖后端API，静态环境需要本地回退

## 解决方案

### 1. 修改了 `vite.config.ts`
- 将 `base: './'` 改为 `base: '/'`
- 添加了 `process.env.NODE_ENV` 定义

### 2. 修改了 `services/dataService.ts`
- 添加了Cloudflare Pages环境检测 (`pages.dev`, `cloudflare`)
- 在静态环境中跳过服务器连接
- 提供本地身份验证回退
- 优化了超时处理和错误处理

### 3. 添加了 `_redirects` 文件
- 确保所有路由都指向 `index.html`
- 支持React Router的客户端路由

## 部署步骤

1. 构建项目：
   ```bash
   npm run build
   ```

2. 部署到Cloudflare Pages：
   - 将 `dist` 文件夹内容上传
   - 或者连接Git仓库自动部署

3. 访问应用：
   - 用户名：`admin`
   - 密码：`123456`

## 功能特性

### 在Cloudflare Pages上
- ✅ 纯前端运行，无需后端
- ✅ 本地存储数据
- ✅ 完整的物料管理功能
- ✅ 响应式设计
- ✅ 离线模式支持

### 数据持久化
- 数据存储在浏览器的localStorage中
- 支持数据导入导出
- 自动保存操作记录

## 注意事项

1. **数据存储**：在Cloudflare Pages上，数据仅保存在用户浏览器本地
2. **多设备同步**：如需多设备数据同步，需要配置后端API
3. **安全性**：本地模式仅适合演示或个人使用

## 故障排除

如果仍然出现白屏：

1. 检查浏览器控制台错误
2. 确保使用HTTPS访问
3. 清除浏览器缓存
4. 检查是否支持Web Crypto API

## 本地测试

可以使用以下命令在本地测试：
```bash
npm run preview
```

然后访问 `http://localhost:4173`