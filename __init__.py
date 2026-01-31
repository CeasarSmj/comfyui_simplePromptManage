import os
import json
import subprocess
import sys
import asyncio
import logging
import hashlib
import time
import aiohttp
from aiohttp import web
from server import PromptServer

from PIL import Image, PngImagePlugin

from .downloadScripts.lora_update_service import LoraUpdateService

# 尝试使用 orjson（比标准 json 快 2-3 倍）
try:
    import orjson

    JSON_DUMP = orjson.dumps
    JSON_LOAD = orjson.loads
    JSON_ENSURE_ASCII = False
    ORJSON_AVAILABLE = True

    # 检查 orjson 是否支持 OPT_INDENT_2
    try:
        ORJSON_OPT_INDENT = orjson.OPT_INDENT_2
    except AttributeError:
        # 旧版本 orjson 不支持 OPT_INDENT_2，禁用 orjson
        ORJSON_AVAILABLE = False
        JSON_DUMP = json.dumps
        JSON_LOAD = json.loads
except ImportError:
    JSON_DUMP = json.dumps
    JSON_LOAD = json.loads
    JSON_ENSURE_ASCII = False
    ORJSON_AVAILABLE = False

logger = logging.getLogger(__name__)


def is_port_in_use(port: int) -> bool:
    """检查指定端口是否被占用"""
    import socket

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(("127.0.0.1", port))
            return result == 0
    except Exception:
        return False


# 数据文件路径
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "prompts.json")
DEFAULT_FILE = os.path.join(DATA_DIR, "prompts_default.json")
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache", "reference_images")
EXAMPLE_DIR = os.path.join(os.path.dirname(__file__), "prompt_example")

# 确保目录和文件存在
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(EXAMPLE_DIR, exist_ok=True)


# ===== 图像下载和缓存函数 =====
def write_png_metadata(image_path, metadata):
    """将metadata写入PNG文件的tEXt块"""
    try:
        from PIL import Image, PngImagePlugin
        from PIL.PngImagePlugin import PngInfo

        # 打开图像
        img = Image.open(image_path)

        # 创建PngInfo对象
        pnginfo = PngInfo()

        # 写入metadata
        if isinstance(metadata, dict):
            for key, value in metadata.items():
                if value is not None:
                    # 将值转换为字符串
                    str_value = str(value)
                    # PNG的tEXt块只支持Latin-1编码，需要处理非ASCII字符
                    try:
                        pnginfo.add_text(key, str_value)
                    except UnicodeEncodeError:
                        # 对于非ASCII字符，使用UTF-8编码并标记
                        encoded_value = str_value.encode(
                            "utf-8", errors="ignore"
                        ).decode("latin-1")
                        pnginfo.add_text(key, encoded_value)

        # 保存图像（覆盖原文件）
        img.save(image_path, format="PNG", pnginfo=pnginfo)
        return True
    except ImportError:
        logger.error("PIL not installed, cannot write PNG metadata")
        return False
    except Exception as e:
        logger.error(f"Error writing PNG metadata: {e}")
        return False


def save_json_metadata(image_path, metadata):
    """将 metadata 保存为同名的 JSON 文件"""
    try:
        json_path = os.path.splitext(image_path)[0] + ".json"

        # 添加提取时间戳
        json_metadata = metadata.copy()
        json_metadata["extracted_at"] = time.strftime("%Y-%m-%d %H:%M:%S")

        # 使用优化的 JSON 写入
        if ORJSON_AVAILABLE:
            # orjson 返回 bytes，使用 option 参数格式化
            json_bytes = JSON_DUMP(json_metadata, option=ORJSON_OPT_INDENT)
            with open(json_path, "wb") as f:
                f.write(json_bytes)
        else:
            # 标准库回退
            with open(json_path, "w", encoding="utf-8") as f:
                JSON_DUMP(json_metadata, f, ensure_ascii=JSON_ENSURE_ASCII, indent=2)

        return True
    except Exception as e:
        logger.warning(f"Error saving JSON metadata: {e}")
        return False


def load_json_file(file_path, default=None):
    """优化的 JSON 文件读取函数"""
    try:
        if ORJSON_AVAILABLE:
            # orjson 读取二进制模式
            with open(file_path, "rb") as f:
                return JSON_LOAD(f.read())
        else:
            # 标准库回退
            with open(file_path, "r", encoding="utf-8") as f:
                return JSON_LOAD(f)
    except FileNotFoundError:
        return default
    except Exception as e:
        logger.warning(f"Error loading JSON file {file_path}: {e}")
        return default


def save_json_file(file_path, data, indent=2):
    """优化的 JSON 文件写入函数"""
    try:
        if ORJSON_AVAILABLE:
            # orjson 只支持 OPT_INDENT_2（2空格缩进），忽略其他缩进值
            json_bytes = JSON_DUMP(data, option=ORJSON_OPT_INDENT)
            with open(file_path, "wb") as f:
                f.write(json_bytes)
        else:
            # 标准库回退
            with open(file_path, "w", encoding="utf-8") as f:
                JSON_DUMP(data, f, ensure_ascii=JSON_ENSURE_ASCII, indent=indent)
        return True
    except Exception as e:
        logger.warning(f"Error saving JSON file {file_path}: {e}")
        return False


def get_image_cache_path(url):
    """根据URL生成缓存文件路径"""
    # 使用URL的MD5哈希作为文件名
    url_hash = hashlib.md5(url.encode("utf-8")).hexdigest()
    # 确定文件扩展名
    ext = ".jpg"
    if ".png" in url.lower():
        ext = ".png"
    elif ".webp" in url.lower():
        ext = ".webp"
    return os.path.join(CACHE_DIR, url_hash + ext)


