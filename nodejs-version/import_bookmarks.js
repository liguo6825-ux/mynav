#!/usr/bin/env node
/**
 * 导入 OneNav HTML 书签到数据库
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'onenav.db');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据库
const db = new Database(DB_PATH);

// 创建表
db.exec(`
    CREATE TABLE IF NOT EXISTS on_categorys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fid INTEGER DEFAULT 0,
        weight INTEGER DEFAULT 100,
        font_icon TEXT DEFAULT 'fa-folder',
        add_time INTEGER DEFAULT (strftime('%s', 'now'))
    );
    
    CREATE TABLE IF NOT EXISTS on_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        fid INTEGER DEFAULT 0,
        weight INTEGER DEFAULT 100,
        icon TEXT DEFAULT '',
        topping INTEGER DEFAULT 0,
        property INTEGER DEFAULT 0,
        add_time INTEGER DEFAULT (strftime('%s', 'now'))
    );
    
    CREATE TABLE IF NOT EXISTS on_options (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    
    CREATE TABLE IF NOT EXISTS on_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        token TEXT,
        last_login INTEGER DEFAULT 0
    );
`);

// 插入默认设置
const defaultSettings = {
    title: '滔哥导航站',
    subtitle: '软件收藏夹',
    keywords: '导航,书签,软件',
    description: '个人书签导航系统',
    theme: 'default',
    default_category: '1'
};

const insertOption = db.prepare('INSERT OR REPLACE INTO on_options (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
    insertOption.run(key, value);
}

// 插入默认管理员 (admin123)
const insertUser = db.prepare('INSERT OR IGNORE INTO on_users (id, username, password) VALUES (1, ?, ?)');
insertUser.run('admin', '0192023a7bbd73250516f069df18b500');

// 清空现有数据
db.exec('DELETE FROM on_links');
db.exec('DELETE FROM on_categorys');

// 解析 HTML 文件
const htmlFile = '/Users/mac/Downloads/OneNav_Export_2026.4.7.html';
const html = fs.readFileSync(htmlFile, 'utf8');

// Font Awesome 图标映射
const iconMap = {
    '远程软件': 'fa-desktop',
    '常用': 'fa-briefcase',
    '原始链接': 'fa-link',
    '系统': 'fa-cog',
    '音乐影音': 'fa-music',
    '美化工具': 'fa-palette',
    '其他工具': 'fa-tools',
    '直播软件': 'fa-broadcast-tower',
    '游戏': 'fa-gamepad',
    'AI员工': 'fa-robot'
};

function getIcon(catName) {
    for (const [key, icon] of Object.entries(iconMap)) {
        if (catName.includes(key)) return icon;
    }
    return 'fa-folder';
}

// 解析 HTML 结构
const lines = html.split('\n');
const categories = [];
let currentCat = null;
let inOnNav = false;

for (const line of lines) {
    // 检测 OneNav 主分类开始
    if (line.includes('OneNav') && line.includes('<H3')) {
        inOnNav = true;
        continue;
    }
    
    // 检测分类标题（跳过 OneNav 主标题）
    const catMatch = line.match(/<DT><H3[^>]*>([^<]+)<\/H3>/);
    if (catMatch && inOnNav) {
        const catName = catMatch[1].trim();
        if (catName !== 'OneNav') {
            currentCat = {
                name: catName,
                font_icon: getIcon(catName),
                links: []
            };
            categories.push(currentCat);
        }
        continue;
    }
    
    // 检测链接
    const linkMatch = line.match(/<DT><A HREF="([^"]+)"[^>]*>([^<]+)<\/A>/);
    if (linkMatch && currentCat) {
        const url = decodeURIComponent(linkMatch[1]);
        const title = linkMatch[2].trim();
        currentCat.links.push({ title, url });
    }
}

// 插入分类和链接
const insertCat = db.prepare('INSERT INTO on_categorys (name, weight, font_icon) VALUES (?, ?, ?)');
const insertLink = db.prepare('INSERT INTO on_links (title, url, description, fid, weight) VALUES (?, ?, ?, ?, ?)');

const importAll = db.transaction(() => {
    categories.forEach((cat, catIndex) => {
        const result = insertCat.run(cat.name, 100 - catIndex * 10, cat.font_icon);
        const fid = result.lastInsertRowid;
        
        cat.links.forEach((link, linkIndex) => {
            insertLink.run(link.title, link.url, '', fid, 100 - linkIndex);
        });
    });
});

importAll();

// 统计
const catCount = db.prepare('SELECT COUNT(*) as count FROM on_categorys').get();
const linkCount = db.prepare('SELECT COUNT(*) as count FROM on_links').get();

console.log('\n✅ 导入完成！');
console.log(`📁 分类数量: ${catCount.count}`);
console.log(`🔗 链接数量: ${linkCount.count}`);
console.log('\n分类明细:');
for (const cat of categories) {
    console.log(`  ${cat.name}: ${cat.links.length} 个链接`);
}

db.close();
