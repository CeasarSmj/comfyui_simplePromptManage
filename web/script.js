// ===== 国际化翻译 =====
const translations = {
    zh: {
        title: "✨ Prompt 管理系统",
        subtitle: "优雅地管理和生成 AI 提示词",
        library: "📚 提示词库",
        search_placeholder: "🔍 搜索提示词...",
        type_filter: "类型筛选",
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
        add_negative: "➖ 加入负向 (N)",
        add_auto: "➕ 加入",
        llm_generator_btn: "🤖 LLM提示词生成",
        llm_title: "🤖 LLM 大模型提示词生成器",
        llm_input_label: "需求输入（自然语言）:",
        llm_output_label: "生成的提示词模板:",
        llm_input_placeholder: "例如：一个穿着红色连衣裙的女性，微笑，在花园里，阳光照耀，柔和光线...",
        llm_generate_btn: "⚡ 生成",
        llm_copy_btn: "📋 复制",
        llm_copy_success: "✓ 已复制",
        llm_no_input: "请输入需求说明",
        llm_no_content: "没有内容可复制，请先点击生成",
        llm_copy_failed: "复制失败，请手动复制",
        llm_task_title: "【任务说明】",
        llm_task_desc: "你是一个 Stable Diffusion 提示词生成专家。请根据以下规则生成高质量的 AI 绘画提示词：",
        llm_rules_title: "生成规则：",
        llm_rule_1: "1. 使用简短的英文短语，避免冗长句子",
        llm_rule_2: "2. 用逗号分隔多个元素",
        llm_rule_3: "3. 按以下顺序组织提示词：质量 > 人物/物体 > 着装 > 动作 > 环境 > 画风 > 其他细节",
        llm_rule_4: "4. 优先使用质量相关的词汇（如 \"masterpiece\", \"best quality\", \"highly detailed\"）",
        llm_rule_5: "5. 为每个重要特征提供多个同义词选项",
        llm_rule_6: "6. 避免使用中文，全部使用英文",
        llm_rule_7: "7. 正向提示词应该说明想要的内容",
        llm_rule_8: "8. 负向提示词应该列举要避免的内容",
        llm_format_title: "【输出格式】",
        llm_format_desc: "请以以下格式输出：",
        llm_positive_label: "正向提示词：",
        llm_negative_label: "负向提示词：",
        llm_available_title: "【可用的提示词模板（可选使用）】",
        llm_demand_title: "【用户需求】",
        search_mode_label: "搜索模式：",
        no_filter: "无筛选",
        direction_label: "方向：",
        direction_none: "无",
        direction_positive: "正向",
        direction_negative: "反向",
        type_label: "类型：",
        quality: "质量",
        style: "风格",
        texture: "质感",
        environment: "环境",
        action: "动作",
        expression: "表情",
        clothing: "着装",
        other: "其它",
        detail_toggle: "显示细节",
        light_mode: "☀️ 白天",
        dark_mode: "🌙 黑夜",
        usage_video_btn: "📹 使用方法",
        usage_video_title: "📹 使用方法教程"
    },
    en: {
        title: "✨ Prompt Manager",
        subtitle: "Elegant AI prompt management and generation",
        library: "📚 Prompt Library",
        search_placeholder: "🔍 Search prompts...",
        type_filter: "Type Filter",
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
        add_negative: "➖ Add Negative (N)",
        add_auto: "➕ Add",
        llm_generator_btn: "🤖 LLM Prompt Generator",
        llm_title: "🤖 LLM Prompt Generator",
        llm_input_label: "Input Your Demand (Natural Language):",
        llm_output_label: "Generated Prompt Template:",
        llm_input_placeholder: "Example: A smiling woman in a red dress in a garden with warm sunlight and soft lighting...",
        llm_generate_btn: "⚡ Generate",
        llm_copy_btn: "📋 Copy",
        llm_copy_success: "✓ Copied",
        llm_no_input: "Please enter your demand",
        llm_no_content: "No content to copy. Please click Generate first",
        llm_copy_failed: "Copy failed. Please copy manually",
        llm_task_title: "【Task Description】",
        llm_task_desc: "You are a Stable Diffusion prompt generation expert. Please generate high-quality AI art prompts according to the following rules:",
        llm_rules_title: "Generation Rules:",
        llm_rule_1: "1. Use short English phrases, avoid long sentences",
        llm_rule_2: "2. Separate multiple elements with commas",
        llm_rule_3: "3. Organize prompts in order: Quality > Character/Object > Clothing > Action > Environment > Art Style > Other Details",
        llm_rule_4: "4. Prioritize quality-related vocabulary (e.g., \"masterpiece\", \"best quality\", \"highly detailed\")",
        llm_rule_5: "5. Provide multiple synonyms for each important feature",
        llm_rule_6: "6. Avoid Chinese text, use English only",
        llm_rule_7: "7. Positive prompts should describe what you want",
        llm_rule_8: "8. Negative prompts should list what to avoid",
        llm_format_title: "【Output Format】",
        llm_format_desc: "Please output in the following format:",
        llm_positive_label: "Positive Prompt:",
        llm_negative_label: "Negative Prompt:",
        llm_available_title: "【Available Prompt Templates (Optional)】",
        llm_demand_title: "【User Demand】",
        search_mode_label: "Search Mode:",
        no_filter: "No Filter",
        direction_label: "Direction:",
        direction_none: "None",
        direction_positive: "Positive",
        direction_negative: "Negative",
        type_label: "Type:",
        quality: "Quality",
        style: "Style",
        texture: "Texture",
        environment: "Environment",
        action: "Action",
        expression: "Expression",
        clothing: "Clothing",
        other: "Other",
        detail_toggle: "Show Details",
        light_mode: "☀️ Light",
        dark_mode: "🌙 Dark",
        usage_video_btn: "📹 Usage Video",
        usage_video_title: "📹 Usage Video Tutorial"
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
        typeFilter.options[8].textContent = t.other;
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
    // 更新视频按钮和标题
    document.getElementById("videoBtn").textContent = t.usage_video_btn;
    document.getElementById("videoModalTitle").textContent = t.usage_video_title;    
    // 更新 LLM 生成器
    document.getElementById("llmGeneratorBtn").textContent = t.llm_generator_btn;
    document.getElementById("llmModalTitle").textContent = t.llm_title;
    document.getElementById("llmInputLabel").textContent = t.llm_input_label;
    document.getElementById("llmOutputLabel").textContent = t.llm_output_label;
    document.getElementById("llmInput").placeholder = t.llm_input_placeholder;
    document.getElementById("llmGenerateBtn").textContent = t.llm_generate_btn;
    document.getElementById("llmCopyBtn").textContent = t.llm_copy_btn;
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

document.getElementById("addToGenerate").onclick = () => addToGenerateAuto();
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
    
    // 获取可用的提示词
    const availablePrompts = prompts.map(p => `- ${p.name} (${p.type}${p.direction !== "无" ? ", " + p.direction : ""}): ${p.text}`).join("\n");
    
    // 生成模板
    let template;
    if (currentLang === "zh") {
        template = `【任务说明】
你是一个 Stable Diffusion 提示词生成专家。请根据以下规则生成高质量的 AI 绘画提示词：

生成规则：
1. 使用简短的英文短语，避免冗长句子
2. 用逗号分隔多个元素
3. 按以下顺序组织提示词：质量 > 人物/物体 > 着装 > 动作 > 环境 > 画风 > 其他细节
4. 优先使用质量相关的词汇（如 "masterpiece", "best quality", "highly detailed"）
5. 为每个重要特征提供多个同义词选项
6. 避免使用中文，全部使用英文
7. 正向提示词应该说明想要的内容
8. 负向提示词应该列举要避免的内容

【输出格式】
请以以下格式输出：

正向提示词：
[你生成的正向提示词]

负向提示词：
[你生成的负向提示词]

【可用的提示词模板（可选使用）】
${availablePrompts}

【用户需求】
${userDemand}

请根据上述需求生成完整的提示词组合。`;
    } else {
        template = `${t.llm_task_title}
${t.llm_task_desc}

${t.llm_rules_title}
${t.llm_rule_1}
${t.llm_rule_2}
${t.llm_rule_3}
${t.llm_rule_4}
${t.llm_rule_5}
${t.llm_rule_6}
${t.llm_rule_7}
${t.llm_rule_8}

${t.llm_format_title}
${t.llm_format_desc}

${t.llm_positive_label}
[Your generated positive prompt]

${t.llm_negative_label}
[Your generated negative prompt]

${t.llm_available_title}
${availablePrompts}

${t.llm_demand_title}
${userDemand}

Please generate a complete prompt combination based on the above requirements.`;
    }
    
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

// ===== 视频播放器功能 =====
const videoPlayerModal = document.getElementById("videoPlayerModal");
const videoBtn = document.getElementById("videoBtn");
const videoCloseBtn = document.getElementById("videoCloseBtn");
const videoPlayer = document.getElementById("videoPlayer");
const videoModalContent = document.querySelector(".video-modal-content");

console.log("Video Button:", videoBtn);
console.log("Video Modal:", videoPlayerModal);

// 打开视频播放器
if (videoBtn) {
    videoBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Opening video modal");
        videoPlayerModal.classList.remove("hidden");
        setTimeout(() => {
            if (videoPlayer) videoPlayer.play();
        }, 100);
    });
}

// 关闭视频播放器
if (videoCloseBtn) {
    videoCloseBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Closing video modal via button");
        videoPlayerModal.classList.add("hidden");
        if (videoPlayer) videoPlayer.pause();
    });
}

// 点击模态框背景关闭视频播放器
if (videoPlayerModal) {
    videoPlayerModal.addEventListener("click", function(e) {
        if (e.target === videoPlayerModal) {
            console.log("Closing video modal via background");
            videoPlayerModal.classList.add("hidden");
            if (videoPlayer) videoPlayer.pause();
        }
    });
}

// 阻止模态框内容的点击事件冒泡
if (videoModalContent) {
    videoModalContent.addEventListener("click", function(e) {
        e.stopPropagation();
    });
}

// ESC键关闭视频播放器
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && videoPlayerModal && !videoPlayerModal.classList.contains("hidden")) {
        console.log("Closing video modal via ESC");
        videoPlayerModal.classList.add("hidden");
        if (videoPlayer) videoPlayer.pause();
    }
});

// 初始化应用
initializeApp();
loadPrompts();