# 🎨 ComfyUI Prompt Manager

An elegant prompt management and generation system designed for ComfyUI.

**中文版本 | [English](README.en.md)**

## ✨ Features

- **📚 Prompt Library Management**: Easily create, edit, delete, and search prompts
- **🔍 Smart Search**: Support both fuzzy and exact search modes
- **🎯 Prompt Generator**: Conveniently combine and generate positive/negative prompts
- **🌐 Multi-language Support**: Support for Chinese and English interfaces
- **🎨 Theme Switching**: Toggle between light and dark themes
- **💾 Real-time Save**: Prompts automatically saved to local JSON files
- **⌨️ Keyboard Shortcuts**: Use P key to quickly add positive prompts, N key for negative prompts

## 📦 Project Structure

```
comfyui_PromptManage/
├── __init__.py                 # Main plugin file with API route definitions
├── prompts.json                # Default prompt configuration (example)
├── data/
│   └── prompts.json            # User saved prompt data
└── web/
    ├── index.html              # Web interface entry point
    ├── script.js               # Main functionality script (260+ lines)
    ├── style.css               # Interface styling
    └── top_menu_extension.js   # ComfyUI menu integration
```

## 🚀 Installation

### Prerequisites
- ComfyUI installed and running properly
- Python 3.7+

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
   - Find "Prompt Manager" in the menu
   - Or directly visit `http://localhost:8188/prompt_manage_web/`

## 💻 Usage Guide

### Managing Prompts

1. **Add New Prompt**
   - Enter prompt name, note, and content in the right panel
   - Click "✚ Add" button to save

2. **Search Prompts**
   - Type keywords in the search box
   - Choose between "Fuzzy" or "Exact" search mode
   - Results filter in real-time

3. **Delete Prompts**
   - Select the prompt to delete from the list
   - Click "🗑️ Delete Selected" button
   - Confirm the deletion

### Generating Prompts

1. **Combine Prompts**
   - Select a prompt from the left list
   - Click "➕ Add Positive (P)" or "➖ Add Negative (N)"
   - Prompt text will be added to the corresponding area

2. **Use Keyboard Shortcuts**
   - Press `P` key to quickly add positive prompts
   - Press `N` key to quickly add negative prompts

3. **Manual Editing**
   - Edit directly in positive/negative text boxes
   - Support standard editing operations like copy and delete

### Interface Settings

- **Language Switching**: Click the "🌐" icon in the top-left to switch between Chinese and English
- **Theme Switching**: Click the "🎨" icon in the top-left to toggle between light and dark themes
- **Settings Save**: Language and theme preferences are automatically saved to browser local storage

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
        "text": "Prompt content...",
        "note": "Note information (optional)"
    },
    {
        "name": "Another Prompt",
        "text": "Prompt content...",
        "note": ""
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

**Q: How to import/export prompts?**
A: Edit the `data/prompts.json` file directly or perform batch operations via API endpoints.

## 💡 Tips

- Regularly backup the `data/prompts.json` file to protect your data
- Organize prompts by application scenarios with descriptive names
- Take full advantage of the "Note" field to record prompt usage and effectiveness

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

**Version**: 1.0.0  
**Last Updated**: January 2026

If you have any questions or suggestions, feel free to open an issue!
