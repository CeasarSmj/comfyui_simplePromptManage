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
        name_placeholder: "名称",
        note_placeholder: "备注（可选）",
        text_placeholder: "输入提示词文本...",
        add_btn: "✚ 添加",
        delete_btn: "🗑️ 删除选中",
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
        name_placeholder: "Name",
        note_placeholder: "Note (Optional)",
        text_placeholder: "Enter prompt text...",
        add_btn: "✚ Add",
        delete_btn: "🗑️ Delete Selected",
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
    document.getElementById("deleteBtn").textContent = t.delete_btn;
    
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
let selectedIndex = -1;

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
    
    prompts.forEach((item, idx) => {
        const mode = document.getElementById("searchMode").value;
        const text = `${item.name} ${item.note} ${item.text}`.toLowerCase();
        const query = filter.toLowerCase();
        const match = mode === "exact" ? text.includes(query) && query : text.includes(query);
        if (filter && !match) return;
        
        const div = document.createElement("div");
        div.className = "prompt-item" + (idx === selectedIndex ? " selected" : "");
        div.innerHTML = `<strong>${item.name}</strong><br><small>${item.note}</small><br><pre>${item.text.substring(0,100)}...</pre>`;
        div.onclick = () => {
            selectedIndex = idx;
            renderList(filter);
            // 更新删除按钮显示状态
            deleteBtn.style.display = "block";
        };
        list.appendChild(div);
    });
    
    // 如果没有选中项，隐藏删除按钮
    if (selectedIndex === -1) {
        deleteBtn.style.display = "none";
    }
}

// 搜索
document.getElementById("searchInput").addEventListener("input", e => {
    renderList(e.target.value);
});

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
    loadPrompts();
};

// 删除（需先选中）
function deleteSelected() {
    const t = translations[currentLang];
    if (selectedIndex === -1) return alert(t.alert_select);
    
    const item = prompts[selectedIndex];
    if (!confirm(`${t.confirm_delete} "${item.name}" ${currentLang === "zh" ? "吗？" : "?"}`)) {
        return;
    }
    
    fetch(API_BASE + "/delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({index: selectedIndex})
    }).then(() => {
        selectedIndex = -1;
        loadPrompts();
    });
}

// 删除按钮事件
document.getElementById("deleteBtn").onclick = deleteSelected;

// 键盘快捷键
document.addEventListener("keydown", e => { 
    if (e.key === "Delete" && selectedIndex !== -1) deleteSelected(); 
});

// 生成区逻辑
function updateText(isPositive) {
    const tagsDiv = document.getElementById(isPositive ? "positiveTags" : "negativeTags");
    const textArea = document.getElementById(isPositive ? "positiveText" : "negativeText");
    const checked = Array.from(tagsDiv.querySelectorAll(".tag-item input:checked"))
        .map(cb => prompts[cb.dataset.index].text);
    textArea.value = checked.join(", ");
}

// 添加到生成区
function addToGenerate(isPositive) {
    const t = translations[currentLang];
    if (selectedIndex === -1) return alert(t.alert_select);
    const item = prompts[selectedIndex];
    const tagsDiv = document.getElementById(isPositive ? "positiveTags" : "negativeTags");
    
    const tag = document.createElement("div");
    tag.className = "tag-item";
    tag.innerHTML = `
        <input type="checkbox" checked data-index="${selectedIndex}">
        <span>${item.name}</span>
        <button class="del-tag">×</button>
    `;
    tag.querySelector("input").onchange = () => updateText(isPositive);
    tag.querySelector(".del-tag").onclick = () => {
        tag.remove();
        updateText(isPositive);
    };
    tagsDiv.appendChild(tag);
    updateText(isPositive);
}

document.getElementById("addToPositive").onclick = () => addToGenerate(true);
document.getElementById("addToNegative").onclick = () => addToGenerate(false);

// 初始化应用
initializeApp();
loadPrompts();