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

// 提示词参考变量
let referenceData = [];
let referenceCategories = [];
let referenceSearchText = "";
let referenceDataLoaded = false;
let currentRightTab = "generator";
let referenceSelectedIndexes = [];  // 保存提示词参考的选择状态
// 分页加载相关变量
let referencePageSize = 100;  // 每次加载100张
let referenceCurrentPage = 0;  // 当前页码
let referenceTotalCount = 0;  // 总数量
let referenceHasMore = true;  // 是否还有更多数据
let referenceLoadingMore = false;  // 是否正在加载更多
let referenceLoadedItemsCount = 0;  // 已加载的项目数量


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
    // 恢复之前的右侧选项卡状态（必须在翻译加载完成后执行）
    restoreRightTabState();
    // 恢复之前的选项卡状态
    restoreLeftTabState();
}).catch(err => {
    console.error('Failed to load configuration files:', err);
    // 加载失败时，提供默认的中文翻译，避免UI显示undefined
    translations = {
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
            llm_generator_btn: "🤖 LLM生成",
            // prompt_reader_btn 使用固定文本，不需要翻译
            // prompt_reader_btn: "🖼️ Lora示例查看",
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
            composition: "构图",
            other: "其它",
            detail_toggle: "显示细节",
            deselect_btn: "✕ 取消选择",
            clear_generator_btn: "🗑️ 全部清空",
            light_mode: "☀️ 白天",
            dark_mode: "🌙 黑夜",
            prompt_library_tab: "📚 提示词库",
            lora_library_tab: "🎨 Lora库",
            lora_category_all: "全部",
            lora_category_label: "类别：",
            lora_detail_toggle: "显示细节",
            llm_generator_info: "💡 说明：生成器部分的提示词和选中的 Lora 都会被加入到 LLM 的提示词中，确保生成的内容与当前选择保持一致。",
            llm_usage_title: "📝 使用说明：",
            llm_usage_step_1: "将上面生成的提示词模板复制",
            llm_usage_step_2: "放入任何一个 LLM 大模型（如 ChatGPT、Claude、deepseek等）",
            llm_usage_step_3: "大模型会根据你的需求生成优化后的 Stable Diffusion 提示词",
            reference_tab: "💡 提示词参考",
            search_reference_placeholder: "🔍 搜索提示词参考...",
            reference_category_all: "全部类别",
            reference_category_label: "类别：",
            download_examples_btn: "📥 下载示例图",
            upload_images_btn: "📤 上传图像",
            upload_images_title: "上传图像",
            upload_images_confirm: "确认上传",
            upload_images_confirm_multiple: "确认上传 {count} 个文件？",
            upload_images_cancel: "取消",
            upload_images_select_files: "选择图像文件（可多选）",
            upload_images_success: "上传成功",
            upload_images_failed: "上传失败",
            upload_images_processing: "正在处理...",
            upload_images_no_files: "请选择至少一个图像文件",
            download_cancelled: "下载已取消",
            download_error: "下载过程中出错",
            copy_prompt: "复制提示词",
            downloading: "下载中",
            scanning: "扫描中",
            success: "成功",
            failed: "失败",
            skipped: "跳过",
            trigger_words_label: "触发词: ",
            load_failed: "加载失败",
            direction_item_label: "方向: ",
            type_item_label: "类型: "
        }
    };
    window.llmTemplates = {};
    console.warn('[PromptManage] Using fallback translations due to load failure');
    // 初始化应用
    initializeApp();
    loadPrompts();
    // 恢复之前的右侧选项卡状态（必须在翻译加载完成后执行）
    restoreRightTabState();
    // 恢复之前的选项卡状态
    restoreLeftTabState();
});

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
    console.log('[PromptManage] updateUI called, lang:', currentLang, 'translations:', t);

    // 如果翻译数据未加载,则不更新UI
    if (!t) {
        console.warn('[PromptManage] Translations not loaded yet, skipping UI update');
        return;
    }

    // 更新 header
    document.querySelector(".header-main h1").textContent = t.title;
    document.querySelector(".header-main p").textContent = t.subtitle;

    // 更新左侧面板
    const generatorTitle = document.getElementById("generatorTitle");
    if (generatorTitle) {
        generatorTitle.textContent = t.generator;
    }

    const positiveTitle = document.getElementById("positiveTitle");
    if (positiveTitle) {
        positiveTitle.textContent = t.positive;
    }

    const negativeTitle = document.getElementById("negativeTitle");
    if (negativeTitle) {
        negativeTitle.textContent = t.negative;
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.placeholder = t.search_placeholder;
    }

    const options = document.getElementById("searchMode")?.querySelectorAll("option");
    if (options && options.length >= 2) {
        options[0].textContent = t.fuzzy;
        options[1].textContent = t.exact;
    }

    const addFormTitle = document.querySelector(".add-form h3");
    if (addFormTitle) {
        addFormTitle.textContent = t.add_title;
    }

    const newName = document.getElementById("newName");
    if (newName) {
        newName.placeholder = t.name_placeholder;
    }

    const newNote = document.getElementById("newNote");
    if (newNote) {
        newNote.placeholder = t.note_placeholder;
    }

    const newText = document.getElementById("newText");
    if (newText) {
        newText.placeholder = t.text_placeholder;
    }

    const addBtn = document.getElementById("addBtn");
    if (addBtn) {
        addBtn.textContent = t.add_btn;
    }

    const confirmEditBtn = document.getElementById("confirmEditBtn");
    if (confirmEditBtn) {
        confirmEditBtn.textContent = t.confirm_edit_btn;
    }

    const editBtn = document.getElementById("editBtn");
    if (editBtn) {
        editBtn.textContent = t.edit_btn;
    }

    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
        deleteBtn.textContent = t.delete_btn;
    }

    const deselectBtn = document.getElementById("deselectBtn");
    if (deselectBtn) {
        deselectBtn.textContent = t.deselect_btn;
    }

    const clearGeneratorBtn = document.getElementById("clearGeneratorBtn");
    if (clearGeneratorBtn) {
        clearGeneratorBtn.textContent = t.clear_generator_btn;
    }

    const cancelEditBtn = document.getElementById("cancelEditBtn");
    if (cancelEditBtn) {
        cancelEditBtn.textContent = t.cancel_edit_btn;
    }

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

    // 更新左侧选项卡
    const promptTabBtn = document.getElementById("promptTabBtn");
    const loraTabBtn = document.getElementById("loraTabBtn");
    if (promptTabBtn) {
        promptTabBtn.textContent = t.prompt_library_tab;
    }
    if (loraTabBtn) {
        loraTabBtn.textContent = t.lora_library_tab;
    }

    // 更新Lora库元素
    const loraSearchInput = document.getElementById("loraSearchInput");
    if (loraSearchInput) {
        loraSearchInput.placeholder = "🔍 " + t.search_placeholder.replace("提示词", "Lora");
    }

    const loraDeselectBtn = document.getElementById("loraDeselectBtn");
    if (loraDeselectBtn) {
        loraDeselectBtn.textContent = "✕ " + t.deselect_btn;
    }

    const loraDetailLabel = document.querySelector("#loraDetailToggle + span");
    if (loraDetailLabel) {
        loraDetailLabel.textContent = t.lora_detail_toggle;
    }

    // 更新右侧选项卡
    const generatorTabBtn = document.getElementById("generatorTabBtn");
    const referenceTabBtn = document.getElementById("referenceTabBtn");
    if (generatorTabBtn) {
        generatorTabBtn.textContent = t.generator;
    }
    if (referenceTabBtn) {
        referenceTabBtn.textContent = t.reference_tab;
    }

    // 更新LLM按钮
    const llmGeneratorBtn = document.getElementById("llmGeneratorBtn");
    if (llmGeneratorBtn) {
        llmGeneratorBtn.textContent = t.llm_generator_btn;
    }

    // 更新按钮文本
    const promptReaderBtn = document.getElementById("promptReaderBtn");
    if (promptReaderBtn) {
        promptReaderBtn.textContent = t.prompt_reader_btn;
    }

    const downloadLoraImagesBtn = document.getElementById("downloadLoraImagesBtn");
    if (downloadLoraImagesBtn) {
        downloadLoraImagesBtn.textContent = t.download_lora_btn;
    }

    // 更新提示词参考面板
    const referenceSearchInput = document.getElementById("referenceSearchInput");
    if (referenceSearchInput) {
        referenceSearchInput.placeholder = t.search_reference_placeholder;
    }

    // 更新生成器面板的标题
    const positiveText = document.getElementById("positiveText");
    const negativeText = document.getElementById("negativeText");
    if (positiveText) {
        positiveText.placeholder = t.positive_placeholder;
    }
    if (negativeText) {
        negativeText.placeholder = t.negative_placeholder;
    }

    // 更新按钮文本
    const addToGenerate = document.getElementById("addToGenerate");
    const addToPositive = document.getElementById("addToPositive");
    const addToNegative = document.getElementById("addToNegative");
    if (addToGenerate) {
        addToGenerate.textContent = t.add_auto;
    }
    if (addToPositive) {
        addToPositive.textContent = t.add_positive;
    }
    if (addToNegative) {
        addToNegative.textContent = t.add_negative;
    }

    // 更新 LLM 生成器
    const llmGeneratorBtnEl = document.getElementById("llmGeneratorBtn");
    const llmModalTitle = document.getElementById("llmModalTitle");
    const llmInputLabel = document.getElementById("llmInputLabel");
    const llmOutputLabel = document.getElementById("llmOutputLabel");
    const llmInput = document.getElementById("llmInput");
    const llmGenerateBtn = document.getElementById("llmGenerateBtn");
    const llmCopyBtn = document.getElementById("llmCopyBtn");

    if (llmGeneratorBtnEl) {
        llmGeneratorBtnEl.textContent = t.llm_generator_btn;
    }
    const promptReaderBtnEl = document.getElementById("promptReaderBtn");
    if (promptReaderBtnEl) {
        promptReaderBtnEl.textContent = t.prompt_reader_btn;
    }
    if (downloadLoraImagesBtn) {
        downloadLoraImagesBtn.textContent = t.download_lora_btn;
    }
    if (llmModalTitle) {
        llmModalTitle.textContent = t.llm_title;
    }
    if (llmInputLabel) {
        llmInputLabel.textContent = t.llm_input_label;
    }
    if (llmOutputLabel) {
        llmOutputLabel.textContent = t.llm_output_label;
    }
    if (llmInput) {
        llmInput.placeholder = t.llm_input_placeholder;
    }
    if (llmGenerateBtn) {
        llmGenerateBtn.textContent = t.llm_generate_btn;
    }
    if (llmCopyBtn) {
        llmCopyBtn.textContent = t.llm_copy_btn;
    }

    // 更新 LLM 说明文本
    const llmGeneratorInfo = document.getElementById("llmGeneratorInfo");
    const llmUsageTitle = document.getElementById("llmUsageTitle");
    const llmUsageStep1 = document.getElementById("llmUsageStep1");
    const llmUsageStep2 = document.getElementById("llmUsageStep2");
    const llmUsageStep3 = document.getElementById("llmUsageStep3");

    if (llmGeneratorInfo) {
        llmGeneratorInfo.textContent = t.llm_generator_info;
    }
    if (llmUsageTitle) {
        llmUsageTitle.textContent = t.llm_usage_title;
    }
    if (llmUsageStep1) {
        llmUsageStep1.textContent = t.llm_usage_step_1;
    }
    if (llmUsageStep2) {
        llmUsageStep2.textContent = t.llm_usage_step_2;
    }
    if (llmUsageStep3) {
        llmUsageStep3.textContent = t.llm_usage_step_3;
    }

    // 更新Lora库控制按钮
    if (loraDeselectBtn) {
        loraDeselectBtn.textContent = t.deselect_btn;
    }

    const loraDetailLabelSection = document.querySelectorAll(".lora-section .detail-checkbox span")[0];
    if (loraDetailLabelSection) {
        loraDetailLabelSection.textContent = t.detail_toggle;
    }

    // 下载示例图和上传图像按钮使用固定图标，不需要翻译

    // 更新提示词参考面板的类别下拉框
    if (referenceCategory) {
        const currentCategory = referenceCategory.value;
        updateReferenceCategories();
        referenceCategory.value = currentCategory;
    }

    // 更新提示词参考面板的取消选择按钮
    const referenceDeselectBtn = document.getElementById("referenceDeselectBtn");
    if (referenceDeselectBtn) {
        referenceDeselectBtn.textContent = t.reference_deselect_btn || "✕ 取消选择";
    }

    // 重新渲染提示词参考列表以更新语言相关的文本
    if (referenceDataLoaded) {
        renderReferenceList(referenceCategory.value);
    }
}



