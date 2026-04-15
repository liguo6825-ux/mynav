<?php
/**
 * 登录控制器
 */

session_start();

$error = '';
$success = '';

// 检查是否已登录
if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    header("Location: index.php?c=admin");
    exit();
}

// 处理登录请求
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? trim($_POST['password']) : '';
    
    if (empty($username) || empty($password)) {
        $error = '请输入用户名和密码';
    } else {
        // 验证用户名
        if ($username !== ADMIN_USER) {
            $error = '用户名或密码错误';
        } else {
            // 验证密码 (MD5)
            $hashedPassword = md5($password);
            
            if ($hashedPassword === ADMIN_PASS) {
                // 登录成功
                $_SESSION['logged_in'] = true;
                $_SESSION['username'] = $username;
                $_SESSION['login_time'] = time();
                
                // 重定向到后台
                header("Location: index.php?c=admin");
                exit();
            } else {
                $error = '用户名或密码错误';
            }
        }
    }
}

// 加载登录模板
require_once __DIR__ . '/../templates/' . THEME . '/login.php';
