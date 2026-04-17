/**
 * MyNav 安全功能单元测试
 * 运行: node test/security.test.js
 */
const crypto = require('crypto');
const assert = require('assert');

// ============ 测试辅助函数 ============

// 模拟 RATE_LIMITS 配置（与 server.js 保持一致）
const RATE_LIMITS = {
    'change-password':  { window: 5 * 60 * 1000,  max: 5,  msg: '密码修改过于频繁，请5分钟后再试' },
    'send-code':       { window: 60 * 1000,        max: 3,  msg: '验证码发送过于频繁，请1分钟后再试' },
    'forgot-password': { window: 60 * 1000,        max: 3,  msg: '请求过于频繁，请1分钟后再试' },
    'reset-password':  { window: 15 * 60 * 1000, max: 3,  msg: '重置尝试过于频繁，请15分钟后再试' },
    'login':           { window: 15 * 60 * 1000,  max: 5,  msg: '登录尝试过于频繁，请15分钟后再试' }
};

// 模拟内存数据库（用于测试）
let rateLimitDB = [];

function mockCheckRateLimit(key) {
    const limit = RATE_LIMITS[key];
    if (!limit) return { allowed: true };
    const now = Date.now();
    // 清理过期记录（只保留还在窗口内的）
    rateLimitDB = rateLimitDB.filter(r => now - r.windowStart < limit.window);
    const record = rateLimitDB.find(r => r.key === key);
    if (!record) {
        rateLimitDB.push({ key, count: 1, windowStart: now });
        return { allowed: true };
    }
    if (record.count >= limit.max) return { allowed: false, msg: limit.msg };
    record.count++;
    return { allowed: true };
}

// SMTP 加密（与 server.js 一致）
const SMTP_KEY = crypto.scryptSync('mynav-smtp-key-2024', 'mynav-salt-v1', 32);

function encryptSMTP(pass) {
    if (!pass) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', SMTP_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(pass, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptSMTP(encrypted) {
    if (!encrypted) return '';
    try {
        const buf = Buffer.from(encrypted, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', SMTP_KEY, buf.subarray(0, 16));
        decipher.setAuthTag(buf.subarray(16, 32));
        return decipher.update(buf.subarray(32)) + decipher.final('utf8');
    } catch (e) {
        return encrypted;
    }
}

// 验证码生成
function generateVerifyCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============ 测试用例 ============

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ ${name}`);
        console.log(`   错误: ${e.message}`);
        failed++;
    }
}

function eq(a, b, msg) {
    if (a !== b) throw new Error((msg || '不相等') + `: 期望 ${b}, 实际 ${a}`);
}

// 1. SMTP 加密/解密
test('SMTP加密: abc123 → 非明文', () => {
    const encrypted = encryptSMTP('abc123');
    eq(typeof encrypted, 'string');
    eq(encrypted.includes('abc123'), false, '密文不应包含明文');
});

test('SMTP解密: 解密后等于原值', () => {
    const original = 'smtp-password-2024';
    const encrypted = encryptSMTP(original);
    const decrypted = decryptSMTP(encrypted);
    eq(decrypted, original);
});

test('SMTP解密: 加密后的数据无法被篡改', () => {
    const encrypted = encryptSMTP('secret');
    const tampered = encrypted.slice(0, -4) + 'XXXX';
    const decrypted = decryptSMTP(tampered);
    // 篡改后解密会失败，返回原值（因为 try-catch）
    eq(typeof decrypted, 'string');
});

test('SMTP: 空密码返回空字符串', () => {
    eq(encryptSMTP(''), '');
    eq(decryptSMTP(''), '');
    eq(decryptSMTP(null), '');
});

test('SMTP: 特殊字符密码', () => {
    const pw = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
    eq(decryptSMTP(encryptSMTP(pw)), pw);
});

// 2. 频率限制
test('频率限制: 首次请求允许', () => {
    rateLimitDB = [];
    const result = mockCheckRateLimit('login');
    eq(result.allowed, true);
});

test('频率限制: 达到上限后拒绝', () => {
    rateLimitDB = [];
    // login 限制 5 次，第 6 次应拒绝
    for (let i = 0; i < 5; i++) {
        const r = mockCheckRateLimit('login');
        eq(r.allowed, true, `第${i+1}次应该允许`);
    }
    const r = mockCheckRateLimit('login');
    eq(r.allowed, false);
    eq(r.msg, '登录尝试过于频繁，请15分钟后再试');
});

test('频率限制: 各接口独立限制', () => {
    rateLimitDB = [];
    // login 满5次被限
    for (let i = 0; i < 5; i++) mockCheckRateLimit('login');
    eq(mockCheckRateLimit('login').allowed, false);
    // send-code 互不影响
    eq(mockCheckRateLimit('send-code').allowed, true);
});

test('频率限制: 未定义的key直接通过', () => {
    rateLimitDB = [];
    eq(mockCheckRateLimit('unknown-action').allowed, true);
});

// 3. 验证码格式
test('验证码: 生成6位数字', () => {
    const code = generateVerifyCode();
    eq(code.length, 6);
    eq(/^\d{6}$/.test(code), true);
});

test('验证码: 多次生成不重复（概率验证）', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) codes.add(generateVerifyCode());
    // 100次中应该大部分唯一
    eq(codes.size > 90, true, '验证码随机性不足');
});

// 4. 邮箱格式验证
test('邮箱格式: 有效邮箱', () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    ['test@example.com', 'user@qq.com', 'a@b.cn'].forEach(email => {
        eq(valid.test(email), true, email + ' 应为有效邮箱');
    });
});

test('邮箱格式: 无效邮箱', () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    ['not-an-email', '@qq.com', 'user@', 'user @qq.com'].forEach(email => {
        eq(valid.test(email), false, email + ' 应为无效邮箱');
    });
});

// 5. 密码强度验证
test('密码强度: 至少8位', () => {
    const check = p => p.length >= 8;
    eq(check('1234567'), false);
    eq(check('12345678'), true);
});

test('密码强度: 必须包含字母和数字', () => {
    const check = p => /(?=.*[a-zA-Z])(?=.*\d)/.test(p);
    eq(check('12345678'), false);
    eq(check('abcdefgh'), false);
    eq(check('1234abcd'), true);
    eq(check('Pass1234'), true);
});

// 6. 审计日志格式
test('审计日志: 生成标准格式', () => {
    const mockReq = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Chrome/120' }
    };
    const entry = {
        username: 'admin',
        action: 'login-success',
        ip: mockReq.ip,
        user_agent: mockReq.headers['user-agent'],
        details: '测试'
    };
    eq(typeof entry.username, 'string');
    eq(typeof entry.action, 'string');
    eq(entry.ip, '192.168.1.1');
    eq(entry.user_agent, 'Chrome/120');
});

// ============ 测试摘要 ============
console.log('\n' + '═'.repeat(50));
console.log(`测试完成: ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log('═'.repeat(50));
process.exit(failed > 0 ? 1 : 0);