// 确保页面加载完成后执行必要的初始化
document.addEventListener('DOMContentLoaded', function () {
    // 检查并初始化参考面板
    if (!referenceDataLoaded && currentRightTab === 'reference') {
        loadReferenceData();
    }
});


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
        // 进入Lora选项卡时，只有在数据未加载时才加载Lora数据
        if (!loraDataLoaded) {
            loadLoraData();
        }
    }
}


// 选项卡按钮点击事件
promptTabBtn.addEventListener("click", () => switchTab("prompt"));
loraTabBtn.addEventListener("click", () => switchTab("lora"));

// ===== 右侧选项卡切换逻辑 =====
const generatorTabBtn = document.getElementById("generatorTabBtn");
const referenceTabBtn = document.getElementById("referenceTabBtn");
const generatorPanel = document.getElementById("generatorPanel");
const referencePanel = document.getElementById("referencePanel");

function switchRightTab(tab) {
    currentRightTab = tab;
    if (tab === "generator") {
        generatorTabBtn.classList.add("active");
        referenceTabBtn.classList.remove("active");
        generatorPanel.style.display = "flex";
        referencePanel.style.display = "none";
        localStorage.setItem("promptActiveRightTab", "generator");
    } else if (tab === "reference") {
        generatorTabBtn.classList.remove("active");
        referenceTabBtn.classList.add("active");
        generatorPanel.style.display = "none";
        referencePanel.style.display = "flex";
        localStorage.setItem("promptActiveRightTab", "reference");
        // 进入提示词参考选项卡时，只有在数据未加载时才加载数据
        if (!referenceDataLoaded) {
            loadReferenceData();
        }
    }
}

