# MyNav 安全功能设计方案

## 一、功能概述

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 修改密码 | P0 | 后台直接修改，需验证旧密码 |
| 密码加密存储 | P0 | MD5 → bcrypt（更安全） |
| 邮箱绑定 | P1 | 用于密码找回 |
| 密码找回 | P1 | 邮件验证码重置 |
| 验证码机制 | P1 | 6位数字，5分钟有效 |

---

## 二、数据库设计

### 现有表结构
```sql
CREATE TABLE on_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT
);
```

### 扩展字段
```sql
ALTER TABLE on_users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE on_users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE on_users ADD COLUMN reset_token TEXT;
ALTER TABLE on_users ADD COLUMN reset_token_expires DATETIME;
```

### 新增表：验证码记录
```sql
CREATE TABLE on_verify_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,           -- 6位数字验证码
    type TEXT NOT NULL,           -- 'reset_password' | 'verify_email'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL, -- 创建时间 + 5分钟
    used INTEGER DEFAULT 0
);
```

---

## 三、密码安全升级

### 当前：MD5（不安全）
```javascript
const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
```

### 升级：bcrypt（推荐）
```javascript
const bcrypt = require('bcryptjs');
const saltRounds = 10;

// 加密
const hashedPassword = await bcrypt.hash(password, saltRounds);

// 验证
const match = await bcrypt.compare(inputPassword, storedHash);
```

### 迁移策略
1. 新安装直接用 bcrypt
2. 已有 MD5 密码：登录成功后自动升级为 bcrypt
3. 兼容验证：先尝试 bcrypt，失败则尝试 MD5（成功后升级）

---

## 四、修改密码功能

### API 设计
```
POST /admin/change-password
Body: { currentPassword, newPassword, confirmPassword }
```

### 流程
1. 验证用户已登录
2. 验证 `currentPassword` 正确
3. 验证 `newPassword` 强度（至少8位，含字母+数字）
4. 验证 `newPassword === confirmPassword`
5. 用 bcrypt 加密新密码
6. 更新数据库，记录 `password_changed_at`
7. 可选：发送邮件通知

### 前端界面
```
┌─────────────────────────────────────┐
│  修改密码                           │
├─────────────────────────────────────┤
│  当前密码：[____________]           │
│  新密码：  [____________]           │
│  确认密码：[____________]           │
│                                     │
│  [取消]  [确认修改]                 │
└─────────────────────────────────────┘
```

---

## 五、邮箱绑定与验证

### API 设计
```
GET  /admin/profile           -- 个人设置页面
POST /admin/bind-email        -- 绑定邮箱
     Body: { email }
POST /admin/send-verify-code  -- 发送验证码
     Body: { email, type: 'verify_email' }
POST /admin/verify-email      -- 验证邮箱
     Body: { code }
```

### 流程
1. 用户输入邮箱
2. 系统发送6位验证码到邮箱
3. 用户输入验证码
4. 验证通过后设置 `email_verified = 1`

---

## 六、密码找回功能

### API 设计
```
GET  /forgot-password         -- 找回密码页面
POST /forgot-password/send    -- 发送重置邮件
     Body: { email }
GET  /reset-password?token=xx -- 重置密码页面（带token）
POST /reset-password          -- 执行重置
     Body: { token, newPassword, confirmPassword }
```

### 流程
```
用户点击"忘记密码"
    ↓
输入注册邮箱
    ↓
系统生成 reset_token (UUID)
存储 token + 过期时间(1小时)
发送邮件包含重置链接
    ↓
用户点击链接
    ↓
验证 token 有效且未过期
    ↓
用户输入新密码
    ↓
更新密码，清除 token
```

### 邮件模板
```
主题：【MyNav】重置您的密码

您好，

您收到这封邮件是因为您申请重置 MyNav 账户密码。

请点击以下链接重置密码（链接1小时内有效）：
{reset_url}

如果您没有申请重置密码，请忽略此邮件。

---
MyNav 导航站
```

---

