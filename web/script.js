// ===== 国际化翻译 =====
const translations = {
    zh: {
        title: "✨ Prompt 管理系统",
        subtitle: "优雅地管理和生成 AI 提示词",
        library: "📚 提示词库",
        search_placeholder: "🔍 搜索提示词...",
        fuzzy: "模糊",
        exact: "精确",
        add_title: "新增提示词",
        edit_title: "编辑提示词",
        name_placeholder: "名称",
        note_placeholder: "备注（可选）",
        text_placeholder: "输入提示词文本...",
        add_btn: "✚ 添加",
        confirm_edit_btn: "✓ 确认编辑",
        edit_btn: "✏️ 编辑选中",
        delete_btn: "🗑️ 删除选中",
        cancel_edit_btn: "✕ 取消编辑",
        alert_select: "请先选中一条提示词",
        alert_required: "名称和提示词必填",
        confirm_delete: "确认要删除提示词",
        generator: "🎨 生成器",
        positive: "✅ 正向提示词",
        negative: "❌ 负向提示词",
        positive_placeholder: "正向提示词将显示在这里...",
        negative_placeholder: "负向提示词将显示在这里...",
        add_positive: "➕ 加入正向 (P)",
        add_negative: "➖ 加入负向 (N)"
    },
    en: {
        title: "✨ Prompt Manager",
        subtitle: "Elegant AI prompt management and generation",
        library: "📚 Prompt Library",
        search_placeholder: "🔍 Search prompts...",
        fuzzy: "Fuzzy",
        exact: "Exact",
        add_title: "Add New Prompt",
        edit_title: "Edit Prompt",
        name_placeholder: "Name",
        note_placeholder: "Note (Optional)",
        text_placeholder: "Enter prompt text...",
        add_btn: "✚ Add",
        confirm_edit_btn: "✓ Confirm Edit",
        edit_btn: "✏️ Edit Selected",
        delete_btn: "🗑️ Delete Selected",
        cancel_edit_btn: "✕ Cancel Edit",
        alert_select: "Please select a prompt",
        alert_required: "Name and prompt text are required",
        confirm_delete: "Confirm to delete prompt",
        generator: "🎨 Generator",
        positive: "✅ Positive Prompts",
        negative: "❌ Negative Prompts",
        positive_placeholder: "Positive prompts will appear here...",
        negative_placeholder: "Negative prompts will appear here...",
        add_positive: "➕ Add Positive (P)",
        add_negative: "➖ Add Negative (N)"
    }
};

let currentLang = localStorage.getItem("promptLang") || "zh";
let currentTheme = localStorage.getItem("promptTheme") || "light";

// 初始化主题和语言
function initializeApp() {
    document.documentElement.setAttribute("data-theme", currentTheme);
    document.documentElement.setAttribute("data-lang", currentLang);
    document.getElementById("themeToggle").value = currentTheme;
    document.getElementById("langToggle").value = currentLang;
    updateUI();
}

// 更新页面文本
function updateUI() {
    const t = translations[currentLang];
    
    // 更新 header
    document.querySelector(".header-main h1").textContent = t.title;
    document.querySelector(".header-main p").textContent = t.subtitle;
    
    // 更新左侧面板
    document.querySelector(".section-header h2").textContent = t.library;
    document.getElementById("searchInput").placeholder = t.search_placeholder;
    
    const options = document.getElementById("searchMode").querySelectorAll("option");
    options[0].textContent = t.fuzzy;
    options[1].textContent = t.exact;
    
    document.querySelector(".add-form h3").textContent = t.add_title;
    document.getElementById("newName").placeholder = t.name_placeholder;
    document.getElementById("newNote").placeholder = t.note_placeholder;
    document.getElementById("newText").placeholder = t.text_placeholder;
    document.getElementById("addBtn").textContent = t.add_btn;
    document.getElementById("confirmEditBtn").textContent = t.confirm_edit_btn;
    document.getElementById("editBtn").textContent = t.edit_btn;
    document.getElementById("deleteBtn").textContent = t.delete_btn;
    document.getElementById("cancelEditBtn").textContent = t.cancel_edit_btn;
    
    // 更新右侧面板
    const sections = document.querySelectorAll(".section-header h2");
    if (sections.length > 1) {
        sections[1].textContent = t.generator;
    }
    
    const promptGroups = document.querySelectorAll(".prompt-group h3");
    if (promptGroups.length >= 2) {
        promptGroups[0].textContent = t.positive;
        promptGroups[1].textContent = t.negative;
    }
    
    const textAreas = document.querySelectorAll(".output-text");
    if (textAreas.length >= 2) {
        textAreas[0].placeholder = t.positive_placeholder;
        textAreas[1].placeholder = t.negative_placeholder;
    }
    
    const actionButtons = document.querySelectorAll(".action-buttons .btn");
    if (actionButtons.length >= 2) {
        actionButtons[0].textContent = t.add_positive;
        actionButtons[1].textContent = t.add_negative;
    }
}