async def download_image(url, session):
    """下载图像并缓存"""
    cache_path = get_image_cache_path(url)

    # 如果缓存已存在，直接返回缓存路径
    if os.path.exists(cache_path):
        return cache_path

    try:
        async with session.get(
            url, timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            if response.status == 200:
                content = await response.read()
                with open(cache_path, "wb") as f:
                    f.write(content)
                return cache_path
            else:
                logger.warning(f"Failed to download image: HTTP {response.status}")
                return None
    except asyncio.TimeoutError:
        logger.warning(f"Timeout downloading image: {url}")
        return None
    except Exception as e:
        logger.error(f"Error downloading image: {e}")
        return None


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
        save_json_file(DEFAULT_FILE, [], indent=4)

    # 读取default数据
    default_data = load_json_file(DEFAULT_FILE, [])

    # 如果user文件不存在，创建为default的副本
    if not os.path.exists(DATA_FILE):
        save_json_file(DATA_FILE, default_data, indent=4)
        return

    # 读取user数据
    user_data = load_json_file(DATA_FILE, [])

    # 检查user_data是否是default_data的子集
    if is_subset(user_data, default_data):
        # 如果是子集，同步为最新的default
        save_json_file(DATA_FILE, default_data, indent=4)


def load_prompts():
    # 启动时同步一次
    sync_prompts()
    return load_json_file(DATA_FILE, [])


def save_prompts(data):
    save_json_file(DATA_FILE, data, indent=4)


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
            "text": data.get("text", prompts[index].get("text", "")),
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

    if not os.path.exists(lora_dir):
        logger.warning(f"Lora directory not found: {lora_dir}")
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
                        metadata = load_json_file(metadata_path, None)
                        if metadata is None:
                            continue

                        # 获取类别（目录名）
                        rel_dir = os.path.relpath(root, lora_dir)
                        if rel_dir == ".":
                            category = "root"
                        else:
                            category = rel_dir.replace("\\", "/")

                        categories.add(category)

                        # 从metadata中提取信息
                        model_name = metadata.get(
                            "model_name", metadata.get("file_name", "")
                        )
                        base_model = metadata.get("base_model", "")

                        # 提取触发词
                        trigger_words = []
                        if (
                            "civitai" in metadata
                            and "trainedWords" in metadata["civitai"]
                        ):
                            trained_words = metadata["civitai"]["trainedWords"]
                            if (
                                isinstance(trained_words, list)
                                and len(trained_words) > 0
                            ):
                                # 将所有训练词合并并提取
                                all_words_str = ", ".join(trained_words)
                                # 分割并清理
                                words = [
                                    w.strip()
                                    for w in all_words_str.split(",")
                                    if w.strip()
                                ]
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
                            safetensors_file = os.path.join(
                                root, base_name + ".safetensors"
                            )
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
                                comfyui_root = os.path.normpath(
                                    os.path.join(plugin_dir, "..", "..")
                                )
                                rel_path = os.path.relpath(preview_url, comfyui_root)
                                # 使用自定义图片端点
                                web_url = (
                                    "/prompt_manage/lora/image?path="
                                    + rel_path.replace("\\", "/")
                                )
                                preview_url = web_url
                            except Exception as e:
                                logger.warning(
                                    f"Failed to convert preview path {preview_url}: {e}"
                                )
                                preview_url = None

                        loras.append(
                            {
                                "name": model_name,
                                "base_model": base_model,
                                "filename": file.replace(".metadata.json", ""),
                                "category": category,
                                "trigger_words": trigger_words,
                                "preview_url": preview_url,
                                "notes": notes,
                                "path": model_path,
                            }
                        )

                    except json.decoder.JSONDecodeError as e:
                        logger.warning(f"Failed to parse JSON in {metadata_path}: {e}")
                    except Exception as e:
                        logger.warning(f"Error reading metadata {metadata_path}: {e}")

    except Exception as e:
        logger.error(f"Error scanning lora directory: {e}")

    return {"categories": sorted(list(categories)), "loras": loras}


async def get_loras(request):
    """获取Lora列表API"""
    return web.json_response(get_lora_data())


async def get_lora_image(request):
    """获取Lora预览图片"""
    try:
        # 获取相对路径参数
        rel_path = request.query.get("path", "")
        if not rel_path:
            return web.Response(status=400, text="Missing path parameter")

        # 构建完整路径
        plugin_dir = os.path.dirname(__file__)
        comfyui_root = os.path.normpath(os.path.join(plugin_dir, "..", ".."))
        full_path = os.path.normpath(os.path.join(comfyui_root, rel_path.lstrip("/")))

        # 安全检查：确保路径在允许的目录下
        try:
            # 规范化路径并检查是否在comfyui根目录下
            full_path = os.path.abspath(full_path)
            comfyui_root_abs = os.path.abspath(comfyui_root)

            # 确保路径以comfyui根目录开头
            if (
                not full_path.startswith(comfyui_root_abs + os.sep)
                and full_path != comfyui_root_abs
            ):
                logger.warning(f"Access denied: path not under comfyui root")
                return web.Response(status=403, text="Access denied")
        except Exception as e:
            logger.error(f"Path validation error: {e}")
            return web.Response(status=403, text="Access denied")

        if not os.path.exists(full_path):
            return web.Response(status=404, text="File not found")

        # 检查文件扩展名
        allowed_image_exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
        allowed_video_exts = [".mp4", ".avi", ".mov", ".mkv", ".webm"]

        is_image = any(full_path.lower().endswith(ext) for ext in allowed_image_exts)
        is_video = any(full_path.lower().endswith(ext) for ext in allowed_video_exts)

        if not (is_image or is_video):
            return web.Response(status=403, text="Invalid file type")

        # 如果是视频文件，返回视频数据
        if is_video:
            try:
                with open(full_path, "rb") as f:
                    content = f.read()

                # 根据文件扩展名设置Content-Type
                ext = os.path.splitext(full_path)[1].lower()
                content_type = {
                    ".mp4": "video/mp4",
                    ".avi": "video/avi",
                    ".mov": "video/quicktime",
                    ".mkv": "video/x-matroska",
                    ".webm": "video/webm",
                }.get(ext, "video/mp4")

                return web.Response(body=content, content_type=content_type)
            except Exception as e:
                logger.error(f"Error reading video file: {e}")
                return web.Response(status=500, text="Error reading video file")

        # 处理图片文件
        with open(full_path, "rb") as f:
            content = f.read()

        # 根据文件扩展名设置Content-Type
        ext = os.path.splitext(full_path)[1].lower()
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }.get(ext, "image/jpeg")

        return web.Response(body=content, content_type=content_type)

    except Exception as e:
        logger.error(f"Error serving image: {e}")
        return web.Response(status=500, text="Internal server error")


# ===== 下载任务管理器 =====
_download_task = {
    "running": False,
    "cancelled": False,
    "progress": 0,
    "total": 0,
    "category_progress": {},  # {category: {"completed": 0, "total": 0}}
}


def cancel_download():
    """取消下载任务"""
    _download_task["cancelled"] = True
    _download_task["running"] = False


def is_download_cancelled():
    """检查下载是否被取消"""
    return _download_task.get("cancelled", False)


def reset_download_task():
    """重置下载任务状态"""
    _download_task["running"] = False
    _download_task["cancelled"] = False
    _download_task["progress"] = 0
    _download_task["total"] = 0
    _download_task["category_progress"] = {}


