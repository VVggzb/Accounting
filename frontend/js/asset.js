// asset.js - 资产首页逻辑（支持新增和编辑合集）

const BASE_URL = 'http://127.0.0.1:5000/api';

let editingCollectionId = null;

// 获取IP合集列表
async function fetchCollections() {
    const container = document.getElementById('collectionList');
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}/collections`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            container.innerHTML = result.data.map(col => `
                <div class="collection-card" data-id="${col.id}">
                    <div class="collection-info">
                        <div class="collection-name">${escapeHtml(col.name)}</div>
                        <div class="collection-total">累计投入 ¥${col.total_amount.toFixed(2)}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="edit-collection-btn" data-id="${col.id}" data-name="${escapeHtml(col.name)}" data-total="${col.total_amount}">✏️</button>
                        <button class="delete-collection-btn" data-id="${col.id}" data-name="${escapeHtml(col.name)}">🗑️</button>
                        <div class="collection-arrow">›</div>
                    </div>
                </div>
            `).join('');
            
            // 绑定合集卡片点击事件（跳转详情）
            document.querySelectorAll('.collection-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('edit-collection-btn') || e.target.classList.contains('delete-collection-btn')) return;
                    const id = card.dataset.id;
                    window.location.href = `collection-detail.html?id=${id}`;
                });
            });
            
            // 绑定编辑按钮事件
            document.querySelectorAll('.edit-collection-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const name = btn.dataset.name;
                    showEditCollectionModal(id, name);
                });
            });
            
            // 绑定删除按钮事件
            document.querySelectorAll('.delete-collection-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const name = btn.dataset.name;
                    if (confirm(`确定要删除合集「${name}」吗？其下的所有藏品也会被删除。`)) {
                        const token = localStorage.getItem('token');
                        try {
                            const response = await fetch(`${BASE_URL}/collections/${id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            const result = await response.json();
                            if (result.success) {
                                alert('删除成功');
                                fetchCollections();
                            } else {
                                alert(result.message || '删除失败');
                            }
                        } catch (error) {
                            console.error('删除失败:', error);
                            alert('网络异常，删除失败');
                        }
                    }
                });
            });
        } else {
            container.innerHTML = '<div class="empty-state">✨ 暂无收藏合集<br>点击右下角➕添加你的第一个IP合集</div>';
        }
    } catch (error) {
        console.error('获取合集失败:', error);
        container.innerHTML = '<div class="empty-state">加载失败，请检查网络</div>';
    }
}

// 防止XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========= 弹窗控制 =========
function showAddCollectionModal() {
    editingCollectionId = null;
    document.getElementById('collectionModalTitle').innerText = '新增合集';
    document.getElementById('collectionName').value = '';
    document.getElementById('collectionModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function showEditCollectionModal(id, name) {
    editingCollectionId = id;
    document.getElementById('collectionModalTitle').innerText = '编辑合集';
    document.getElementById('collectionName').value = name;
    document.getElementById('collectionModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    document.getElementById('collectionModal').classList.remove('show');
    document.body.style.overflow = '';
    document.getElementById('collectionName').value = '';
    editingCollectionId = null;
}

// ========= 保存合集（新增或编辑）=========
async function handleSaveCollection() {
    const name = document.getElementById('collectionName').value.trim();
    if (!name) {
        alert('请输入合集名称');
        return;
    }
    if (name.length > 20) {
        alert('名称不能超过20个字符');
        return;
    }
    
    const token = localStorage.getItem('token');
    let result;
    
    try {
        if (editingCollectionId) {
            // 编辑模式：PUT 请求
            const response = await fetch(`${BASE_URL}/collections/${editingCollectionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            result = await response.json();
        } else {
            // 新增模式：POST 请求
            const response = await fetch(`${BASE_URL}/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            result = await response.json();
        }
        
        if (result.success) {
            hideModal();
            fetchCollections(); // 刷新列表
        } else {
            alert(result.message || '操作失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('网络异常');
    }
}

// ========= 底部导航栏 =========
function initTabBar() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            if (page === 'bill') {
                window.location.href = 'bill.html';
            } else if (page === 'statistics') {
                window.location.href = 'statistics.html';
            }
        });
    });
}

// ========= 退出登录 =========
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }
}

// ========= 初始化 =========
function init() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    fetchCollections();
    initTabBar();
    initLogout();
    
    const addBtn = document.getElementById('addCollectionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddCollectionModal);
    }
    
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideModal);
    }
    
    const cancelBtn = document.getElementById('modalCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }
    
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveCollection);
    }
    
    const modal = document.getElementById('collectionModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal();
        });
    }
    
    const nameInput = document.getElementById('collectionName');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSaveCollection();
        });
    }
}

init();