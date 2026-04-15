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

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

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
    `);
    
    // 数据库迁移：添加 hidden 字段（如果不存在）
    try {
        db.exec("ALTER TABLE on_categorys ADD COLUMN hidden INTEGER DEFAULT 0");
    } catch (e) {
        // 字段已存在，忽略错误
    }
    
    // 检查是否已初始化
    const userCount = db.prepare('SELECT COUNT(*) as count FROM on_users').get();
    if (userCount.count === 0) {
        // 插入默认用户
        const defaultPassword = crypto.createHash('md5').update('admin123').digest('hex');
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
    secret: 'onenav-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// 文件上传配置
const upload = multer({ storage: multer.memoryStorage() });

// 视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 辅助函数
function getSiteSettings() {
    const row = db.prepare('SELECT value FROM on_options WHERE key = ?').get('site_settings');
    return row ? JSON.parse(row.value) : {
        title: '我的导航站',
        subtitle: '简洁实用的书签管理',
        description: '个人书签导航系统',
        keywords: '导航,书签,收藏,工具',
        link_num: 50
    };
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

// 解析 HTML 书签
function parseBookmarkHtml(content) {
    let categoriesCount = 0;
    let linksCount = 0;

    // 获取所有分类
    const categoryPattern = /<DT><H3[^>]*>([^<]+)<\/H3>/gi;
    let match;
    const categoryNames = new Map(); // name -> id

    while ((match = categoryPattern.exec(content)) !== null) {
        const name = match[1].trim();
        // 检查是否已存在
        let existing = db.prepare('SELECT id FROM on_categorys WHERE name = ?').get(name);
        if (!existing) {
            const result = db.prepare('INSERT INTO on_categorys (name, weight) VALUES (?, ?)').run(name, 100);
            existing = { id: result.lastInsertRowid };
        }
        categoryNames.set(name, existing.id);
        categoriesCount++;
    }

    // 获取所有链接
    const linkPattern = /<DT><A HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
    while ((match = linkPattern.exec(content)) !== null) {
        const url = match[1];
        const title = match[2].trim();

        // 查找所属分类（向上查找最近的 H3）
        let categoryId = 0;
        const beforeLink = content.substring(0, match.index);
        const recentH3s = [...beforeLink.matchAll(/<DT><H3[^>]*>([^<]+)<\/H3>/gi)];
        if (recentH3s.length > 0) {
            const lastH3 = recentH3s[recentH3s.length - 1][1].trim();
            if (categoryNames.has(lastH3)) {
                categoryId = categoryNames.get(lastH3);
            }
        }

        // 检查是否已存在
        const existing = db.prepare('SELECT id FROM on_links WHERE url = ?').get(url);
        if (!existing) {
            db.prepare('INSERT INTO on_links (title, url, fid, weight) VALUES (?, ?, ?, ?)').run(title, url, categoryId, 100);
            linksCount++;
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
            categoryTree[link.fid].links.push(link);
        }
    });
    
    // 获取全部链接列表（用于搜索建议）
    const allLinks = db.prepare('SELECT title, url, description FROM on_links ORDER BY weight DESC').all();
    
    // 搜索功能
    const searchQuery = req.query.q || '';
    let searchResults = [];
    
    if (searchQuery) {
        searchResults = db.prepare(`
            SELECT * FROM on_links 
            WHERE title LIKE ? OR description LIKE ? OR url LIKE ?
            ORDER BY weight DESC
        `).all(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }
    
    res.render(themePath, {
        settings,
        custom_header: settings.custom_header || '',
        siteName: settings.siteName || settings.title || 'MyNav',
        categories: topCategories,
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
                categories: topCategories,
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

// 登录处理
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
    
    const user = db.prepare('SELECT * FROM on_users WHERE username = ? AND password = ?').get(username, hashedPassword);
    
    if (user) {
        req.session.loggedIn = true;
        req.session.username = user.username;
        res.redirect('/admin');
    } else {
        res.render('login', { error: '用户名或密码错误' });
    }
});

// 登出
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
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
    db.prepare('INSERT INTO on_categorys (name, fid, weight, font_icon) VALUES (?, ?, ?, ?)').run(
        name, parseInt(fid) || 0, parseInt(weight) || 100, font_icon || 'fa-folder'
    );
    
    res.redirect('/admin/category?msg=添加成功');
});

// 删除分类
app.post('/admin/category/delete', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { id } = req.body;
    db.prepare('DELETE FROM on_links WHERE fid = ?').run(id);
    db.prepare('DELETE FROM on_categorys WHERE id = ?').run(id);
    
    res.redirect('/admin/category?msg=删除成功');
});

// 切换分类显示/隐藏
app.post('/admin/category/toggle', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { id } = req.body;
    db.prepare('UPDATE on_categorys SET hidden = NOT hidden WHERE id = ?').run(id);
    
    res.redirect('/admin/category?msg=切换成功');
});

// 链接管理
app.get('/admin/link', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const settings = getSiteSettings();
    const categories = db.prepare('SELECT * FROM on_categorys ORDER BY weight DESC').all();
    const links = db.prepare('SELECT * FROM on_links ORDER BY topping DESC, weight DESC').all();
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
        message: '',
        error: ''
    });
});

// 添加链接
app.post('/admin/link/add', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { title, url, description, fid, weight } = req.body;
    db.prepare('INSERT INTO on_links (title, url, description, fid, weight) VALUES (?, ?, ?, ?, ?)').run(
        title, url, description || '', parseInt(fid), parseInt(weight) || 100
    );
    
    res.redirect('/admin/link?msg=添加成功');
});

// 删除链接
app.post('/admin/link/delete', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { id } = req.body;
    db.prepare('DELETE FROM on_links WHERE id = ?').run(id);
    
    res.redirect('/admin/link?msg=删除成功');
});

// 置顶/取消置顶
app.post('/admin/link/toggle-top', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { id } = req.body;
    const link = db.prepare('SELECT topping FROM on_links WHERE id = ?').get(id);
    const newTopping = link.topping ? 0 : 1;
    db.prepare('UPDATE on_links SET topping = ? WHERE id = ?').run(newTopping, id);
    
    res.redirect('/admin/link?msg=' + (newTopping ? '已置顶' : '已取消置顶'));
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

// 保存设置
app.post('/admin/settings', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    const { title, subtitle, description, keywords, link_num, theme, custom_header } = req.body;
    const newSettings = JSON.stringify({
        title, subtitle, description, keywords,
        link_num: parseInt(link_num) || 50,
        theme: theme || '1',
        custom_header: custom_header || ''
    });

    db.prepare('UPDATE on_options SET value = ? WHERE key = ?').run(newSettings, 'site_settings');

    res.redirect('/admin/settings?msg=保存成功');
});

// 书签导出
app.get('/admin/export', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

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
app.post('/admin/import', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    if (!req.files || !req.files.bookmarks) {
        return res.redirect('/admin?error=请选择要导入的文件');
    }

    const file = req.files.bookmarks;
    const content = file.data.toString('utf8');

    try {
        // 解析 HTML 书签格式
        const result = parseBookmarkHtml(content);
        res.redirect(`/admin?msg=导入成功：${result.categories} 个分类，${result.links} 个链接`);
    } catch (e) {
        res.redirect(`/admin?error=导入失败：${e.message}`);
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
app.post('/admin/restore', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    if (!req.files || !req.files.backup) {
        return res.redirect('/admin?error=请选择备份文件');
    }

    try {
        const file = req.files.backup;
        const backup = JSON.parse(file.data.toString('utf8'));

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

        res.redirect('/admin?msg=数据恢复成功');
    } catch (e) {
        res.redirect(`/admin?error=恢复失败：${e.message}`);
    }
});

// 启动服务器
initDatabase();

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
console.log('按 Ctrl+C 停止服务器');
console.log('================================');
console.log('');

app.listen(PORT, HOST);
