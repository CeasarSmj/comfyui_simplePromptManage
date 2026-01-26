import os
import json
import asyncio
import logging
from aiohttp import web
from server import PromptServer
from .lora_update_service import LoraUpdateService

logger = logging.getLogger(__name__)

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

# ===== Lora 数据接口 =====
def get_lora_data():
    """
    扫描ComfyUI/models/loras目录，获取所有Lora文件信息
    相对路径: ../../models/loras/
    """
    # 计算相对于插件目录的路径
    plugin_dir = os.path.dirname(__file__)
    lora_dir = os.path.join(plugin_dir, "..", "..", "models", "loras")
    lora_dir = os.path.normpath(lora_dir)
    
    print(f"[PromptManage] Scanning Lora directory: {lora_dir}")
    
    if not os.path.exists(lora_dir):
        print(f"[PromptManage] Lora directory not found: {lora_dir}")
        return {"categories": [], "loras": []}
    
    loras = []
    categories = set()
    
    # 扫描目录
    try:
        for root, dirs, files in os.walk(lora_dir):
            for file in files:
                if file.endswith(".metadata.json"):
                    metadata_path = os.path.join(root, file)
                    
                    try:
                        with open(metadata_path, "r", encoding="utf-8") as f:
                            metadata = json.load(f)
                        
                        # 获取类别（目录名）
                        rel_dir = os.path.relpath(root, lora_dir)
                        if rel_dir == ".":
                            category = "root"
                        else:
                            category = rel_dir.replace("\\", "/")
                        
                        categories.add(category)
                        
                        # 从metadata中提取信息
                        model_name = metadata.get("model_name", metadata.get("file_name", ""))
                        base_model = metadata.get("base_model", "")
                        
                        # 提取触发词
                        trigger_words = []
                        if "civitai" in metadata and "trainedWords" in metadata["civitai"]:
                            trained_words = metadata["civitai"]["trainedWords"]
                            if isinstance(trained_words, list) and len(trained_words) > 0:
                                # 将所有训练词合并并提取
                                all_words_str = ", ".join(trained_words)
                                # 分割并清理
                                words = [w.strip() for w in all_words_str.split(",") if w.strip()]
                                trigger_words = words[:5]  # 只取前5个触发词
                        
                        # 获取描述
                        notes = metadata.get("notes", "")
                        
                        # 获取预览图路径
                        preview_url = metadata.get("preview_url", None)
                        
                        # 获取模型文件路径
                        model_path = metadata.get("file_path", None)
                        
                        # 如果路径不存在，尝试本地查找
                        if not model_path or not os.path.exists(model_path):
                            # 从metadata文件名推断模型文件名
                            base_name = file.replace(".metadata.json", "")
                            safetensors_file = os.path.join(root, base_name + ".safetensors")
                            if os.path.exists(safetensors_file):
                                model_path = safetensors_file
                        
                        # 如果预览图路径不存在，尝试本地查找
                        if not preview_url or not os.path.exists(preview_url):
                            base_name = file.replace(".metadata.json", "")
                            # 尝试多种图片格式
                            for ext in [".jpeg", ".jpg", ".png"]:
                                preview_file = os.path.join(root, base_name + ext)
                                if os.path.exists(preview_file):
                                    preview_url = preview_file
                                    break
                        
                        # 将预览图路径转换为web可访问的相对路径
                        if preview_url and os.path.exists(preview_url):
                            try:
                                # 计算相对于ComfyUI根目录的路径
                                comfyui_root = os.path.normpath(os.path.join(plugin_dir, "..", ".."))
                                rel_path = os.path.relpath(preview_url, comfyui_root)
                                # 使用自定义图片端点
                                web_url = "/prompt_manage/lora/image?path=" + rel_path.replace("\\", "/")
                                print(f"[PromptManage] Converting {preview_url} -> {web_url}")
                                preview_url = web_url
                            except Exception as e:
                                print(f"[PromptManage] Failed to convert preview path {preview_url}: {e}")
                                preview_url = None
                        
                        loras.append({
                            "name": model_name,
                            "base_model": base_model,
                            "filename": file.replace(".metadata.json", ""),
                            "category": category,
                            "trigger_words": trigger_words,
                            "preview_url": preview_url,
                            "notes": notes,
                            "path": model_path
                        })
                        
                    except json.JSONDecodeError as e:
                        print(f"[PromptManage] Failed to parse JSON in {metadata_path}: {e}")
                    except Exception as e:
                        print(f"[PromptManage] Error reading metadata {metadata_path}: {e}")
    
    except Exception as e:
        print(f"[PromptManage] Error scanning lora directory: {e}")
    
    print(f"[PromptManage] Found {len(loras)} Lora files in {len(categories)} categories: {sorted(list(categories))}")
    
    return {
        "categories": sorted(list(categories)),
        "loras": loras
    }

