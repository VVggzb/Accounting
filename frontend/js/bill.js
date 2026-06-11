// bill.js - 账本首页 + 弹窗记账

console.log('bill.js 已加载');

const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;
let currentModalType = 'expense';
let editingBillId = null;

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
    if (elem) elem.innerText = `${currentYear}年${String(currentMonth).padStart(2, '0')}月`;
}

async function fetchOverview() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/bills/overview?year=${currentYear}&month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('totalIncome').innerText = formatNumber(data.data.total_income);
            document.getElementById('totalExpense').innerText = formatNumber(data.data.total_expense);
            document.getElementById('balance').innerText = formatNumber(data.data.balance);
        }
    } catch (e) { console.error(e); }
}

async function fetchBills() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const container = document.getElementById('billList');
    if (!container) return;
    try {
        const res = await fetch(`${BASE_URL}/bills?year=${currentYear}&month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
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
                html += `<div class="bill-item" data-id="${item.id}">
                    <div class="bill-left">
                        <div class="category-icon">${getCategoryIcon(item.category)}</div>
                        <div class="bill-info">
                            <div class="bill-category">${item.category}</div>
                            <div class="bill-note-time">${item.note || '无备注'}</div>
                        </div>
                    </div>
                    <div class="bill-amount ${amountClass}">${sign} ¥${formatNumber(item.amount)}</div>
                    <div class="bill-actions">
                        <button class="edit-bill-btn" data-id="${item.id}" data-type="${item.type}" data-category="${item.category}" data-amount="${item.amount}" data-date="${group.date}" data-note="${item.note || ''}" data-account="${item.account || ''}">编辑</button>
                        <button class="delete-bill-btn" data-id="${item.id}">删除</button>
                    </div>
                </div>`;
            });
            html += `</div>`;
        });
        container.innerHTML = html;

        document.querySelectorAll('.delete-bill-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('确定删除这条账单吗？')) return;
                const billId = btn.dataset.id;
                const token = localStorage.getItem('token');
                try {
                    const res = await fetch(`${BASE_URL}/bills/${billId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await res.json();
                    if (result.success) {
                        fetchOverview();
                        fetchBills();
                    } else {
                        alert(result.message || '删除失败');
                    }
                } catch (error) {
                    alert('网络异常');
                }
            });
        });

        document.querySelectorAll('.edit-bill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const billData = {
                    id: btn.dataset.id,
                    type: btn.dataset.type,
                    category: btn.dataset.category,
                    amount: btn.dataset.amount,
                    date: btn.dataset.date,
                    note: btn.dataset.note,
                    account: btn.dataset.account
                };
                openEditModal(billData);
            });
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="empty-state">加载失败，请检查网络</div>';
    }
}

function openEditModal(bill) {
    editingBillId = bill.id;
    document.getElementById('modalTitle').innerText = '编辑账单';
    currentModalType = bill.type;
    const typeTabs = document.querySelectorAll('.type-tab');
    typeTabs.forEach(tab => {
        if (tab.dataset.type === bill.type) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    renderModalCategory();
    document.getElementById('modalCategory').value = bill.category;
    document.getElementById('modalAmount').value = bill.amount;
    document.getElementById('modalDate').value = bill.date;
    document.getElementById('modalAccount').value = bill.account || '';
    document.getElementById('modalNote').value = bill.note || '';
    // 直接打开弹窗，不重置表单（避免清空编辑状态）
    const modal = document.getElementById('billModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function changeMonth(delta) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    else if (newMonth > 12) { newMonth = 1; newYear++; }
    currentYear = newYear;
    currentMonth = newMonth;
    updateMonthDisplay();
    fetchOverview();
    fetchBills();
}

function initTabBar() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            if (page === 'asset') window.location.href = 'asset.html';
            else if (page === 'statistics') window.location.href = 'statistics.html';
        });
    });
}

function renderModalCategory() {
    const categories = currentModalType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const select = document.getElementById('modalCategory');
    if (!select) return;
    let html = '<option value="">请选择分类</option>';
    categories.forEach(cat => html += `<option value="${cat}">${cat}</option>`);
    select.innerHTML = html;
}

function showModal() {
    resetModalForm();
    const modal = document.getElementById('billModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
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
    editingBillId = null;
    document.getElementById('modalTitle').innerText = '记一笔';
    currentModalType = 'expense';
    const typeTabs = document.querySelectorAll('.type-tab');
    typeTabs.forEach(tab => {
        if (tab.dataset.type === 'expense') tab.classList.add('active');
        else tab.classList.remove('active');
    });
    renderModalCategory();
    document.getElementById('modalAmount').value = '';
    document.getElementById('modalNote').value = '';
    document.getElementById('modalAccount').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('modalDate').value = today;
}

async function handleSaveBill() {
    const category = document.getElementById('modalCategory')?.value;
    const amount = parseFloat(document.getElementById('modalAmount')?.value);
    const date = document.getElementById('modalDate')?.value;
    const account = document.getElementById('modalAccount')?.value;
    const note = document.getElementById('modalNote')?.value;

    if (!category) { alert('请选择分类'); return; }
    if (isNaN(amount) || amount <= 0) { alert('请输入有效金额'); return; }
    if (!date) { alert('请选择日期'); return; }

    const data = {
        type: currentModalType,
        category,
        amount,
        date,
        account: account || '',
        note: note || ''
    };
    const token = localStorage.getItem('token');
    if (!token) { alert('未登录'); window.location.href = 'login.html'; return; }

    try {
        let response;
        if (editingBillId) {
            response = await fetch(`${BASE_URL}/bills/${editingBillId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${BASE_URL}/bills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
        }
        const result = await response.json();
        if (result.success) {
            hideModal();
            editingBillId = null;
            fetchOverview();
            fetchBills();
        } else {
            alert(result.message || '保存失败');
        }
    } catch (error) {
        console.error(error);
        alert('网络异常，请检查后端服务');
    }
}

function init() {
    const token = localStorage.getItem('token');
    if (!token) return window.location.href = 'login.html';
    updateMonthDisplay();
    fetchOverview();
    fetchBills();
    initTabBar();

    document.getElementById('addBillBtn').addEventListener('click', showModal);
    document.getElementById('closeModalBtn').addEventListener('click', hideModal);
    document.getElementById('modalCancelBtn').addEventListener('click', hideModal);
    document.getElementById('modalSaveBtn').addEventListener('click', handleSaveBill);
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    // 类型切换
    document.querySelectorAll('.type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentModalType = tab.dataset.type;
            renderModalCategory();
        });
    });
}

init();
