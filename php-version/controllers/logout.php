<?php
/**
 * 登出控制器
 */

session_start();

// 销毁会话
session_unset();
session_destroy();

// 重定向到首页
header("Location: index.php");
exit();
