<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 - <?php echo htmlspecialchars(SITE_TITLE); ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #667eea;
            --primary-dark: #764ba2;
            --sidebar-bg: #2c3e50;
            --sidebar-text: #ecf0f1;
            --content-bg: #f5f7fa;
            --card-bg: #ffffff;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--content-bg);
            display: flex;
            min-height: 100vh;
        }
        
        /* 侧边栏 */
        .sidebar {
            width: 250px;
            background: var(--sidebar-bg);
            color: var(--sidebar-text);
            padding: 20px 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        
        .sidebar-header {
            padding: 0 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
        }
        
        .sidebar-header h2 {
            font-size: 1.3rem;
        }
        
        .sidebar-header p {
            font-size: 12px;
            opacity: 0.7;
        }
        
        .nav-menu {
            list-style: none;
        }
        
        .nav-menu li a {
            display: block;
            padding: 12px 20px;
            color: var(--sidebar-text);
            text-decoration: none;
            transition: all 0.3s;
        }
        
        .nav-menu li a:hover,
        .nav-menu li a.active {
            background: rgba(255,255,255,0.1);
            border-left: 3px solid var(--primary);
        }
        
        .nav-menu li a i {
            margin-right: 10px;
            width: 20px;
        }
        
        /* 主内容 */
        .main-content {
            margin-left: 250px;
            flex: 1;
            padding: 30px;
        }
        
        .page-header {
            margin-bottom: 30px;
        }
        
        .page-header h1 {
            font-size: 1.8rem;
            color: #333;
        }
        
        .page-header p {
            color: #666;
            margin-top: 5px;
        }
        
        /* 卡片 */
        .card {
            background: var(--card-bg);
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            margin-bottom: 25px;
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .card-header h3 {
            font-size: 1.2rem;
            color: #333;
        }
        
        /* 统计卡片 */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-card i {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .stat-card .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
        }
        
        .stat-card .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
        
        /* 表格 */
        .data-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .data-table th,
        .data-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .data-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
        }
        
        .data-table tr:hover {
            background: #f8f9fa;
        }
        
        /* 按钮 */
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .btn-sm {
            padding: 5px 10px;
            font-size: 12px;
        }
        
        /* 表单 */
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 10px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }
        
        /* 消息提示 */
        .message {
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
        }
        
        /* 响应式 */
        @media (max-width: 768px) {
            .sidebar {
                width: 60px;
                overflow: hidden;
            }
            
            .sidebar-header h2,
            .sidebar-header p,
            .nav-menu li a span {
                display: none;
            }
            
            .main-content {
                margin-left: 60px;
            }
        }
    </style>
