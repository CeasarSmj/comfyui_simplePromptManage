# 🎨 ComfyUI Prompt Manager

为 ComfyUI 设计的优雅 AI 提示词和 Lora 库管理与生成系统，帮助您高效地管理、搜索和生成 Stable Diffusion 提示词，同时管理和组织 Lora 模型。

**[中文](README.md) | [English](README.en.md)**


---

## ⚡ 快速安装与使用

### 1️⃣ 安装

将插件克隆或下载到 ComfyUI 自定义节点目录：

```bash
cd path/to/ComfyUI/custom_nodes
git clone https://github.com/CeasarSmj/comfyui_PromptManage.git
```

重启 ComfyUI，访问 `http://localhost:8188/prompt_manage_web/` 或在网页界面中点击插件入口按钮。

![](./asset/entrance.png)

### 2️⃣ 基础概念

插件包含三大核心功能：

| 功能 | 说明 |
|------|------|
| **提示词库**（选项卡） | 提示词库管理 - 添加、编辑、删除、搜索提示词 |
| **Lora库**（选项卡） | Lora 模型管理 - 浏览、分类、组织本地 Lora 模型 |
| **生成器**（右侧面板） | 提示词生成器 - 组合提示词和 Lora 生成完整的正向/负向提示词 |

每条提示词包含：
- **名称**：提示词的简短标识（如"风景"、"人物"）
- **方向**：正向（要生成的内容）/ 反向（要避免的内容）/ 无
- **类型**：分类标签 - 质量、风格、质感、环境、动作、表情、着装、构图、其它
- **提示词文本**：完整的提示词内容
- **备注**（可选）：用途说明和使用建议

---

## 🎯 核心使用方式

### 📚 管理提示词库

![](./asset/pic_promptlib_cn.png)
#### 添加提示词
1. 在左侧"新增提示词"表单中填写：
   - **名称**：例如 "高质量画面"、"美女角色"
   - **方向**：选择"正向"、"反向"或"无"
   - **类型**：从下拉菜单选择分类
   - **备注**（可选）：例如"适合人物生成"
   - **提示词文本**：复制粘贴提示词内容
2. 点击"✚ 添加"保存

#### 搜索和筛选
- **搜索框**：输入关键词查找提示词名称（支持模糊和精确两种模式）
- **类型筛选**：从下拉菜单按分类过滤
- **显示细节**：勾选复选框查看每条提示词的完整信息

#### 编辑或删除
1. 从列表中点击选中要修改的提示词（按钮会变色表示选中）
2. 编辑：点击"✏️ 编辑选中" → 修改信息 → 点击"✓ 确认编辑"
3. 删除：点击"🗑️ 删除选中" → 确认删除

### 🎨 生成提示词

#### 方式1：手动组合（推荐入门）
1. 在左侧提示词库中选中一条提示词
2. 点击按钮添加到右侧生成器：
   - **➕ 加入**：系统自动根据方向判断，添加到对应区域
   - **➕ 加入正向 (P)**：强制添加到正向提示词区域
   - **➖ 加入负向 (N)**：强制添加到负向提示词区域
3. 提示词文本自动拼接到右侧的文本框中
4. 继续添加更多提示词进行组合
5. 完成后复制生成的提示词到 ComfyUI 使用

#### 方式2：快捷键（高效）
- 选中提示词后按 **`P` 键**：快速添加到正向提示词
- 选中提示词后按 **`N` 键**：快速添加到负向提示词

#### 方式3：LLM AI 生成（专业）
1. 点击右上角"🤖 LLM 提示词生成"按钮
2. 在对话框中用自然语言描述您的需求，例如：
   ```
   一个穿着红色连衣裙的女性，微笑，在花园里，阳光照耀，柔和的光线
   ```
3. 点击"⚡ 生成"按钮
4. 系统基于预设规则生成标准化提示词模板（包含完整的正向和负向提示词）
5. 点击"📋 复制"按钮复制生成结果
6. 可选：粘贴到文本框继续微调

### � 管理 Lora 库

![](./asset/pic_loralib_cn.png)
#### 浏览和分类
1. 点击左侧选项卡切换到"🎨 Lora库"
2. 从"全部"下拉菜单选择 Lora 分类（自动按目录生成）
3. 勾选"显示细节"查看完整信息：
   - Lora 名称和文件名
   - 触发词（用于生成器中使用）
   - 预览图片/视频

#### 选中并添加到生成器
1. 在 Lora 列表中点击要添加的 Lora（会高亮显示）
2. 点击"➕ 加入"按钮将选中的 Lora 添加到正向提示词区域
3. Lora 的触发词会自动追加到提示词文本中

#### Lora 在生成器中的使用
- 提示词和 Lora 会按照 **添加顺序** 拼接，而不是先提示词后 Lora
- Lora 触发词会自动从元数据中提取
- 支持同时添加多个 Lora，提示词会依次拼接

### 🎛️ 界面设置

- **语言切换**：点击左上角"🌐"图标选择中文或英文
- **主题切换**：点击左上角"🎨"图标在亮色/暗色主题间切换
- **设置自动保存**：语言和主题偏好保存到浏览器本地存储

---

## ✨ 功能特性

