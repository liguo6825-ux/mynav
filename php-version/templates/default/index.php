<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($siteSettings['title']); ?> - <?php echo htmlspecialchars($siteSettings['subtitle']); ?></title>
    <meta name="keywords" content="<?php echo htmlspecialchars($siteSettings['keywords']); ?>">
    <meta name="description" content="<?php echo htmlspecialchars($siteSettings['description']); ?>">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #667eea;
            --primary-dark: #764ba2;
            --bg: #f5f7fa;
            --card-bg: #ffffff;
            --text: #333333;
            --text-light: #666666;
            --border: #e0e0e0;
            --shadow: 0 2px 12px rgba(0,0,0,0.08);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        /* 头部 */
        .header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            box-shadow: var(--shadow);
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        /* 搜索框 */
        .search-box {
            max-width: 600px;
            margin: -25px auto 30px;
            padding: 0 20px;
            position: relative;
            z-index: 10;
        }

        .search-box input {
            width: 100%;
            padding: 15px 20px 15px 50px;
            border: none;
            border-radius: 50px;
            font-size: 16px;
            box-shadow: var(--shadow);
            background: white;
        }

        .search-box i {
            position: absolute;
            left: 40px;
            top: 50%;
            transform: translateY(-50%);
            color: #999;
        }

        /* 主内容 */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        /* 分类区域 */
        .category-section {
            background: var(--card-bg);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: var(--shadow);
        }

        .category-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--bg);
        }

        .category-header i {
            font-size: 1.5rem;
            color: var(--primary);
            margin-right: 12px;
        }

        .category-header h2 {
            font-size: 1.3rem;
            color: var(--text);
        }

        /* 链接网格 */
        .links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
        }

        .link-card {
            background: var(--bg);
            border-radius: 10px;
            padding: 15px;
            text-decoration: none;
            color: var(--text);
            transition: all 0.3s;
            border: 2px solid transparent;
        }

        .link-card:hover {
            transform: translateY(-3px);
            border-color: var(--primary);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
        }

        .link-card.topping {
            border-color: #f39c12;
            background: #fffbeb;
        }

        .link-title {
            font-weight: 600;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .link-title .badge {
            font-size: 12px;
            padding: 2px 8px;
            background: #f39c12;
            color: white;
            border-radius: 10px;
        }

        .link-url {
            font-size: 12px;
            color: var(--text-light);
            word-break: break-all;
            margin-bottom: 5px;
        }

        .link-desc {
            font-size: 13px;
            color: var(--text-light);
        }

        /* 空状态 */
        .empty {
            text-align: center;
            padding: 40px;
            color: var(--text-light);
        }

        /* 页脚 */
        .footer {
            text-align: center;
            padding: 30px;
            color: var(--text-light);
            font-size: 14px;
        }

        .footer a {
            color: var(--primary);
            text-decoration: none;
        }

        /* 管理入口 */
        .admin-link {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            box-shadow: var(--shadow);
            transition: transform 0.3s;
        }

        .admin-link:hover {
            transform: scale(1.1);
        }

        /* 搜索结果 */
        .search-results {
            background: var(--card-bg);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: var(--shadow);
        }

        .search-results h3 {
            margin-bottom: 15px;
            color: var(--primary);
        }

        /* 响应式 */
        @media (max-width: 768px) {
            .header h1 { font-size: 1.8rem; }
            .links-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <!-- 头部 -->
    <header class="header">
        <h1><?php echo htmlspecialchars($siteSettings['title']); ?></h1>
        <p><?php echo htmlspecialchars($siteSettings['subtitle']); ?></p>
    </header>

    <!-- 搜索框 -->
    <div class="search-box">
        <i class="fas fa-search"></i>
        <form method="GET" action="">
            <input type="text" name="q" placeholder="搜索书签..." value="<?php echo htmlspecialchars($searchQuery); ?>">
        </form>
    </div>

    <!-- 主内容 -->
    <main class="container">
        <?php if (!empty($searchQuery)): ?>
            <!-- 搜索结果 -->
            <div class="search-results">
                <h3><i class="fas fa-search"></i> 搜索结果: "<?php echo htmlspecialchars($searchQuery); ?>"</h3>
                <?php if (empty($searchResults)): ?>
                    <div class="empty">没有找到相关书签</div>
                <?php else: ?>
                    <div class="links-grid">
                        <?php foreach ($searchResults as $link): ?>
                            <a href="<?php echo htmlspecialchars($link['url']); ?>" target="_blank" class="link-card">
                                <div class="link-title"><?php echo htmlspecialchars($link['title']); ?></div>
                                <div class="link-url"><?php echo htmlspecialchars($link['url']); ?></div>
                                <?php if ($link['description']): ?>
                                    <div class="link-desc"><?php echo htmlspecialchars($link['description']); ?></div>
                                <?php endif; ?>
                            </a>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <!-- 分类列表 -->
            <?php foreach ($categoryTree as $cat): ?>
                <?php if (!empty($cat['links'])): ?>
                    <section class="category-section">
                        <div class="category-header">
                            <i class="fas <?php echo htmlspecialchars($cat['font_icon']); ?>"></i>
                            <h2><?php echo htmlspecialchars($cat['name']); ?></h2>
                        </div>
                        
                        <div class="links-grid">
                            <?php foreach ($cat['links'] as $link): ?>
                                <a href="<?php echo htmlspecialchars($link['url']); ?>" target="_blank" class="link-card <?php echo $link['topping'] ? 'topping' : ''; ?>">
                                    <div class="link-title">
                                        <?php echo htmlspecialchars($link['title']); ?>
                                        <?php if ($link['topping']): ?>
                                            <span class="badge">置顶</span>
                                        <?php endif; ?>
                                    </div>
                                    <div class="link-url"><?php echo htmlspecialchars($link['url']); ?></div>
                                    <?php if ($link['description']): ?>
                                        <div class="link-desc"><?php echo htmlspecialchars($link['description']); ?></div>
                                    <?php endif; ?>
                                </a>
                            <?php endforeach; ?>
                        </div>
                        
                        <!-- 二级分类 -->
                        <?php foreach ($cat['children'] as $subCat): ?>
                            <?php
                            $subLinks = $db->select('on_links', '*', [
                                'fid' => $subCat['id'],
                                'ORDER' => ['weight' => 'DESC']
                            ]);
                            ?>
                            <?php if (!empty($subLinks)): ?>
                                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed var(--border);">
                                    <h3 style="font-size: 1rem; color: var(--text-light); margin-bottom: 15px;">
                                        <i class="fas <?php echo htmlspecialchars($subCat['font_icon']); ?>"></i>
                                        <?php echo htmlspecialchars($subCat['name']); ?>
                                    </h3>
                                    <div class="links-grid">
                                        <?php foreach ($subLinks as $link): ?>
                                            <a href="<?php echo htmlspecialchars($link['url']); ?>" target="_blank" class="link-card">
                                                <div class="link-title"><?php echo htmlspecialchars($link['title']); ?></div>
                                                <div class="link-url"><?php echo htmlspecialchars($link['url']); ?></div>
                                            </a>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </section>
                <?php endif; ?>
            <?php endforeach; ?>
        <?php endif; ?>
    </main>

    <!-- 管理入口 -->
    <a href="index.php?c=login" class="admin-link" title="管理后台">
        <i class="fas fa-cog"></i>
    </a>

    <!-- 页脚 -->
    <footer class="footer">
        <p>Powered by <a href="#">OneNav</a> v1.0 | © <?php echo date('Y'); ?></p>
    </footer>
</body>
</html>
