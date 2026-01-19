# 🎨 ComfyUI Prompt Manager

一个为 ComfyUI 设计的优雅提示词管理和生成系统。

**[中文](README.md) | [English](README.en.md)**

## ✨ 功能特性

- **📚 提示词库管理**：轻松创建、编辑、删除和搜索提示词
- **🔍 智能搜索**：支持模糊搜索和精确搜索两种模式
- **🎯 提示词生成器**：便捷组合和生成正向/负向提示词
- **🌐 多语言支持**：支持中文和英文界面
- **🎨 主题切换**：亮色和暗色主题自由切换
- **💾 实时保存**：提示词自动保存到本地 JSON 文件
- **⌨️ 快捷键支持**：使用 P 键快速添加正向提示，N 键添加负向提示

## 📦 项目结构

```
comfyui_PromptManage/
├── __init__.py                 # 主插件文件，包含 API 路由定义
├── prompts.json                # 默认提示词配置（示例）
├── data/
│   └── prompts.json            # 用户保存的提示词数据
└── web/
    ├── index.html              # Web 界面入口
    ├── script.js               # 主要功能脚本（260+ 行）
    ├── style.css               # 界面样式
    └── top_menu_extension.js   # ComfyUI 菜单集成
```

## 🚀 安装方法

### 前置要求
- ComfyUI 已安装并正常运行
- Python 3.7+

### 安装步骤

1. **克隆或下载到 ComfyUI 自定义节点目录**
   ```bash
   cd path/to/ComfyUI/custom_nodes
   git clone https://github.com/your-repo/comfyui_PromptManage.git
   # 或直接下载解压到此目录
   ```

2. **启动 ComfyUI**
   ```bash
   python main.py
   ```

3. **访问插件**
   - 打开 ComfyUI 网页界面
   - 在菜单中找到 "Prompt Manager" 选项
   - 或直接访问 `http://localhost:8188/prompt_manage_web/`

## 💻 使用指南

### 管理提示词

1. **添加新提示词**
   - 在右侧输入提示词名称、备注和内容
   - 点击"✚ 添加"按钮保存

2. **搜索提示词**
   - 在搜索框输入关键词
   - 可选择"模糊搜索"或"精确搜索"模式
   - 实时过滤列表结果

3. **删除提示词**
   - 在列表中选中要删除的提示词
   - 点击"🗑️ 删除选中"按钮
   - 确认删除操作

### 生成提示词

1. **组合提示词**
   - 从左侧列表选中一条提示词
   - 点击"➕ 加入正向 (P)"或"➖ 加入负向 (N)"
   - 提示词文本将添加到对应区域

2. **使用快捷键**
   - 按 `P` 键快速添加正向提示词
   - 按 `N` 键快速添加负向提示词

3. **手动编辑**
   - 直接在正向/负向文本框中编辑
   - 支持复制、删除等标准编辑操作

### 界面设置

- **语言切换**：点击左上角"🌐"图标选择中文或英文
- **主题切换**：点击左上角"🎨"图标在亮色/暗色主题间切换
- **设置保存**：语言和主题设置自动保存到浏览器本地存储

## 🔧 API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/prompt_manage/get` | 获取所有提示词 |
| POST | `/prompt_manage/save` | 保存所有提示词 |
| POST | `/prompt_manage/add` | 添加新提示词 |
| POST | `/prompt_manage/delete` | 删除指定提示词 |

### 请求/响应示例

**添加提示词**
```json
POST /prompt_manage/add
{
    "name": "风景",
    "text": "beautiful landscape, mountains, clear sky",
    "note": "自然风景提示词"
}
```

**删除提示词**
```json
POST /prompt_manage/delete
{
    "index": 0
}
```

## 📁 数据格式

提示词保存为 JSON 数组格式：

```json
[
    {
        "name": "提示词名称",
        "text": "提示词内容...",
        "note": "备注信息（可选）"
    },
    {
        "name": "另一个提示词",
        "text": "提示词内容...",
        "note": ""
    }
]
```

## 🎯 技术栈

- **后端**：Python + aiohttp
- **前端**：HTML5 + CSS3 + JavaScript
- **集成**：ComfyUI PromptServer

## 🌍 浏览器兼容性

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📝 配置文件

### data/prompts.json

自动生成的用户提示词数据文件。首次启动时会自动创建。

### prompts.json（根目录）

预设提示词示例文件（如需要）。

## 🐛 常见问题

**Q: 提示词没有保存？**
A: 检查 `data` 文件夹是否存在且有写入权限。插件会自动创建。

**Q: 访问时出现 404？**
A: 确保 ComfyUI 服务正在运行，检查是否访问了正确的地址 `http://localhost:8188/prompt_manage_web/`

**Q: 如何导入/导出提示词？**
A: 直接编辑 `data/prompts.json` 文件或通过 API 端点进行批量操作。

## 💡 提示

- 定期备份 `data/prompts.json` 文件保护数据
- 提示词的组织建议按照应用场景分类命名
- 充分利用"备注"字段记录提示词的用途和效果

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**版本**：1.0.0  
**最后更新**：2026 年 1 月

如有问题或建议，欢迎提出 Issue！
