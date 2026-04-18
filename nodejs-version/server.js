#!/usr/bin/env node

/**
 * OneNav Personal - Node.js Server
 * 个人书签导航系统
 */

const express = require('express');
const Database = require('better-sqlite3');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ============ 启动时安全校验（环境变量必须设置）============
// 会话密钥
const SESSION_SECRET = process.env.MYNAV_SESSION_SECRET;
if (!SESSION_SECRET) {
    console.error('❌ 错误：未设置环境变量 MYNAV_SESSION_SECRET');
    console.error('   请在启动前设置：export MYNAV_SESSION_SECRET=<随机字符串>');
    console.error('   生成随机密钥：openssl rand -hex 32');
    process.exit(1);
}

// SMTP 加密密钥
const SMTP_KEY = process.env.MYNAV_SMTP_KEY;
if (!SMTP_KEY) {
    console.error('❌ 错误：未设置环境变量 MYNAV_SMTP_KEY');
    console.error('   请在启动前设置：export MYNAV_SMTP_KEY=<随机字符串>');
    console.error('   生成随机密钥：openssl rand -hex 32');
    process.exit(1);
}
const SMTP_KEY_DERIVED = crypto.scryptSync(SMTP_KEY, 'mynav-salt-v1', 32);

// ============ 应用常量 ============
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// 允许的背景图片扩展名（白名单）
const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// 数据目录
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'mynav.db');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 数据库初始化
let db;
function initDatabase() {
    db = new Database(DB_PATH);

    // 创建表
    db.exec(`
        CREATE TABLE IF NOT EXISTS on_categorys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            fid INTEGER DEFAULT 0,
            weight INTEGER DEFAULT 100,
            font_icon TEXT DEFAULT 'fa-folder',
            hidden INTEGER DEFAULT 0,
            add_time INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS on_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            description TEXT,
            fid INTEGER DEFAULT 0,
            weight INTEGER DEFAULT 100,
            topping INTEGER DEFAULT 0,
            add_time INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS on_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS on_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            add_time INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS on_verify_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            type TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS on_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            action TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS on_rate_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            count INTEGER DEFAULT 1,
            window_start INTEGER NOT NULL
        );
    `);

    // 数据库迁移：添加 hidden 字段（如果不存在）
    try {
        db.exec("ALTER TABLE on_categorys ADD COLUMN hidden INTEGER DEFAULT 0");
    } catch (e) {
        // 字段已存在，忽略错误
    }

    // 迁移：添加安全相关字段和表
    const migrations = [
        "ALTER TABLE on_users ADD COLUMN password_changed_at TEXT",
        "ALTER TABLE on_users ADD COLUMN email_verified INTEGER DEFAULT 0",
        "ALTER TABLE on_users ADD COLUMN reset_token TEXT",
        "ALTER TABLE on_users ADD COLUMN reset_token_expires TEXT",
    ];
    migrations.forEach(sql => {
        try { db.exec(sql); } catch (e) { /* 已存在，忽略 */ }
    });
    // 检查是否已初始化
    const userCount = db.prepare('SELECT COUNT(*) as count FROM on_users').get();
    if (userCount.count === 0) {
        // 插入默认用户（使用bcrypt）
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO on_users (username, password, email) VALUES (?, ?, ?)').run('admin', defaultPassword, 'admin@example.com');

        // 插入默认分类
        const insertCategory = db.prepare('INSERT INTO on_categorys (name, fid, weight, font_icon) VALUES (?, ?, ?, ?)');
        insertCategory.run('常用工具', 0, 100, 'fa-star');
        insertCategory.run('搜索引擎', 0, 90, 'fa-search');
        insertCategory.run('开发工具', 0, 80, 'fa-code');
        insertCategory.run('前端开发', 3, 100, 'fa-html5');
        insertCategory.run('后端开发', 3, 90, 'fa-server');

        // 插入示例链接
        const insertLink = db.prepare('INSERT INTO on_links (title, url, description, fid, weight) VALUES (?, ?, ?, ?, ?)');
        insertLink.run('百度', 'https://www.baidu.com', '百度搜索', 2, 100);
        insertLink.run('Google', 'https://www.google.com', 'Google 搜索', 2, 90);
        insertLink.run('GitHub', 'https://github.com', '代码托管平台', 1, 100);
        insertLink.run('Stack Overflow', 'https://stackoverflow.com', '编程问答社区', 1, 90);
        insertLink.run('MDN', 'https://developer.mozilla.org', 'Web 开发文档', 4, 100);
        insertLink.run('Vue.js', 'https://vuejs.org', '渐进式 JavaScript 框架', 4, 95);
        insertLink.run('React', 'https://reactjs.org', '构建用户界面的 JavaScript 库', 4, 90);
        insertLink.run('Node.js', 'https://nodejs.org', 'JavaScript 运行时', 5, 100);

        // 插入默认配置
        const defaultSettings = JSON.stringify({
            title: '我的导航站',
            subtitle: '简洁实用的书签管理',
            description: '个人书签导航系统',
            keywords: '导航,书签,收藏,工具',
            link_num: 50
        });
        db.prepare('INSERT INTO on_options (key, value) VALUES (?, ?)').run('site_settings', defaultSettings);

        console.log('✅ 数据库初始化完成');
    }
}

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 会话配置
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));

// CSRF 防护中间件
app.use(csrfMiddleware);

// 文件上传配置
const upload = multer({ storage: multer.memoryStorage() });