- ✅ **提示词库管理** - 轻松创建、编辑、删除和搜索
- ✅ **Lora 库管理** - 浏览、分类和组织本地 Lora 模型
- ✅ **智能搜索** - 支持模糊搜索和精确搜索
- ✅ **多维度分类** - 按方向和类型组织提示词，按目录分类 Lora
- ✅ **AI 辅助生成** - LLM 大模型生成高质量提示词（包括 Lora API）
├── data/
│   ├── prompts.json            # 用户提示词数据存储
│   ├── prompts_default.json    # 默认提示词库（中文）
│   └── prompts_default_en.json # 默认提示词库（英文）
├── web/                        # 前端：Web 界面
│   ├── index.html              # HTML 页面结构
│   ├── script.js               # JavaScript 交互逻辑
│   ├── style.css               # 样式表
│   ├── translations.json       # 多语言翻译配置
│   ├── llm-templates.json      # LLM 生成规则模板
│   └── top_menu_extension.js   # ComfyUI 菜单集成
└── asset/                      # 资源文件和图片
    ├── pic_promptlib_cn.png    # 提示词库界面截图（中文）
    ├── pic_promptlib_en.png    # 提示词库界面截图（英文）
    ├── pic_loralib_cn.png      # Lora 库界面截图（中文）
    ├── pic_llmgenerate_cn.png  # LLM 生成界面截图（中文）
    └── pic_llmgenerate_en.png  # LLM 生成界面截图（英文）
### 项目架构

```
comfyui_PromptManage/
├── __init__.py                 # 后端：Python API 服务器
├── data/
│   └── prompts.json            # 用户提示词数据存储
├── web/                        # 前端：Web 界面
│   ├── index.html              # HTML 页面结构
│   ├── script.js               # JavaScript 交互逻辑
│   ├── style.css               # 样式表
│   ├── translations.json       # 多语言翻译配置
│   ├── llm-templates.json      # LLM 生成规则模板
│   ├── top_menu_extension.js   # ComfyUI 菜单集成
#### 提示词管理 API

| 方法 | 端点 | 功能 |
|------|------|------|
| POST | `/prompt_manage/get` | 获取所有提示词 |
| POST | `/prompt_manage/add` | 添加新提示词 |
| POST | `/prompt_manage/update` | 更新指定提示词 |
| POST | `/prompt_manage/delete` | 删除指定提示词 |
| POST | `/prompt_manage/save` | 保存所有提示词 |

#### Lora 库管理 API

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/prompt_manage/lora/list` | 获取所有 Lora 模型列表
|------|------|------|
| POST | `/prompt_manage/get` | 获取所有提示词 |
| POST | `/prompt_manage/add` | 添加新提示词 |
| POST | `/prompt_manage/update` | 更新指定提示词 |
| POST | `/prompt_manage/delete` | 删除指定提示词 |
| POST | `/prompt_manage/save` | 保存所有提示词 |

#### API 使用示例

**添加提示词**
```bash
POST /prompt_manage/add
Content-Type: application/json

{
    "name": "风景",
    "direction": "无",
    "type": "环境",
    "text": "beautiful landscape, mountains, clear sky",
    "note": "自然风景提示词"
}
```

**删除提示词**
```bash
POST /prompt_manage/delete
Content-Type: application/json

{
    "index": 0
}
```

### 数据格式

提示词数据存储为 JSON 数组，位置：`data/prompts.json`

```json
[
    {
        "name": "提示词名称",
        "direction": "正向|反向|无",
        "type": "质量|风格|质感|环境|动作|表情|着装|构图|其它",
        "text": "提示词内容...",
        "note": "备注信息（可选）"
    }
]
```
- **Lora 库管理** - 加载、分类、浏览、选择 Lora 模型
- **搜索和筛选** - 模糊搜索、精确搜索和分类筛选逻辑
- **快捷键处理** - P/N 键事件监听和处理
- **LLM 集成** - 调用大模型 API 生成提示词
- **按顺序拼接** - 根据用户添加顺序拼接提示词和 Lora
### 代码说明

#### 后端 (__init__.py)
- **load_prompts()** - 从 JSON 文件加载提示词
- **save_prompts(data)** - 将提示词保存到 JSON 文件
- **API 路由处理** - 处理添加、删除、更新、获取提示词的请求
- **web 目录挂载** - 静态文件服务，提供 Web 界面

#### 前端 (script.js)
- **国际化系统** - 从 translations.json 加载多语言配置
- **提示词库管理** - CRUD 操作的前端实现
- **搜索和筛选** - 模糊搜索、精确搜索和分类筛选逻辑
- **快捷键处理** - P/N 键事件监听和处理
- **LLM 集成** - 调用大模型 API 生成提示词
- **主题和语言** - 动态切换界面主题和语言，使用 localStorage 持久化

#### 样式 (style.css)
- **响应式布局** - 两栏设计（左侧库，右侧生成器）
- **主题系统** - CSS 变量实现亮色/暗色主题切换
- **组件样式** - 按钮、表单、列表等 UI 组件的完整样式

### LLM 提示词生成规则

![](./asset/pic_llmgenerate_cn.png)
LLM 生成器基于预设的 8 条规则，确保生成的提示词：
1. 全英文，无中文
2. 优先使用简短短语，非必要不写完整句子
3. 逗号分隔，同类元素连续，不同类别换行
4. 遵循优先顺序：质量 > 主体 > 着装 > 动作 > 环境 > 画风
5. 多人物时按人物分组描述
6. 开头必含高质量词（masterpiece, best quality 等）
7. 重要特征提供多个同义词
8. 支持权重语法：(keyword:1.2) 加强，[keyword] 减弱

详见 `web/llm-templates.json`

---

## 💡 使用建议

- 定期整理提示词库，删除过时或重复的条目
- 充分利用"备注"字段记录提示词的用途和效果
- 按照应用场景给提示词命名，便于后续搜索
- 为常用提示词创建多个变体（如不同风格、不同质量级别）
- 保存成功生成的提示词组合，形成可复用的模板
- 利用类型筛选功能快速定位某类提示词

---

## 📄 许可证

MIT License

---

**版本**：1.2.0  
**最后更新**：2026 年 1 月 29 日  

