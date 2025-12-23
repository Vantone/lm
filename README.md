<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 物料管理系统

一个基于React和Node.js的现代化物料管理系统，支持PC端和移动端访问。

## 快速启动

**前提条件:** Node.js

### 方式一：使用启动脚本（推荐）

**Windows用户:**
```bash
# 双击运行或在命令行执行
start.bat
```

**Mac/Linux用户:**
```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动后端服务器：
   ```bash
   npm start
   ```

3. 启动前端开发服务器：
   ```bash
   npm run dev
   ```

## 访问地址

启动成功后，可以通过以下地址访问：

- **本地访问:** http://localhost:5173
- **局域网访问:** http://[你的IP地址]:5173
- **移动端访问:** 使用局域网地址

**默认账号密码:**
- 用户名: admin
- 密码: 123456

## 移动端访问说明

### 🚨 移动端白屏问题解决

如果移动端访问时出现白屏，请按以下步骤操作：

#### 快速诊断
1. **使用移动端调试工具**
   ```bash
   # 在移动端浏览器中访问
   http://[你的IP]:5173/mobile-debug.html
   ```

2. **常见原因及解决方案**

   **❌ 原因1: 服务器未启动**
   ```bash
   # 使用移动端启动脚本
   start-mobile.bat
   ```

   **❌ 原因2: 网络连接问题**
   - 确保手机和电脑在同一WiFi网络
   - 使用IP地址访问，不要用localhost
   - 检查防火墙设置

   **❌ 原因3: API地址错误**
   - 系统已自动适配移动端IP访问
   - 如果仍有问题，检查Vite配置中的host设置

   **❌ 原因4: JavaScript错误**
   - 清除浏览器缓存
   - 检查控制台错误信息
   - 尝试强制刷新页面

#### 手动诊断步骤
1. 在电脑上确认服务器正常运行：
   - 后端: http://localhost:3001/api/data
   - 前端: http://localhost:5173

2. 获取正确的IP地址：
   - Windows: `ipconfig` → 找到"IPv4 地址"
   - Mac: `ifconfig` → 找到"inet "

3. 在手机浏览器访问：
   - 主应用: http://[IP]:5173
   - 调试工具: http://[IP]:5173/mobile-debug.html

4. 如果调试工具显示API连接失败，检查：
   - 后端服务器是否正在运行
   - 3001端口是否被防火墙阻止
   - 手机和电脑是否在同一网络

#### 自动修复脚本
使用提供的启动脚本可自动配置并启动系统：
```bash
# Windows用户
start-mobile.bat
```

## 技术架构

- **前端:** React + TypeScript + Vite + Tailwind CSS
- **后端:** Node.js + Express
- **数据存储:** JSON文件 + localStorage
- **移动端适配:** 响应式设计 + 动态API地址

## 功能特性

- ✅ 物料管理
- ✅ 库存记录
- ✅ 历史查询
- ✅ 报表导出
- ✅ 审计日志
- ✅ 系统配置
- ✅ 移动端支持
- ✅ 实时数据同步
- ✅ Excel批量导入
