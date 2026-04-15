<?php
/**
 * 初始化控制器
 */

$step = isset($_GET['step']) ? intval($_GET['step']) : 1;
$error = '';
$success = '';

// 检查是否已初始化
if (file_exists(__DIR__ . '/../data/config.php')) {
    header("Location: index.php");
    exit();
}

// 处理初始化
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 创建数据目录
    $dataDir = __DIR__ . '/../data';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    
    // 获取用户输入
    $adminUser = isset($_POST['username']) ? trim($_POST['username']) : 'admin';
    $adminPass = isset($_POST['password']) ? trim($_POST['password']) : 'admin123';
    $adminEmail = isset($_POST['email']) ? trim($_POST['email']) : 'admin@example.com';
    $siteTitle = isset($_POST['site_title']) ? trim($_POST['site_title']) : '我的导航站';
    
    // 创建数据库
    $dbFile = $dataDir . '/onenav.db';
    
    try {
        // 初始化数据库
        require_once __DIR__ . '/../class/Medoo.php';
        
        $db = new Medoo\Medoo([
            'database_type' => 'sqlite',
            'database_file' => $dbFile
        ]);
        
        // 创建表结构
        $db->exec("
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
            
            CREATE INDEX IF NOT EXISTS idx_categorys_fid ON on_categorys(fid);
            CREATE INDEX IF NOT EXISTS idx_links_fid ON on_links(fid);
        ");
        
        // 插入默认数据
        $db->insert('on_options', [
            'key' => 'site_settings',
            'value' => serialize([
                'title' => $siteTitle,
                'subtitle' => '简洁实用的书签管理',
                'description' => '个人书签导航系统',
                'keywords' => '导航,书签,收藏,工具',
                'link_num' => 50
            ])
        ]);
        
        // 插入默认分类
        $db->insert('on_categorys', ['name' => '常用工具', 'fid' => 0, 'weight' => 100, 'font_icon' => 'fa-star']);
        $db->insert('on_categorys', ['name' => '搜索引擎', 'fid' => 0, 'weight' => 90, 'font_icon' => 'fa-search']);
        $db->insert('on_categorys', ['name' => '开发工具', 'fid' => 0, 'weight' => 80, 'font_icon' => 'fa-code']);
        
        // 插入示例链接
        $db->insert('on_links', ['title' => '百度', 'url' => 'https://www.baidu.com', 'description' => '百度搜索', 'fid' => 2, 'weight' => 100]);
        $db->insert('on_links', ['title' => 'Google', 'url' => 'https://www.google.com', 'description' => 'Google 搜索', 'fid' => 2, 'weight' => 90]);
        $db->insert('on_links', ['title' => 'GitHub', 'url' => 'https://github.com', 'description' => '代码托管平台', 'fid' => 1, 'weight' => 100]);
        
        // 创建配置文件
        $configContent = "<?php
// 自动生成的配置文件
// 创建时间: " . date('Y-m-d H:i:s') . "

require_once __DIR__ . '/../class/Medoo.php';

use Medoo\Medoo;

\$db = new Medoo([
    'database_type' => 'sqlite',
    'database_file' => __DIR__ . '/onenav.db',
    'error' => PDO::ERRMODE_EXCEPTION
]);

// 站点配置
\$siteConfig = [
    'title' => '{$siteTitle}',
    'subtitle' => '简洁实用的书签管理',
    'admin' => [
        'username' => '{$adminUser}',
        'password' => '" . md5($adminPass) . "',
        'email' => '{$adminEmail}'
    ],
    'link_num' => 50,
    'theme' => 'default'
];

define('SITE_TITLE', \$siteConfig['title']);
define('SITE_SUBTITLE', \$siteConfig['subtitle']);
define('ADMIN_USER', \$siteConfig['admin']['username']);
define('ADMIN_PASS', \$siteConfig['admin']['password']);
define('ADMIN_EMAIL', \$siteConfig['admin']['email']);
define('LINK_NUM', \$siteConfig['link_num']);
define('THEME', \$siteConfig['theme']);
define('VERSION', '1.0.0');

function getSiteSettings() {
    global \$db;
    \$settings = \$db->get('on_options', 'value', ['key' => 'site_settings']);
    return \$settings ? unserialize(\$settings) : [];
}

function updateSiteSettings(\$settings) {
    global \$db;
    return \$db->update('on_options', ['value' => serialize(\$settings)], ['key' => 'site_settings']);
}
";
        
        file_put_contents($dataDir . '/config.php', $configContent);
        
        $success = '初始化成功！请登录管理后台。';
        $step = 3;
        
    } catch (Exception $e) {
        $error = '初始化失败: ' . $e->getMessage();
    }
}

// 加载初始化模板
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OneNav 初始化</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 90%;
        }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
        input[type="text"],
        input[type="password"],
        input[type="email"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus { outline: none; border-color: #667eea; }
        .btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.3s;
        }
        .btn:hover { transform: translateY(-2px); }
        .error { color: #e74c3c; margin-bottom: 20px; padding: 10px; background: #ffe6e6; border-radius: 5px; }
        .success { color: #27ae60; margin-bottom: 20px; padding: 10px; background: #e6ffe6; border-radius: 5px; }
        .step { color: #888; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 OneNav 初始化</h1>
        
        <?php if ($error): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <?php if ($success): ?>
            <div class="success"><?php echo htmlspecialchars($success); ?></div>
            <a href="index.php?c=login" class="btn" style="display: block; text-align: center; text-decoration: none; line-height: 48px;">前往登录</a>
        <?php else: ?>
            <form method="POST">
                <div class="form-group">
                    <label>管理员账号</label>
                    <input type="text" name="username" value="admin" required>
                </div>
                <div class="form-group">
                    <label>管理员密码</label>
                    <input type="password" name="password" value="admin123" required>
                </div>
                <div class="form-group">
                    <label>管理员邮箱</label>
                    <input type="email" name="email" value="admin@example.com">
                </div>
                <div class="form-group">
                    <label>网站标题</label>
                    <input type="text" name="site_title" value="我的导航站" required>
                </div>
                <button type="submit" class="btn">开始初始化</button>
            </form>
        <?php endif; ?>
        
        <div class="step">步骤 <?php echo $step; ?> / 3</div>
    </div>
</body>
</html>
