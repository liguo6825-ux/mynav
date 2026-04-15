<?php
/**
 * OneNav 个人版 - 主入口文件
 * 
 * @author Mac
 * @date 2026-04-14
 */

// 错误报告
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 字符编码
header("Content-Type: text/html; charset=UTF-8");

// 时区设置
date_default_timezone_set('Asia/Shanghai');

// 获取控制器参数
$c = isset($_GET['c']) ? trim($_GET['c']) : '';

// 安全过滤
$c = strip_tags($c);
$c = preg_replace('/[^a-zA-Z0-9_]/', '', $c);

// 初始化检查
if (!file_exists(__DIR__ . '/data/config.php')) {
    // 配置文件不存在，显示初始化页面
    if ($c === 'init') {
        include_once __DIR__ . '/controllers/init.php';
        exit();
    } else {
        header("Location: index.php?c=init");
        exit();
    }
}

// 加载配置文件
require_once __DIR__ . '/data/config.php';

// 启动会话
session_start();

// 路由处理
if (empty($c)) {
    // 显示首页
    include_once __DIR__ . '/controllers/index.php';
} else {
    // 安全检查：防止目录遍历
    $c = str_replace(['\\', '../', '..\\'], '', $c);
    
    // 加载对应的控制器
    $controllerFile = __DIR__ . '/controllers/' . $c . '.php';
    
    if (file_exists($controllerFile)) {
        include_once $controllerFile;
    } else {
        http_response_code(404);
        echo '<h1>404 - 页面不存在</h1>';
        echo '<p>请求的控制器: ' . htmlspecialchars($c) . '</p>';
        echo '<p><a href="index.php">返回首页</a></p>';
        exit();
    }
}
