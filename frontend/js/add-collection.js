// collection-detail.js - 藏品明细页 + 弹窗

// 完全禁用 hideModal
hideModal = function() {
    console.log('hideModal 被调用，但已禁用');
};

const BASE_URL = 'http://127.0.0.1:5000/api';

let collectionId = null;
let editingItemId = null;
const DEFAULT_IMAGE_URL = 'assets/default.jpg';

function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========= 弹窗控制 =========
function showAddModal() {
    editingItemId = null;
    window.currentImageUrl = null;
    document.getElementById('modalTitle').innerText = '新增藏品';
    document.getElementById('itemName').value = '';
    document.getElementById('itemAmount').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = today;
    document.getElementById('purchaseDate').max = today;
    
    // 重置预览区为默认图片
    const previewDiv = document.getElementById('imagePreview');
    const existingImg = previewDiv.querySelector('img');
    if (existingImg) {
        existingImg.src = DEFAULT_IMAGE_URL;
    } else {
        previewDiv.innerHTML = `<img src="${DEFAULT_IMAGE_URL}" style="width:100%;height:100%;object-fit:cover;">`;
    }
    
    document.getElementById('itemModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function showEditModal(id, name, amount, date, imageUrl) {
    editingItemId = id;
    window.currentImageUrl = imageUrl || null;
    document.getElementById('modalTitle').innerText = '编辑藏品';
    document.getElementById('itemName').value = name;
    document.getElementById('itemAmount').value = amount;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = date || today;
    document.getElementById('purchaseDate').max = today;

    const previewDiv = document.getElementById('imagePreview');
    if (window.currentImageUrl) {
        const existingImg = previewDiv.querySelector('img');
        if (existingImg) {
            existingImg.src = window.currentImageUrl;
        } else {
            previewDiv.innerHTML = `<img src="${window.currentImageUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        }
    } else {
        const existingImg = previewDiv.querySelector('img');
        if (existingImg) {
            existingImg.src = DEFAULT_IMAGE_URL;
        } else {
            previewDiv.innerHTML = `<img src="${DEFAULT_IMAGE_URL}" style="width:100%;height:100%;object-fit:cover;">`;
        }
    }
    
    document.getElementById('itemModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    console.log('hideModal 执行，关闭弹窗');
    document.getElementById('itemModal').classList.remove('show');
    document.body.style.overflow = '';
    editingItemId = null;
}

// ========= 保存藏品 =========
async function handleSave() {
    const name = document.getElementById('itemName').value.trim();
    const amount = parseFloat(document.getElementById('itemAmount').value);
    const purchaseDate = document.getElementById('purchaseDate').value;

    if (!name) return alert('请输入藏品名称');
    if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');

    const data = {
        name,
        amount,
        purchase_date: purchaseDate || null,
        image_url: window.currentImageUrl || null
    };

    const token = localStorage.getItem('token');
    const url = editingItemId
        ? `${BASE_URL}/collections/items/${editingItemId}`
        : `${BASE_URL}/collections/${collectionId}/items`;

    try {
        const res = await fetch(url, {
            method: editingItemId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            hideModal();
            fetchItems();
        } else {
            alert(result.message || '保存失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('网络异常');
    }
}

// ========= 获取藏品列表 =========
async function fetchItems() {
    const container = document.getElementById('itemList');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${BASE_URL}/collections/${collectionId}/items`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();

        if (!result.success) {
            container.innerHTML = '<div class="empty-state">加载失败</div>';
            return;
        }

        const data = result.data;
        document.getElementById('collectionName').innerText = data.collection_name;
        document.getElementById('collectionNameTitle').innerText = data.collection_name;
        document.getElementById('totalAmount').innerText = data.total_amount.toFixed(2);

        const items = data.items;
        document.getElementById('itemCount').innerText = items.length;
        const avgPrice = items.length ? data.total_amount / items.length : 0;
        document.getElementById('avgPrice').innerText = avgPrice.toFixed(2);

        if (!items.length) {
            container.innerHTML = '<div class="empty-state">📭 暂无藏品，点击右下角➕添加</div>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="item-card">
                <div class="item-image">
                    <img src="${item.image_url || DEFAULT_IMAGE_URL}" style="width:100%;height:100%;object-fit:cover;"
                         onerror="this.src='${DEFAULT_IMAGE_URL}'">
                </div>
                <div class="item-info">
                    <div class="item-name">${escapeHtml(item.name)}</div>
                    <div class="item-meta">购入于 ${item.purchase_date || '日期未知'}</div>
                </div>
                <div class="item-amount">¥${item.amount.toFixed(2)}</div>
                <div class="item-actions">
                    <div class="item-action edit" data-id="${item.id}" data-name="${escapeHtml(item.name)}"
                         data-amount="${item.amount}" data-date="${item.purchase_date || ''}"
                         data-image="${item.image_url || ''}">✏️</div>
                    <div class="item-action delete" data-id="${item.id}" data-name="${escapeHtml(item.name)}">🗑️</div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.item-action.edit').forEach(btn => {
            btn.addEventListener('click', () => {
                showEditModal(btn.dataset.id, btn.dataset.name, btn.dataset.amount, btn.dataset.date, btn.dataset.image);
            });
        });

        document.querySelectorAll('.item-action.delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm(`确定删除「${btn.dataset.name}」吗？`)) {
                    const token = localStorage.getItem('token');
                    await fetch(`${BASE_URL}/collections/items/${btn.dataset.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    fetchItems();
                }
            });
        });
    } catch (error) {
        console.error('获取藏品失败:', error);
        container.innerHTML = '<div class="empty-state">加载失败，请检查网络</div>';
    }
}

// ========= 底部导航栏 =========
function initTabBar() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            if (page === 'bill') location.href = 'bill.html';
            if (page === 'statistics') location.href = 'statistics.html';
        });
    });
}

// ========= 页面初始化 =========
async function init() {
    const token = localStorage.getItem('token');
    if (!token) return location.href = 'login.html';

    collectionId = getUrlParam('id');
    if (!collectionId) return location.href = 'asset.html';

    await fetchItems();
    initTabBar();

    document.getElementById('backBtn').onclick = () => location.href = 'asset.html';
    document.getElementById('addItemBtn').onclick = showAddModal;
    document.getElementById('closeModalBtn').onclick = hideModal;
    document.getElementById('modalCancelBtn').onclick = hideModal;
    document.getElementById('modalSaveBtn').onclick = handleSave;
}

init();