// 语言切换
document.getElementById("langToggle").addEventListener("change", (e) => {
    currentLang = e.target.value;
    localStorage.setItem("promptLang", currentLang);
    document.documentElement.setAttribute("data-lang", currentLang);
    updateUI();
});

// 主题切换
document.getElementById("themeToggle").addEventListener("change", (e) => {
    currentTheme = e.target.value;
    localStorage.setItem("promptTheme", currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
});

let prompts = [];
let selectedIndexes = [];
let editingIndex = -1;
let detailMode = false;

const API_BASE = "/prompt_manage";

// 加载数据
async function loadPrompts() {
    const res = await fetch(API_BASE + "/get", { method: "POST" });
    prompts = await res.json();
    renderList();
}

// 渲染列表
function renderList(filter = "") {
    const list = document.getElementById("promptList");
    list.innerHTML = "";
    const deleteBtn = document.getElementById("deleteBtn");
    const editBtn = document.getElementById("editBtn");
    
    // 根据详细模式更新容器类
    if (detailMode) {
        list.classList.add("detail-mode");
    } else {
        list.classList.remove("detail-mode");
    }
    
    prompts.forEach((item, idx) => {
        const mode = document.getElementById("searchMode").value;
        const text = `${item.name} ${item.note} ${item.text}`.toLowerCase();
        const query = filter.toLowerCase();
        const match = mode === "exact" ? text.includes(query) && query : text.includes(query);
        if (filter && !match) return;
        
        const div = document.createElement("div");
        const viewClass = detailMode ? "detail-view" : "compact-view";
        
        // 根据名称最后一个字母判断颜色
        const lastChar = item.name.trim().slice(-1).toUpperCase();
        let colorClass = "";
        if (lastChar === "P") {
            colorClass = "color-positive";
        } else if (lastChar === "N") {
            colorClass = "color-negative";
        }
        
        const isSelected = selectedIndexes.includes(idx);
        div.className = "prompt-item " + viewClass + " " + colorClass + (isSelected ? " selected" : "");
        
        if (detailMode) {
            div.innerHTML = `<strong>${item.name}</strong><br><small>${item.note}</small><br><pre>${item.text.substring(0,100)}...</pre>`;
        } else {
            div.innerHTML = `<strong>${item.name}</strong>`;
        }
        
        div.onclick = () => {
            // 多选逻辑：点击一次选中，再点击取消
            if (selectedIndexes.includes(idx)) {
                selectedIndexes = selectedIndexes.filter(i => i !== idx);
            } else {
                selectedIndexes.push(idx);
            }
            renderList(filter);
            updateButtonVisibility();
        };
        list.appendChild(div);
    });
    
    updateButtonVisibility();
}

// 更新按钮显示状态
function updateButtonVisibility() {
    const deleteBtn = document.getElementById("deleteBtn");
    const editBtn = document.getElementById("editBtn");
    
    if (selectedIndexes.length === 0) {
        deleteBtn.style.display = "none";
        editBtn.style.display = "none";
    } else if (selectedIndexes.length === 1) {
        // 只选中一个时，显示编辑和删除按钮
        deleteBtn.style.display = "block";
        editBtn.style.display = "block";
    } else {
        // 多选时，只显示删除按钮
        deleteBtn.style.display = "block";
        editBtn.style.display = "none";
    }
}

// 搜索
document.getElementById("searchInput").addEventListener("input", e => {
    renderList(e.target.value);
});

// 显示细节复选框
document.getElementById("detailToggle").addEventListener("change", e => {
    detailMode = e.target.checked;
    localStorage.setItem("promptDetailMode", detailMode);
    renderList(document.getElementById("searchInput").value);
});

// 初始化显示细节设置
const savedDetailMode = localStorage.getItem("promptDetailMode");
if (savedDetailMode !== null) {
    detailMode = savedDetailMode === "true";
    document.getElementById("detailToggle").checked = detailMode;
}

// 编辑选中的提示词
function editSelected() {
    const t = translations[currentLang];
    if (selectedIndexes.length !== 1) return alert(t.alert_select);
    
    const idx = selectedIndexes[0];
    const item = prompts[idx];
    editingIndex = idx;
    
    // 填充表单
    document.getElementById("newName").value = item.name;
    document.getElementById("newNote").value = item.note;
    document.getElementById("newText").value = item.text;
    
    // 更新标题
    document.getElementById("addFormTitle").textContent = t.edit_title;
    
    // 编辑模式：显示确认和取消按钮，隐藏添加按钮
    document.getElementById("addBtn").style.display = "none";
    document.getElementById("confirmEditBtn").style.display = "inline-block";
    document.getElementById("cancelEditBtn").style.display = "inline-block";
}

// 编辑按钮事件
document.getElementById("editBtn").onclick = editSelected;

// 取消编辑
function cancelEdit() {
    const t = translations[currentLang];
    editingIndex = -1;
    
    // 清空表单
    document.getElementById("newName").value = "";
    document.getElementById("newNote").value = "";
    document.getElementById("newText").value = "";
    
    // 恢复标题
    document.getElementById("addFormTitle").textContent = t.add_title;
    
    // 隐藏确认和取消按钮，显示添加按钮
    document.getElementById("addBtn").style.display = "inline-block";
    document.getElementById("confirmEditBtn").style.display = "none";
    document.getElementById("cancelEditBtn").style.display = "none";
    
    selectedIndexes = [];
}

// 取消编辑按钮事件
document.getElementById("cancelEditBtn").onclick = cancelEdit;

// 添加
document.getElementById("addBtn").onclick = async () => {
    const name = document.getElementById("newName").value.trim();
    const note = document.getElementById("newNote").value.trim();
    const text = document.getElementById("newText").value.trim();
    const t = translations[currentLang];
    if (!name || !text) return alert(t.alert_required);
    
    await fetch(API_BASE + "/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, note, text})
    });
    
    document.getElementById("newName").value = "";
    document.getElementById("newNote").value = "";
    document.getElementById("newText").value = "";
    selectedIndexes = [];
    loadPrompts();
};