// 视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 全局辅助函数（通过 res.locals 传递给所有模板）
app.use((req, res, next) => {
    res.locals.escapeHtml = (text) => {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    next();
});

// ============ 安全工具函数（必须在路由之前定义）============

// ---------- 频率限制 ----------
const RATE_LIMITS = {
    'change-password':  { window: 5 * 60 * 1000,  max: 5,  msg: '密码修改过于频繁，请5分钟后再试' },
    'send-code':       { window: 60 * 1000,        max: 3,  msg: '验证码发送过于频繁，请1分钟后再试' },
    'forgot-password': { window: 60 * 1000,        max: 3,  msg: '请求过于频繁，请1分钟后再试' },
    'reset-password':  { window: 15 * 60 * 1000, max: 3,  msg: '重置尝试过于频繁，请15分钟后再试' },
    'login':           { window: 15 * 60 * 1000,  max: 5,  msg: '登录尝试过于频繁，请15分钟后再试' }
};

function checkRateLimit(key) {
    const limit = RATE_LIMITS[key];
    if (!limit) return { allowed: true };
    const now = Date.now();
    db.prepare('DELETE FROM on_rate_limits WHERE window_start < ?').run(now - limit.window);
    const record = db.prepare('SELECT * FROM on_rate_limits WHERE key = ?').get(key);
    if (!record) {
        db.prepare('INSERT INTO on_rate_limits (key, count, window_start) VALUES (?, 1, ?)').run(key, now);
        return { allowed: true };
    }
    if (record.count >= limit.max) return { allowed: false, msg: limit.msg };
    db.prepare('UPDATE on_rate_limits SET count = count + 1 WHERE key = ?').run(key);
    return { allowed: true };
}

// ---------- 审计日志 ----------
function auditLog(action, username, req, details) {
    try {
        db.prepare(
            'INSERT INTO on_audit_log (username, action, ip, user_agent, details) VALUES (?, ?, ?, ?, ?)'
        ).run(
            username || null,
            action,
            req ? (req.ip || req.headers['x-forwarded-for'] || '-') : '-',
            req ? (req.headers['user-agent'] || '-') : '-',
            details || null
        );
    } catch (e) {
        console.error('审计日志写入失败:', e.message);
    }
}

// ---------- SMTP 加密存储 ----------
function encryptSMTP(pass) {
    if (!pass) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', SMTP_KEY_DERIVED, iv);
    const encrypted = Buffer.concat([cipher.update(pass, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptSMTP(encrypted) {
    if (!encrypted) return '';
    try {
        const buf = Buffer.from(encrypted, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', SMTP_KEY_DERIVED, buf.subarray(0, 16));
        decipher.setAuthTag(buf.subarray(16, 32));
        return decipher.update(buf.subarray(32)) + decipher.final('utf8');
    } catch (e) {
        return encrypted; // 旧明文数据直接返回
    }
}

// ---------- 定期清理 ----------
function cleanupExpired() {
    if (!db) return; // 数据库未初始化时跳过
    const now = new Date(Date.now()).toISOString();
    try {
        const r1 = db.prepare("DELETE FROM on_verify_codes WHERE expires_at < ? OR used = 1").run(now).changes;
        const r2 = db.prepare("DELETE FROM on_users WHERE reset_token_expires < ?").run(now).changes;
        const r3 = db.prepare('DELETE FROM on_rate_limits WHERE window_start < ?').run(Date.now() - 86400000).changes;
        if (r1 + r2 + r3 > 0) {
            console.log(`🧹 清理过期数据: 验证码 ${r1} 条, 重置令牌 ${r2} 条, 频率限制 ${r3} 条`);
        }
    } catch (e) {
        // 忽略（可能是表不存在）
    }
}

// ---------- 验证码生成 ----------
function generateVerifyCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------- 搜索输入安全过滤 ----------
// 过滤 LIKE 查询中的特殊字符（%，_，\），防止模糊 DoS 或意外匹配
function sanitizeSearchInput(input) {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/[%_\\]/g, ' ').trim();
}

// ---------- 独立的 CSRF 验证中间件 ----------
function csrfMiddleware(req, res, next) {
    // 辅助函数：生成 CSRF token（内联避免声明顺序问题）
    const genToken = () => {
        const random = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const secret = req.session.secret || process.env.MYNAV_SESSION_SECRET || 'default';
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(random + secret).digest('hex').substring(0, 32);
    };

    // GET/HEAD/OPTIONS 请求：生成 CSRF token 并传给模板
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        if (!req.session.csrfToken) {
            req.session.csrfToken = genToken();
        }
        res.locals.csrfToken = req.session.csrfToken;
        return next();
    }

    // 跳过 multipart 表单（由路由手动处理 CSRF）
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        return next();
    }

    // POST/PUT/DELETE：验证 token
    const token = req.body && req.body._csrf;
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).send('CSRF 验证失败，请刷新页面后重试');
    }
    // 保持 token 不变（同一 session 内复用，避免多表单冲突）
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

// ---------- 辅助函数 ----------
function getSiteSettings() {
    const row = db.prepare('SELECT value FROM on_options WHERE key = ?').get('site_settings');
    const settings = row ? JSON.parse(row.value) : {
        title: '我的导航站',
        subtitle: '简洁实用的书签管理',
        description: '个人书签导航系统',
        keywords: '导航,书签,收藏,工具',
        link_num: 50
    };

    // 从 on_options 读取 SMTP 配置
    const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'email_from'];
    smtpKeys.forEach(key => {
        const r = db.prepare('SELECT value FROM on_options WHERE key = ?').get(key);
        if (r) settings[key] = r.value;
    });

    return settings;
}

function isLoggedIn(req) {
    return req.session && req.session.loggedIn;
}

// HTML 转义
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#039;');
}

// 格式化日期
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

