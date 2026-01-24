import os
import json
from aiohttp import web
from server import PromptServer

# 数据文件路径
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "prompts.json")
DEFAULT_FILE = os.path.join(DATA_DIR, "prompts_default.json")

# 确保目录和文件存在
os.makedirs(DATA_DIR, exist_ok=True)

def is_subset(user_data, default_data):
    """
    检查user_data是否是default_data的子集
    子集定义：user_data中的所有项都在default_data中存在（根据name判断）
    """
    if not isinstance(user_data, list) or not isinstance(default_data, list):
        return False
    
    default_names = {item.get("name") for item in default_data}
    
    for item in user_data:
        name = item.get("name")
        if name not in default_names:
            return False
    
    return True

def sync_prompts():
    """
    同步prompts.json和prompts_default.json
    如果prompts.json是prompts_default.json的子集，则更新为最新的default
    否则不更新
    """
    # 确保default文件存在
    if not os.path.exists(DEFAULT_FILE):
        with open(DEFAULT_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
    
    # 读取default数据
    with open(DEFAULT_FILE, "r", encoding="utf-8") as f:
        default_data = json.load(f)
    
    # 如果user文件不存在，创建为default的副本
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, ensure_ascii=False, indent=4)
        return
    
    # 读取user数据
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        user_data = json.load(f)
    
    # 检查user_data是否是default_data的子集
    if is_subset(user_data, default_data):
        # 如果是子集，同步为最新的default
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, ensure_ascii=False, indent=4)

def load_prompts():
    # 启动时同步一次
    sync_prompts()
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
    # 确保新项目有完整的字段
    if "direction" not in item:
        item["direction"] = "无"
    if "type" not in item:
        item["type"] = "其它"
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

async def update_prompt(request):
    data = await request.json()
    index = data["index"]
    prompts = load_prompts()
    if 0 <= index < len(prompts):
        prompts[index] = {
            "name": data.get("name", prompts[index].get("name", "")),
            "direction": data.get("direction", prompts[index].get("direction", "无")),
            "type": data.get("type", prompts[index].get("type", "其它")),
            "note": data.get("note", prompts[index].get("note", "")),
            "text": data.get("text", prompts[index].get("text", ""))
        }
        save_prompts(prompts)
    return web.json_response(prompts)

# 注册路由
PromptServer.instance.routes.post("/prompt_manage/get")(get_prompts)
PromptServer.instance.routes.post("/prompt_manage/save")(save_prompts_api)
PromptServer.instance.routes.post("/prompt_manage/add")(add_prompt)
PromptServer.instance.routes.post("/prompt_manage/delete")(delete_prompt)
PromptServer.instance.routes.post("/prompt_manage/update")(update_prompt)

# 静态文件服务
web_dir = os.path.join(os.path.dirname(__file__), "web")
PromptServer.instance.app.add_routes([web.static('/prompt_manage_web', web_dir)])

# === 关键修复：让插件正确加载 + extensions JS 被识别 ===
WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]