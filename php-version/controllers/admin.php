<?php
/**
 * 后台管理控制器
 */

session_start();

// 检查登录状态
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    header("Location: index.php?c=login");
    exit();
}

// 获取操作
$action = isset($_GET['action']) ? trim($_GET['action']) : 'dashboard';

$message = '';
$error = '';

// 处理不同的操作
switch ($action) {
    case 'dashboard':
        // 仪表盘统计
        $stats = [
            'categories' => $db->count('on_categorys'),
            'links' => $db->count('on_links'),
            'today_links' => $db->count('on_links', [
                'add_time[>]' => strtotime('today')
            ])
        ];
        break;

    case 'category':
        // 分类管理
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $op = isset($_POST['op']) ? $_POST['op'] : 'add';
            
            if ($op === 'add') {
                $name = trim($_POST['name']);
                $fid = intval($_POST['fid']);
                $weight = intval($_POST['weight']);
                $fontIcon = trim($_POST['font_icon']);
                
                if (!empty($name)) {
                    $db->insert('on_categorys', [
                        'name' => $name,
                        'fid' => $fid,
                        'weight' => $weight,
                        'font_icon' => $fontIcon ?: 'fa-folder',
                        'add_time' => time()
                    ]);
                    $message = '分类添加成功';
                }
            } elseif ($op === 'delete') {
                $id = intval($_POST['id']);
                // 检查是否有子分类或链接
                $childCount = $db->count('on_categorys', ['fid' => $id]);
                $linkCount = $db->count('on_links', ['fid' => $id]);
                
                if ($childCount > 0 || $linkCount > 0) {
                    $error = '该分类下有子分类或链接，无法删除';
                } else {
                    $db->delete('on_categorys', ['id' => $id]);
                    $message = '分类删除成功';
                }
            }
        }
        
        // 获取所有分类
        $categories = $db->select('on_categorys', '*', [
            'ORDER' => ['fid' => 'ASC', 'weight' => 'DESC']
        ]);
        break;

    case 'link':
        // 链接管理
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $op = isset($_POST['op']) ? $_POST['op'] : 'add';
            
            if ($op === 'add') {
                $title = trim($_POST['title']);
                $url = trim($_POST['url']);
                $description = trim($_POST['description']);
                $fid = intval($_POST['fid']);
                $weight = intval($_POST['weight']);
                
                if (!empty($title) && !empty($url)) {
                    $db->insert('on_links', [
                        'title' => $title,
                        'url' => $url,
                        'description' => $description,
                        'fid' => $fid,
                        'weight' => $weight,
                        'topping' => 0,
                        'add_time' => time()
                    ]);
                    $message = '链接添加成功';
                }
            } elseif ($op === 'delete') {
                $id = intval($_POST['id']);
                $db->delete('on_links', ['id' => $id]);
                $message = '链接删除成功';
            } elseif ($op === 'toggle_top') {
                $id = intval($_POST['id']);
                $link = $db->get('on_links', ['topping'], ['id' => $id]);
                $newTopping = $link['topping'] ? 0 : 1;
                $db->update('on_links', ['topping' => $newTopping], ['id' => $id]);
                $message = $newTopping ? '已置顶' : '已取消置顶';
            }
        }
        
        // 获取所有分类
        $categories = $db->select('on_categorys', '*', [
            'ORDER' => ['weight' => 'DESC']
        ]);
        
        // 获取所有链接
        $links = $db->select('on_links', '*', [
            'ORDER' => ['topping' => 'DESC', 'weight' => 'DESC']
        ]);
        break;

    case 'settings':
        // 系统设置
        $siteSettings = getSiteSettings();
        
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $siteSettings['title'] = trim($_POST['title']);
            $siteSettings['subtitle'] = trim($_POST['subtitle']);
            $siteSettings['description'] = trim($_POST['description']);
            $siteSettings['keywords'] = trim($_POST['keywords']);
            $siteSettings['link_num'] = intval($_POST['link_num']);
            
            updateSiteSettings($siteSettings);
            $message = '设置保存成功';
        }
        break;

    case 'backup':
        // 备份功能
        $backupDir = __DIR__ . '/../../backups';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $backupFile = $backupDir . '/backup_' . date('Y-m-d_His') . '.sql';
        
        // 导出数据库
        $tables = ['on_categorys', 'on_links', 'on_options', 'on_users'];
        $sql = "-- OneNav 备份\n-- 时间: " . date('Y-m-d H:i:s') . "\n\n";
        
        foreach ($tables as $table) {
            $rows = $db->select($table, '*');
            if ($rows) {
                $sql .= "-- 表: {$table}\n";
                foreach ($rows as $row) {
                    $values = array_map(function ($v) {
                        return "'" . addslashes($v) . "'";
                    }, array_values($row));
                    $sql .= "INSERT INTO {$table} VALUES (" . implode(', ', $values) . ");\n";
                }
                $sql .= "\n";
            }
        }
        
        file_put_contents($backupFile, $sql);
        $message = "备份成功: {$backupFile}";
        break;
}

// 加载后台模板
require_once __DIR__ . '/../templates/' . THEME . '/admin.php';