// 解析 HTML 书签（支持嵌套分类）
function parseBookmarkHtml(content) {
    let categoriesCount = 0;
    let linksCount = 0;

    // 使用栈式解析，支持 DL>DT>H3 嵌套结构
    // 收集所有 H3 分类和 A 链接，记录层级关系
    const categoryStack = []; // 栈：记录当前分类层级
    const categoryMap = new Map(); // name -> id

    // 按行解析，维护分类层级
    const lines = content.split('\n');
    let currentCategoryId = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检测分类 <DT><H3 ...>分类名</H3>
        const h3Match = line.match(/<DT><H3[^>]*>([^<]+)<\/H3>/i);
        if (h3Match) {
            const name = h3Match[1].trim();
            // 检查是否已存在
            let existing = db.prepare('SELECT id FROM on_categorys WHERE name = ?').get(name);
            if (!existing) {
                // 父分类为栈顶分类（如果有）
                const parentId = categoryStack.length > 0 ? categoryStack[categoryStack.length - 1].id : 0;
                const result = db.prepare('INSERT INTO on_categorys (name, fid, weight) VALUES (?, ?, ?)').run(name, parentId, 100);
                existing = { id: result.lastInsertRowid };
                categoriesCount++;
            }
            categoryMap.set(name, existing.id);
            // 将当前分类压栈
            categoryStack.push({ name, id: existing.id });
            continue;
        }

        // 检测 </DL> 表示一个分类层级结束
        if (line.match(/<\/DL>/i)) {
            if (categoryStack.length > 0) {
                categoryStack.pop();
            }
            continue;
        }

        // 检测链接 <DT><A HREF="url" ...>标题</A>
        const linkMatch = line.match(/<DT><A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/i);
        if (linkMatch) {
            const url = linkMatch[1];
            const title = linkMatch[2].trim();

            // 所属分类：栈顶分类
            const categoryId = categoryStack.length > 0 ? categoryStack[categoryStack.length - 1].id : 0;

            // 检查是否已存在（同 URL 不重复导入）
            const existing = db.prepare('SELECT id FROM on_links WHERE url = ?').get(url);
            if (!existing) {
                db.prepare('INSERT INTO on_links (title, url, fid, weight) VALUES (?, ?, ?, ?)').run(title, url, categoryId, 100);
                linksCount++;
            }
            continue;
        }
    }

    return { categories: categoriesCount, links: linksCount };
}

// ============ 路由 ============

// 首页
// 主题配置
const THEMES = {
    '1': { name: '主题1', path: path.join(__dirname, 'themes', 'theme1', 'index.ejs') },
    '2': { name: '主题2', path: path.join(__dirname, 'themes', 'theme2', 'index.ejs') },
    '3': { name: '主题3', path: path.join(__dirname, 'themes', 'theme3', 'index.ejs') },
};

function getThemePath(themeId) {
    const theme = THEMES[themeId];
    if (theme && fs.existsSync(theme.path)) {
        return theme.path;
    }
    return path.join(__dirname, 'views', 'index.ejs'); // 默认主题
}

app.get('/', (req, res) => {
    const settings = getSiteSettings();
    // URL参数优先，否则使用设置中的主题，默认主题1
    const themeId = req.query.theme || settings.theme || '1';
    const themePath = getThemePath(themeId);
    const linkNum = settings.link_num || 50; // 每分类显示链接数

    // 获取所有分类（排除隐藏的）
    const categories = db.prepare('SELECT * FROM on_categorys WHERE hidden = 0 ORDER BY weight DESC').all();

    // 构成分类树
    const categoryTree = {};
    const topCategories = [];

    categories.forEach(cat => {
        cat.children = [];
        cat.links = [];
        categoryTree[cat.id] = cat;
        if (cat.fid === 0) {
            topCategories.push(cat);
        }
    });

    categories.forEach(cat => {
        if (cat.fid !== 0 && categoryTree[cat.fid]) {
            categoryTree[cat.fid].children.push(cat);
        }
    });

    // 获取所有链接
    const links = db.prepare('SELECT * FROM on_links ORDER BY topping DESC, weight DESC').all();
    links.forEach(link => {
        if (categoryTree[link.fid]) {
            // 只有当该分类的链接数未达到上限时才添加
            if (categoryTree[link.fid].links.length < linkNum) {
                categoryTree[link.fid].links.push(link);
            }
        }
    });

    // 扁平化所有分类（含子分类），用于模板遍历
    const allFlatCategories = [];
    function flattenCategories(cats) {
        cats.forEach(cat => {
            allFlatCategories.push(cat);
            if (cat.children.length > 0) {
                flattenCategories(cat.children);
            }
        });
    }
    flattenCategories(topCategories);

    // 获取全部链接列表（用于搜索建议）
    const allLinks = db.prepare('SELECT title, url, description FROM on_links ORDER BY weight DESC').all();

    // 搜索功能
    const searchQuery = req.query.q || '';
    let searchResults = [];

    if (searchQuery) {
        const safeQuery = sanitizeSearchInput(searchQuery);
        searchResults = db.prepare(`
            SELECT * FROM on_links
            WHERE title LIKE ? OR description LIKE ? OR url LIKE ?
            ORDER BY weight DESC
        `).all(`%${safeQuery}%`, `%${safeQuery}%`, `%${safeQuery}%`);
    }

    res.render(themePath, {
        settings,
        custom_header: settings.custom_header || '',
        siteName: settings.siteName || settings.title || 'MyNav',
        categories: allFlatCategories,
        categoryTree,
        searchQuery,
        searchResults,
        isLoggedIn: isLoggedIn(req),
        currentTheme: themeId,
        allLinks: allLinks || []
    }, (err, html) => {
        if (err && err.message.includes('Failed to lookup')) {
            // 主题文件不存在，使用默认
            res.render(path.join(__dirname, 'views', 'index.ejs'), {
                settings,
                custom_header: settings.custom_header || '',
                siteName: settings.siteName || settings.title || 'MyNav',
                categories: allFlatCategories,
                categoryTree,
                searchQuery,
                searchResults,
                isLoggedIn: isLoggedIn(req),
                currentTheme: '1',
                allLinks: allLinks || []
            });
        } else if (err) {
            res.status(500).send('渲染错误: ' + err.message);
        } else {
            res.send(html);
        }
    });
});

