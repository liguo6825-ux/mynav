# MyNav 部署指南

> MyNav - 个人书签导航系统
> 版本: 1.0 | 更新: 2026-04-15

---

## 零、一键部署

如果服务器已有 Node.js 环境，复制以下命令到终端即可完成部署：

```bash
# 一键部署（在服务器上执行）
git clone https://github.com/YOUR_USERNAME/mynav.git /opt/mynav && \
cd /opt/mynav/nodejs-version && \
npm install --production && \
node server.js
```

部署完成后访问 http://服务器IP:3000 即可，默认账号 admin / admin123。

> 如果没有 Node.js，先执行：
> ```bash
> curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs
> ```

---

## 一、环境要求

### 服务器环境

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 操作系统 | CentOS 7+ / Ubuntu 18+ / Debian 9+ | Ubuntu 22.04 LTS |
| Node.js | v16.0.0+ | v18.x LTS 或 v20.x LTS |
| 内存 | 128 MB | 512 MB+ |
| 硬盘 | 100 MB | 1 GB+ |
| 网络 | 能访问 npm 仓库 | 有公网 IP（可选） |

### 检查 Node.js 是否已安装

```bash
node -v
npm -v
```

### 安装 Node.js（如未安装）

**Ubuntu / Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS / RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

**macOS:**
```bash
brew install node
```

---

## 二、部署步骤

### 1. 上传文件

将 `nodejs-version` 文件夹上传到服务器，例如放到 `/opt/mynav/`：

```bash
# 本地执行（在 Mac 上）
scp -r nodejs-version/ root@你的服务器IP:/opt/mynav/
```

或通过宝塔面板 / FTP 等方式上传。

### 2. 安装依赖

```bash
cd /opt/mynav/nodejs-version
npm install --production
```

> 如果 npm 下载慢，可使用国内镜像：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install --production
> ```

### 3. 启动服务

```bash
node server.js
```

看到以下输出说明启动成功：
```
MyNav 服务器已启动: http://0.0.0.0:3000
```

### 4. 访问测试

- 前台: http://你的服务器IP:3000
- 后台: http://你的服务器IP:3000/admin
- 默认账号: `admin`
- 默认密码: `admin123`

⚠️ 首次登录后请立即修改密码！

---

## 三、后台进程管理

### 方式一：使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd /opt/mynav/nodejs-version
pm2 start server.js --name mynav

# 开机自启
pm2 startup
pm2 save

# 常用命令
pm2 status          # 查看状态
pm2 logs mynav      # 查看日志
pm2 restart mynav   # 重启
pm2 stop mynav      # 停止
```

### 方式二：使用 systemd

创建服务文件：

```bash
sudo vim /etc/systemd/system/mynav.service
```

写入以下内容：

```ini
[Unit]
Description=MyNav Bookmark Navigator
After=network.target

[Service]
Type=simple
User=www
WorkingDirectory=/opt/mynav/nodejs-version
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable mynav
sudo systemctl start mynav
```

常用命令：

```bash
sudo systemctl status mynav   # 查看状态
sudo systemctl restart mynav  # 重启
sudo systemctl stop mynav     # 停止
journalctl -u mynav -f        # 查看日志
```

---

## 四、Nginx 反向代理（推荐）

如果服务器已有 Nginx 或使用宝塔面板，建议配置反向代理 + HTTPS。

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name nav.yourdomain.com;

    # 强制跳转 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nav.yourdomain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置完成后：

```bash
sudo nginx -t          # 检查配置
sudo systemctl reload nginx  # 重载
```

---

## 五、目录结构说明

```
mynav/
├── DEPLOY.md               # 本部署文档
├── nodejs-version/
│   ├── server.js              # 主服务器（所有功能入口）
│   ├── package.json           # 依赖配置
│   ├── package-lock.json      # 依赖锁定
│   ├── mynav.db               # 数据库文件（自动生成，重要！）
│   ├── import_bookmarks.js    # 书签批量导入工具
│   ├── views/
│   │   ├── index.ejs          # 默认主题（WebStack 风格）
│   │   ├── admin.ejs          # 后台管理页
│   │   └── login.ejs          # 登录页
│   ├── themes/
│   │   ├── theme1.ejs         # 主题1：WebStack 经典风格
│   │   ├── theme2/index.ejs   # 主题2：简洁网格风格
│   │   └── theme3/index.ejs   # 主题3：卡片列表风格
│   └── node_modules/          # 依赖包（npm install 生成）
```

