// ===== API 配置 =====
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// ===== 获取 token =====
function getToken() {
    return localStorage.getItem('token');
}

// ===== 保存登录信息 =====
function saveAuthData(token, userId, username) {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
}

// ===== 清除登录信息 =====
function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
}

// ===== 检查是否已登录 =====
function isLoggedIn() {
    return !!getToken();
}

// ===== 检查登录，未登录则跳转 =====
function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ===== 发起带认证的请求 =====
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });
    
    return response;
}

// ===== Emoji 图标映射 =====
const CATEGORY_ICON = {
    '餐饮': '🍜', '购物': '🛒', '服饰': '👗', '日用': '🧴', '数码': '📱',
    '美妆': '💄', '护肤': '🧴', '应用软件': '📲', '交通': '🚇', '娱乐': '🎬',
    '医疗': '💊', '学习': '📚', '运动': '⚽', '人情': '🎁',
    '生活费': '💰', '红包': '🧧', '兼职': '💼', '副业': '💻'
};

// ===== 获取分类图标 =====
function getCategoryIcon(category) {
    return CATEGORY_ICON[category] || '📌';
}

// ===== 格式化金额 =====
function formatMoney(amount) {
    return parseFloat(amount).toFixed(2);
}

// ===== 显示错误提示 =====
function showError(msg) {
    alert(msg);
}

// ===== 显示成功提示 =====
function showSuccess(msg) {
    alert(msg);
}