// ===== 全局变量 =====
const API_BASE = window.location.origin;
let categories = [];
let currentCategory = "";
let currentSearch = "";
let currentOffset = 0;
let currentLimit = 100;
let totalCount = 0;
let hasMore = true;
let isLoading = false;
let detailMode = false;
let currentData = [];

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // 恢复主题设置
    const savedTheme = localStorage.getItem('promptReaderTheme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    
    // 恢复详情模式
    const savedDetailMode = localStorage.getItem('promptReaderDetailMode');
    if (savedDetailMode) {
        detailMode = savedDetailMode === 'true';
        document.getElementById('detailCheckbox').checked = detailMode;
        updateDetailMode();
    }
    
    // 加载类别
    loadCategories();
    
    // 绑定事件
    bindEvents();
}

// ===== 事件绑定 =====
function bindEvents() {
    // 搜索输入
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value.trim();
            currentOffset = 0;
            currentData = [];
            loadReferences();
        }, 300);
    });
    
    // 类别选择
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        currentOffset = 0;
        currentData = [];
        loadReferences();
    });
    
    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
        currentOffset = 0;
        currentData = [];
        loadCategories();
        loadReferences();
    });
    
    // 详情模式切换
    document.getElementById('detailCheckbox').addEventListener('change', (e) => {
        detailMode = e.target.checked;
        localStorage.setItem('promptReaderDetailMode', detailMode);
        updateDetailMode();
        renderImageGrid();
    });
    
    // 加载更多按钮
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        if (hasMore && !isLoading) {
            currentOffset += currentLimit;
            loadReferences();
        }
    });
    
    // 模态框关闭
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('detailModal').addEventListener('click', closeModal);
    
    // 复制按钮
    document.getElementById('copyPromptBtn').addEventListener('click', () => {
        copyToClipboard('modalPrompt');
    });
    document.getElementById('copyNegativeBtn').addEventListener('click', () => {
        copyToClipboard('modalNegativePrompt');
    });
}

// ===== API 调用 =====

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/api/categories`);
        const data = await response.json();
        categories = data.categories || [];

        // 更新类别下拉框
        const categorySelect = document.getElementById('categorySelect');
        categorySelect.innerHTML = '';

        if (categories.length > 0) {
            // 有子目录，添加第一个作为默认选项
            categories.forEach((cat, index) => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categorySelect.appendChild(option);
            });
            // 设置默认值为第一个子目录
            categorySelect.value = categories[0];
            currentCategory = categories[0];
        } else {
            // 没有子目录，添加"空"选项
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '空';
            categorySelect.appendChild(option);
            currentCategory = '';
        }

        // 加载默认类别的数据
        loadReferences();
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

async function loadReferences() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    
    try {
        const params = new URLSearchParams({
            offset: currentOffset,
            limit: currentLimit
        });
        
        if (currentCategory) {
            params.append('category', currentCategory);
        }
        
        if (currentSearch) {
            params.append('search', currentSearch);
        }
        
        const response = await fetch(`${API_BASE}/api/references?${params.toString()}`);
        const data = await response.json();
        
        totalCount = data.total || 0;
        hasMore = data.has_more || false;
        
        // 如果是第一页，清空现有数据
        if (currentOffset === 0) {
            currentData = data.references || [];
        } else {
            currentData = [...currentData, ...(data.references || [])];
        }
        
        renderImageGrid();
        updateLoadMoreButton();
        updateEmptyState();
        
    } catch (error) {
        console.error('Failed to load references:', error);
        showEmptyState(true);
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// ===== UI 更新 =====

function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    indicator.style.display = show ? 'flex' : 'none';
}

function renderImageGrid() {
    const grid = document.getElementById('imageGrid');
    grid.innerHTML = '';
    
    currentData.forEach(item => {
        const card = createImageCard(item);
        grid.appendChild(card);
    });
}

function createImageCard(item) {
    const card = document.createElement('div');
    card.className = 'image-card';
    
    const img = document.createElement('img');
    img.className = 'image-card-image';
    img.src = item.image_url;
    img.alt = item.lora_name;
    img.loading = 'lazy';
    
    const content = document.createElement('div');
    content.className = 'image-card-content';
    
    const title = document.createElement('div');
    title.className = 'image-card-title';
    title.textContent = item.lora_name;
    title.title = item.lora_name;
    
    const meta = document.createElement('div');
    meta.className = 'image-card-meta';
    meta.textContent = `${item.category} · ${item.width}x${item.height}`;
    
    const prompt = document.createElement('div');
    prompt.className = 'image-card-prompt';
    prompt.textContent = item.prompt;
    prompt.title = item.prompt;
    
    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(prompt);
    
    card.appendChild(img);
    card.appendChild(content);
    
    // 点击显示详情
    card.addEventListener('click', () => {
        showDetailModal(item);
    });
    
    return card;
}

function updateDetailMode() {
    const grid = document.getElementById('imageGrid');
    if (detailMode) {
        grid.classList.add('detail-mode');
    } else {
        grid.classList.remove('detail-mode');
    }
}

function updateLoadMoreButton() {
    const container = document.getElementById('loadMoreContainer');
    const button = document.getElementById('loadMoreBtn');
    
    if (hasMore && totalCount > currentLimit) {
        container.style.display = 'flex';
        button.textContent = `加载更多 (${totalCount - currentData.length})`;
    } else {
        container.style.display = 'none';
    }
}

function updateEmptyState() {
    showEmptyState(currentData.length === 0);
}

function showEmptyState(show) {
    const emptyState = document.getElementById('emptyState');
    const grid = document.getElementById('imageGrid');
    
    if (show) {
        emptyState.style.display = 'flex';
        grid.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        grid.style.display = 'grid';
    }
}

// ===== 详情模态框 =====

function showDetailModal(item) {
    const modal = document.getElementById('detailModal');
    
    // 设置图片
    document.getElementById('modalImage').src = item.image_url;
    
    // 设置基本信息
    document.getElementById('modalFileName').textContent = item.file_name;
    document.getElementById('modalCategory').textContent = item.category;
    document.getElementById('modalLoraName').textContent = item.lora_name;
    
    // 设置图像参数
    document.getElementById('modalSize').textContent = `${item.width}x${item.height}`;
    document.getElementById('modalSteps').textContent = item.steps || '-';
    document.getElementById('modalSampler').textContent = item.sampler || '-';
    document.getElementById('modalCfg').textContent = item.cfg_scale || '-';
    document.getElementById('modalSeed').textContent = item.seed || '-';
    document.getElementById('modalModel').textContent = item.model || '-';
    
    // 设置Prompt
    document.getElementById('modalPrompt').textContent = item.prompt || '-';
    document.getElementById('modalNegativePrompt').textContent = item.negative_prompt || '-';
    
    // 显示模态框
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.style.display = 'none';
}

// ===== 工具函数 =====

async function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent || element.innerText;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // 显示复制成功提示
        const btn = element.parentElement.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 1000);
    } catch (err) {
        console.error('Failed to copy:', err);
        
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const btn = element.parentElement.querySelector('.copy-btn');
            const originalText = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
    }
}