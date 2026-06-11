
// statistics.js - 统计页面逻辑

// 替换 let  currentYear = 2026; let currentMonth = 5;
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;  // 月份从 0 开始，需要 +1
let pieChart = null;
let barChart = null;

function formatNumber(n) {
    return parseFloat(n).toFixed(2);
}

function updateMonthDisplay() {
    document.getElementById('monthDisplay').innerText = `${currentYear}年${String(currentMonth).padStart(2, '0')}月`;
}

// 注意：CATEGORY_ICON 已在 utils.js 中定义，这里不要重复定义

async function loadPieData() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/statistics/pie?year=${currentYear}&month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('totalExpense').innerText = formatNumber(result.data.total_expense);
            const categories = result.data.categories;
            if (categories && categories.length > 0) {
                pieChart.setOption({
                    series: [{
                        data: categories.map(item => ({ name: item.category, value: item.amount })),
                        label: { show: true, formatter: '{b}: {d}%', fontSize: 11 }
                    }]
                });
            } else {
                pieChart.setOption({ series: [{ data: [{ name: '暂无支出', value: 1 }], label: { show: true, formatter: '暂无数据' } }] });
            }
        }
    } catch (e) { console.error(e); }
}

async function loadRankingData() {
    const container = document.getElementById('rankingList');
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/statistics/ranking?year=${currentYear}&month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(item => {
                return `<div class="ranking-item">
                    <div class="ranking-left">
                        <div class="ranking-icon">${CATEGORY_ICON[item.category] || '📌'}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${item.category}</div>
                            <div class="ranking-stats">${item.count}笔</div>
                        </div>
                    </div>
                    <div class="ranking-right">
                        <div class="ranking-amount">¥${formatNumber(item.amount)}</div>
                    </div>
                </div>`;
            }).join('');
        } else {
            container.innerHTML = '<div class="loading">暂无消费数据</div>';
        }
    } catch (e) { console.error(e); container.innerHTML = '<div class="loading">加载失败</div>'; }
}

async function loadTrendData() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`${BASE_URL}/statistics/trend?year=${currentYear}&month=${currentMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('avgExpense').innerText = formatNumber(result.data.avg_expense);
            const dailyData = result.data.daily_expense;
            barChart.setOption({
                xAxis: { data: dailyData.map(d => d.day), name: '日期' },
                yAxis: { name: '金额(元)' },
                series: [{
                    name: '支出', type: 'bar', data: dailyData.map(d => d.amount),
                    itemStyle: { color: '#FF3B30', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', formatter: (p) => p.value > 0 ? `¥${p.value}` : '', fontSize: 10 }
                }]
            });
        }
    } catch (e) { console.error(e); }
}

function initCharts() {
    pieChart = echarts.init(document.getElementById('pieChart'));
    pieChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
        series: [{ type: 'pie', radius: '55%', label: { show: true, position: 'outside', formatter: '{b}' } }],
        color: ['#FFD250', '#FFA726', '#FF8A65', '#FF7043', '#FFB74D', '#FFD54F', '#FFCC80']
    });
    barChart = echarts.init(document.getElementById('barChart'));
    barChart.setOption({ tooltip: { trigger: 'axis', formatter: '{b}日: ¥{c}' }, grid: { top: 30, left: 50, right: 20, bottom: 30 } });
}

function changeMonth(delta) {
    let newMonth = currentMonth + delta, newYear = currentYear;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    else if (newMonth > 12) { newMonth = 1; newYear++; }
    currentYear = newYear; currentMonth = newMonth;
    updateMonthDisplay();
    loadPieData(); loadRankingData(); loadTrendData();
}

function initTabBar() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            if (page === 'bill') window.location.href = 'bill.html';
            else if (page === 'asset') window.location.href = 'asset.html';
        });
    });
}

function init() {
    if (!checkAuth()) return;
    updateMonthDisplay();
    initCharts();
    loadPieData();
    loadRankingData();
    loadTrendData();
    initTabBar();
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
}

init();