// 右侧选项卡按钮点击事件
generatorTabBtn.addEventListener("click", () => switchRightTab("generator"));
referenceTabBtn.addEventListener("click", () => switchRightTab("reference"));

// 恢复之前的右侧选项卡状态（必须在翻译加载完成后调用）
function restoreRightTabState() {
    const activeRightTab = localStorage.getItem("promptActiveRightTab") || "generator";
    if (activeRightTab === "reference") {
        currentRightTab = "reference";
        generatorTabBtn.classList.remove("active");
        referenceTabBtn.classList.add("active");
        generatorPanel.style.display = "none";
        referencePanel.style.display = "flex";

        if (!referenceDataLoaded) {
            loadReferenceData();
        }
    }
}

// 恢复之前的选项卡状态（必须在翻译加载完成后调用）
function restoreLeftTabState() {
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
            const t = translations[currentLang];
            div.innerHTML = `<strong>${item.name}</strong><br><small>${t.direction_item_label}${directionText} | ${t.type_item_label}${itemType}</small><small>${item.note || ""}</small><pre>${item.text.substring(0, 100)}${item.text.length > 100 ? "..." : ""}</pre>`;
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, direction, type, note, text })
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: editingIndex, name, direction, type, note, text })
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index: idx })
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

// ===== Prompt Reader 按钮 =====
const promptReaderBtn = document.getElementById("promptReaderBtn");
if (promptReaderBtn) {
    promptReaderBtn.onclick = async () => {
        try {
            // 调用后端 API 启动 prompt_reader 服务器
            const response = await fetch(`${API_BASE}/start_prompt_reader`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // 在新标签页中打开 prompt_reader 网页
                window.open(data.url, '_blank');
            } else {
                console.error('Failed to start prompt reader:', response.statusText);
                alert('启动 Prompt Reader 失败，请检查控制台');
            }
        } catch (error) {
            console.error('Error starting prompt reader:', error);
            alert('启动 Prompt Reader 时出错: ' + error.message);
        }
    };
}

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
llmGenerateBtn.onclick = async () => {
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

    // 获取右侧提示词参考中选中的示例
    let referenceExamples = "";
    if (referenceSelectedIndexes.length > 0) {
        try {
            // 从后端获取选中的提示词参考数据
            const params = new URLSearchParams();
            referenceSelectedIndexes.forEach(id => params.append("ids", id));
            const res = await fetch(`${API_BASE}/reference/get_by_ids?${params.toString()}`, { method: "GET" });
            if (res.ok) {
                const data = await res.json();
                const examples = data.references || [];
                if (examples.length > 0) {
                    referenceExamples = examples.map(item =>
                        `- ${item.lora_name} (${item.category || "unknown"}):\n  Positive: ${item.prompt}${item.negative_prompt ? `\n  Negative: ${item.negative_prompt}` : ""}`
                    ).join("\n\n");
                }
            }
        } catch (err) {
            console.error("[PromptManage] Error fetching reference examples:", err);
        }
    }

    // 从加载的模板生成
    const template = window.llmTemplates[currentLang]
        .replace('${availablePrompts}', availablePrompts)
        .replace('${referenceExamples}', referenceExamples)
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

        // 启用 CivitAI更新按钮
        const loraRefreshBtn = document.getElementById("loraRefreshBtn");
        if (loraRefreshBtn) {
            loraRefreshBtn.disabled = false;
            loraRefreshBtn.style.opacity = "1";
            loraRefreshBtn.style.cursor = "pointer";
            console.log("[PromptManage] Lora refresh button enabled");
        }
    } catch (err) {
        console.error("[PromptManage] Error loading lora data:", err);
        console.error("[PromptManage] Stack:", err.stack);
    }
}