// 确认编辑
document.getElementById("confirmEditBtn").onclick = async () => {
    const name = document.getElementById("newName").value.trim();
    const note = document.getElementById("newNote").value.trim();
    const text = document.getElementById("newText").value.trim();
    const t = translations[currentLang];
    if (!name || !text) return alert(t.alert_required);
    
    await fetch(API_BASE + "/update", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({index: editingIndex, name, note, text})
    });
    
    document.getElementById("newName").value = "";
    document.getElementById("newNote").value = "";
    document.getElementById("newText").value = "";
    cancelEdit();
    selectedIndexes = [];
    loadPrompts();
};

// 删除（支持批量删除）
function deleteSelected() {
    const t = translations[currentLang];
    if (selectedIndexes.length === 0) return alert(t.alert_select);
    
    const names = selectedIndexes.map(idx => prompts[idx].name).join("、");
    const msg = selectedIndexes.length === 1 
        ? `${t.confirm_delete} "${names}" ${currentLang === "zh" ? "吗？" : "?"}`
        : `${t.confirm_delete} ${selectedIndexes.length} ${currentLang === "zh" ? "条提示词吗？" : "prompts?"}`;
    
    if (!confirm(msg)) {
        return;
    }
    
    // 按从大到小的顺序删除，避免索引错乱
    const sortedIndexes = [...selectedIndexes].sort((a, b) => b - a);
    
    Promise.all(sortedIndexes.map(idx => 
        fetch(API_BASE + "/delete", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({index: idx})
        })
    )).then(() => {
        selectedIndexes = [];
        loadPrompts();
    });
}

// 删除按钮事件
document.getElementById("deleteBtn").onclick = deleteSelected;

// 键盘快捷键
document.addEventListener("keydown", e => { 
    if (e.key === "Delete" && selectedIndexes.length > 0) deleteSelected(); 
});

// 生成区逻辑
function updateText(isPositive) {
    const tagsDiv = document.getElementById(isPositive ? "positiveTags" : "negativeTags");
    const textArea = document.getElementById(isPositive ? "positiveText" : "negativeText");
    const checked = Array.from(tagsDiv.querySelectorAll(".tag-item input:checked"))
        .map(cb => prompts[cb.dataset.index].text);
    textArea.value = checked.join(", ");
}

// 添加到生成区（支持批量添加）
function addToGenerate(isPositive) {
    const t = translations[currentLang];
    if (selectedIndexes.length === 0) return alert(t.alert_select);
    const tagsDiv = document.getElementById(isPositive ? "positiveTags" : "negativeTags");
    
    selectedIndexes.forEach(idx => {
        const item = prompts[idx];
        const tag = document.createElement("div");
        tag.className = "tag-item";
        tag.innerHTML = `
            <input type="checkbox" checked data-index="${idx}">
            <span>${item.name}</span>
            <button class="del-tag">×</button>
        `;
        tag.querySelector("input").onchange = () => updateText(isPositive);
        tag.querySelector(".del-tag").onclick = () => {
            tag.remove();
            updateText(isPositive);
        };
        tagsDiv.appendChild(tag);
    });
    
    updateText(isPositive);
}

document.getElementById("addToPositive").onclick = () => addToGenerate(true);
document.getElementById("addToNegative").onclick = () => addToGenerate(false);

// 初始化应用
initializeApp();
loadPrompts();