def update_category_progress(category, completed, total):
    """更新目录进度"""
    if category not in _download_task["category_progress"]:
        _download_task["category_progress"][category] = {"completed": 0, "total": 0}
    _download_task["category_progress"][category]["completed"] = completed
    _download_task["category_progress"][category]["total"] = total


# ===== 缓存管理 =====
_reference_cache = {
    "categories": [],
    "data_hash": "",
    "category_cache": {},  # {category: {"hash": "", "data": [], "total": 0}}
}


def get_category_cache_path(category):
    """获取类别缓存文件的路径"""
    if not category:
        category = "all"
    safe_category = "".join(
        c for c in category if c.isalnum() or c in ("_", "-")
    ).strip()
    return os.path.join(CACHE_DIR, f"reference_cache_{safe_category}.json")


def compute_data_hash(data_list):
    """计算数据列表的哈希值"""
    if not data_list:
        return ""

    # 创建一个可哈希的字符串表示
    hash_input = "|".join(
        [
            f"{item['lora_name']}|{item['category']}|{item['prompt'][:50]}"
            for item in data_list
        ]
    )
    return hashlib.md5(hash_input.encode("utf-8")).hexdigest()


def load_category_cache(category):
    """从磁盘加载类别缓存"""
    cache_path = get_category_cache_path(category)
    if os.path.exists(cache_path):
        return load_json_file(cache_path)
    return None


def save_category_cache(category, cache_data):
    """保存类别缓存到磁盘"""
    cache_path = get_category_cache_path(category)
    try:
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        save_json_file(cache_path, cache_data, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save cache for category {category}: {e}")


async def get_prompt_reference_data(category=None, search=None, offset=0, limit=200):
    """
    从本地示例图目录读取图像和PNG metadata中的提示词信息
    支持分页加载，带缓存机制

    Args:
        category: 类别筛选（None或空字符串表示所有类别）
        search: 搜索关键词（None表示不搜索）
        offset: 偏移量（从第几条开始）
        limit: 返回数量限制（默认100条）
    """
    plugin_dir = os.path.dirname(__file__)
    comfyui_root = os.path.normpath(os.path.join(plugin_dir, "..", ".."))

    if not os.path.exists(EXAMPLE_DIR):
        return {"categories": [], "references": [], "total": 0}

    # 使用空字符串表示"全部类别"以避免None和空字符串的混淆
    category_key = category if category else ""

    # 检查是否有缓存
    cache_key = category_key
    if cache_key not in _reference_cache["category_cache"]:
        # 尝试从磁盘加载缓存
        disk_cache = load_category_cache(cache_key)
        if disk_cache:
            _reference_cache["category_cache"][cache_key] = disk_cache

    # 扫描指定类别的目录
    scan_dir = EXAMPLE_DIR
    if category_key:
        scan_dir = os.path.join(EXAMPLE_DIR, category_key)
        if not os.path.exists(scan_dir):
            # 类别目录不存在，返回空结果
            return {
                "categories": [],
                "references": [],
                "total": 0,
                "offset": offset,
                "limit": limit,
                "has_more": False,
            }

    all_references = []
    categories = set()

    try:
        # 只扫描指定的目录（不递归子目录，因为每个类别是一个独立的目录）
        for root, dirs, files in os.walk(scan_dir):
            # 如果指定了类别，不要深入子目录（除非类别本身就是嵌套的）
            if category_key and root != scan_dir:
                continue

            for file in files:
                if file.lower().endswith((".png", ".jpg", ".jpeg")):
                    image_path = os.path.join(root, file)

                    try:
                        # 优先尝试读取 JSON 文件
                        json_path = os.path.splitext(image_path)[0] + ".json"
                        png_metadata = {}

                        if os.path.exists(json_path):
                            try:
                                json_metadata = load_json_file(json_path)
                                if json_metadata:
                                    png_metadata = {
                                        "prompt": json_metadata.get("prompt", ""),
                                        "negative_prompt": json_metadata.get(
                                            "negative_prompt", ""
                                        ),
                                        "steps": json_metadata.get("steps", ""),
                                        "sampler": json_metadata.get("sampler", ""),
                                        "cfg_scale": json_metadata.get("cfg_scale", ""),
                                        "seed": json_metadata.get("seed", ""),
                                        "model": json_metadata.get("model", ""),
                                        "width": json_metadata.get("width", 0),
                                        "height": json_metadata.get("height", 0),
                                        "lora_name": json_metadata.get("lora_name", ""),
                                    }
                            except Exception as e:
                                logger.debug(
                                    f"Failed to read JSON for {file}: {e}, falling back to image"
                                )
                                png_metadata = {}

                        # 如果 JSON 不存在或读取失败，从图像提取
                        if not png_metadata:
                            # 读取图像和PNG metadata
                            with Image.open(image_path) as img:
                                if hasattr(img, "text"):
                                    png_metadata = img.text.copy()

                                # 获取图像尺寸（如果metadata中没有）
                                if (
                                    "width" not in png_metadata
                                    or "height" not in png_metadata
                                ):
                                    png_metadata["width"] = img.width
                                    png_metadata["height"] = img.height

                        # 提取提示词
                        prompt = png_metadata.get("prompt", "")
                        if not prompt:
                            continue

                        # 获取类别（目录名）
                        rel_dir = os.path.relpath(root, EXAMPLE_DIR)
                        if rel_dir == ".":
                            file_category = "root"
                        else:
                            file_category = rel_dir.replace("\\", "/")

                        categories.add(file_category)

                        # 获取Lora名称
                        lora_name = png_metadata.get("lora_name", file)

                        # 获取负向提示词
                        negative_prompt = png_metadata.get("negative_prompt", "")

                        # 生成图像URL
                        try:
                            rel_path = os.path.relpath(image_path, comfyui_root)
                            image_url = (
                                "/prompt_manage/example/image?path="
                                + rel_path.replace("\\", "/")
                            )
                        except Exception as e:
                            logger.warning(f"Failed to convert image path: {e}")
                            continue

                        all_references.append(
                            {
                                "lora_name": lora_name,
                                "category": file_category,
                                "image_url": image_url,
                                "prompt": prompt,
                                "negative_prompt": negative_prompt,
                                "width": png_metadata.get(
                                    "width", png_metadata["width"]
                                ),
                                "height": png_metadata.get(
                                    "height", png_metadata["height"]
                                ),
                                "steps": png_metadata.get("steps", ""),
                                "sampler": png_metadata.get("sampler", ""),
                                "cfg_scale": png_metadata.get("cfg_scale", ""),
                                "seed": png_metadata.get("seed", ""),
                                "model": png_metadata.get("model", ""),
                            }
                        )
                    except Exception as e:
                        logger.warning(f"Error reading image {image_path}: {e}")
                        continue  # 跳过有问题的图像文件

    except Exception as e:
        logger.error(f"Error scanning for prompt reference: {e}")

    # 计算数据的哈希值
    current_hash = compute_data_hash(all_references)

    # 检查缓存是否有效
    cache_data = _reference_cache["category_cache"].get(cache_key)
    if cache_data and cache_data.get("hash") == current_hash:
        # 使用缓存的数据
        filtered_references = cache_data["data"]
        logger.debug(f"Using cached data for category {cache_key}")
    else:
        # 更新缓存
        # 先应用搜索筛选（因为搜索不影响缓存）
        if search:
            search_lower = search.lower()
            all_references = [
                ref
                for ref in all_references
                if (
                    search_lower in ref["lora_name"].lower()
                    or search_lower in ref["prompt"].lower()
                )
            ]

        cache_data = {
            "hash": current_hash,
            "data": all_references,
            "total": len(all_references),
        }
        _reference_cache["category_cache"][cache_key] = cache_data
        # 保存到磁盘
        save_category_cache(cache_key, cache_data)
        filtered_references = all_references

    # 如果有搜索条件，再次筛选（因为缓存的数据可能不包含搜索筛选）
    if search and cache_data.get("hash") == current_hash:
        search_lower = search.lower()
        filtered_references = [
            ref
            for ref in filtered_references
            if (
                search_lower in ref["lora_name"].lower()
                or search_lower in ref["prompt"].lower()
            )
        ]

    # 分页
    total = len(filtered_references)
    start_idx = offset
    end_idx = min(offset + limit, total)
    paginated_references = filtered_references[start_idx:end_idx]

    # 获取所有类别列表（只在category为空时扫描）
    all_categories = sorted(list(categories))
    if not category_key and all_categories:
        # 更新全局类别缓存
        _reference_cache["categories"] = all_categories

    return {
        "categories": all_categories,
        "references": paginated_references,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": end_idx < total,
    }


async def get_prompt_references(request):
    """获取提示词参考数据API（支持分页）"""
    # 获取查询参数
    category = request.query.get("category", None)
    search = request.query.get("search", None)
    try:
        offset = int(request.query.get("offset", 0))
        limit = int(request.query.get("limit", 200))
    except ValueError:
        offset = 0
        limit = 200

    return web.json_response(
        await get_prompt_reference_data(category, search, offset, limit)
    )


async def get_cache_image(request):
    """获取缓存的图像"""
    try:
        # 获取相对路径参数
        rel_path = request.query.get("path", "")
        if not rel_path:
            return web.Response(status=400, text="Missing path parameter")

        # 构建完整路径
        plugin_dir = os.path.dirname(__file__)
        comfyui_root = os.path.normpath(os.path.join(plugin_dir, "..", ".."))
        full_path = os.path.normpath(os.path.join(comfyui_root, rel_path.lstrip("/")))

        # 安全检查
        try:
            full_path = os.path.abspath(full_path)
            comfyui_root_abs = os.path.abspath(comfyui_root)

            if (
                not full_path.startswith(comfyui_root_abs + os.sep)
                and full_path != comfyui_root_abs
            ):
                logger.warning(f"Access denied: path not under comfyui root")
                return web.Response(status=403, text="Access denied")
        except Exception as e:
            logger.error(f"Path validation error: {e}")
            return web.Response(status=403, text="Access denied")

        if not os.path.exists(full_path):
            return web.Response(status=404, text="File not found")

        # 检查文件扩展名
        allowed_image_exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

        is_image = any(full_path.lower().endswith(ext) for ext in allowed_image_exts)

        if not is_image:
            return web.Response(status=403, text="Invalid file type")

        # 读取图像文件
        with open(full_path, "rb") as f:
            content = f.read()

        # 根据文件扩展名设置Content-Type
        ext = os.path.splitext(full_path)[1].lower()
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }.get(ext, "image/jpeg")

        return web.Response(body=content, content_type=content_type)

    except Exception as e:
        logger.error(f"Error serving cache image: {e}")
        return web.Response(status=500, text="Internal server error")