// 登录页面
app.get('/login', (req, res) => {
    if (isLoggedIn(req)) {
        return res.redirect('/admin');
    }
    res.render('login', { error: '' });
});

// 密码验证函数（支持bcrypt + MD5兼容迁移）
function verifyPassword(inputPassword, storedHash, username) {
    // 先尝试bcrypt验证
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        return bcrypt.compareSync(inputPassword, storedHash);
    }

    // 兼容旧的MD5密码
    const md5Hash = crypto.createHash('md5').update(inputPassword).digest('hex');
    if (md5Hash === storedHash) {
        // MD5匹配，自动升级为bcrypt
        const newHash = bcrypt.hashSync(inputPassword, 10);
        db.prepare('UPDATE on_users SET password = ? WHERE username = ?').run(newHash, username);
        return true;
    }

    return false;
}

// 登录处理
app.post('/login', (req, res) => {
    // 频率限制
    const limit = checkRateLimit('login');
    if (!limit.allowed) {
        return res.render('login', { error: limit.msg });
    }

    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM on_users WHERE username = ?').get(username);

    if (user && verifyPassword(password, user.password, username)) {
        req.session.loggedIn = true;
        req.session.username = user.username;
        auditLog('login-success', username, req);
        res.redirect('/admin');
    } else {
        auditLog('login-fail', username || 'unknown', req, '用户名或密码错误');
        res.render('login', { error: '用户名或密码错误' });
    }
});

// 登出
app.get('/logout', (req, res) => {
    auditLog('logout', req.session.username, req);
    req.session.destroy();
    res.redirect('/');
});

// 发送邮件（需配置SMTP）
async function sendEmail(to, subject, html) {
    const settings = getSiteSettings();
    if (!settings.smtp_host || !settings.smtp_user) {
        throw new Error('邮件服务未配置');
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 465,
        secure: settings.smtp_secure !== '0',
        auth: {
            user: settings.smtp_user,
            pass: decryptSMTP(settings.smtp_pass)
        }
    });

    await transporter.sendMail({
        from: settings.email_from || settings.smtp_user,
        to,
        subject,
        html
    });
}

// 修改密码页面
app.get('/admin/change-password', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    res.render('change-password', { error: null, success: null });
});

// 修改密码处理
app.post('/admin/change-password', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    // 频率限制
    const limit = checkRateLimit('change-password');
    if (!limit.allowed) {
        return res.render('change-password', { error: limit.msg, success: null });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    const username = req.session.username;

    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.render('change-password', { error: '请填写所有字段', success: null });
    }

    if (newPassword !== confirmPassword) {
        return res.render('change-password', { error: '两次输入的新密码不一致', success: null });
    }

    if (newPassword.length < 8) {
        return res.render('change-password', { error: '密码至少8位', success: null });
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
        return res.render('change-password', { error: '密码必须包含字母和数字', success: null });
    }

    // 验证当前密码
    const user = db.prepare('SELECT * FROM on_users WHERE username = ?').get(username);
    if (!user || !verifyPassword(currentPassword, user.password, username)) {
        return res.render('change-password', { error: '当前密码错误', success: null });
    }

    // 更新密码
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE on_users SET password = ?, password_changed_at = datetime('now') WHERE username = ?").run(newHash, username);

    auditLog('password-change', username, req);
    res.render('change-password', { error: null, success: '密码修改成功' });
});

// 个人设置页面
app.get('/admin/profile', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const user = db.prepare('SELECT * FROM on_users WHERE username = ?').get(req.session.username);
    const settings = getSiteSettings();

    res.render('admin-profile', {
        user,
        settings,
        error: null,
        success: null
    });
});

// 绑定邮箱
app.post('/admin/profile/bind-email', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    // 频率限制
    const limit = checkRateLimit('send-code');
    if (!limit.allowed) {
        const user = db.prepare('SELECT * FROM on_users WHERE username = ?').get(req.session.username);
        return res.render('admin-profile', { user, settings: getSiteSettings(), error: limit.msg, success: null });
    }

    const { email } = req.body;
    const username = req.session.username;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const user = db.prepare('SELECT * FROM on_users WHERE username = ?').get(username);
        return res.render('admin-profile', { user, settings: getSiteSettings(), error: '邮箱格式不正确', success: null });
    }

    // 生成验证码
    const code = generateVerifyCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO on_verify_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)').run(email, code, 'verify_email', expiresAt);

    // 发送验证码邮件
    sendEmail(email, '【MyNav】验证您的邮箱', `
        <p>您的验证码是：<strong style="font-size:24px;color:#007bff">${code}</strong></p>
        <p>验证码5分钟内有效。</p>
        <p>如果您没有请求此验证码，请忽略此邮件。</p>
    `).then(() => {
        auditLog('bind-email-send', username, req, '发送到: ' + email);
        res.render('admin-profile', {
            user: { ...db.prepare('SELECT * FROM on_users WHERE username = ?').get(username), pending_email: email },
            settings: getSiteSettings(),
            error: null,
            success: '验证码已发送到 ' + email
        });
    }).catch(err => {
        res.render('admin-profile', {
            user: db.prepare('SELECT * FROM on_users WHERE username = ?').get(username),
            settings: getSiteSettings(),
            error: '发送失败: ' + err.message,
            success: null
        });
    });
});

