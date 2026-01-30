# Prompt Reader

独立的 Prompt 查看工具，用于查看 `lora_prompts/` 目录下的图像及其 metadata 中的 prompt 信息。

## 特性

- 🖼️ **图像浏览**：查看 lora_prompts 目录下的所有图像
- 📝 **Prompt 查看**：查看图像 metadata 中的正向和负向 prompt
- 🔍 **搜索功能**：按 prompt 或 lora 名称搜索
- 📂 **类别筛选**：按目录类别筛选图像
- 💾 **缓存机制**：智能缓存，提升加载速度
- 🌙 **主题切换**：支持亮色/暗色主题
- 📱 **响应式设计**：适配各种屏幕尺寸

## 安装依赖

```bash
pip install aiohttp pillow
```

## 使用方法

### Windows

双击运行 `start.bat` 文件，或在命令行中执行：

```bash
cd prompt_reader
python app.py
```

### Linux/Mac

在终端中执行：

```bash
cd prompt_reader
chmod +x start.sh
./start.sh
```

或直接运行：

```bash
python3 app.py
```

### 自定义端口和地址

```bash
python app.py --host 0.0.0.0 --port 8888
```

默认配置：
- 地址：127.0.0.1
- 端口：8765

## 使用说明

1. 启动服务器后，在浏览器中打开 `http://127.0.0.1:8765`
2. 使用顶部的搜索框搜索 prompt 或 lora 名称
3. 使用类别下拉框筛选特定类别的图像
4. 点击图像卡片查看详细信息（包括完整的 prompt 和生成参数）
5. 使用"显示详情"复选框切换列表显示模式

## 目录结构

```
prompt_reader/
├── app.py              # Python 后端服务器
├── index.html          # 前端页面
├── start.bat           # Windows 启动脚本
├── start.sh            # Linux/Mac 启动脚本
├── README.md           # 说明文档
├── cache/              # 缓存目录（自动创建）
└── static/             # 静态文件
    ├── style.css       # 样式文件
    └── app.js          # 前端脚本
```

## 注意事项

- 此工具完全独立运行，**不依赖 ComfyUI**
- 需要确保 `lora_prompts/` 目录存在于项目根目录
- 图像文件必须包含 PNG metadata 中的 prompt 信息才能正常显示
- 支持的图像格式：PNG, JPG, JPEG, WEBP

## 技术栈

- **后端**：Python + aiohttp
- **前端**：原生 HTML + CSS + JavaScript
- **图像处理**：Pillow (PIL)