async def download_prompt_examples(request):
    """下载提示词示例图并写入metadata"""
    import requests

    # 检查是否有正在运行的任务
    if _download_task["running"]:
        return web.json_response(
            {"success": False, "message": "已有下载任务正在运行"}, status=400
        )
    plugin_dir = os.path.dirname(__file__)
    lora_dir = os.path.normpath(os.path.join(plugin_dir, "..", "..", "models", "loras"))
    comfyui_root = os.path.normpath(os.path.join(plugin_dir, "..", ".."))
    if not os.path.exists(lora_dir):
        return web.json_response(
            {"success": False, "message": f"Lora目录不存在: {lora_dir}"}, status=400
        )
    # 初始化任务状态
    reset_download_task()
    _download_task["running"] = True
    success_count = 0
    failed_count = 0
    skipped_count = 0
    failed_items = []
    total_images = 0
    processed_images = 0
    # 先统计总图像数
    for root, dirs, files in os.walk(lora_dir):
        for file in files:
            if file.endswith(".metadata.json"):
                metadata_path = os.path.join(root, file)
                try:
                    metadata = load_json_file(metadata_path)
                    if (
                        metadata
                        and "civitai" in metadata
                        and "images" in metadata["civitai"]
                    ):
                        images = metadata["civitai"].get("images", [])
                        for img in images:
                            if "meta" in img and "prompt" in img["meta"]:
                                prompt = img["meta"]["prompt"]
                                if prompt and prompt.strip():
                                    total_images += 1
                except Exception:
                    pass
    _download_task["total"] = total_images
    # 创建requests会话，带User-Agent头避免403
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    )

    try:
        for root, dirs, files in os.walk(lora_dir):
            # 检查是否被取消
            if is_download_cancelled():
                logger.info("Download cancelled by user")
                break
            for file in files:
                if file.endswith(".metadata.json"):
                    metadata_path = os.path.join(root, file)
                    try:
                        metadata = load_json_file(metadata_path)
                        if metadata is None:
                            continue
                        # 获取类别（目录名）
                        rel_dir = os.path.relpath(root, lora_dir)
                        if rel_dir == ".":
                            category = "root"
                        else:
                            category = rel_dir.replace("\\", "/")
                        # 创建示例图目录
                        example_category_dir = os.path.join(EXAMPLE_DIR, category)
                        os.makedirs(example_category_dir, exist_ok=True)
                        # 获取模型名称
                        model_name = metadata.get(
                            "model_name", metadata.get("file_name", "")
                        )

                        # 检查civitai数据中是否有图像和提示词
                        if "civitai" in metadata and "images" in metadata["civitai"]:
                            civitai_data = metadata["civitai"]
                            images = civitai_data.get("images", [])
                            # 遍历所有图像，下载有提示词的图像
                            for idx, img in enumerate(images):
                                # 检查是否被取消
                                if is_download_cancelled():
                                    logger.info("Download cancelled by user")
                                    break
                                if "meta" in img and "prompt" in img["meta"]:
                                    prompt = img["meta"]["prompt"]
                                    # 检查提示词是否为空
                                    if not prompt or not prompt.strip():
                                        skipped_count += 1
                                        continue
                                    image_url = img.get("url", "")
                                    if not image_url:
                                        skipped_count += 1
                                        continue
                                    # 生成文件名
                                    base_name = file.replace(".metadata.json", "")
                                    safe_model_name = "".join(
                                        c
                                        for c in model_name
                                        if c.isalnum() or c in (" ", "-", "_")
                                    ).strip()
                                    filename = f"{safe_model_name}_{idx}.png"
                                    save_path = os.path.join(
                                        example_category_dir, filename
                                    )

                                    # 检查同名文件是否存在
                                    if os.path.exists(save_path):
                                        skipped_count += 1
                                        continue
                                    # 下载图像
                                    try:
                                        response = session.get(image_url, timeout=60)
                                        if response.status_code == 200:
                                            content = response.content
                                            # 保存图像
                                            with open(save_path, "wb") as f:
                                                f.write(content)
                                            # 准备metadata
                                            png_metadata = {
                                                "prompt": prompt,
                                                "negative_prompt": img["meta"].get(
                                                    "negativePrompt", ""
                                                ),
                                                "steps": img["meta"].get("steps", ""),
                                                "sampler": img["meta"].get(
                                                    "sampler", ""
                                                ),
                                                "cfg_scale": img["meta"].get(
                                                    "cfgScale", ""
                                                ),
                                                "seed": img["meta"].get("seed", ""),
                                                "width": img.get("width", ""),
                                                "height": img.get("height", ""),
                                                "model": img["meta"].get("Model", ""),
                                                "lora_name": model_name,
                                                "lora_category": category,
                                            }

                                            # 写入PNG metadata和JSON文件
                                            write_png_metadata(save_path, png_metadata)
                                            save_json_metadata(save_path, png_metadata)
                                            success_count += 1
                                            processed_images += 1
                                            _download_task["progress"] = (
                                                processed_images
                                            )
                                        else:
                                            logger.warning(
                                                f"Failed to download: HTTP {response.status_code}"
                                            )
                                            failed_count += 1
                                            processed_images += 1
                                            _download_task["progress"] = (
                                                processed_images
                                            )
                                            failed_items.append(image_url)
                                    except requests.exceptions.Timeout:
                                        logger.warning(
                                            f"Timeout downloading: {image_url}"
                                        )
                                        failed_count += 1
                                        processed_images += 1
                                        _download_task["progress"] = processed_images
                                        failed_items.append(image_url)
                                    except Exception as e:
                                        logger.error(
                                            f"Error downloading {image_url}: {e}"
                                        )
                                        failed_count += 1
                                        processed_images += 1
                                        _download_task["progress"] = processed_images
                                        failed_items.append(image_url)
                    except json.decoder.JSONDecodeError as e:
                        logger.warning(f"Failed to parse JSON in {metadata_path}: {e}")
                    except Exception as e:
                        logger.warning(f"Error processing {metadata_path}: {e}")
    except Exception as e:
        logger.error(f"Error scanning for prompt examples: {e}")
        return web.json_response(
            {"success": False, "message": f"扫描失败: {str(e)}"}, status=500
        )
    finally:
        session.close()
        _download_task["running"] = False

    logger.info(
        f"Download completed: {success_count} success, {failed_count} failed, {skipped_count} skipped"
    )

    return web.json_response(
        {
            "success": True,
            "message": f"下载完成！成功: {success_count}, 失败: {failed_count}, 跳过: {skipped_count}",
            "success_count": success_count,
            "failed_count": failed_count,
            "skipped_count": skipped_count,
            "failed_items": failed_items[:10],  # 只返回前10个失败的
        }
    )