// 验证邮箱
app.post('/admin/profile/verify-email', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { email, code } = req.body;
    const username = req.session.username;

    // 验证验证码
    const record = db.prepare(`
        SELECT * FROM on_verify_codes
        WHERE email = ? AND code = ? AND type = 'verify_email' AND used = 0
        AND expires_at > datetime('now')
        ORDER BY created_at DESC LIMIT 1
    `).get(email, code);

    if (!record) {
        const user = db.prepare('SELECT * FROM on_users WHERE username = ?').get(username);
        return res.render('admin-profile', { user, settings: getSiteSettings(), error: '验证码错误或已过期', success: null });
    }

    // 标记验证码已使用
    db.prepare('UPDATE on_verify_codes SET used = 1 WHERE id = ?').run(record.id);

    // 更新用户邮箱
    db.prepare('UPDATE on_users SET email = ?, email_verified = 1 WHERE username = ?').run(email, username);

    auditLog('bind-email-verify', username, req, '已绑定: ' + email);
    res.render('admin-profile', {
        user: db.prepare('SELECT * FROM on_users WHERE username = ?').get(username),
        settings: getSiteSettings(),
        error: null,
        success: '邮箱绑定成功'
    });
});

// 找回密码页面
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { error: null, success: null, step: 'email' });
});

// 发送重置邮件
app.post('/forgot-password/send', (req, res) => {
    // 频率限制
    const limit = checkRateLimit('forgot-password');
    if (!limit.allowed) {
        return res.render('forgot-password', { error: limit.msg, success: null, step: 'email' });
    }

    const { email } = req.body;

    const user = db.prepare('SELECT * FROM on_users WHERE email = ?').get(email);
    if (!user) {
        // 不暴露用户是否存在
        return res.render('forgot-password', { error: null, success: '如果该邮箱已注册，重置邮件已发送', step: 'done' });
    }

    // 生成重置token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1小时

    db.prepare('UPDATE on_users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expiresAt, user.id);

    // 发送重置邮件
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    sendEmail(email, '【MyNav】重置您的密码', `
        <p>您好 ${user.username}，</p>
        <p>您收到这封邮件是因为您申请重置 MyNav 账户密码。</p>
        <p>请点击以下链接重置密码（链接1小时内有效）：</p>
        <p><a href="${resetUrl}" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px">重置密码</a></p>
        <p>或复制此链接：${resetUrl}</p>
        <p>如果您没有申请重置密码，请忽略此邮件。</p>
    `).then(() => {
        auditLog('forgot-password-send', user.username, req, '发送到: ' + email);
        res.render('forgot-password', { error: null, success: '重置邮件已发送，请查收', step: 'done' });
    }).catch(err => {
        res.render('forgot-password', { error: '发送失败: ' + err.message, success: null, step: 'email' });
    });
});

// 重置密码页面
app.get('/reset-password', (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.redirect('/forgot-password');
    }

    // 验证token
    const user = db.prepare(`
        SELECT * FROM on_users
        WHERE reset_token = ? AND reset_token_expires > datetime('now')
    `).get(token);

    if (!user) {
        return res.render('reset-password', { error: '重置链接无效或已过期', success: null, valid: false });
    }

    res.render('reset-password', { error: null, success: null, valid: true, token });
});

// 执行重置密码
app.post('/reset-password', (req, res) => {
    // 频率限制（按 token 限制，防止暴力破解）
    const limitKey = 'reset-password:' + (req.body.token || 'unknown');
    const limit = checkRateLimit(limitKey);
    if (!limit.allowed) {
        return res.render('reset-password', { error: limit.msg, success: null, valid: true, token: req.body.token });
    }

    const { token, newPassword, confirmPassword } = req.body;

    // 验证token
    const user = db.prepare(`
        SELECT * FROM on_users
        WHERE reset_token = ? AND reset_token_expires > datetime('now')
    `).get(token);

    if (!user) {
        return res.render('reset-password', { error: '重置链接无效或已过期', success: null, valid: false });
    }

    // 验证密码
    if (newPassword !== confirmPassword) {
        return res.render('reset-password', { error: '两次输入的密码不一致', success: null, valid: true, token });
    }

    if (newPassword.length < 8) {
        return res.render('reset-password', { error: '密码至少8位', success: null, valid: true, token });
    }

    // 更新密码并清除token
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE on_users SET password = ?, password_changed_at = datetime('now'), reset_token = NULL, reset_token_expires = NULL WHERE id = ?").run(newHash, user.id);

    auditLog('password-reset', user.username, req, '密码通过邮件重置链接重置');
    res.render('reset-password', { error: null, success: '密码重置成功，请登录', valid: false });
});

// 邮件设置页面
app.get('/admin/email-settings', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const settings = getSiteSettings();
    res.render('admin-email-settings', { settings, error: null, success: null });
});

// 保存邮件设置
app.post('/admin/email-settings', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, email_from } = req.body;

    // 使用 on_options 表存储（smtp_pass 加密存储）
    const stmt = db.prepare('INSERT OR REPLACE INTO on_options (key, value) VALUES (?, ?)');
    stmt.run('smtp_host', smtp_host || '');
    stmt.run('smtp_port', smtp_port || '465');
    stmt.run('smtp_secure', smtp_secure ? '1' : '0');
    stmt.run('smtp_user', smtp_user || '');
    stmt.run('smtp_pass', smtp_pass ? encryptSMTP(smtp_pass) : ''); // 加密存储
    stmt.run('email_from', email_from || '');

    auditLog('email-settings-save', req.session.username, req, '邮件设置已保存');
    res.render('admin-email-settings', { settings: getSiteSettings(), error: null, success: '保存成功' });
});

// 测试邮件发送
app.post('/admin/test-email', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.json({ success: false, error: '未登录' });
    }

    // 频率限制
    const limit = checkRateLimit('send-code');
    if (!limit.allowed) {
        return res.json({ success: false, error: limit.msg });
    }

    const { test_email } = req.body;

    sendEmail(test_email, '【MyNav】测试邮件', '<p>这是一封测试邮件，邮件服务配置正确！</p>')
        .then(() => {
            auditLog('test-email', req.session.username, req, '发送到: ' + test_email);
            res.json({ success: true });
        })
        .catch(err => res.json({ success: false, error: err.message }));
});

