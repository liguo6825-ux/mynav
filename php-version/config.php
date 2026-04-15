<?php
/**
 * OneNav 个人版 - 配置文件
 */

// 数据库配置
require_once __DIR__ . '/../class/Medoo.php';

use Medoo\Medoo;

// 数据库连接
$db = new Medoo([
    'database_type' => 'sqlite',
    'database_file' => __DIR__ . '/../data/onenav.db',
    'error' => PDO::ERRMODE_EXCEPTION
]);

// 站点配置
$siteConfig = [
    // 基本信息
    'title' => '我的导航站',
    'subtitle' => '简洁实用的书签管理',
    'description' => '个人书签导航系统',
    'keywords' => '导航,书签,收藏,工具',
    
    // 用户配置
    'admin' => [
        'username' => 'admin',
        // 默认密码: admin123 (MD5)
        'password' => '0192023a7bbd73250516f069df18b500',
        'email' => 'admin@example.com'
    ],
    
    // 显示配置
    'link_num' => 50,  // 每个分类显示链接数
    'theme' => 'default',
    
    // 安全配置
    'session_lifetime' => 7200,  // 会话有效期 (秒)
    'max_login_attempts' => 5,   // 最大登录尝试次数
];

// 常量定义
define('SITE_TITLE', $siteConfig['title']);
define('SITE_SUBTITLE', $siteConfig['subtitle']);
define('ADMIN_USER', $siteConfig['admin']['username']);
define('ADMIN_PASS', $siteConfig['admin']['password']);
define('ADMIN_EMAIL', $siteConfig['admin']['email']);
define('LINK_NUM', $siteConfig['link_num']);
define('THEME', $siteConfig['theme']);

// 版本信息
define('VERSION', '1.0.0');
define('AUTHOR', 'Mac');

// 获取站点设置 (从数据库)
function getSiteSettings() {
    global $db;
    
    $settings = $db->get('on_options', 'value', ['key' => 'site_settings']);
    
    if ($settings) {
        return unserialize($settings);
    }
    
    return [
        'title' => SITE_TITLE,
        'subtitle' => SITE_SUBTITLE,
        'description' => '我的个人导航站',
        'keywords' => '导航,书签,工具',
        'link_num' => LINK_NUM
    ];
}

// 更新站点设置
function updateSiteSettings($settings) {
    global $db;
    
    return $db->update('on_options', [
        'value' => serialize($settings)
    ], ['key' => 'site_settings']);
}
