// ===== 国际化翻译 =====
// 从 translations.json 加载翻译数据
let translations = {};

// ===== API 和全局常量 =====
const API_BASE = "/prompt_manage";
const LORA_API_BASE = "/prompt_manage/lora";

// ===== 全局变量 =====
let currentLang = localStorage.getItem("promptLang") || "zh";
let currentTheme = localStorage.getItem("promptTheme") || "light";
let currentTab = "prompt";
let currentLang_inner = currentLang;

// 提示词库变量
let prompts = [];
let selectedIndexes = [];
let editingIndex = -1;
let detailMode = false;
let savedTypeFilterValue;

// Lora库变量
let loraData = [];
let loraCategories = [];
let loraSelectedIndexes = [];
let loraDetailMode = false;
let loraSearchText = "";
let loraDataLoaded = false;  // 标志Lora数据是否已加载

// 加载翻译和LLM模板
Promise.all([
    fetch('translations.json').then(r => r.json()),
    fetch('llm-templates.json').then(r => r.json())
]).then(([trans, templates]) => {
    translations = trans;
    window.llmTemplates = templates;
    // 初始化应用
    initializeApp();
    loadPrompts();
}).catch(err => {
    console.error('Failed to load configuration files:', err);
});

// 获取ComfyUI的语言设置
function getComfyUILanguage() {
    // 先尝试从app对象获取
    if (window.app && window.app.settings) {
        try {
            const comfyLang = window.app.settings.getSettingValue("language");
            if (comfyLang) return comfyLang;
        } catch (e) {
            // 如果失败，继续下一个方法
        }
    }
    
    // 从localStorage获取ComfyUI的语言设置
    const storedLang = localStorage.getItem("Comfy.Settings.language");
    if (storedLang) return storedLang;
    
    return null;
}

// 将ComfyUI语言转换为插件支持的语言
function mapComfyLanguage(comfyLang) {
    if (!comfyLang) return null;
    
    const langMap = {
        "zh": "zh",
        "zh_CN": "zh",
        "zh-cn": "zh",
        "zh-hans": "zh",
        "en": "en",
        "en_US": "en"
    };
    
    return langMap[comfyLang] || null;
}

