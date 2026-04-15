-- OneNav 个人版数据库结构
-- 创建时间: 2026-04-14

-- 分类表
CREATE TABLE IF NOT EXISTS on_categorys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fid INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 100,
    font_icon TEXT DEFAULT 'fa-folder',
    add_time INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 链接表
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

-- 配置表
CREATE TABLE IF NOT EXISTS on_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT
);

-- 用户表
CREATE TABLE IF NOT EXISTS on_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    add_time INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_categorys_fid ON on_categorys(fid);
CREATE INDEX IF NOT EXISTS idx_categorys_weight ON on_categorys(weight);
CREATE INDEX IF NOT EXISTS idx_links_fid ON on_links(fid);
CREATE INDEX IF NOT EXISTS idx_links_weight ON on_links(weight);
CREATE INDEX IF NOT EXISTS idx_links_topping ON on_links(topping);

-- 默认配置
INSERT OR IGNORE INTO on_options (key, value) VALUES (
    'site_settings',
    'a:5:{s:5:"title";s:12:"我的导航站";s:8:"subtitle";s:18:"简洁实用的书签管理";s:11:"description";s:33:"个人书签导航系统";s:8:"keywords";s:23:"导航,书签,收藏,工具";s:8:"link_num";i:50;}'
);

-- 默认分类
INSERT OR IGNORE INTO on_categorys (name, fid, weight, font_icon) VALUES 
('常用工具', 0, 100, 'fa-star'),
('搜索引擎', 0, 90, 'fa-search'),
('开发工具', 0, 80, 'fa-code'),
('社交媒体', 0, 70, 'fa-users'),
('学习资源', 0, 60, 'fa-book');

-- 二级分类
INSERT OR IGNORE INTO on_categorys (name, fid, weight, font_icon) VALUES 
('前端开发', 3, 100, 'fa-html5'),
('后端开发', 3, 90, 'fa-server'),
('设计资源', 3, 80, 'fa-palette');

-- 示例链接
INSERT OR IGNORE INTO on_links (title, url, description, fid, weight, topping) VALUES 
('百度', 'https://www.baidu.com', '百度搜索', 2, 100, 0),
('Google', 'https://www.google.com', 'Google 搜索', 2, 90, 0),
('GitHub', 'https://github.com', '代码托管平台', 1, 100, 1),
('Stack Overflow', 'https://stackoverflow.com', '编程问答社区', 1, 90, 0),
('MDN', 'https://developer.mozilla.org', 'Web 开发文档', 6, 100, 0),
('Vue.js', 'https://vuejs.org', '渐进式 JavaScript 框架', 6, 95, 0),
('React', 'https://reactjs.org', '构建用户界面的 JavaScript 库', 6, 90, 0),
('Node.js', 'https://nodejs.org', 'JavaScript 运行时', 7, 100, 0),
('Python', 'https://www.python.org', 'Python 编程语言', 7, 95, 0),
('Docker', 'https://www.docker.com', '容器化平台', 1, 80, 0);