// ============ 后台管理 ============

// 后台首页
app.get('/admin', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const settings = getSiteSettings();
    const stats = {
        categories: db.prepare('SELECT COUNT(*) as count FROM on_categorys').get().count,
        links: db.prepare('SELECT COUNT(*) as count FROM on_links').get().count,
        todayLinks: db.prepare('SELECT COUNT(*) as count FROM on_links WHERE add_time > ?').get(Math.floor(Date.now() / 1000) - 86400).count
    };

    res.render('admin', {
        settings,
        stats,
        action: 'dashboard',
        message: req.query.msg || '',
        error: req.query.error || ''
    });
});

// 分类管理
app.get('/admin/category', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const settings = getSiteSettings();
    const categories = db.prepare('SELECT * FROM on_categorys ORDER BY fid ASC, weight DESC').all();
    const stats = {
        categories: db.prepare('SELECT COUNT(*) as count FROM on_categorys').get().count,
        links: db.prepare('SELECT COUNT(*) as count FROM on_links').get().count,
        todayLinks: 0
    };

    res.render('admin', {
        settings,
        stats,
        categories,
        action: 'category',
        message: '',
        error: ''
    });
});

// 添加分类
app.post('/admin/category/add', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { name, fid, weight, font_icon } = req.body;
    const username = req.session.username;
    db.prepare('INSERT INTO on_categorys (name, fid, weight, font_icon) VALUES (?, ?, ?, ?)').run(
        name, parseInt(fid) || 0, parseInt(weight) || 100, font_icon || 'fa-folder'
    );
    auditLog('category-add', username, req, '添加分类: ' + name);

    res.redirect('/admin/category?msg=添加成功');
});

// ---------- 递归删除分类（包含所有子分类和链接） ----------
function deleteCategoryRecursive(categoryId) {
    // 1. 删除该分类下的所有链接
    db.prepare('DELETE FROM on_links WHERE fid = ?').run(categoryId);

    // 2. 找出所有子分类
    const children = db.prepare('SELECT id FROM on_categorys WHERE fid = ?').all(categoryId);

    // 3. 递归删除每个子分类
    children.forEach(child => {
        deleteCategoryRecursive(child.id);
    });

    // 4. 删除当前分类
    db.prepare('DELETE FROM on_categorys WHERE id = ?').run(categoryId);
}

// 删除分类
app.post('/admin/category/delete', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { id } = req.body;
    const username = req.session.username;

    // 递归删除（包含子分类和链接）
    const category = db.prepare('SELECT name FROM on_categorys WHERE id = ?').get(id);
    if (!category) {
        return res.redirect('/admin/category?error=分类不存在');
    }

    deleteCategoryRecursive(parseInt(id));
    auditLog('category-delete', username, req, '删除分类: ' + category.name + ' (含子分类)');

    res.redirect('/admin/category?msg=删除成功（含子分类和链接）');
});

// 切换分类显示/隐藏
app.post('/admin/category/toggle', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { id } = req.body;
    const category = db.prepare('SELECT name, hidden FROM on_categorys WHERE id = ?').get(id);
    if (category) {
        const newHidden = category.hidden ? 0 : 1;
        db.prepare('UPDATE on_categorys SET hidden = ? WHERE id = ?').run(newHidden, id);
        auditLog('category-toggle', req.session.username, req, '切换分类可见性: ' + category.name + ' -> ' + (newHidden ? '隐藏' : '显示'));
    }

    res.redirect('/admin/category?msg=切换成功');
});

// 更新分类
app.post('/admin/category/update', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { id, name, fid, font_icon, weight } = req.body;
    db.prepare('UPDATE on_categorys SET name = ?, fid = ?, font_icon = ?, weight = ? WHERE id = ?')
        .run(name, fid || 0, font_icon || 'fa-folder', weight || 100, id);
    auditLog('category-update', req.session.username, req, '更新分类: ' + name);

    res.redirect('/admin/category?msg=更新成功');
});

// 链接管理
app.get('/admin/link', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const settings = getSiteSettings();
    const categories = db.prepare('SELECT * FROM on_categorys ORDER BY weight DESC').all();
    const searchQuery = req.query.q || '';
    const filterFid = req.query.fid ? parseInt(req.query.fid) : null;
    const message = req.query.msg || '';

    // 构建链接查询
    let links;
    const params = [];
    let whereClauses = [];

    if (searchQuery) {
        const safeQuery = sanitizeSearchInput(searchQuery);
        whereClauses.push('(title LIKE ? OR url LIKE ?)');
        params.push(`%${safeQuery}%`, `%${safeQuery}%`);
    }
    if (filterFid) {
        whereClauses.push('fid = ?');
        params.push(filterFid);
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    links = db.prepare(`SELECT * FROM on_links ${whereSQL} ORDER BY topping DESC, weight DESC`).all(...params);

    const stats = {
        categories: db.prepare('SELECT COUNT(*) as count FROM on_categorys').get().count,
        links: db.prepare('SELECT COUNT(*) as count FROM on_links').get().count,
        todayLinks: 0
    };

    res.render('admin', {
        settings,
        stats,
        categories,
        links,
        action: 'link',
        searchQuery,
        filterFid,
        message,
        error: ''
    });
});

// 添加链接
app.post('/admin/link/add', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { title, url, description, fid, weight, icon } = req.body;
    db.prepare('INSERT INTO on_links (title, url, description, fid, weight, icon) VALUES (?, ?, ?, ?, ?, ?)').run(
        title, url, description || '', parseInt(fid), parseInt(weight) || 100, icon || ''
    );
    auditLog('link-add', req.session.username, req, '添加链接: ' + title + ' -> ' + url);

    res.redirect('/admin/link?msg=添加成功');
});

