// add-item.js
const BASE_URL = 'https://tool.gvzbz.fun/api';

function getToken() {
    return localStorage.getItem('token');
}

function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function showError(msg) {
    const errorDiv = document.getElementById('errorMsg');
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 2500);
}

let collectionId = null;
let itemId = null;
let currentImageUrl = null;

async function uploadImage(file) {
    const token = getToken();
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`${BASE_URL}/upload/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            return result.data.image_url;
        } else {
            showError(result.message || '图片上传失败');
            return null;
        }
    } catch (error) {
        showError('网络异常，图片上传失败');
        return null;
    }
}

function initImageUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewImg = document.getElementById('previewImg');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const deleteImgBtn = document.getElementById('deleteImgBtn');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            deleteImgBtn.style.display = 'flex';
        };
        reader.readAsDataURL(file);
        
        const imageUrl = await uploadImage(file);
        if (imageUrl) currentImageUrl = imageUrl;
    });
    
    deleteImgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        previewImg.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
        deleteImgBtn.style.display = 'none';
        currentImageUrl = null;
        fileInput.value = '';
    });
}

async function handleSave() {
    const name = document.getElementById('itemName').value.trim();
    const amount = parseFloat(document.getElementById('itemAmount').value);
    
    if (!name) {
        showError('请输入藏品名称');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showError('请输入有效的金额');
        return;
    }
    
    const purchaseDate = document.getElementById('purchaseDate').value;
    const data = {
        name: name,
        amount: amount,
        purchase_date: purchaseDate || null,
        image_url: currentImageUrl || null
    };
    
    const token = getToken();
    try {
        let result;
        if (itemId) {
            const response = await fetch(`${BASE_URL}/collections/items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            result = await response.json();
        } else {
            const response = await fetch(`${BASE_URL}/collections/${collectionId}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            result = await response.json();
        }
        
        if (result.success) {
            window.location.href = `collection-detail.html?id=${collectionId}`;
        } else {
            showError(result.message || '保存失败');
        }
    } catch (error) {
        showError('网络异常');
    }
}

async function loadItemDetail() {
    const token = getToken();
    try {
        const response = await fetch(`${BASE_URL}/collections/${collectionId}/items`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
            const item = result.data.items.find(i => i.id == itemId);
            if (item) {
                document.getElementById('itemName').value = item.name;
                document.getElementById('itemAmount').value = item.amount;
                if (item.purchase_date) {
                    document.getElementById('purchaseDate').value = item.purchase_date;
                }
                if (item.image_url && item.image_url !== '/static/default.jpg') {
                    currentImageUrl = item.image_url;
                    document.getElementById('previewImg').src = item.image_url;
                    document.getElementById('previewImg').style.display = 'block';
                    document.getElementById('uploadPlaceholder').style.display = 'none';
                    document.getElementById('deleteImgBtn').style.display = 'flex';
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function init() {
    collectionId = getUrlParam('collectionId');
    itemId = getUrlParam('itemId');
    
    if (!collectionId) {
        window.location.href = 'asset.html';
        return;
    }
    
    if (itemId) {
        document.getElementById('pageTitle').innerText = '编辑藏品';
        loadItemDetail();
    } else {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('purchaseDate').value = today;
    }
    
    initImageUpload();
    
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = `collection-detail.html?id=${collectionId}`;
    });
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = `collection-detail.html?id=${collectionId}`;
    });
    document.getElementById('saveBtn').addEventListener('click', handleSave);
}

init();