</head>
<body>
    <!-- 侧边栏 -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <h2><i class="fas fa-bookmark"></i> OneNav</h2>
            <p>管理后台</p>
        </div>
        
        <ul class="nav-menu">
            <li>
                <a href="index.php?c=admin&action=dashboard" class="<?php echo $action === 'dashboard' ? 'active' : ''; ?>">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>仪表盘</span>
                </a>
            </li>
            <li>
                <a href="index.php?c=admin&action=category" class="<?php echo $action === 'category' ? 'active' : ''; ?>">
                    <i class="fas fa-folder"></i>
                    <span>分类管理</span>
                </a>
            </li>
            <li>
                <a href="index.php?c=admin&action=link" class="<?php echo $action === 'link' ? 'active' : ''; ?>">
                    <i class="fas fa-link"></i>
                    <span>链接管理</span>
                </a>
            </li>
            <li>
                <a href="index.php?c=admin&action=settings" class="<?php echo $action === 'settings' ? 'active' : ''; ?>">
                    <i class="fas fa-cog"></i>
                    <span>系统设置</span>
                </a>
            </li>
            <li>
                <a href="index.php?c=admin&action=backup">
                    <i class="fas fa-database"></i>
                    <span>数据备份</span>
                </a>
            </li>
            <li>
                <a href="index.php" target="_blank">
                    <i class="fas fa-home"></i>
                    <span>访问首页</span>
                </a>
            </li>
            <li>
                <a href="index.php?c=logout">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>退出登录</span>
                </a>
            </li>
        </ul>
    </aside>
    
    <!-- 主内容 -->
    <main class="main-content">
        <?php if ($message): ?>
            <div class="message success"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="message error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <?php if ($action === 'dashboard'): ?>
            <!-- 仪表盘 -->
            <div class="page-header">
                <h1><i class="fas fa-tachometer-alt"></i> 仪表盘</h1>
                <p>欢迎回来，<?php echo htmlspecialchars($_SESSION['username']); ?></p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fas fa-folder"></i>
                    <div class="stat-number"><?php echo $stats['categories']; ?></div>
                    <div class="stat-label">分类数量</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-link"></i>
                    <div class="stat-number"><?php echo $stats['links']; ?></div>
                    <div class="stat-label">链接总数</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-clock"></i>
                    <div class="stat-number"><?php echo $stats['today_links']; ?></div>
                    <div class="stat-label">今日新增</div>
                </div>
            </div>
            
        <?php elseif ($action === 'category'): ?>
            <!-- 分类管理 -->
            <div class="page-header">
                <h1><i class="fas fa-folder"></i> 分类管理</h1>
                <p>管理书签分类</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>添加分类</h3>
                </div>
                <form method="POST">
                    <input type="hidden" name="op" value="add">
                    <div class="form-group">
                        <label>分类名称</label>
                        <input type="text" name="name" required placeholder="输入分类名称">
                    </div>
                    <div class="form-group">
                        <label>父分类</label>
                        <select name="fid">
                            <option value="0">作为一级分类</option>
                            <?php foreach ($categories as $cat): ?>
                                <?php if ($cat['fid'] == 0): ?>
                                    <option value="<?php echo $cat['id']; ?>">-- <?php echo htmlspecialchars($cat['name']); ?></option>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>权重 (越大越靠前)</label>
                        <input type="number" name="weight" value="100">
                    </div>
                    <div class="form-group">
                        <label>图标 (FontAwesome)</label>
                        <input type="text" name="font_icon" value="fa-folder" placeholder="例如: fa-star">
                    </div>
                    <button type="submit" class="btn btn-primary">添加分类</button>
                </form>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>分类列表</h3>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>名称</th>
                            <th>类型</th>
                            <th>权重</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($categories as $cat): ?>
                            <tr>
                                <td><?php echo $cat['id']; ?></td>
                                <td>
                                    <i class="fas <?php echo htmlspecialchars($cat['font_icon']); ?>"></i>
                                    <?php echo htmlspecialchars($cat['name']); ?>
                                </td>
                                <td><?php echo $cat['fid'] == 0 ? '一级分类' : '二级分类'; ?></td>
                                <td><?php echo $cat['weight']; ?></td>
                                <td>
                                    <form method="POST" style="display: inline;" onsubmit="return confirm('确定删除？')">
                                        <input type="hidden" name="op" value="delete">
                                        <input type="hidden" name="id" value="<?php echo $cat['id']; ?>">
                                        <button type="submit" class="btn btn-danger btn-sm">删除</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
        <?php elseif ($action === 'link'): ?>
            <!-- 链接管理 -->
            <div class="page-header">
                <h1><i class="fas fa-link"></i> 链接管理</h1>
                <p>管理书签链接</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>添加链接</h3>
                </div>
                <form method="POST">
                    <input type="hidden" name="op" value="add">
                    <div class="form-group">
                        <label>链接标题</label>
                        <input type="text" name="title" required placeholder="输入链接标题">
                    </div>
                    <div class="form-group">
                        <label>链接地址</label>
                        <input type="url" name="url" required placeholder="https://example.com">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <textarea name="description" rows="2" placeholder="简短描述"></textarea>
                    </div>
                    <div class="form-group">
                        <label>所属分类</label>
                        <select name="fid" required>
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?php echo $cat['id']; ?>">
                                    <?php echo $cat['fid'] == 0 ? '' : '└─ '; ?>
                                    <?php echo htmlspecialchars($cat['name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>权重</label>
                        <input type="number" name="weight" value="100">
                    </div>
                    <button type="submit" class="btn btn-primary">添加链接</button>
                </form>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>链接列表</h3>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>标题</th>
                            <th>URL</th>
                            <th>分类</th>
                            <th>置顶</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($links as $link): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($link['title']); ?></td>
                                <td><a href="<?php echo htmlspecialchars($link['url']); ?>" target="_blank"><?php echo htmlspecialchars(substr($link['url'], 0, 40)); ?>...</a></td>
                                <td>
                                    <?php
                                    $cat = $db->get('on_categorys', 'name', ['id' => $link['fid']]);
                                    echo $cat ? htmlspecialchars($cat) : '-';
                                    ?>
                                </td>
                                <td><?php echo $link['topping'] ? '是' : '否'; ?></td>
                                <td>
                                    <form method="POST" style="display: inline;">
                                        <input type="hidden" name="op" value="toggle_top">
                                        <input type="hidden" name="id" value="<?php echo $link['id']; ?>">
                                        <button type="submit" class="btn btn-primary btn-sm"><?php echo $link['topping'] ? '取消置顶' : '置顶'; ?></button>
                                    </form>
                                    <form method="POST" style="display: inline;" onsubmit="return confirm('确定删除？')">
                                        <input type="hidden" name="op" value="delete">
                                        <input type="hidden" name="id" value="<?php echo $link['id']; ?>">
                                        <button type="submit" class="btn btn-danger btn-sm">删除</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
        <?php elseif ($action === 'settings'): ?>
            <!-- 系统设置 -->
            <div class="page-header">
                <h1><i class="fas fa-cog"></i> 系统设置</h1>
                <p>配置网站基本信息</p>
            </div>
            
            <div class="card">
                <form method="POST">
                    <div class="form-group">
                        <label>网站标题</label>
                        <input type="text" name="title" value="<?php echo htmlspecialchars($siteSettings['title']); ?>">
                    </div>
                    <div class="form-group">
                        <label>副标题</label>
                        <input type="text" name="subtitle" value="<?php echo htmlspecialchars($siteSettings['subtitle']); ?>">
                    </div>
                    <div class="form-group">
                        <label>网站描述</label>
                        <textarea name="description" rows="3"><?php echo htmlspecialchars($siteSettings['description']); ?></textarea>
                    </div>
                    <div class="form-group">
                        <label>关键词</label>
                        <input type="text" name="keywords" value="<?php echo htmlspecialchars($siteSettings['keywords']); ?>">
                    </div>
                    <div class="form-group">
                        <label>每分类显示链接数</label>
                        <input type="number" name="link_num" value="<?php echo $siteSettings['link_num']; ?>">
                    </div>
                    <button type="submit" class="btn btn-primary">保存设置</button>
                </form>
            </div>
        <?php endif; ?>
    </main>
</body>
</html>
