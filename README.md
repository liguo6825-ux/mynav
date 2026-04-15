# OneNav 个人部署版

> 基于 OneNav 的个人书签导航系统
> 创建时间: 2026-04-14

---

## 🚀 快速开始

### macOS / Linux
```bash
cd ~/.openclaw/workspace/my-onenav
./start.sh
```

### Windows
```cmd
cd %USERPROFILE%\.openclaw\workspace\my-onenav\php-version
php -S localhost:8080
```

### 访问地址
- 本机: http://localhost:8080
- 局域网: http://你的IP:8080

### 默认账号
- 用户名: `admin`
- 密码: `admin123`

---

## 📁 目录结构

```
my-onenav/
├── php-version/              # PHP 版本 (推荐)
│   ├── index.php            # 入口文件
│   ├── config.php           # 配置文件
│   ├── class/
│   │   └── Medoo.php       # 数据库 ORM
│   ├── controllers/
│   │   ├── index.php       # 首页
│   │   ├── admin.php       # 后台管理
│   │   ├── login.php       # 登录
│   │   ├── init.php        # 初始化
│   │   └── logout.php      # 登出
│   ├── templates/
│   │   └── default/
│   │       ├── index.php   # 前台模板
│   │       ├── admin.php   # 后台模板
│   │       └── login.php   # 登录模板
│   ├── database.sql         # 数据库结构
│   └── data/                # 数据目录 (自动生成)
├── backups/                  # 备份目录
├── start.sh                  # 启动脚本
└── README.md                 # 本文件
```

---

## ✨ 功能特性

### 前台
- 📱 响应式设计，支持移动端
- 🔍 书签搜索
- 🎨 现代化 UI 设计
- 📂 分类导航

### 后台
- 📊 仪表盘统计
- 📁 分类管理 (支持二级)
- 🔗 链接管理 (支持置顶)
- ⚙️ 系统设置
- 💾 数据备份

---

## ⚙️ 配置说明

### 修改管理员密码
编辑 `php-version/data/config.php`:
```php
$siteConfig['admin']['password'] = md5('你的新密码');
```

### 修改端口
编辑 `start.sh`:
```bash
php -S 0.0.0.0:你的端口
```

---

## 🔧 技术栈

- **后端**: PHP 7.0+
- **数据库**: SQLite3
- **ORM**: Medoo (轻量级)
- **前端**: HTML5 + CSS3
- **图标**: Font Awesome

---

## 📝 使用说明

### 首次使用
1. 运行 `./start.sh`
2. 访问 http://localhost:8080
3. 系统会自动跳转到初始化页面
4. 设置管理员账号和网站信息
5. 完成初始化

### 管理后台
1. 点击右下角齿轮图标
2. 输入用户名和密码登录
3. 在后台管理分类和链接

### 数据备份
后台点击"数据备份"，系统会自动导出 SQL 备份文件到 `backups/` 目录

---

## 🛡️ 安全建议

1. **修改默认密码** - 首次使用后立即修改
2. **定期备份** - 使用后台备份功能
3. **限制访问** - 如需公网访问，配置 HTTPS
4. **更新维护** - 定期检查更新

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- OneNav 原版: https://github.com/helloxz/onenav
- Medoo: https://medoo.in
- Font Awesome: https://fontawesome.com
