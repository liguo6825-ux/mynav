<?php
/**
 * 首页控制器
 */

// 获取站点设置
$siteSettings = getSiteSettings();

// 获取分类列表
$categories = $db->select('on_categorys', '*', [
    'ORDER' => ['weight' => 'DESC']
]);

// 组织分类树
$categoryTree = [];
foreach ($categories as $cat) {
    if ($cat['fid'] == 0) {
        // 一级分类
        $categoryTree[$cat['id']] = $cat;
        $categoryTree[$cat['id']]['children'] = [];
        $categoryTree[$cat['id']]['links'] = [];
    } else {
        // 二级分类
        if (isset($categoryTree[$cat['fid']])) {
            $categoryTree[$cat['fid']]['children'][] = $cat;
        }
    }
}

// 获取所有链接
$links = $db->select('on_links', '*', [
    'ORDER' => ['weight' => 'DESC', 'topping' => 'DESC']
]);

// 将链接分配到对应分类
foreach ($links as $link) {
    if (isset($categoryTree[$link['fid']])) {
        $categoryTree[$link['fid']]['links'][] = $link;
    }
}

// 搜索功能
$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
$searchResults = [];

if (!empty($searchQuery)) {
    $searchResults = $db->select('on_links', '*', [
        'OR' => [
            'title[~]' => $searchQuery,
            'description[~]' => $searchQuery,
            'url[~]' => $searchQuery
        ]
    ]);
}

// 加载模板
require_once __DIR__ . '/../templates/' . THEME . '/index.php';
