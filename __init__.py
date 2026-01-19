import os
import json
from aiohttp import web
from server import PromptServer

# 数据文件路径
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "prompts.json")

# 确保目录和文件存在
os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=4)

def load_prompts():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_prompts(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# API 路由
async def get_prompts(request):
    return web.json_response(load_prompts())

async def save_prompts_api(request):
    data = await request.json()
    save_prompts(data)
    return web.Response(text="OK")

async def add_prompt(request):
    item = await request.json()
    prompts = load_prompts()
    prompts.append(item)
    save_prompts(prompts)
    return web.json_response(prompts)

async def delete_prompt(request):
    data = await request.json()
    index = data["index"]
    prompts = load_prompts()
    if 0 <= index < len(prompts):
        prompts.pop(index)
        save_prompts(prompts)
    return web.json_response(prompts)

# 注册路由
PromptServer.instance.routes.post("/prompt_manage/get")(get_prompts)
PromptServer.instance.routes.post("/prompt_manage/save")(save_prompts_api)
PromptServer.instance.routes.post("/prompt_manage/add")(add_prompt)
PromptServer.instance.routes.post("/prompt_manage/delete")(delete_prompt)

# 静态文件服务
web_dir = os.path.join(os.path.dirname(__file__), "web")
PromptServer.instance.app.add_routes([web.static('/prompt_manage_web', web_dir)])

# === 关键修复：让插件正确加载 + extensions JS 被识别 ===
WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]