async def get_loras(request):
    """获取Lora列表API"""
    return web.json_response(get_lora_data())

async def get_lora_image(request):
    """获取Lora预览图片"""
    try:
        # 获取相对路径参数
        rel_path = request.query.get('path', '')
        if not rel_path:
            return web.Response(status=400, text="Missing path parameter")
        
        print(f"[PromptManage] Image request for path: {rel_path}")
        
        # 构建完整路径
        plugin_dir = os.path.dirname(__file__)
        comfyui_root = os.path.normpath(os.path.join(plugin_dir, "..", ".."))
        full_path = os.path.normpath(os.path.join(comfyui_root, rel_path.lstrip('/')))
        
        print(f"[PromptManage] Full path: {full_path}")
        print(f"[PromptManage] ComfyUI root: {comfyui_root}")
        
        # 安全检查：确保路径在允许的目录下
        try:
            # 规范化路径并检查是否在comfyui根目录下
            full_path = os.path.abspath(full_path)
            comfyui_root_abs = os.path.abspath(comfyui_root)
            
            print(f"[PromptManage] Absolute full path: {full_path}")
            print(f"[PromptManage] Absolute comfyui root: {comfyui_root_abs}")
            
            # 确保路径以comfyui根目录开头
            if not full_path.startswith(comfyui_root_abs + os.sep) and full_path != comfyui_root_abs:
                print(f"[PromptManage] Access denied: path not under comfyui root")
                return web.Response(status=403, text="Access denied")
        except Exception as e:
            print(f"[PromptManage] Path validation error: {e}")
            return web.Response(status=403, text="Access denied")
        
        if not os.path.exists(full_path):
            print(f"[PromptManage] File not found: {full_path}")
            return web.Response(status=404, text="File not found")
        
        # 检查文件扩展名
        allowed_image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        allowed_video_exts = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
        
        is_image = any(full_path.lower().endswith(ext) for ext in allowed_image_exts)
        is_video = any(full_path.lower().endswith(ext) for ext in allowed_video_exts)
        
        if not (is_image or is_video):
            print(f"[PromptManage] Invalid file type: {full_path}")
            return web.Response(status=403, text="Invalid file type")
        
        print(f"[PromptManage] Serving {'video' if is_video else 'image'}: {full_path}")
        
        # 如果是视频文件，返回视频数据
        if is_video:
            try:
                with open(full_path, 'rb') as f:
                    content = f.read()
                
                # 根据文件扩展名设置Content-Type
                ext = os.path.splitext(full_path)[1].lower()
                content_type = {
                    '.mp4': 'video/mp4',
                    '.avi': 'video/avi',
                    '.mov': 'video/quicktime',
                    '.mkv': 'video/x-matroska',
                    '.webm': 'video/webm'
                }.get(ext, 'video/mp4')
                
                return web.Response(body=content, content_type=content_type)
            except Exception as e:
                print(f"[PromptManage] Error reading video file: {e}")
                return web.Response(status=500, text="Error reading video file")
        
        # 处理图片文件
        with open(full_path, 'rb') as f:
            content = f.read()
        
        # 根据文件扩展名设置Content-Type
        ext = os.path.splitext(full_path)[1].lower()
        content_type = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }.get(ext, 'image/jpeg')
        
        return web.Response(body=content, content_type=content_type)
        
    except Exception as e:
        print(f"[PromptManage] Error serving image: {e}")
        return web.Response(status=500, text="Internal server error")

# ===== Lora更新功能 =====
# 用于跟踪正在进行的更新任务
_lora_update_tasks = {}