// 更新Lora类别下拉框
function updateLoraCategories() {
    const t = translations[currentLang];
    const categorySelect = document.getElementById("loraCategory");
    categorySelect.innerHTML = `<option value="">${t.lora_category_all}</option>`;
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
            const t = translations[currentLang] || {};
            const triggerWordsLabel = t.trigger_words_label || "触发词: ";
            let textContent = `<div class="text-content">`;
            textContent += nameWithBase;
            textContent += `<small class="filename">${item.filename || ""}</small>`;
            if (item.trigger_words && item.trigger_words.length > 0) {
                textContent += `<small class="trigger-words">${triggerWordsLabel}${item.trigger_words.join(", ")}</small>`;
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
            triggerWords = item.trigger_words.join(", ");
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

// ===== 提示词参考功能 =====

// 加载提示词参考数据（只加载类别列表）
async function loadReferenceData() {
    try {
        console.log("[PromptManage] Starting to load reference categories from:", API_BASE + "/reference/list");

        // 先获取类别列表（offset=0, limit=0 只返回类别和数据哈希）
        const params = new URLSearchParams();
        params.append("offset", "0");
        params.append("limit", "0");

        const res = await fetch(`${API_BASE}/reference/list?${params.toString()}`, { method: "GET" });
        console.log("[PromptManage] Fetch response status:", res.status, res.statusText);

        if (!res.ok) {
            console.error(`[PromptManage] Failed to load reference data: HTTP ${res.status}`);
            const errorText = await res.text();
            console.error("[PromptManage] Response:", errorText);
            return;
        }

        const data = await res.json();
        console.log("[PromptManage] Received reference data:", data);

        referenceCategories = data.categories || [];

        console.log(`[PromptManage] Loaded ${referenceCategories.length} categories:`, referenceCategories);

        // 标记类别已加载
        referenceDataLoaded = true;

        // 恢复选中状态
        restoreReferenceSelectedIndexes();

        // 直接更新UI，不等待翻译加载
        updateReferenceCategories();

        // 设置默认类别为 selected（如果存在）
        const categorySelect = document.getElementById("referenceCategory");
        if (referenceCategories.length > 0) {
            // 优先使用 selected 作为默认类别
            if (referenceCategories.includes("selected")) {
                categorySelect.value = "selected";
                console.log("[PromptManage] Set default category to: selected");
            } else {
                // 如果没有 selected，使用第一个类别
                categorySelect.value = referenceCategories[0];
                console.log("[PromptManage] Set default category to:", referenceCategories[0]);
            }
            // 初始化第一页数据
            initReferencePagination(categorySelect.value);
        } else {
            // 如果没有类别，显示空状态
            categorySelect.value = "";
            initReferencePagination("");
        }

        // 更新取消选择按钮的显示状态
        updateReferenceDeselectButton();
    } catch (err) {
        console.error("[PromptManage] Error loading reference data:", err);
        console.error("[PromptManage] Stack:", err.stack);
    }
}

// 更新参考类别下拉框
function updateReferenceCategories() {
    const t = translations[currentLang] || {};
    const categorySelect = document.getElementById("referenceCategory");
    if (!categorySelect) return;

    const allCategoriesText = t.reference_category_all || "全部类别";
    categorySelect.innerHTML = `<option value="">${allCategoriesText}</option>`;

    // 只有在 referenceCategories 有数据时才添加类别选项
    if (referenceCategories && referenceCategories.length > 0) {
        referenceCategories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    }
}

// 保存提示词参考的选中状态到 localStorage
function saveReferenceSelectedIndexes() {
    localStorage.setItem("referenceSelectedIndexes", JSON.stringify(referenceSelectedIndexes));
}

// 从 localStorage 恢复提示词参考的选中状态
function restoreReferenceSelectedIndexes() {
    const saved = localStorage.getItem("referenceSelectedIndexes");
    if (saved) {
        try {
            referenceSelectedIndexes = JSON.parse(saved);
        } catch (e) {
            console.error("[PromptManage] Failed to parse referenceSelectedIndexes:", e);
            referenceSelectedIndexes = [];
        }
    }
}

// 更新取消选择按钮的显示状态
function updateReferenceDeselectButton() {
    const deselectBtn = document.getElementById("referenceDeselectBtn");
    if (deselectBtn) {
        deselectBtn.style.display = referenceSelectedIndexes.length > 0 ? "inline-block" : "none";
    }
}

// 初始化参考列表分页
function initReferencePagination(category = "") {
    // 重置页码、总数量和已加载项目计数
    referenceCurrentPage = 0;
    referenceTotalCount = 0;
    referenceLoadedItemsCount = 0;
    referenceHasMore = true;

    // 清空列表
    const list = document.getElementById("referenceList");
    list.innerHTML = "";

    // 加载第一页数据
    loadMoreReferenceItems(category);
}

// 加载更多参考项
async function loadMoreReferenceItems(category = "") {
    if (referenceLoadingMore) return;
    if (!referenceHasMore) return;

    referenceLoadingMore = true;

    const categorySelect = document.getElementById("referenceCategory");
    const currentCategory = category || categorySelect.value;

    // 构建API参数
    const params = new URLSearchParams();
    if (currentCategory) {
        params.append("category", currentCategory);
    }
    if (referenceSearchText) {
        params.append("search", referenceSearchText);
    }
    params.append("offset", referenceLoadedItemsCount);
    params.append("limit", referencePageSize);

    try {
        console.log("[PromptManage] Loading reference items with params:", params.toString());
        const res = await fetch(`${API_BASE}/reference/list?${params.toString()}`, { method: "GET" });
        const data = await res.json();

        if (!res.ok) {
            console.error(`[PromptManage] Failed to load reference items: HTTP ${res.status}`);
            return;
        }

        console.log("[PromptManage] Received reference items:", data);

        // 更新总数量和加载状态
        if (referenceLoadedItemsCount === 0) {
            referenceTotalCount = data.total || 0;
        }
        referenceHasMore = data.has_more || false;

        // 渲染新加载的项目
        const list = document.getElementById("referenceList");
        const items = data.references || [];

        for (const item of items) {
            const div = document.createElement("div");
            // 检查是否已选中
            const isSelected = referenceSelectedIndexes.includes(item.id);
            div.className = "reference-item" + (isSelected ? " selected" : "");

            // 创建名称和类别的容器
            let nameWithCategory = `<div class="lora-name-row"><strong>${item.lora_name}</strong>`;
            if (item.category) {
                nameWithCategory += `<span class="lora-category">${item.category}</span>`;
            }
            nameWithCategory += `</div>`;

            // 统一布局：左侧图片，右侧文字
            let innerHTML = "";

            // 图片部分
            if (item.image_url) {
                const t = translations[currentLang] || {};
                const loadFailedText = encodeURIComponent(t.load_failed || "加载失败");
                innerHTML += `<img src="${item.image_url}" alt="${item.lora_name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22180%22%3E%3Crect fill=%22%23ccc%22 width=%22180%22 height=%22180%22/%3E%3Ctext fill=%22%23666%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${loadFailedText}%3C/text%3E%3C/svg%3E'">`;
            }

            // 文字内容部分
            innerHTML += `<div class="text-content">`;
            innerHTML += nameWithCategory;
            innerHTML += `<textarea class="prompt-textarea" readonly>${item.prompt}</textarea>`;
            if (item.negative_prompt) {
                innerHTML += `<textarea class="negative-textarea" readonly>${item.negative_prompt}</textarea>`;
            }
            innerHTML += `</div>`;

            div.innerHTML = innerHTML;

            // 点击事件：处理多选逻辑
            div.onclick = () => {
                // 多选逻辑：点击一次选中，再点击取消
                if (referenceSelectedIndexes.includes(item.id)) {
                    referenceSelectedIndexes = referenceSelectedIndexes.filter(id => id !== item.id);
                    div.classList.remove("selected");
                } else {
                    referenceSelectedIndexes.push(item.id);
                    div.classList.add("selected");
                }
                // 持久化保存选中状态
                saveReferenceSelectedIndexes();
                // 更新取消选择按钮的显示状态
                updateReferenceDeselectButton();
            };

            list.appendChild(div);
        }

        // 更新已加载项目计数
        referenceLoadedItemsCount += items.length;
        referenceCurrentPage++;
    } catch (err) {
        console.error("[PromptManage] Error loading reference items:", err);
        console.error("[PromptManage] Stack:", err.stack);
    } finally {
        referenceLoadingMore = false;
    }
}

// 滚动加载更多
function setupScrollListener() {
    const list = document.getElementById("referenceList");

    // 移除旧的监听器
    list.removeEventListener("scroll", handleScroll);

    // 添加新的监听器
    list.addEventListener("scroll", handleScroll);
}

function handleScroll() {
    const list = document.getElementById("referenceList");
    const scrollTop = list.scrollTop;
    const scrollHeight = list.scrollHeight;
    const clientHeight = list.clientHeight;

    // 计算剩余未显示的项目数量
    const remainingScroll = scrollHeight - (scrollTop + clientHeight);
    // 估算每个项目的高度（假设平均高度为150px）
    const estimatedItemHeight = 150;
    const estimatedRemainingItems = Math.ceil(remainingScroll / estimatedItemHeight);

    // 当剩余未显示的项目少于50条时，加载更多
    if (estimatedRemainingItems < 50 && referenceHasMore && !referenceLoadingMore) {
        const categorySelect = document.getElementById("referenceCategory");
        loadMoreReferenceItems(categorySelect.value);
    }
}

// 渲染参考列表（用于兼容性，调用初始化函数）
function renderReferenceList(category = "") {
    initReferencePagination(category);
    setupScrollListener();
}

// 参考类别变化事件
document.getElementById("referenceCategory").addEventListener("change", (e) => {
    renderReferenceList(e.target.value);
});

// 参考搜索框事件
document.getElementById("referenceSearchInput").addEventListener("input", (e) => {
    referenceSearchText = e.target.value;
    const category = document.getElementById("referenceCategory").value;
    renderReferenceList(category);
});

// 提示词参考下载状态
let referenceDownloadRunning = false;
let referenceDownloadInterval = null;

// 下载提示词示例图
async function downloadPromptExamples() {
    const btn = document.getElementById("downloadExamplesBtn");

    if (referenceDownloadRunning) {
        // 如果正在运行，则取消下载
        try {
            const response = await fetch("/prompt_manage/reference/cancel", {
                method: "POST"
            });
            const result = await response.json();
            const t = translations[currentLang] || {};
            if (result.success) {
                alert(t.download_cancelled || "下载已取消");
            }
        } catch (err) {
            console.error("[PromptManage] Cancel download error:", err);
        }
        return;
    }

    // 禁用按钮并显示加载状态
    referenceDownloadRunning = true;
    btn.disabled = true;
    const originalText = btn.textContent;
    const t = translations[currentLang] || {};
    btn.textContent = `⏳ ${t.downloading || "下载中"}...`;

    // 启动状态检查
    checkDownloadStatus();

    try {
        // 调用 download_by_civitaiwebnum.py
        const response = await fetch("/prompt_manage/download_by_civitaiwebnum", {
            method: "POST"
        });
        const result = await response.json();

        if (result.success) {
            const message = `${result.message}\n${t.success || "成功"}: ${result.success_count}, ${t.failed || "失败"}: ${result.failed_count}, ${t.skipped || "跳过"}: ${result.skipped_count || 0}`;
            alert(message);
            // 下载完成，重新加载数据
            await loadReferenceData();
        } else {
            alert(result.message || t.download_error || "下载过程中出错");
        }
    } catch (err) {
        console.error("[PromptManage] Download error:", err);
        alert(t.download_error || "下载过程中出错");
    } finally {
        // 停止状态检查
        if (referenceDownloadInterval) {
            clearInterval(referenceDownloadInterval);
            referenceDownloadInterval = null;
        }
        referenceDownloadRunning = false;
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// 检查下载状态
async function checkDownloadStatus() {
    referenceDownloadInterval = setInterval(async () => {
        try {
            const response = await fetch("/prompt_manage/reference/status");
            const status = await response.json();

            const btn = document.getElementById("downloadExamplesBtn");
            const t = translations[currentLang] || {};
            if (status.running) {
                if (status.total > 0) {
                    const percent = Math.round((status.progress / status.total) * 100);
                    btn.textContent = `⏳ ${t.downloading || "下载中"}... ${percent}% (${status.progress}/${status.total})`;
                } else {
                    btn.textContent = `⏳ ${t.scanning || "扫描中"}...`;
                }

                // 在提示词参考面板中显示目录进度条
                renderDownloadProgress(status.category_progress);
            }
        } catch (err) {
            console.error("[PromptManage] Status check error:", err);
        }
    }, 1000);
}

// 渲染下载进度条
function renderDownloadProgress(categoryProgress) {
    const list = document.getElementById("referenceList");

    // 如果已经有进度条，更新它
    let progressContainer = document.getElementById("downloadProgressContainer");
    if (!progressContainer) {
        // 创建进度容器
        progressContainer = document.createElement("div");
        progressContainer.id = "downloadProgressContainer";
        progressContainer.className = "download-progress-container";
        list.innerHTML = "";
        list.appendChild(progressContainer);
    }

    // 清空现有进度条
    progressContainer.innerHTML = "";

    // 为每个目录创建进度条
    for (const [category, progress] of Object.entries(categoryProgress)) {
        const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

        const progressItem = document.createElement("div");
        progressItem.className = "download-progress-item";
        progressItem.innerHTML = `
            <div class="progress-info">
                <span class="progress-category">${category}</span>
                <span class="progress-text">${progress.completed}/${progress.total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
        `;
        progressContainer.appendChild(progressItem);
    }
}

// 下载示例图按钮事件
document.getElementById("downloadExamplesBtn").addEventListener("click", downloadPromptExamples);

// ===== 上传图像功能 =====

// 上传图像按钮事件
document.getElementById("uploadImagesBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("imageFileInput");
    if (fileInput) {
        fileInput.click();
    }
});

// 文件选择事件
document.getElementById("imageFileInput").addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const t = translations[currentLang] || {};
    const confirmText = t.upload_images_confirm_multiple || t.upload_images_confirm || "Confirm upload";
    const message = confirmText.replace("{count}", files.length);
    if (!confirm(message)) {
        e.target.value = ""; // 清空选择
        return;
    }

    const btn = document.getElementById("uploadImagesBtn");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = `${t.upload_images_processing || "Processing..."} (0/${files.length})`;

    try {
        // 读取所有文件并转换为 base64
        const fileDataList = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            btn.textContent = `${t.upload_images_processing || "Processing..."} (${i + 1}/${files.length})`;

            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            fileDataList.push({
                name: file.name,
                data: base64
            });
        }

        // 发送到服务器
        const response = await fetch("/prompt_manage/upload_images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: fileDataList })
        });

        const result = await response.json();

        if (result.success) {
            alert(`${t.upload_images_success || "Upload successful"}: ${result.success_count}/${files.length}`);
            // 刷新提示词参考数据
            referenceDataLoaded = false;
            if (currentRightTab === "reference") {
                loadReferenceData();
            }
        } else {
            alert(`${t.upload_images_failed || "Upload failed"}: ${result.message}`);
        }
    } catch (err) {
        console.error("[PromptManage] Upload images error:", err);
        alert(`${t.upload_images_failed || "Upload failed"}: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
        e.target.value = ""; // 清空选择
    }
});

// DownloadLoraImages 按钮事件
async function downloadLoraImages() {
    const btn = document.getElementById("downloadLoraImagesBtn");

    if (!btn) return;

    // 禁用按钮并显示加载状态
    btn.disabled = true;
    const originalText = btn.textContent;
    const t = translations[currentLang] || {};
    btn.textContent = `⏳ Downloading...`;

    try {
        const response = await fetch("/prompt_manage/download_lora_images", {
            method: "POST"
        });
        const result = await response.json();

        if (result.success) {
            alert(result.message || "Download completed successfully!");
        } else {
            alert(result.message || "Download failed");
        }
    } catch (err) {
        console.error("[PromptManage] Download Lora Images error:", err);
        alert("Download failed: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

document.getElementById("downloadLoraImagesBtn").addEventListener("click", downloadLoraImages);

// 提示词参考取消选择按钮事件
document.getElementById("referenceDeselectBtn").addEventListener("click", () => {
    referenceSelectedIndexes = [];
    saveReferenceSelectedIndexes();
    updateReferenceDeselectButton();
    // 重新渲染当前列表以更新选中状态
    const categorySelect = document.getElementById("referenceCategory");
    renderReferenceList(categorySelect.value);
});

// ===== 分割条拖动功能 =====
const resizer = document.getElementById('resizer');
const leftPanel = document.querySelector('.left-panel');
const rightPanel = document.querySelector('.right-panel');
const container = document.querySelector('.container');

let isResizing = false;

// 恢复之前保存的面板比例
function restorePanelWidth() {
    const savedWidth = localStorage.getItem('leftPanelWidth');
    if (savedWidth) {
        leftPanel.style.width = savedWidth;
    }
}

// 保存面板比例
function savePanelWidth() {
    localStorage.setItem('leftPanelWidth', leftPanel.style.width);
}

// 初始化分割条拖动
resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // 防止拖动时选中文本
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    
    // 计算新的左侧面板宽度
    let newWidth = e.clientX - containerRect.left;
    
    // 限制最小和最大宽度
    const minWidth = 200;
    const maxWidth = containerWidth - 200;
    
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    
    // 计算百分比
    const percentage = (newWidth / containerWidth) * 100;
    
    leftPanel.style.width = percentage + '%';
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        savePanelWidth();
    }
});

// 防止拖动时的默认行为
resizer.addEventListener('dblclick', () => {
    // 双击分割条恢复默认 50/50 比例
    leftPanel.style.width = '50%';
    savePanelWidth();
});

// 页面加载时恢复面板比例
window.addEventListener('load', restorePanelWidth);