---

## 六、功能清单

| 功能 | 说明 |
|------|------|
| 分类管理 | 增删改查，支持二级分类、隐藏/显示、排序 |
| 链接管理 | 增删改查，支持权重排序、描述、图标 |
| 书签导入 | 上传 HTML 书签文件，自动解析分类和链接 |
| 书签导出 | 导出为标准 HTML 书签文件，可导入浏览器 |
| 数据备份 | 下载完整 JSON 备份（含分类+链接+设置+用户） |
| 数据恢复 | 上传备份文件，覆盖恢复所有数据 |
| 自定义 Header | 在 head 中注入自定义代码（统计、样式等） |
| 主题切换 | 3 套主题，后台一键切换 |
| 多用户 | 支持多管理员账号 |

---

## 七、常见故障处理

### Q1: 启动报错 Cannot find module xxx

**原因：** 依赖未安装或 node_modules 损坏

**解决：**
```bash
cd /opt/mynav/nodejs-version
rm -rf node_modules package-lock.json
npm install --production
```

### Q2: 端口 3000 被占用

**原因：** 其他程序已占用该端口

**解决：**
```bash
# 查看占用进程
lsof -i :3000
# 或
netstat -tlnp | grep 3000

# 杀掉占用进程
kill -9 进程PID

# 或修改端口：编辑 server.js，将末尾的 3000 改为其他端口
```

### Q3: 数据库损坏或丢失

**原因：** mynav.db 文件被误删或损坏

**解决：**
- 从备份恢复：进入后台 → 系统设置 → 上传备份文件
- 重新初始化：删除 mynav.db，重启服务，系统会自动重新创建

### Q4: 页面空白或 502 错误

**原因：** Node.js 进程已崩溃

**解决：**
```bash
# PM2 方式
pm2 restart mynav
pm2 logs mynav --lines 50

# systemd 方式
sudo systemctl restart mynav
journalctl -u mynav --no-pager -n 50
```

### Q5: npm install 网络超时

**原因：** 无法访问 npm 官方仓库

**解决：**
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install --production

# 或使用淘宝旧镜像
npm config set registry https://registry.npm.taobao.org
```

### Q6: 首页分类/链接不显示

**原因：** 分类可能被设置为隐藏

**解决：** 登录后台 → 分类管理 → 检查分类是否被隐藏，点击显示按钮

### Q7: 后台登录失败

**原因：** 密码错误或 session 失效

**解决：**
- 确认使用正确密码（默认 admin/admin123）
- 清除浏览器 Cookie 后重试
- 如果忘记密码，删除 mynav.db 重新初始化（会丢失所有数据）

### Q8: 导入书签后分类名异常

**原因：** 导入的 HTML 文件分类名可能包含特殊字符

**解决：** 在后台分类管理中手动重命名分类

---

## 八、安全建议

1. **修改默认密码** — 首次登录后立即在后台修改
2. **使用 HTTPS** — 通过 Nginx 配置 SSL 证书（免费可用 Let Encrypt）
3. **定期备份** — 使用后台备份功能，建议每周备份一次
4. **限制访问** — 如果是私人使用，可通过 Nginx 限制 IP 访问
5. **防火墙** — 仅开放 80/443 端口，不直接暴露 3000 端口
6. **更新 Node.js** — 定期更新到最新 LTS 版本以获得安全补丁

---

## 九、维护命令速查

```bash
# 启动
node server.js                    # 直接启动
pm2 start server.js --name mynav  # PM2 启动

# 查看日志
pm2 logs mynav                    # PM2 日志
journalctl -u mynav -f            # systemd 日志

# 重启
pm2 restart mynav                 # PM2 重启
sudo systemctl restart mynav      # systemd 重启

# 备份数据库
cp mynav.db mynav_backup_$(date +%Y%m%d).db

# 查看端口
lsof -i :3000
```