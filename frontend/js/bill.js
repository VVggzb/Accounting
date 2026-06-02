// bill.js - 账本首页 + 弹窗记账

console.log('bill.js 已加载');

const BASE_URL = 'http://tool.gvzbz.fun/api';

// 替换 let currentYear = 2026; let currentMonth = 5;
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;  // 月份从 0 开始，需要 +1
// 当前弹窗选择类型
let currentModalType = 'expense';

// 分类数据
const EXPENSE_CATEGORIES = ['餐饮', '购物', '服饰', '日用', '数码', '美妆', '护肤', '应用软件', '交通', '娱乐', '医疗', '学习', '运动', '人情'];
const INCOME_CATEGORIES = ['生活费', '红包', '兼职', '副业'];

function formatNumber(n) {
    return parseFloat(n).toFixed(2);
}

function getCategoryIcon(category) {
    const icons = {
        '餐饮': '🍜', '购物': '🛒', '服饰': '👗', '日用': '🧴', '数码': '📱',
        '美妆': '💄', '护肤': '🧴', '应用软件': '📲', '交通': '🚇', '娱乐': '🎬',
        '医疗': '💊', '学习': '📚', '运动': '⚽', '人情': '🎁',
        '生活费': '💰', '红包': '🧧', '兼职': '💼', '副业': '💻'
    };
    return icons[category] || '📌';
}

function updateMonthDisplay() {
    const elem = document.getElementById('monthDisplay');
    if (elem) {
        elem.innerText = `${currentYear}年${String(currentMonth).padStart(2, '0')}月`;
    } else {
        console.error('monthDisplay 元素不存在');
    }
}

async function fetchOverview() {
    console.log('fetchOverview 开始执行');
    const token = localStorage.getItem('token');
    console.log('token 是否存在:', token ? '是' : '否');
    if (!token) return;
    
    try {
        // 修改：使用正确的后端接口 /bills/overview
        const res = await fetch(`${BASE_URL}/bills/overview?year=${currentYear}&month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('概览数据:', data);
        
        if (data.success) {
            const totalIncomeElem = document.getElementById('totalIncome');
            const totalExpenseElem = document.getElementById('totalExpense');
            const balanceElem = document.getElementById('balance');
            
            if (totalIncomeElem) totalIncomeElem.innerText = formatNumber(data.data.total_income);
            if (totalExpenseElem) totalExpenseElem.innerText = formatNumber(data.data.total_expense);
            if (balanceElem) balanceElem.innerText = formatNumber(data.data.balance);
        } else {
            console.error('概览接口返回失败:', data);
        }
    } catch (e) {
        console.error('fetchOverview 错误:', e);
    }
}

async function fetchBills() {
    console.log('fetchBills 开始执行');
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const container = document.getElementById('billList');
    if (!container) {
        console.error('billList 元素不存在');
        return;
    }
    
    try {
        const res = await fetch(`${BASE_URL}/bills?year=${currentYear}&month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        console.log('账单列表数据:', result);

        if (!result.success || !result.data || result.data.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 暂无账单，点击右下角➕添加</div>';
            return;
        }

        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        let html = '';
        result.data.forEach(group => {
            const date = new Date(group.date);
            const weekday = weekdays[date.getDay()];
            html += `<div class="date-group">
                <div class="date-header">
                    <span>${group.date} ${weekday}</span>
                    <span class="daily-expense">支出 ¥${formatNumber(group.daily_expense)}</span>
                </div>`;
            group.items.forEach(item => {
                const amountClass = item.type === 'expense' ? 'expense' : 'income';
                const sign = item.type === 'expense' ? '-' : '+';
                html += `<div class="bill-item">
                    <div class="bill-left">
                        <div class="category-icon">${getCategoryIcon(item.category)}</div>
                        <div class="bill-info">
                            <div class="bill-category">${item.category}</div>
                            <div class="bill-note-time">${item.note || '无备注'} · ${item.time}</div>
                        </div>
                    </div>
                    <div class="bill-amount ${amountClass}">${sign} ¥${formatNumber(item.amount)}</div>
                </div>`;
            });
            html += `</div>`;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error('fetchBills 错误:', e);
        container.innerHTML = '<div class="empty-state">加载失败，请检查网络</div>';
    }
}

function changeMonth(delta) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth < 1) {
        newMonth = 12;
        newYear--;
    } else if (newMonth > 12) {
        newMonth = 1;
        newYear++;
    }
    currentYear = newYear;
    currentMonth = newMonth;
    updateMonthDisplay();
    fetchOverview();
    fetchBills();
}

function initTabBar() {
    const tabs = document.querySelectorAll('.tab-item');
    if (!tabs.length) {
        console.warn('没有找到 .tab-item 元素');
        return;
    }
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            if (page === 'asset') {
                window.location.href = 'asset.html';
            } else if (page === 'statistics') {
                window.location.href = 'statistics.html';
            }
        });
    });
}