async def get_download_status(request):
    """获取下载状态"""
    return web.json_response(
        {
            "running": _download_task["running"],
            "cancelled": _download_task["cancelled"],
            "progress": _download_task["progress"],
            "total": _download_task["total"],
            "category_progress": _download_task.get("category_progress", {}),
        }
    )


async def cancel_download_api(request):
    """取消下载任务"""
    if _download_task["running"]:
        cancel_download()
        return web.json_response({"success": True, "message": "下载任务已取消"})
    else:
        return web.json_response(
            {"success": False, "message": "没有正在运行的下载任务"}, status=400
        )


async def get_example_image(request):
    """获取示例图图像"""
    try:
        # 获取相对路径参数
        rel_path = request.query.get("path", "")
        if not rel_path:
            return web.Response(status=400, text="Missing path parameter")

        # 构建完整路径
        plugin_dir = os.path.dirname(__file__)
        comfyui_root = os.path.normpath(os.path.join(plugin_dir, "..", ".."))
        full_path = os.path.normpath(os.path.join(comfyui_root, rel_path.lstrip("/")))

        # 安全检查
        try:
            full_path = os.path.abspath(full_path)
            comfyui_root_abs = os.path.abspath(comfyui_root)

            if (
                not full_path.startswith(comfyui_root_abs + os.sep)
                and full_path != comfyui_root_abs
            ):
                logger.warning(f"Access denied: path not under comfyui root")
                return web.Response(status=403, text="Access denied")
        except Exception as e:
            logger.error(f"Path validation error: {e}")
            return web.Response(status=403, text="Access denied")

        if not os.path.exists(full_path):
            return web.Response(status=404, text="File not found")

        # 检查文件扩展名
        allowed_image_exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

        is_image = any(full_path.lower().endswith(ext) for ext in allowed_image_exts)

        if not is_image:
            return web.Response(status=403, text="Invalid file type")

        # 读取图像文件
        with open(full_path, "rb") as f:
            content = f.read()

        # 根据文件扩展名设置Content-Type
        ext = os.path.splitext(full_path)[1].lower()
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }.get(ext, "image/jpeg")

        return web.Response(body=content, content_type=content_type)

    except Exception as e:
        logger.error(f"Error serving example image: {e}")
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
        lora_dir = os.path.normpath(
            os.path.join(plugin_dir, "..", "..", "models", "loras")
        )

        if not os.path.exists(lora_dir):
            return web.json_response(
                {"success": False, "message": f"Lora目录不存在: {lora_dir}"}, status=400
            )

        # 初始化更新服务
        service = LoraUpdateService(lora_dir)
        await service.initialize()

        mode = request.query.get("mode", "file").lower()

        if mode == "all":
            # 批量更新模式 - 更新所有未有metadata的Lora
            lora_files = service.scan_local_loras()

            if not lora_files:
                return web.json_response(
                    {
                        "success": True,
                        "message": "没有需要更新的Lora文件（所有文件都已有metadata）",
                        "updated": 0,
                        "failed": 0,
                        "total": 0,
                    }
                )

            logger.info(f"开始批量更新 {len(lora_files)} 个Lora文件的metadata")

            # 创建异步任务进行更新
            async def batch_update():
                success_count, failed_count, failed_files = (
                    await service.batch_update_lora_metadata(
                        lora_files, progress_callback=None
                    )
                )
                return success_count, failed_count, failed_files

            success_count, failed_count, failed_files = await batch_update()

            return web.json_response(
                {
                    "success": True,
                    "message": f"更新完成：成功 {success_count} 个，失败 {failed_count} 个",
                    "updated": success_count,
                    "failed": failed_count,
                    "total": len(lora_files),
                    "failed_files": [os.path.basename(f) for f in failed_files],
                }
            )

        else:
            # 单个文件更新模式
            file_path = request.query.get("file", "")

            if not file_path:
                return web.json_response(
                    {"success": False, "message": "缺少 file 参数"}, status=400
                )

            # 验证文件路径
            file_path = os.path.normpath(file_path)
            if not os.path.isabs(file_path):
                # 如果是相对路径，相对于lora目录
                file_path = os.path.join(lora_dir, file_path)

            if not os.path.exists(file_path):
                return web.json_response(
                    {"success": False, "message": f"文件不存在: {file_path}"},
                    status=400,
                )

            if not file_path.endswith(".safetensors"):
                return web.json_response(
                    {"success": False, "message": "只支持.safetensors格式的文件"},
                    status=400,
                )

            logger.info(f"开始更新Lora: {file_path}")

            success, message = await service.update_lora_metadata(file_path)

            return web.json_response(
                {
                    "success": success,
                    "message": message,
                    "file": os.path.basename(file_path),
                }
            )

    except asyncio.CancelledError:
        return web.json_response(
            {"success": False, "message": "更新已取消"}, status=400
        )
    except Exception as e:
        logger.error(f"Lora更新失败: {e}", exc_info=True)
        return web.json_response(
            {"success": False, "message": f"更新失败: {str(e)}"}, status=500
        )