async def refresh_lora_metadata(request):
    """
    刷新Lora元数据 - 从CivitAI获取信息并保存metadata和预览图像
    
    支持两种模式：
    1. ?mode=all - 更新所有未有metadata的Lora文件
    2. ?file=<file_path> - 更新指定的Lora文件
    """
    try:
        plugin_dir = os.path.dirname(__file__)
        lora_dir = os.path.normpath(os.path.join(plugin_dir, "..", "..", "models", "loras"))
        
        if not os.path.exists(lora_dir):
            return web.json_response({
                "success": False,
                "message": f"Lora目录不存在: {lora_dir}"
            }, status=400)
        
        # 初始化更新服务
        service = LoraUpdateService(lora_dir)
        await service.initialize()
        
        mode = request.query.get('mode', 'file').lower()
        
        if mode == 'all':
            # 批量更新模式 - 更新所有未有metadata的Lora
            lora_files = service.scan_local_loras()
            
            if not lora_files:
                return web.json_response({
                    "success": True,
                    "message": "没有需要更新的Lora文件（所有文件都已有metadata）",
                    "updated": 0,
                    "failed": 0,
                    "total": 0
                })
            
            logger.info(f"开始批量更新 {len(lora_files)} 个Lora文件的metadata")
            
            # 创建异步任务进行更新
            async def batch_update():
                success_count, failed_count, failed_files = await service.batch_update_lora_metadata(
                    lora_files,
                    progress_callback=None
                )
                return success_count, failed_count, failed_files
            
            success_count, failed_count, failed_files = await batch_update()
            
            return web.json_response({
                "success": True,
                "message": f"更新完成：成功 {success_count} 个，失败 {failed_count} 个",
                "updated": success_count,
                "failed": failed_count,
                "total": len(lora_files),
                "failed_files": [os.path.basename(f) for f in failed_files]
            })
        
        else:
            # 单个文件更新模式
            file_path = request.query.get('file', '')
            
            if not file_path:
                return web.json_response({
                    "success": False,
                    "message": "缺少 file 参数"
                }, status=400)
            
            # 验证文件路径
            file_path = os.path.normpath(file_path)
            if not os.path.isabs(file_path):
                # 如果是相对路径，相对于lora目录
                file_path = os.path.join(lora_dir, file_path)
            
            if not os.path.exists(file_path):
                return web.json_response({
                    "success": False,
                    "message": f"文件不存在: {file_path}"
                }, status=400)
            
            if not file_path.endswith('.safetensors'):
                return web.json_response({
                    "success": False,
                    "message": "只支持.safetensors格式的文件"
                }, status=400)
            
            logger.info(f"开始更新Lora: {file_path}")
            
            success, message = await service.update_lora_metadata(file_path)
            
            return web.json_response({
                "success": success,
                "message": message,
                "file": os.path.basename(file_path)
            })
    
    except asyncio.CancelledError:
        return web.json_response({
            "success": False,
            "message": "更新已取消"
        }, status=400)
    except Exception as e:
        logger.error(f"Lora更新失败: {e}", exc_info=True)
        return web.json_response({
            "success": False,
            "message": f"更新失败: {str(e)}"
        }, status=500)

async def get_refresh_status(request):
    """获取刷新状态"""
    task_id = request.query.get('task_id', '')
    
    if task_id not in _lora_update_tasks:
        return web.json_response({
            "status": "unknown",
            "message": "任务不存在"
        })
    
    task_data = _lora_update_tasks[task_id]
    
    return web.json_response({
        "status": task_data.get('status', 'running'),
        "progress": task_data.get('progress', 0),
        "message": task_data.get('message', ''),
        "total": task_data.get('total', 0),
        "completed": task_data.get('completed', 0)
    })

# 注册路由
PromptServer.instance.routes.post("/prompt_manage/get")(get_prompts)
PromptServer.instance.routes.post("/prompt_manage/save")(save_prompts_api)
PromptServer.instance.routes.post("/prompt_manage/add")(add_prompt)
PromptServer.instance.routes.post("/prompt_manage/delete")(delete_prompt)
PromptServer.instance.routes.post("/prompt_manage/update")(update_prompt)
PromptServer.instance.routes.get("/prompt_manage/lora/list")(get_loras)
PromptServer.instance.routes.get("/prompt_manage/lora/image")(get_lora_image)
PromptServer.instance.routes.get("/prompt_manage/lora/refresh")(refresh_lora_metadata)
PromptServer.instance.routes.get("/prompt_manage/lora/refresh-status")(get_refresh_status)

# 静态文件服务
web_dir = os.path.join(os.path.dirname(__file__), "web")
PromptServer.instance.app.add_routes([web.static('/prompt_manage_web', web_dir)])

# === 关键修复：让插件正确加载 + extensions JS 被识别 ===
WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]