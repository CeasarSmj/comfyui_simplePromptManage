# 🎨 ComfyUI Prompt Manager

An elegant prompt management and generation system designed for ComfyUI.

**中文版本 | [English](README.en.md)**

## 🚀 Quick Start

### Installation Steps

1. **Clone or download to ComfyUI custom nodes directory**
   ```bash
   cd path/to/ComfyUI/custom_nodes
   git clone https://github.com/your-repo/comfyui_PromptManage.git
   # Or download and extract directly to this directory
   ```

2. **Start ComfyUI**
   ```bash
   python main.py
   ```

3. **Access the Plugin**
   - Open ComfyUI web interface
   - Find the button to launch beside the running button
   - Or directly visit `http://localhost:8188/prompt_manage_web/`

### Usage Video Tutorial

📹 **[Click here to watch the usage tutorial video](asset/Usage_example.mp4)** or click the "📹 Usage Video" button in the top-right corner of the Web interface

**Video Contents:**
- ✅ Feature demonstration
- ✅ Prompt management methods
- ✅ Generator usage tips
- ✅ LLM-assisted generation features
- ✅ Keyboard shortcuts guide

## 💻 Usage Guide

### Managing Prompts

1. **Add New Prompt**
   - In the left "Add New Prompt" section, enter:
     - **Name**: Brief identifier for the prompt (e.g., "landscape", "character")
     - **Direction**: Select "Positive", "Negative", or "None" (used for auto-add)
     - **Type**: Choose from 8 categories (Quality, Style, Texture, Environment, Action, Expression, Clothing, Other)
     - **Note**: Optional description information
     - **Prompt Text**: Complete prompt content
   - Click "✚ Add" button to save

2. **Search and Filter Prompts**
   - **Search Box**: Type keywords to quickly find prompts
   - **Search Mode**:
     - Fuzzy: Matches prompt names containing the keyword
     - Exact: Exact match of prompt names
   - **Type Filter**: Filter display by prompt category

3. **Edit Prompts**
   - Select the prompt to edit from the list
   - Click "✏️ Edit Selected" button
   - Modify information in the form
   - Click "✓ Confirm Edit" to save changes

4. **Delete Prompts**
   - Select the prompt to delete from the list
   - Click "🗑️ Delete Selected" button
   - Confirm the deletion

5. **Show Details Mode**
   - Check the "Show Details" checkbox
   - View detailed information (direction, type, note) for each prompt in the list

### Generating Prompts

1. **Combine Prompts**
   - Select a prompt from the left library
   - Click the corresponding button to add to the generator:
     - **➕ Add**: Auto-detect direction and add to the corresponding area
     - **➕ Add Positive (P)**: Add to positive prompts area
     - **➖ Add Negative (N)**: Add to negative prompts area
   - Prompt text will be automatically appended to the right text box

2. **Use Keyboard Shortcuts**
   - Select a prompt, then press **`P` key**: Quickly add positive prompt
   - Select a prompt, then press **`N` key**: Quickly add negative prompt

3. **Manual Editing**
   - Edit directly in positive/negative text boxes
   - Support standard editing operations like copy and delete
   - Can copy generated prompts to use in ComfyUI

### LLM Prompt Generation

1. **Click "🤖 LLM Prompt Generator" button**
2. **Enter your demand** (natural language description)
   - Example: "A smiling woman in a red dress in a garden"
3. **Click "⚡ Generate" button**
   - System generates a standardized prompt template
   - Template includes 8 complete rules and available prompt references
4. **Click "📋 Copy" button** to copy the generated content

### Interface Settings

- **Language Switching**: Click the "🌐" icon in the top-left to choose Chinese or English
- **Theme Switching**: Click the "🎨" icon in the top-left to toggle between light and dark themes
- **Settings Save**: Language and theme preferences are automatically saved to browser local storage

## ✨ Features

- **📚 Prompt Library Management**: Easily create, edit, delete, and search prompts
- **🔍 Smart Search**: Support both fuzzy and exact search modes
- **🎯 Multi-dimensional Classification**: Direction (Positive/Negative/None) and Type (8 categories)
- **🤖 LLM Prompt Generation**: AI-assisted generation of high-quality prompts
- **🌐 Multi-language Support**: Support for Chinese and English interfaces
- **🎨 Theme Switching**: Toggle between light and dark themes
- **💾 Real-time Save**: Prompts automatically saved to local JSON files
- **⌨️ Keyboard Shortcuts**: Use P key to quickly add positive prompts, N key for negative prompts
- **📹 Video Tutorial**: Built-in usage video for quick learning

## 📦 Project Structure

```
comfyui_PromptManage/
├── __init__.py                 # Main plugin file with API route definitions
├── prompts.json                # Default prompt configuration (example)
├── web/
│   └── Usage_example.mp4       # Usage video tutorial
├── data/
│   └── prompts.json            # User saved prompt data
└── web/
    ├── index.html              # Web interface entry point
    ├── script.js               # Main functionality script (800+ lines)
    ├── style.css               # Interface styling (1100+ lines)
    └── top_menu_extension.js   # ComfyUI menu integration
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/prompt_manage/get` | Get all prompts |
| POST | `/prompt_manage/save` | Save all prompts |
| POST | `/prompt_manage/add` | Add new prompt |
| POST | `/prompt_manage/delete` | Delete specified prompt |

### Request/Response Examples

**Add Prompt**
```json
POST /prompt_manage/add
{
    "name": "landscape",
    "direction": "None",
    "type": "Environment",
    "text": "beautiful landscape, mountains, clear sky",
    "note": "Natural landscape prompts"
}
```

**Delete Prompt**
```json
POST /prompt_manage/delete
{
    "index": 0
}
```

## 📁 Data Format

Prompts are saved in JSON array format:

```json
[
    {
        "name": "Prompt Name",
        "direction": "Positive|Negative|None",
        "type": "Quality|Style|Texture|Environment|Action|Expression|Clothing|Other",
        "text": "Prompt content...",
        "note": "Note information (optional)"
    }
]
```

## 🎯 Technology Stack

- **Backend**: Python + aiohttp
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Integration**: ComfyUI PromptServer

## 🌍 Browser Compatibility

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📝 Configuration Files

### data/prompts.json

Auto-generated user prompt data file. Created automatically on first startup.

### prompts.json (root directory)

Preset prompt example file (if needed).

## 🐛 FAQ

**Q: Prompts not saving?**
A: Check if the `data` folder exists and has write permissions. The plugin will create it automatically.

**Q: Getting 404 when accessing?**
A: Ensure ComfyUI service is running and check if you're accessing the correct URL `http://localhost:8188/prompt_manage_web/`

**Q: Where is the usage video?**
A: Click the "📹 Usage Video" button in the top-right corner of the interface to watch it.

**Q: How to import/export prompts?**
A: Edit the `data/prompts.json` file directly or perform batch operations via API endpoints.

## 💡 Tips

- Regularly backup the `data/prompts.json` file to protect your data
- Organize prompts by application scenarios with descriptive names
- Take full advantage of the "Note" field to record prompt usage and effectiveness
- Use the direction and type fields to effectively organize and manage your prompt library

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

**Version**: 1.1.0  
**Last Updated**: January 2026

If you have any questions or suggestions, feel free to open an issue!