async def get_refresh_status(request):
    """获取刷新状态"""
    task_id = request.query.get("task_id", "")

    if task_id not in _lora_update_tasks:
        return web.json_response({"status": "unknown", "message": "任务不存在"})

    task_data = _lora_update_tasks[task_id]

    return web.json_response(
        {
            "status": task_data.get("status", "running"),
            "progress": task_data.get("progress", 0),
            "message": task_data.get("message", ""),
            "total": task_data.get("total", 0),
            "completed": task_data.get("completed", 0),
        }
    )


# 注册路由
PromptServer.instance.routes.post("/prompt_manage/get")(get_prompts)
PromptServer.instance.routes.post("/prompt_manage/save")(save_prompts_api)
PromptServer.instance.routes.post("/prompt_manage/add")(add_prompt)
PromptServer.instance.routes.post("/prompt_manage/delete")(delete_prompt)
PromptServer.instance.routes.post("/prompt_manage/update")(update_prompt)
PromptServer.instance.routes.get("/prompt_manage/lora/list")(get_loras)
PromptServer.instance.routes.get("/prompt_manage/lora/image")(get_lora_image)
PromptServer.instance.routes.get("/prompt_manage/lora/refresh")(refresh_lora_metadata)
PromptServer.instance.routes.get("/prompt_manage/lora/refresh-status")(
    get_refresh_status
)
PromptServer.instance.routes.get("/prompt_manage/reference/list")(get_prompt_references)
PromptServer.instance.routes.get("/prompt_manage/reference/download")(
    download_prompt_examples
)
PromptServer.instance.routes.get("/prompt_manage/reference/cancel")(cancel_download_api)
PromptServer.instance.routes.get("/prompt_manage/reference/status")(get_download_status)
PromptServer.instance.routes.get("/prompt_manage/example/image")(get_example_image)
PromptServer.instance.routes.get("/prompt_manage/cache/image")(get_cache_image)

# ===== Prompt Reader 相关 API =====

# 检查 prompt_reader 是否已经在运行
prompt_reader_process = None
PROMPT_READER_URL = "http://127.0.0.1:8765"