## 七、验证码机制

### 生成
```javascript
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
```

### 存储
```javascript
const code = generateCode();
const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟

db.prepare(`
    INSERT INTO on_verify_codes (email, code, type, expires_at)
    VALUES (?, ?, ?, ?)
`).run(email, code, type, expiresAt.toISOString());
```

### 验证
```javascript
const record = db.prepare(`
    SELECT * FROM on_verify_codes
    WHERE email = ? AND code = ? AND type = ? AND used = 0
    AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
`).get(email, code, type);

if (record) {
    // 标记已使用
    db.prepare('UPDATE on_verify_codes SET used = 1 WHERE id = ?').run(record.id);
    return true;
}
return false;
```

### 安全限制
- 同一邮箱每分钟最多发送1次
- 同一IP每小时最多发送10次
- 验证码错误5次锁定30分钟

---

## 八、邮件发送配置

### 配置项（存入 on_settings）
```javascript
{
    smtp_host: 'smtp.example.com',
    smtp_port: 465,
    smtp_secure: true,           // SSL
    smtp_user: 'noreply@example.com',
    smtp_pass: 'encrypted_password',
    email_from: 'MyNav <noreply@example.com>'
}
```

### 后台设置界面
```
┌─────────────────────────────────────────────┐
│  邮件服务配置                               │
├─────────────────────────────────────────────┤
│  SMTP服务器：[smtp.qq.com      ]            │
│  端口：      [465              ]            │
│  使用SSL：   [✓]                            │
│  用户名：    [noreply@qq.com   ]            │
│  授权码：    [****************]             │
│  发件人名称：[MyNav            ]            │
│                                             │
│  [测试发送]  [保存配置]                     │
└─────────────────────────────────────────────┘
```

### 常用SMTP配置
| 服务商 | SMTP服务器 | 端口 | 说明 |
|--------|-----------|------|------|
| QQ邮箱 | smtp.qq.com | 465 | 需开启SMTP，使用授权码 |
| 163邮箱 | smtp.163.com | 465 | 需开启SMTP，使用授权码 |
| Gmail | smtp.gmail.com | 587 | 需应用专用密码 |
| 阿里云 | smtp.aliyun.com | 465 | 企业邮箱 |

---

## 九、实现优先级

### 第一阶段（基础安全）
1. ✅ 安装 bcryptjs 依赖
2. ✅ 数据库添加新字段
3. ✅ 实现修改密码功能
4. ✅ 密码强度验证
5. ✅ 后台添加"修改密码"入口

### 第二阶段（邮件功能）
1. ✅ 邮件服务配置界面
2. ✅ 验证码生成与验证
3. ✅ 邮箱绑定功能
4. ✅ 密码找回功能
5. ✅ 登录页添加"忘记密码"链接

### 第三阶段（安全加固）
1. 登录失败次数限制
2. 敏感操作二次验证
3. 操作日志记录
4. 密码过期提醒（90天）

---

## 十、安全建议

### 密码策略
- 最少8位，建议12位以上
- 包含大小写字母、数字、特殊符号
- 不能与用户名相同
- 不能是常见弱密码（123456, password等）

### 会话安全
- session 过期时间：2小时无操作
- 登出后彻底销毁 session
- 敏感操作需要重新验证密码

### 邮件安全
- 重置链接一次性使用
- 链接有效期：1小时
- 重置成功后发送通知邮件

---

## 十一、文件修改清单

| 文件 | 修改内容 |
|------|----------|
| server.js | 添加密码修改/找回API，bcrypt集成 |
| views/login.ejs | 添加"忘记密码"链接 |
| views/admin.ejs | 添加"修改密码"和"个人设置"入口 |
| views/change-password.ejs | 新增：修改密码页面 |
| views/forgot-password.ejs | 新增：找回密码页面 |
| views/reset-password.ejs | 新增：重置密码页面 |
| views/admin-settings.ejs | 新增：邮件配置页面 |
| package.json | 添加 bcryptjs 依赖 |