// 删除链接
app.post('/admin/link/delete', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { id } = req.body;
    const link = db.prepare('SELECT title FROM on_links WHERE id = ?').get(id);
    if (link) {
        auditLog('link-delete', req.session.username, req, '删除链接: ' + link.title);
    }
    db.prepare('DELETE FROM on_links WHERE id = ?').run(id);

    res.redirect('/admin/link?msg=删除成功');
});

// 置顶/取消置顶
app.post('/admin/link/toggle-top', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { id } = req.body;
    const link = db.prepare('SELECT title, topping FROM on_links WHERE id = ?').get(id);
    const newTopping = link.topping ? 0 : 1;
    db.prepare('UPDATE on_links SET topping = ? WHERE id = ?').run(newTopping, id);
    auditLog('link-toggle-top', req.session.username, req, '切换置顶: ' + link.title + ' -> ' + (newTopping ? '置顶' : '取消置顶'));

    res.redirect('/admin/link?msg=' + (newTopping ? '已置顶' : '已取消置顶'));
});

// 更新链接
app.post('/admin/link/update', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { id, title, url, fid, weight, description, icon } = req.body;
    db.prepare('UPDATE on_links SET title = ?, url = ?, fid = ?, weight = ?, description = ?, icon = ? WHERE id = ?')
        .run(title, url, fid, weight || 100, description || '', icon || '', id);
    auditLog('link-update', req.session.username, req, '更新链接: ' + title + ' -> ' + url);

    res.redirect('/admin/link?msg=更新成功');
});

// 图标上传目录
const iconUploadDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconUploadDir)) {
    fs.mkdirSync(iconUploadDir, { recursive: true });
}

// 图标上传路由
const iconUpload = multer({ 
    dest: iconUploadDir,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的图片格式'));
        }
    }
});

app.post('/admin/link/upload-icon', iconUpload.single('icon_file'), (req, res) => {
    if (!isLoggedIn(req)) {
        return res.status(401).json({ success: false, error: '未登录' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, error: '没有上传文件' });
    }

    // 重命名为带扩展名的文件
    const ext = path.extname(req.file.originalname) || '.png';
    const newFilename = req.file.filename + ext;
    const newPath = path.join(iconUploadDir, newFilename);
    
    fs.renameSync(req.file.path, newPath);
    
    const iconUrl = '/icons/' + newFilename;
    res.json({ success: true, iconUrl });
});

// 系统设置
app.get('/admin/settings', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const settings = getSiteSettings();
    const stats = {
        categories: db.prepare('SELECT COUNT(*) as count FROM on_categorys').get().count,
        links: db.prepare('SELECT COUNT(*) as count FROM on_links').get().count,
        todayLinks: 0
    };

    res.render('admin', {
        settings,
        stats,
        action: 'settings',
        message: req.query.msg || '',
        error: ''
    });
});

// 保存设置（CSRF 在 multer 后手动验证）
app.post('/admin/settings', upload.single('bg_file'), (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    // 手动验证 CSRF（multer 解析后才能获取到 _csrf）
    const token = req.body && req.body._csrf;
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).send('CSRF 验证失败，请刷新页面后重试');
    }

    const { title, subtitle, description, keywords, link_num, theme, custom_header, auto_search,
            bg_type, bg_color, bg_gradient, bg_image, bg_overlay } = req.body;

    let finalBgType = bg_type || 'none';
    let finalBgImage = bg_image || '';

    // 如果选择了上传背景
    if (req.file) {
        if (req.file.size > 5 * 1024 * 1024) {
            return res.redirect('/admin/settings?error=背景图片不能超过5MB');
        }
        // 白名单扩展名验证
        const ext = (path.extname(req.file.originalname) || '').toLowerCase();
        if (!ALLOWED_IMAGE_EXT.includes(ext)) {
            return res.redirect('/admin/settings?error=不支持的图片格式，仅支持：JPG/PNG/GIF/WebP/BMP');
        }
        // MIME 类型验证（防止扩展名伪造）
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (!allowedMimes.includes((req.file.mimetype || '').toLowerCase())) {
            return res.redirect('/admin/settings?error=文件类型不支持');
        }
        const bgDir = path.join(__dirname, 'public', 'bg');
        if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });
        const filename = 'background-' + Date.now() + ext;
        fs.writeFileSync(path.join(bgDir, filename), req.file.buffer);
        finalBgType = 'upload';
        finalBgImage = '/bg/' + filename;
        auditLog('upload-bg', req.session.username, req, '上传背景: ' + filename);
    }

    const newSettings = JSON.stringify({
        title, subtitle, description, keywords,
        link_num: parseInt(link_num) || 50,
        theme: theme || '1',
        custom_header: custom_header || '',
        auto_search: auto_search || '0',
        bg_type: finalBgType,
        bg_color: bg_color || '',
        bg_gradient: bg_gradient || '',
        bg_image: finalBgImage,
        bg_overlay: bg_overlay !== undefined ? parseInt(bg_overlay) : 85
    });

    db.prepare('UPDATE on_options SET value = ? WHERE key = ?').run(newSettings, 'site_settings');
    auditLog('settings-save', req.session.username, req, '保存系统设置');

    res.redirect('/admin/settings?msg=保存成功');
});