// 初始化主题和语言
function initializeApp() {
    // 优先使用ComfyUI的语言设置，如果没有则使用本地保存，最后降级为中文
    const comfyLang = getComfyUILanguage();
    const mappedLang = comfyLang ? mapComfyLanguage(comfyLang) : null;
    currentLang = mappedLang || localStorage.getItem("promptLang") || "zh";
    
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
    document.getElementById("deselectBtn").textContent = t.deselect_btn;
    document.getElementById("clearGeneratorBtn").textContent = t.clear_generator_btn;
    document.getElementById("cancelEditBtn").textContent = t.cancel_edit_btn;
    
    // 更新左侧搜索和筛选
    const searchMode = document.getElementById("searchMode");
    if (searchMode) {
        searchMode.options[0].textContent = t.fuzzy;
        searchMode.options[1].textContent = t.exact;
    }
    
    const typeFilter = document.getElementById("typeFilter");
    if (typeFilter) {
        typeFilter.options[0].textContent = t.no_filter;
        typeFilter.options[1].textContent = t.quality;
        typeFilter.options[2].textContent = t.style;
        typeFilter.options[3].textContent = t.texture;
        typeFilter.options[4].textContent = t.environment;
        typeFilter.options[5].textContent = t.action;
        typeFilter.options[6].textContent = t.expression;
        typeFilter.options[7].textContent = t.clothing;
        typeFilter.options[8].textContent = t.composition;
        typeFilter.options[9].textContent = t.other;
    }
    
    // 更新显示细节标签
    const detailLabel = document.querySelector(".detail-checkbox span");
    if (detailLabel) {
        detailLabel.textContent = t.detail_toggle;
    }
    
    // 更新新增表单的下拉框
    const newDirection = document.getElementById("newDirection");
    if (newDirection) {
        newDirection.options[0].textContent = t.direction_label + t.direction_none;
        newDirection.options[1].textContent = t.direction_label + t.direction_positive;
        newDirection.options[2].textContent = t.direction_label + t.direction_negative;
    }
    
    const newType = document.getElementById("newType");
    if (newType) {
        newType.options[0].textContent = t.type_label + t.other;
        newType.options[1].textContent = t.type_label + t.quality;
        newType.options[2].textContent = t.type_label + t.style;
        newType.options[3].textContent = t.type_label + t.texture;
        newType.options[4].textContent = t.type_label + t.environment;
        newType.options[5].textContent = t.type_label + t.action;
        newType.options[6].textContent = t.type_label + t.expression;
        newType.options[7].textContent = t.type_label + t.clothing;
        newType.options[8].textContent = t.type_label + t.composition;
    }
    
    // 更新主题选择
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.options[0].textContent = t.light_mode;
        themeToggle.options[1].textContent = t.dark_mode;
    }
    
    // 更新右侧面板
    document.getElementById("generatorTitle").textContent = t.generator;
    document.getElementById("positiveTitle").textContent = t.positive;
    document.getElementById("negativeTitle").textContent = t.negative;
    
    document.getElementById("positiveText").placeholder = t.positive_placeholder;
    document.getElementById("negativeText").placeholder = t.negative_placeholder;
    
    document.getElementById("addToGenerate").textContent = t.add_auto;
    document.getElementById("addToPositive").textContent = t.add_positive;
    document.getElementById("addToNegative").textContent = t.add_negative;    
    // 更新 LLM 生成器
    document.getElementById("llmGeneratorBtn").textContent = t.llm_generator_btn;
    document.getElementById("llmModalTitle").textContent = t.llm_title;
    document.getElementById("llmInputLabel").textContent = t.llm_input_label;
    document.getElementById("llmOutputLabel").textContent = t.llm_output_label;
    document.getElementById("llmInput").placeholder = t.llm_input_placeholder;
    document.getElementById("llmGenerateBtn").textContent = t.llm_generate_btn;
    document.getElementById("llmCopyBtn").textContent = t.llm_copy_btn;
    
    // 更新 LLM 说明文本
    document.getElementById("llmGeneratorInfo").textContent = t.llm_generator_info;
    document.getElementById("llmUsageTitle").textContent = t.llm_usage_title;
    document.getElementById("llmUsageStep1").textContent = t.llm_usage_step_1;
    document.getElementById("llmUsageStep2").textContent = t.llm_usage_step_2;
    document.getElementById("llmUsageStep3").textContent = t.llm_usage_step_3;
    
    // 更新选项卡按钮
    document.getElementById("promptTabBtn").textContent = t.prompt_library_tab || "📚 提示词库";
    document.getElementById("loraTabBtn").textContent = t.lora_library_tab || "🎨 Lora库";
    
    // 更新Lora库控制按钮
    const loraDeselectBtn = document.getElementById("loraDeselectBtn");
    if (loraDeselectBtn) {
        loraDeselectBtn.textContent = t.deselect_btn;
    }
    
    const loraRefreshBtn = document.getElementById("loraRefreshBtn");
    if (loraRefreshBtn) {
        loraRefreshBtn.textContent = t.lora_refresh_btn || "🔄 更新";
    }
    
    const loraDetailLabel = document.querySelectorAll(".lora-section .detail-checkbox span")[0];
    if (loraDetailLabel) {
        loraDetailLabel.textContent = t.detail_toggle;
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

// ===== 选项卡切换逻辑 =====
const promptTabBtn = document.getElementById("promptTabBtn");
const loraTabBtn = document.getElementById("loraTabBtn");
const promptPanel = document.getElementById("promptPanel");
const loraPanel = document.getElementById("loraPanel");

function switchTab(tab) {
    currentTab = tab;
    if (tab === "prompt") {
        promptTabBtn.classList.add("active");
        loraTabBtn.classList.remove("active");
        promptPanel.style.display = "flex";
        loraPanel.style.display = "none";
        localStorage.setItem("promptActiveTab", "prompt");
    } else if (tab === "lora") {
        // 在切换到lora前，保存typeFilter的值
        savedTypeFilterValue = document.getElementById("typeFilter").value;
        
        promptTabBtn.classList.remove("active");
        loraTabBtn.classList.add("active");
        promptPanel.style.display = "none";
        loraPanel.style.display = "flex";
        localStorage.setItem("promptActiveTab", "lora");
        // 进入Lora选项卡时加载Lora数据
        loadLoraData();
    }
}

// 选项卡按钮点击事件
promptTabBtn.addEventListener("click", () => switchTab("prompt"));
loraTabBtn.addEventListener("click", () => switchTab("lora"));

// 恢复之前的选项卡状态（仅恢复UI，不加载数据）
const activeTab = localStorage.getItem("promptActiveTab") || "prompt";
if (activeTab === "prompt") {
    currentTab = "prompt";
    promptTabBtn.classList.add("active");
    loraTabBtn.classList.remove("active");
    promptPanel.style.display = "flex";
    loraPanel.style.display = "none";
} else if (activeTab === "lora") {
    currentTab = "lora";
    promptTabBtn.classList.remove("active");
    loraTabBtn.classList.add("active");
    promptPanel.style.display = "none";
    loraPanel.style.display = "flex";
    
    // 如果还没有加载Lora数据，则加载
    if (!loraDataLoaded) {
        loadLoraData();
    }
}

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
    const typeFilter = document.getElementById("typeFilter").value;
    
    // 根据详细模式更新容器类
    if (detailMode) {
        list.classList.add("detail-mode");
    } else {
        list.classList.remove("detail-mode");
    }
    
    prompts.forEach((item, idx) => {
        const mode = document.getElementById("searchMode").value;
        const text = `${item.name} ${item.note || ""} ${item.text}`.toLowerCase();
        const query = filter.toLowerCase();
        const match = mode === "exact" ? text.includes(query) && query : text.includes(query);
        
        // 检查文本匹配
        if (filter && !match) return;
        
        // 检查类型筛选
        const itemType = item.type || "其它";
        if (typeFilter && itemType !== typeFilter) return;
        
        const div = document.createElement("div");
        const viewClass = detailMode ? "detail-view" : "compact-view";
        
        // 根据类型和方向确定样式类
        const typeClass = `type-${itemType}`;
        const directionClass = `direction-${item.direction || "无"}`;
        
        const isSelected = selectedIndexes.includes(idx);
        div.className = "prompt-item " + viewClass + " " + typeClass + " " + directionClass + (isSelected ? " selected" : "");
        
        const directionText = item.direction || "无";
        
        if (detailMode) {
            div.innerHTML = `<strong>${item.name}</strong><br><small>方向: ${directionText} | 类型: ${itemType}</small><small>${item.note || ""}</small><pre>${item.text.substring(0, 100)}${item.text.length > 100 ? "..." : ""}</pre>`;
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
    const deselectBtn = document.getElementById("deselectBtn");
    
    if (selectedIndexes.length === 0) {
        deleteBtn.style.display = "none";
        editBtn.style.display = "none";
        deselectBtn.style.display = "none";
    } else if (selectedIndexes.length === 1) {
        // 只选中一个时，显示编辑和删除按钮
        deleteBtn.style.display = "block";
        editBtn.style.display = "block";
        deselectBtn.style.display = "block";
    } else {
        // 多选时，只显示删除按钮
        deleteBtn.style.display = "block";
        editBtn.style.display = "none";
        deselectBtn.style.display = "block";
    }
}

// 搜索
document.getElementById("searchInput").addEventListener("input", e => {
    renderList(e.target.value);
});

// 类型筛选
document.getElementById("typeFilter").addEventListener("change", e => {
    renderList(document.getElementById("searchInput").value);
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
    document.getElementById("newDirection").value = item.direction || "无";
    document.getElementById("newType").value = item.type || "其它";
    document.getElementById("newNote").value = item.note || "";
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
    document.getElementById("newDirection").value = "无";
    document.getElementById("newType").value = "其它";
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
    const direction = document.getElementById("newDirection").value;
    const type = document.getElementById("newType").value;
    const note = document.getElementById("newNote").value.trim();
    const text = document.getElementById("newText").value.trim();
    const t = translations[currentLang];
    if (!name || !text) return alert(t.alert_required);
    
    await fetch(API_BASE + "/add", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, direction, type, note, text})
    });
    
    document.getElementById("newName").value = "";
    document.getElementById("newDirection").value = "无";
    document.getElementById("newType").value = "其它";
    document.getElementById("newNote").value = "";
    document.getElementById("newText").value = "";
    selectedIndexes = [];
    loadPrompts();
};

// 确认编辑
document.getElementById("confirmEditBtn").onclick = async () => {
    const name = document.getElementById("newName").value.trim();
    const direction = document.getElementById("newDirection").value;
    const type = document.getElementById("newType").value;
    const note = document.getElementById("newNote").value.trim();
    const text = document.getElementById("newText").value.trim();
    const t = translations[currentLang];
    if (!name || !text) return alert(t.alert_required);
    
    await fetch(API_BASE + "/update", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({index: editingIndex, name, direction, type, note, text})
    });
    
    document.getElementById("newName").value = "";
    document.getElementById("newDirection").value = "无";
    document.getElementById("newType").value = "其它";
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

// 取消选择按钮事件
document.getElementById("deselectBtn").onclick = () => {
    selectedIndexes = [];
    renderList(document.getElementById("searchInput").value);
};

// 清空生成器按钮事件
document.getElementById("clearGeneratorBtn").onclick = () => {
    document.getElementById("positiveTags").innerHTML = "";
    document.getElementById("negativeTags").innerHTML = "";
    document.getElementById("positiveText").value = "";
    document.getElementById("negativeText").value = "";
};

// 键盘快捷键
document.addEventListener("keydown", e => { 
    if (e.key === "Delete" && selectedIndexes.length > 0) deleteSelected(); 
});

// 生成区逻辑
function updateText(isPositive) {
    const tagsDiv = document.getElementById(isPositive ? "positiveTags" : "negativeTags");
    const textArea = document.getElementById(isPositive ? "positiveText" : "negativeText");
    
    // 如果是正向提示词且有Lora数据，使用按顺序拼接的逻辑
    if (isPositive && loraData && loraData.length > 0) {
        updateLoraText();
        return;
    }
    
    // 获取所有选中的text，保持每个tag的内容分离（用换行分隔）
    let selectedPhrases = Array.from(tagsDiv.querySelectorAll(".tag-item input:checked"))
        .map(cb => prompts[cb.dataset.index].text);
    
    // 不同tag之间用换行分隔，最后以逗号结尾
    textArea.value = selectedPhrases.length > 0 ? selectedPhrases.join(",\n") + "," : "";
}

// 获取生成器中已添加的tag
function getGeneratorTags() {
    const positiveTags = Array.from(document.querySelectorAll("#positiveTags .tag-item input"))
        .map(cb => parseInt(cb.dataset.index));
    const negativeTags = Array.from(document.querySelectorAll("#negativeTags .tag-item input"))
        .map(cb => parseInt(cb.dataset.index));
    return new Set([...positiveTags, ...negativeTags]);
}
// 添加到生成区（支持批量添加）- 根据方向自动放入
function addToGenerateAuto() {
    const t = translations[currentLang];
    if (selectedIndexes.length === 0) return alert(t.alert_select);
    
    selectedIndexes.forEach(idx => {
        const item = prompts[idx];
        const direction = item.direction || "无";
        const isPositive = direction !== "反向";  // 如果是反向则放入负向，否则放入正向
        
        const tagsDiv = document.getElementById(isPositive ? "positiveTags" : "negativeTags");
        
        // 检查是否已经添加
        const existing = Array.from(tagsDiv.querySelectorAll(".tag-item input")).find(cb => cb.dataset.index == idx);
        if (existing) return;
        
        const tag = document.createElement("div");
        tag.className = `tag-item type-${item.type || "其它"} direction-${direction}`;
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
    
    updateText(true);
    updateText(false);
}

// 添加到生成区（支持批量添加）
function addToGenerate(isPositive) {
    const t = translations[currentLang];
    if (selectedIndexes.length === 0) return alert(t.alert_select);
    const tagsDiv = document.getElementById(isPositive ? "positiveTags" : "negativeTags");
    
    selectedIndexes.forEach(idx => {
        const item = prompts[idx];
        
        // 检查是否已经添加
        const existing = Array.from(tagsDiv.querySelectorAll(".tag-item input")).find(cb => cb.dataset.index == idx);
        if (existing) return;
        
        const tag = document.createElement("div");
        tag.className = `tag-item type-${item.type || "其它"} direction-${item.direction || "无"}`;
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

document.getElementById("addToGenerate").onclick = () => {
    // 检查当前选中的是提示词还是Lora
    if (currentTab === "lora" && loraSelectedIndexes.length > 0) {
        addLoraToGenerator();
    } else if (currentTab === "prompt") {
        addToGenerateAuto();
    }
};
document.getElementById("addToPositive").onclick = () => addToGenerate(true);
document.getElementById("addToNegative").onclick = () => addToGenerate(false);

// ===== LLM 提示词生成器 =====
const modal = document.getElementById("llmGeneratorModal");
const llmGeneratorBtn = document.getElementById("llmGeneratorBtn");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const llmGenerateBtn = document.getElementById("llmGenerateBtn");
const llmCopyBtn = document.getElementById("llmCopyBtn");
const llmInput = document.getElementById("llmInput");
const llmOutput = document.getElementById("llmOutput");

// 打开Modal
llmGeneratorBtn.onclick = () => {
    modal.style.display = "flex";
    llmInput.focus();
};

// 关闭Modal
function closeModal() {
    modal.style.display = "none";
}

modalCloseBtn.onclick = closeModal;

// 点击背景关闭Modal
modal.onclick = (e) => {
    if (e.target === modal) {
        closeModal();
    }
};

// ESC键关闭Modal
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "flex") {
        closeModal();
    }
});


// 生成提示词模板
llmGenerateBtn.onclick = () => {
    const t = translations[currentLang];
    const userDemand = llmInput.value.trim();
    if (!userDemand) {
        alert(t.llm_no_input);
        return;
    }
    
    // 获取生成器中已添加的tags
    const generatorTagIndices = getGeneratorTags();
    
    // 如果生成器中已添加了tag，则只使用这些tag；否则使用所有提示词
    let availablePrompts = "";
    if (generatorTagIndices.size > 0) {
        // 只使用生成器中已添加的tag
        availablePrompts = prompts
            .filter((p, idx) => generatorTagIndices.has(idx))
            .map(p => `- ${p.name} (${p.type}${p.direction !== "无" ? ", " + p.direction : ""}): ${p.text}`)
            .join("\n");
    } else {
        // 使用所有可用的提示词
        availablePrompts = prompts.map(p => `- ${p.name} (${p.type}${p.direction !== "无" ? ", " + p.direction : ""}): ${p.text}`).join("\n");
    }
    
    // 获取生成器中的Lora信息
    const positiveLoraTags = document.getElementById("positiveTags");
    const loraInfo = Array.from(positiveLoraTags.querySelectorAll(".tag-item.type-lora input:checked"))
        .map(cb => {
            const item = loraData[cb.dataset.loraIndex];
            if (item.trigger_words && item.trigger_words.length > 0) {
                return `- ${item.name}: ${item.trigger_words.join(", ")}`;
            }
            return `- ${item.name}`;
        })
        .join("\n");
    
    // 添加Lora信息到提示词
    if (loraInfo) {
        availablePrompts += "\n【已选择的Lora】\n" + loraInfo;
    }
    
    // 从加载的模板生成
    const template = window.llmTemplates[currentLang]
        .replace('${availablePrompts}', availablePrompts)
        .replace('${userDemand}', userDemand);
    
    llmOutput.value = template;
};


// 复制到剪贴板
llmCopyBtn.onclick = () => {
    const t = translations[currentLang];
    if (!llmOutput.value) {
        alert(t.llm_no_content);
        return;
    }
    
    navigator.clipboard.writeText(llmOutput.value).then(() => {
        const originalText = llmCopyBtn.textContent;
        llmCopyBtn.textContent = t.llm_copy_success;
        setTimeout(() => {
            llmCopyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert(t.llm_copy_failed);
    });
};

// ===== Lora库功能 =====

// 加载Lora数据
async function loadLoraData() {
    try {
        console.log("[PromptManage] Starting to load Lora data from:", LORA_API_BASE + "/list");
        const res = await fetch(LORA_API_BASE + "/list", { method: "GET" });
        console.log("[PromptManage] Fetch response status:", res.status, res.statusText);
        
        if (!res.ok) {
            console.error(`[PromptManage] Failed to load lora data: HTTP ${res.status}`);
            const errorText = await res.text();
            console.error("[PromptManage] Response:", errorText);
            return;
        }
        
        const data = await res.json();
        console.log("[PromptManage] Received data:", data);
        
        loraData = data.loras || [];
        loraCategories = data.categories || [];
        
        console.log(`[PromptManage] Loaded ${loraData.length} Loras in ${loraCategories.length} categories:`, loraCategories);
        
        // 更新类别下拉框
        updateLoraCategories();
        
        // 设置默认类别为第一个子目录（如果有多个类别）
        const categorySelect = document.getElementById("loraCategory");
        if (loraCategories.length > 0) {
            // 使用第一个子目录作为默认值
            categorySelect.value = loraCategories[0];
            console.log("[PromptManage] Set default category to:", loraCategories[0]);
        } else {
            // 如果没有子目录，显示全部
            categorySelect.value = "";
            console.log("[PromptManage] No categories found, showing all");
        }
        
        // 渲染Lora列表（使用当前选中的类别）
        renderLoraList(categorySelect.value);
        
        // 恢复之前保存的typeFilter值（如果有的话）
        if (savedTypeFilterValue !== undefined) {
            const typeFilter = document.getElementById("typeFilter");
            if (typeFilter) {
                typeFilter.value = savedTypeFilterValue;
            }
        }
        
        // 标记Lora数据已加载
        loraDataLoaded = true;
    } catch (err) {
        console.error("[PromptManage] Error loading lora data:", err);
        console.error("[PromptManage] Stack:", err.stack);
    }
}

// 更新Lora类别下拉框
function updateLoraCategories() {
    const categorySelect = document.getElementById("loraCategory");
    categorySelect.innerHTML = '<option value="">全部</option>';
    loraCategories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

// 渲染Lora列表
function renderLoraList(category = "") {
    const list = document.getElementById("loraList");
    list.innerHTML = "";
    
    // 根据详细模式更新容器类
    if (loraDetailMode) {
        list.classList.add("detail-mode");
    } else {
        list.classList.remove("detail-mode");
    }
    
    loraData.forEach((item) => {
        // 获取原始索引
        const idx = loraData.indexOf(item);
        // 检查类别筛选
        if (category && item.category !== category) return;
        // 检查搜索（模糊搜索）
        if (loraSearchText) {
            const searchLower = loraSearchText.toLowerCase();
            const matchName = item.name.toLowerCase().includes(searchLower);
            const matchFilename = item.filename.toLowerCase().includes(searchLower);
            const matchBase = item.base_model && item.base_model.toLowerCase().includes(searchLower);
            if (!matchName && !matchFilename && !matchBase) return;
        }
        
        const div = document.createElement("div");
        const viewClass = loraDetailMode ? "detail-view" : "compact-view";
        const isSelected = loraSelectedIndexes.includes(idx);
        div.className = "lora-item " + viewClass + (isSelected ? " selected" : "");
        
        // 创建名称和base_model的容器（两者都显示）
        let nameWithBase = `<div class="lora-name-row"><strong>${item.name}</strong>`;
        if (item.base_model) {
            nameWithBase += `<span class="base-model">${item.base_model}</span>`;
        }
        nameWithBase += `</div>`;
        
        let innerHTML = nameWithBase;
        
        if (loraDetailMode) {
            let textContent = `<div class="text-content">`;
            textContent += nameWithBase;
            textContent += `<small class="filename">${item.filename || ""}</small>`;
            if (item.trigger_words && item.trigger_words.length > 0) {
                textContent += `<small class="trigger-words">触发词: ${item.trigger_words.join(", ")}</small>`;
            }
            if (item.notes) {
                textContent += `<pre>${item.notes.substring(0, 100)}${item.notes.length > 100 ? "..." : ""}</pre>`;
            }
            textContent += `</div>`;
            
            if (item.preview_url) {
                // 检测文件类型
                const url = new URL(item.preview_url, window.location.origin);
                const pathParam = url.searchParams.get('path') || '';
                const fileExt = pathParam.split('.').pop().toLowerCase();
                const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
                
                if (videoExts.includes(fileExt)) {
                    // 视频文件：显示第一帧作为预览
                    innerHTML = `<video src="${item.preview_url}" 
                                alt="${item.name}" muted preload="metadata"></video>` + textContent;
                } else {
                    // 图片文件
                    innerHTML = `<img src="${item.preview_url}" alt="${item.name}">` + textContent;
                }
            } else {
                innerHTML = textContent;
            }
        }
        
        div.innerHTML = innerHTML;
        
        div.onclick = () => {
            // 多选逻辑
            if (loraSelectedIndexes.includes(idx)) {
                loraSelectedIndexes = loraSelectedIndexes.filter(i => i !== idx);
            } else {
                loraSelectedIndexes.push(idx);
            }
            renderLoraList(category);
        };
        list.appendChild(div);
    });
}

// Lora类别变化事件
document.getElementById("loraCategory").addEventListener("change", (e) => {
    // 保存选中的类别
    localStorage.setItem("loraCategory", e.target.value);
    // 只重新渲染列表，不重新加载数据
    renderLoraList(e.target.value);
});

// Lora详细模式切换
document.getElementById("loraDetailToggle").addEventListener("change", (e) => {
    loraDetailMode = e.target.checked;
    localStorage.setItem("loraDetailMode", loraDetailMode);
    renderLoraList(document.getElementById("loraCategory").value);
});

// 初始化Lora详细模式
const savedLoraDetailMode = localStorage.getItem("loraDetailMode");
if (savedLoraDetailMode !== null) {
    loraDetailMode = savedLoraDetailMode === "true";
    document.getElementById("loraDetailToggle").checked = loraDetailMode;
}

// Lora取消选择按钮
document.getElementById("loraDeselectBtn").addEventListener("click", () => {
    loraSelectedIndexes = [];
    renderLoraList(document.getElementById("loraCategory").value);
});

// Lora联网更新按钮 - 现在支持从CivitAI获取模型
document.getElementById("loraRefreshBtn").addEventListener("click", async () => {
    const t = translations[currentLang];
    const btn = document.getElementById("loraRefreshBtn");
    
    // 禁用按钮并显示加载状态
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "⏳ 更新中...";
    
    try {
        // 调用后端API进行更新
        const response = await fetch("/prompt_manage/lora/refresh?mode=all");
        const result = await response.json();
        
        if (result.success) {
            // 更新成功，重新加载Lora数据
            alert(t.lora_refresh_success || result.message);
            await loadLoraData();
            // 恢复之前选中的类别
            const categorySelect = document.getElementById("loraCategory");
            const savedCategory = localStorage.getItem("loraCategory") || "";
            categorySelect.value = savedCategory;
            renderLoraList(savedCategory);
        } else {
            alert(t.lora_refresh_failed || `更新失败: ${result.message}`);
        }
    } catch (err) {
        console.error("[PromptManage] Lora refresh error:", err);
        alert(t.lora_refresh_error || "更新过程中出错，请检查浏览器控制台");
    } finally {
        // 恢复按钮状态
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

// 启用Lora联网更新按钮
const loraRefreshBtn = document.getElementById("loraRefreshBtn");
loraRefreshBtn.disabled = false;
loraRefreshBtn.style.opacity = "1";
loraRefreshBtn.style.cursor = "pointer";

// Lora搜索框事件
document.getElementById("loraSearchInput").addEventListener("input", (e) => {
    loraSearchText = e.target.value;
    const category = document.getElementById("loraCategory").value;
    renderLoraList(category);
});
loraRefreshBtn.title = "从CivitAI更新Lora模型的metadata和预览图像";

// 添加Lora到生成器
function addLoraToGenerator() {
    const t = translations[currentLang];
    if (loraSelectedIndexes.length === 0) return alert(t.alert_select);
    
    loraSelectedIndexes.forEach(idx => {
        const item = loraData[idx];
        const tagsDiv = document.getElementById("positiveTags");
        
        // 检查是否已经添加
        const existing = Array.from(tagsDiv.querySelectorAll(".tag-item")).find(tag => 
            tag.dataset.loraIndex == idx
        );
        if (existing) return;
        
        const tag = document.createElement("div");
        tag.className = "tag-item type-lora";
        tag.dataset.loraIndex = idx;
        
        let triggerWords = "";
        if (item.trigger_words && item.trigger_words.length > 0) {
            triggerWords = item.trigger_words[0];
        }
        
        tag.innerHTML = `
            <input type="checkbox" checked data-lora-index="${idx}">
            <span>${item.name}${triggerWords ? " (" + triggerWords + ")" : ""}</span>
            <button class="del-tag">×</button>
        `;
        
        tag.querySelector("input").onchange = () => updateLoraText();
        tag.querySelector(".del-tag").onclick = () => {
            tag.remove();
            updateLoraText();
        };
        
        tagsDiv.appendChild(tag);
    });
    
    updateLoraText();
}

// 更新包含Lora信息的文本
function updateLoraText() {
    const textArea = document.getElementById("positiveText");
    const positiveTags = document.getElementById("positiveTags");
    
    // 获取所有标签（按DOM顺序，保持添加顺序）
    const allTags = Array.from(positiveTags.querySelectorAll(".tag-item"));
    
    let textParts = [];
    
    allTags.forEach(tag => {
        const checkbox = tag.querySelector("input:checked");
        if (!checkbox) return;
        
        if (tag.classList.contains("type-lora")) {
            // 这是一个Lora标签
            const loraIndex = checkbox.dataset.loraIndex;
            const item = loraData[loraIndex];
            if (item.trigger_words && item.trigger_words.length > 0) {
                textParts.push(item.trigger_words.join(", "));
            }
        } else {
            // 这是一个提示词标签
            const promptIndex = checkbox.dataset.index;
            const item = prompts[promptIndex];
            if (item && item.text) {
                textParts.push(item.text);
            }
        }
    });
    
    // 拼接所有部分，每个部分之间用换行分隔，最后以逗号结尾
    let text = "";
    if (textParts.length > 0) {
        text = textParts.join(",\n") + ",";
    }
    
    textArea.value = text;
}