// ========= 弹窗分类渲染 =========
function renderModalCategory() {
    const categories = currentModalType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const select = document.getElementById('modalCategory');
    if (!select) {
        console.warn('modalCategory 元素不存在');
        return;
    }
    let html = '<option value="">请选择分类</option>';
    categories.forEach(cat => {
        html += `<option value="${cat}">${cat}</option>`;
    });
    select.innerHTML = html;
}

// ========= 弹窗开关 =========
function showModal() {
    resetModalForm();
    const modal = document.getElementById('billModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('billModal 元素不存在');
    }
}

function hideModal() {
    const modal = document.getElementById('billModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function resetModalForm() {
    currentModalType = 'expense';
    const typeTabs = document.querySelectorAll('.type-tab');
    typeTabs.forEach(tab => {
        if (tab.dataset.type === 'expense') tab.classList.add('active');
        else tab.classList.remove('active');
    });
    renderModalCategory();
    const amountInput = document.getElementById('modalAmount');
    const noteInput = document.getElementById('modalNote');
    const accountSelect = document.getElementById('modalAccount');
    const dateInput = document.getElementById('modalDate');
    if (amountInput) amountInput.value = '';
    if (noteInput) noteInput.value = '';
    if (accountSelect) accountSelect.value = '';
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.value = today;
}

// ========= 保存账单 =========
async function handleSaveBill() {
    const category = document.getElementById('modalCategory')?.value;
    const amount = parseFloat(document.getElementById('modalAmount')?.value);
    const date = document.getElementById('modalDate')?.value;
    const account = document.getElementById('modalAccount')?.value;
    const note = document.getElementById('modalNote')?.value;

    if (!category) {
        alert('请选择分类');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert('请输入有效金额');
        return;
    }
    if (!date) {
        alert('请选择日期');
        return;
    }

    const data = {
        type: currentModalType,
        category: category,
        amount: amount,
        date: date,
        account: account || '',
        note: note || ''
    };

    const token = localStorage.getItem('token');
    if (!token) {
        alert('未登录，请重新登录');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/bills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            hideModal();
            fetchOverview();
            fetchBills();
        } else {
            alert(result.message || '保存失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('网络异常，请检查后端服务');
    }
}

// ========= 初始化 =========
function init() {
    console.log('init 函数执行了');
    
    // 检查必要的 DOM 元素
    const requiredElements = ['monthDisplay', 'totalIncome', 'totalExpense', 'balance', 'billList', 'addBillBtn'];
    for (const id of requiredElements) {
        if (!document.getElementById(id)) {
            console.error(`缺少必要元素: ${id}`);
        }
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    updateMonthDisplay();
    fetchOverview();
    fetchBills();
    initTabBar();

    // 右下角➕打开弹窗
    const addBtn = document.getElementById('addBillBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showModal);
    } else {
        console.error('addBillBtn 元素不存在');
    }

    // 关闭弹窗（× / 取消 / 遮罩）
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    
    const cancelBtn = document.getElementById('modalCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
    
    const modal = document.getElementById('billModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal();
        });
    }

    // 类型切换（支出 / 收入）
    const typeTabs = document.querySelectorAll('.type-tab');
    typeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            typeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentModalType = tab.dataset.type;
            renderModalCategory();
        });
    });

    // 保存按钮
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', handleSaveBill);

    // 月份切换
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

    // 退出登录
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }
}

// 启动
init();