// 书签导出
app.get('/admin/export', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    auditLog('bookmark-export', req.session.username, req, '导出书签');

    const categories = db.prepare('SELECT * FROM on_categorys ORDER BY weight DESC').all();
    const links = db.prepare('SELECT * FROM on_links ORDER BY weight DESC').all();

    // 生成 HTML 格式书签（兼容浏览器导入）
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. It will be read and overwritten. DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>MyNav Bookmarks</TITLE>
<H1>MyNav Bookmarks</H1>
<DL><p>`;

    // 一级分类
    categories.filter(c => c.fid === 0).forEach(cat => {
        html += `\n    <DT><H3>${escapeHtml(cat.name)}</H3>\n    <DL><p>`;

        // 子分类
        categories.filter(c => c.fid === cat.id).forEach(subCat => {
            html += `\n        <DT><H3>${escapeHtml(subCat.name)}</H3>\n        <DL><p>`;

            // 该分类下的链接
            links.filter(l => l.fid === subCat.id).forEach(link => {
                const icon = link.icon || '🔗';
                const desc = escapeHtml(link.description || '');
                const addDate = link.add_time || Math.floor(Date.now() / 1000);
                html += `\n            <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}" ICON="${icon}">${escapeHtml(link.title)}</A>`;
                if (desc) html += `\n            <DD>${desc}`;
            });

            html += `\n        </DL><p>`;
        });

        // 该分类下的链接（无子分类）
        links.filter(l => l.fid === cat.id).forEach(link => {
            const icon = link.icon || '🔗';
            const desc = escapeHtml(link.description || '');
            const addDate = link.add_time || Math.floor(Date.now() / 1000);
            html += `\n        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}" ICON="${icon}">${escapeHtml(link.title)}</A>`;
            if (desc) html += `\n        <DD>${desc}`;
        });

        html += `\n    </DL><p>`;
    });

    html += `\n</DL><p>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=MyNav_Bookmarks_${formatDate(new Date())}.html`);
    res.send(html);
});

// 书签导入
app.post('/admin/import', upload.single('bookmarks'), (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    if (!req.file) {
        return res.redirect('/admin/settings?error=请选择要导入的文件');
    }

    const content = req.file.buffer.toString('utf8');

    try {
        // 解析 HTML 书签格式
        const result = parseBookmarkHtml(content);
        auditLog('bookmark-import', req.session.username, req, `导入书签: ${result.categories} 个分类, ${result.links} 个链接`);
        res.redirect(`/admin/settings?msg=导入成功：${result.categories} 个分类，${result.links} 个链接`);
    } catch (e) {
        res.redirect(`/admin/settings?error=导入失败：${e.message}`);
    }
});

// 数据备份
app.get('/admin/backup', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    // 获取所有数据
    const categories = db.prepare('SELECT * FROM on_categorys').all();
    const links = db.prepare('SELECT * FROM on_links').all();
    const settings = getSiteSettings();
    const users = db.prepare('SELECT id, username, email, add_time FROM on_users').all();

    const backup = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        data: {
            categories,
            links,
            settings,
            users
        }
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=MyNav_Backup_${formatDate(new Date())}.json`);
    res.send(JSON.stringify(backup, null, 2));
});

// 数据恢复
app.post('/admin/restore', upload.single('backup'), (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    if (!req.file) {
        return res.redirect('/admin/settings?error=请选择备份文件');
    }

    try {
        const backup = JSON.parse(req.file.buffer.toString('utf8'));

        if (!backup.data || !backup.data.categories || !backup.data.links) {
            throw new Error('无效的备份文件格式');
        }

        // 清空现有数据
        db.prepare('DELETE FROM on_categorys').run();
        db.prepare('DELETE FROM on_links').run();

        // 恢复分类
        const insertCat = db.prepare('INSERT INTO on_categorys (id, name, fid, weight, font_icon, hidden, add_time) VALUES (?, ?, ?, ?, ?, ?, ?)');
        backup.data.categories.forEach(cat => {
            insertCat.run(cat.id, cat.name, cat.fid || 0, cat.weight || 100, cat.font_icon || 'fa-folder', cat.hidden || 0, cat.add_time);
        });

        // 恢复链接
        const insertLink = db.prepare('INSERT INTO on_links (id, title, url, description, fid, weight, topping, add_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        backup.data.links.forEach(link => {
            insertLink.run(link.id, link.title, link.url, link.description || '', link.fid || 0, link.weight || 100, link.topping || 0, link.add_time);
        });

        // 恢复设置（如果有）
        if (backup.data.settings) {
            db.prepare('UPDATE on_options SET value = ? WHERE key = ?').run(JSON.stringify(backup.data.settings), 'site_settings');
        }

        res.redirect('/admin/settings?msg=数据恢复成功');
    } catch (e) {
        res.redirect(`/admin/settings?error=恢复失败：${e.message}`);
    }
});

// 启动服务器
initDatabase();

// 启动时清理过期数据，并每小时清理一次
cleanupExpired();
setInterval(cleanupExpired, 60 * 60 * 1000);

console.log('');
console.log('================================');
console.log('  MyNav 个人版 - 启动中...');
console.log('================================');
console.log('');
console.log('访问地址:');
console.log(`  本机: http://localhost:${PORT}`);
console.log('');
console.log('默认账号: admin');
console.log('默认密码: admin123');
console.log('');
console.log('⚠️  安全启动检查:');
console.log(`  MYNAV_SESSION_SECRET: ${process.env.MYNAV_SESSION_SECRET ? '✅ 已设置' : '❌ 未设置'}`);
console.log(`  MYNAV_SMTP_KEY: ${process.env.MYNAV_SMTP_KEY ? '✅ 已设置' : '❌ 未设置'}`);
console.log('');
console.log('首次启动请设置环境变量:');
console.log('  export MYNAV_SESSION_SECRET=$(openssl rand -hex 32)');
console.log('  export MYNAV_SMTP_KEY=$(openssl rand -hex 32)');
console.log('');
console.log('按 Ctrl+C 停止服务器');
console.log('================================');
console.log('');

app.listen(PORT, HOST);