async def start_prompt_reader(request):
    """启动 Prompt Reader 服务器"""
    global prompt_reader_process

    try:
        # 检查端口是否被占用（更可靠的方法）
        if is_port_in_use(8765):
            logger.info("Prompt Reader already running on port 8765")
            return web.json_response(
                {
                    "status": "success",
                    "url": PROMPT_READER_URL,
                    "message": "Prompt Reader 已经在运行",
                }
            )

        # 检查进程是否也在运行（作为备用检查）
        if prompt_reader_process and prompt_reader_process.poll() is None:
            logger.info("Prompt Reader process still running")
            return web.json_response(
                {
                    "status": "success",
                    "url": PROMPT_READER_URL,
                    "message": "Prompt Reader 已经在运行",
                }
            )

        # 获取 prompt_reader 目录
        script_dir = os.path.dirname(__file__)
        prompt_reader_dir = os.path.join(script_dir, "prompt_reader")
        app_py = os.path.join(prompt_reader_dir, "app.py")

        # 检查 app.py 是否存在
        if not os.path.exists(app_py):
            return web.json_response(
                {"status": "error", "message": f"Prompt Reader 未找到: {app_py}"},
                status=404,
            )

        # 启动新进程运行 prompt_reader
        # Windows 上需要 CREATE_NEW_PROCESS_GROUP 来避免 Ctrl+C 影响
        if sys.platform == "win32":
            # 使用 CREATE_NEW_PROCESS_GROUP 标志在新窗口中启动
            creation_flags = (
                subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
            )
            # 使用 start 命令在新窗口中启动，使用 sys.executable 确保使用相同的 Python 环境
            start_cmd = f'start "Prompt Reader" cmd /c "cd /d {prompt_reader_dir} && {sys.executable} app.py"'
            subprocess.Popen(start_cmd, shell=True)
        else:
            # Linux/Mac
            subprocess.Popen(
                [sys.executable, app_py],
                cwd=prompt_reader_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

        logger.info(f"Starting Prompt Reader at {PROMPT_READER_URL}")

        # 等待一下让服务器启动
        await asyncio.sleep(2)

        return web.json_response(
            {
                "status": "success",
                "url": PROMPT_READER_URL,
                "message": "Prompt Reader 已启动",
            }
        )

    except Exception as e:
        logger.error(f"Error starting prompt reader: {e}")
        return web.json_response(
            {"status": "error", "message": f"启动失败: {str(e)}"}, status=500
        )


# 添加路由
PromptServer.instance.routes.post("/prompt_manage/start_prompt_reader")(
    start_prompt_reader
)


# ===== 下载脚本相关 API =====


async def download_by_civitaiwebnum(request):
    """执行 download_by_civitaiwebnum.py"""
    try:
        script_dir = os.path.dirname(__file__)
        script_path = os.path.join(
            script_dir, "downloadScripts", "download_by_civitaiwebnum.py"
        )

        if not os.path.exists(script_path):
            return web.json_response(
                {"status": "error", "message": f"Script not found: {script_path}"},
                status=404,
            )

        # 在新窗口中执行脚本
        if sys.platform == "win32":
            download_scripts_dir = os.path.join(script_dir, "downloadScripts")
            # 使用 sys.executable 确保使用相同的 Python 环境
            # 添加 pause 以便看到错误信息
            start_cmd = f'start "Download by CivitAI" cmd /c "cd /d {download_scripts_dir} && {sys.executable} download_by_civitaiwebnum.py && pause"'
            subprocess.Popen(start_cmd, shell=True)
        else:
            subprocess.Popen(
                [sys.executable, script_path],
                cwd=os.path.join(script_dir, "downloadScripts"),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

        logger.info(f"Started download_by_civitaiwebnum.py")
        return web.json_response(
            {
                "status": "success",
                "message": "Download by CivitAI started in new window",
            }
        )

    except Exception as e:
        logger.error(f"Error starting download_by_civitaiwebnum: {e}")
        return web.json_response(
            {"status": "error", "message": f"Failed to start: {str(e)}"}, status=500
        )


async def download_lora_images(request):
    """执行 download_lora_images.py"""
    try:
        script_dir = os.path.dirname(__file__)
        script_path = os.path.join(
            script_dir, "downloadScripts", "download_lora_images.py"
        )

        if not os.path.exists(script_path):
            return web.json_response(
                {"status": "error", "message": f"Script not found: {script_path}"},
                status=404,
            )

        # 在新窗口中执行脚本
        if sys.platform == "win32":
            download_scripts_dir = os.path.join(script_dir, "downloadScripts")
            # 使用 sys.executable 确保使用相同的 Python 环境
            # 添加 pause 以便看到错误信息
            start_cmd = f'start "Download Lora Images" cmd /c "cd /d {download_scripts_dir} && {sys.executable} download_lora_images.py && pause"'
            subprocess.Popen(start_cmd, shell=True)
        else:
            subprocess.Popen(
                [sys.executable, script_path],
                cwd=os.path.join(script_dir, "downloadScripts"),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

        logger.info(f"Started download_lora_images.py")
        return web.json_response(
            {
                "status": "success",
                "message": "Download Lora Images started in new window",
            }
        )

    except Exception as e:
        logger.error(f"Error starting download_lora_images: {e}")
        return web.json_response(
            {"status": "error", "message": f"Failed to start: {str(e)}"}, status=500
        )


# 添加路由
PromptServer.instance.routes.post("/prompt_manage/download_by_civitaiwebnum")(
    download_by_civitaiwebnum
)
PromptServer.instance.routes.post("/prompt_manage/download_lora_images")(
    download_lora_images
)


# ===== 上传图像功能 =====


def extract_workflow_metadata(image_data: bytes):
    """
    从图像数据中提取 ComfyUI workflow metadata
    如果没有 workflow 格式的 metadata，尝试从 prompt 字段提取
    与 workflow2js.py 的逻辑保持一致
    """
    import io
    import re
    from PIL import Image

    try:
        img = Image.open(io.BytesIO(image_data))

        if not hasattr(img, "text"):
            return None

        text_data = img.text
        workflow_str = text_data.get("workflow", "")
        prompt_str = text_data.get("prompt", "")

        # 初始化结果
        result = {
            "prompt": "",
            "negative_prompt": "",
            "steps": "",
            "sampler": "",
            "cfg_scale": "",
            "seed": "",
            "model": "",
            "width": str(img.width),
            "height": str(img.height),
        }

        # 尝试解析 workflow JSON
        workflow = None
        if workflow_str:
            try:
                workflow = json.loads(workflow_str)
            except json.JSONDecodeError:
                workflow = None

        # 如果有 workflow，从中提取参数
        if workflow:
            # 提取 prompt 和 negative prompt
            prompt_text = ""
            negative_prompt = ""

            for node in workflow.get("nodes", []):
                node_type = node.get("type", "")

                if node_type == "CLIPTextEncode":
                    widgets = node.get("widgets_values", [])
                    if widgets and isinstance(widgets, list) and len(widgets) > 0:
                        text = str(widgets[0])
                        if text:
                            # 判断是否是 negative prompt
                            if "negative" in text.lower() or "nsfw" in text.lower():
                                negative_prompt = text
                            elif (
                                "low quality" in text.lower()
                                or "worst quality" in text.lower()
                            ):
                                negative_prompt = text
                            elif not prompt_text or len(text) > len(prompt_text):
                                prompt_text = text

            # 提取采样参数
            params = {
                "steps": "",
                "sampler": "",
                "cfg_scale": "",
                "seed": "",
                "width": "",
                "height": "",
                "model": "",
            }

            for node in workflow.get("nodes", []):
                if node.get("type") in ["KSampler", "KSamplerAdvanced"]:
                    widgets = node.get("widgets_values", [])
                    if widgets and isinstance(widgets, list) and len(widgets) >= 5:
                        params["seed"] = (
                            str(widgets[0]) if widgets[0] is not None else ""
                        )
                        params["steps"] = (
                            str(widgets[1]) if widgets[1] is not None else ""
                        )
                        params["cfg_scale"] = (
                            str(widgets[2]) if widgets[2] is not None else ""
                        )
                        params["sampler"] = (
                            str(widgets[3]) if widgets[3] is not None else ""
                        )

            for node in workflow.get("nodes", []):
                if node.get("type") == "EmptyLatentImage":
                    widgets = node.get("widgets_values", [])
                    if widgets and isinstance(widgets, list) and len(widgets) >= 2:
                        params["width"] = (
                            str(widgets[0]) if widgets[0] is not None else ""
                        )
                        params["height"] = (
                            str(widgets[1]) if widgets[1] is not None else ""
                        )

            for node in workflow.get("nodes", []):
                if node.get("type") == "CheckpointLoaderSimple":
                    widgets = node.get("widgets_values", [])
                    if widgets and isinstance(widgets, list) and len(widgets) > 0:
                        params["model"] = (
                            str(widgets[0]) if widgets[0] is not None else ""
                        )

            result["prompt"] = prompt_text
            result["negative_prompt"] = negative_prompt
            result["steps"] = params.get("steps", "")
            result["sampler"] = params.get("sampler", "")
            result["cfg_scale"] = params.get("cfg_scale", "")
            result["seed"] = params.get("seed", "")
            result["model"] = params.get("model", "")
            result["width"] = params.get("width", str(img.width))
            result["height"] = params.get("height", str(img.height))
        else:
            # 如果没有 workflow，尝试从 prompt 字段解析（与 workflow2js.py 一致）
            if prompt_str:
                result["prompt"] = prompt_str
                result["negative_prompt"] = ""

                # 尝试从正则表达式提取参数
                steps_match = re.search(r"Steps:\s*(\d+)", prompt_str)
                if steps_match:
                    result["steps"] = steps_match.group(1)

                sampler_match = re.search(r"Sampler:\s*([a-zA-Z0-9_]+)", prompt_str)
                if sampler_match:
                    result["sampler"] = sampler_match.group(1)

                cfg_match = re.search(r"CFG scale:\s*([\d.]+)", prompt_str)
                if cfg_match:
                    result["cfg_scale"] = cfg_match.group(1)

                seed_match = re.search(r"Seed:\s*(\d+)", prompt_str)
                if seed_match:
                    result["seed"] = seed_match.group(1)

                size_match = re.search(r"Size:\s*(\d+)x(\d+)", prompt_str)
                if size_match:
                    result["width"] = size_match.group(1)
                    result["height"] = size_match.group(2)

                model_match = re.search(r"Model:\s*([^\n,]+)", prompt_str)
                if model_match:
                    result["model"] = model_match.group(1).strip()

                # 分离正负 prompt
                if "Negative prompt:" in prompt_str:
                    parts = prompt_str.split("Negative prompt:", 1)
                    result["prompt"] = parts[0].strip()
                    result["negative_prompt"] = parts[1].strip()

        return result

    except Exception as e:
        logger.warning(f"Error extracting workflow metadata: {e}")
        return None


async def upload_images(request):
    """
    上传图像文件，保存到 generate/ 目录，并提取 metadata 保存为 JSON
    """
    try:
        data = await request.json()
        files = data.get("files", [])

        if not files:
            return web.json_response(
                {"success": False, "message": "No files provided"}, status=400
            )

        import base64
        import io

        success_count = 0
        failed_count = 0
        errors = []

        for file_info in files:
            try:
                file_name = file_info.get("name", "")
                file_data = file_info.get("data", "")

                if not file_name or not file_data:
                    failed_count += 1
                    errors.append(f"Invalid file data: {file_name}")
                    continue

                # 解码 base64 数据
                if "," in file_data:
                    file_data = file_data.split(",", 1)[1]

                image_bytes = base64.b64decode(file_data)

                # 生成唯一文件名（防止冲突）
                base_name = os.path.splitext(file_name)[0]
                ext = os.path.splitext(file_name)[1].lower()
                if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
                    ext = ".png"  # 默认使用 PNG

                # 检查文件名是否已存在，如果存在则添加时间戳
                dest_path = os.path.join(EXAMPLE_DIR, "generate", file_name)
                if os.path.exists(dest_path):
                    timestamp = int(time.time())
                    dest_path = os.path.join(
                        EXAMPLE_DIR, "generate", f"{base_name}_{timestamp}{ext}"
                    )

                # 保存图像文件
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, "wb") as f:
                    f.write(image_bytes)

                # 提取 metadata
                metadata = extract_workflow_metadata(image_bytes)

                # 准备保存的 JSON 数据
                json_metadata = {
                    "file_name": os.path.basename(dest_path),
                    "prompt": metadata.get("prompt", "") if metadata else "",
                    "negative_prompt": (
                        metadata.get("negative_prompt", "") if metadata else ""
                    ),
                    "steps": metadata.get("steps", "") if metadata else "",
                    "sampler": metadata.get("sampler", "") if metadata else "",
                    "cfg_scale": metadata.get("cfg_scale", "") if metadata else "",
                    "seed": metadata.get("seed", "") if metadata else "",
                    "model": metadata.get("model", "") if metadata else "",
                    "width": metadata.get("width", "") if metadata else "",
                    "height": metadata.get("height", "") if metadata else "",
                    "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                }

                # 检查是否提取到了有效数据
                has_metadata = metadata and (
                    metadata.get("prompt")
                    or metadata.get("steps")
                    or metadata.get("sampler")
                    or metadata.get("cfg_scale")
                    or metadata.get("seed")
                    or metadata.get("model")
                )

                if not has_metadata:
                    logger.info(
                        f"No valid metadata found in {file_name}, saving with minimal fields"
                    )

                # 保存 JSON 文件
                json_path = os.path.splitext(dest_path)[0] + ".json"
                save_json_file(json_path, json_metadata, indent=2)

                success_count += 1

            except Exception as e:
                failed_count += 1
                errors.append(f"{file_info.get('name', 'unknown')}: {str(e)}")
                logger.error(
                    f"Error processing uploaded file {file_info.get('name')}: {e}"
                )

        result = {
            "success": True,
            "success_count": success_count,
            "failed_count": failed_count,
            "message": f"Processed {success_count + failed_count} files: {success_count} successful, {failed_count} failed",
        }

        if errors:
            result["errors"] = errors[:10]  # 只返回前10个错误

        return web.json_response(result)

    except Exception as e:
        logger.error(f"Error in upload_images: {e}")
        return web.json_response(
            {"success": False, "message": f"Server error: {str(e)}"}, status=500
        )


# 添加上传图像路由
PromptServer.instance.routes.post("/prompt_manage/upload_images")(upload_images)

# 静态文件服务
web_dir = os.path.join(os.path.dirname(__file__), "web")
PromptServer.instance.app.add_routes([web.static("/prompt_manage_web", web_dir)])

# === 关键修复：让插件正确加载 + extensions JS 被识别 ===
WEB_DIRECTORY = "web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
