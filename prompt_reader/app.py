#!/usr/bin/env python3
"""
Prompt Reader - 超优化版本
使用 orjson 提升 JSON 序列化性能
"""

import os
import json
import asyncio
import logging
import hashlib
import time
from aiohttp import web
from pathlib import Path
from typing import Dict, List, Optional, Any

# 尝试使用 orjson（比标准 json 快很多）
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
        print("⚠️  orjson version does not support OPT_INDENT_2, falling back to standard json")
except ImportError:
    JSON_DUMP = json.dumps
    JSON_LOAD = json.loads
    JSON_ENSURE_ASCII = False
    ORJSON_AVAILABLE = False
    print("⚠️  使用标准 json 库 (建议安装 orjson 以提升性能)")

from PIL import Image

# 配置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ===== 配置 =====
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
LORA_PROMPTS_DIR = PROJECT_ROOT / "lora_prompts"
STATIC_DIR = SCRIPT_DIR / "static"
CACHE_DIR = SCRIPT_DIR / "cache"
DEFAULT_PORT = 8765
DEFAULT_HOST = "127.0.0.1"

STATIC_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

if not LORA_PROMPTS_DIR.exists():
    logger.warning(f"Lora prompts directory not found: {LORA_PROMPTS_DIR}")


# ===== 缓存管理（优化版）=====
class CacheManager:
    """优化的缓存管理器"""

    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.memory_cache: Dict[str, Any] = {}

    def get_cache_file_path(self, category: str) -> Path:
        """获取类别缓存文件路径"""
        safe_category = "".join(
            c for c in category if c.isalnum() or c in ("_", "-")
        ).strip()
        return self.cache_dir / f"lora_prompts_{safe_category}.json"

    def load_from_disk(self, category: str) -> Optional[Dict]:
        """从磁盘加载缓存（使用 orjson 优化）"""
        cache_file = self.get_cache_file_path(category)
        if cache_file.exists():
            try:
                with open(cache_file, "rb") as f:  # 使用二进制模式（orjson 优化）
                    return JSON_LOAD(f.read())
            except Exception as e:
                logger.warning(f"Failed to load cache for {category}: {e}")
        return None

    def save_to_disk(self, category: str, data: Dict):
        """保存缓存到磁盘（使用 orjson 优化）"""
        cache_file = self.get_cache_file_path(category)
        try:
            json_bytes = JSON_DUMP(
                data, option=ORJSON_OPT_INDENT if ORJSON_AVAILABLE else None
            )
            with open(cache_file, "wb") as f:  # 使用二进制模式
                f.write(json_bytes)
        except Exception as e:
            logger.warning(f"Failed to save cache for {category}: {e}")

    def get_memory_cache(self, category: str) -> Optional[Dict]:
        """获取内存缓存"""
        return self.memory_cache.get(category)

    def set_memory_cache(self, category: str, data: Dict):
        """设置内存缓存"""
        self.memory_cache[category] = data

    def compute_hash(self, data_list: List[Dict]) -> str:
        """计算数据列表的哈希值（优化版）"""
        if not data_list:
            return ""
        # 使用更快的哈希计算方式
        hash_input = "|".join(
            [
                f"{item.get('file_name', '')}|{item.get('category', '')}|{item.get('prompt', '')[:50]}"
                for item in data_list[:100]  # 只采样前100个，提升速度
            ]
        )
        return hashlib.md5(hash_input.encode("utf-8")).hexdigest()


cache_manager = CacheManager(CACHE_DIR)


# ===== 图像处理 =====


def extract_metadata_from_json(json_path: Path) -> Optional[Dict[str, Any]]:
    """从 JSON 文件读取 metadata（超快）"""
    try:
        with open(json_path, "rb") as f:  # 二进制模式
            data = JSON_LOAD(f.read())

        return {
            "prompt": data.get("prompt", ""),
            "negative_prompt": data.get("negative_prompt", ""),
            "steps": data.get("steps", ""),
            "sampler": data.get("sampler", ""),
            "cfg_scale": data.get("cfg_scale", ""),
            "seed": data.get("seed", ""),
            "model": data.get("model", ""),
            "width": data.get("width", 0),
            "height": data.get("height", 0),
        }
    except Exception as e:
        return None


def extract_image_metadata(image_path: Path) -> Dict[str, Any]:
    """从图像文件提取 metadata（优化版）"""
    # 优先读取 JSON
    json_path = image_path.with_suffix(".json")
    if json_path.exists():
        metadata = extract_metadata_from_json(json_path)
        if metadata:
            return metadata

    # 从图像提取
    try:
        with Image.open(image_path) as img:
            metadata = {}
            if hasattr(img, "text"):
                metadata = img.text.copy()

            return {
                "prompt": metadata.get("prompt", ""),
                "negative_prompt": metadata.get("negative_prompt", ""),
                "steps": metadata.get("steps", ""),
                "sampler": metadata.get("sampler", ""),
                "cfg_scale": metadata.get("cfg_scale", ""),
                "seed": metadata.get("seed", ""),
                "model": metadata.get("model", ""),
                "width": metadata.get("width", img.width),
                "height": metadata.get("height", img.height),
            }
    except Exception as e:
        logger.warning(f"Error reading metadata from {image_path}: {e}")
        return {}


# ===== 扫描函数（优化版）=====


def scan_lora_prompts(
    category: Optional[str] = None,
    search: Optional[str] = None,
    offset: int = 0,
    limit: int = 200,
) -> Dict[str, Any]:
    """
    扫描lora_prompts目录（超优化版）
    """
    start_time = time.time()

    if not LORA_PROMPTS_DIR.exists():
        return {
            "categories": [],
            "references": [],
            "total": 0,
            "offset": offset,
            "limit": limit,
            "has_more": False,
        }

    category_key = category if category else ""

    # 检查缓存
    cached_data = cache_manager.get_memory_cache(category_key)
    if cached_data is None:
        cached_data = cache_manager.load_from_disk(category_key)
        if cached_data:
            cache_manager.set_memory_cache(category_key, cached_data)

    # 如果有缓存，快速验证
    if cached_data:
        scan_dir = LORA_PROMPTS_DIR
        if category_key:
            scan_dir = LORA_PROMPTS_DIR / category_key

        if scan_dir.exists():
            # 快速统计文件数（只数不读取）
            file_count = sum(1 for _ in scan_dir.glob("*.png")) + sum(
                1 for _ in scan_dir.glob("*.jpg")
            )

            if file_count == cached_data.get("total", 0):
                # 使用缓存
                filtered_references = cached_data["data"]

                # 搜索筛选
                if search:
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

                return {
                    "categories": cached_data.get("categories", []),
                    "references": paginated_references,
                    "total": total,
                    "offset": offset,
                    "limit": limit,
                    "has_more": end_idx < total,
                }
            else:
                cached_data = None

    # 需要重新扫描
    scan_dir = LORA_PROMPTS_DIR
    if category_key:
        scan_dir = LORA_PROMPTS_DIR / category_key
        if not scan_dir.exists():
            return {
                "categories": [],
                "references": [],
                "total": 0,
                "offset": offset,
                "limit": limit,
                "has_more": False,
            }

    # 快速收集文件路径
    image_paths = []
    categories = set()

    for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp"]:
        image_paths.extend(scan_dir.glob(ext))

    # 批量处理
    all_references = []
    for image_path in image_paths:
        metadata = extract_image_metadata(image_path)

        if not metadata["prompt"]:
            continue

        # 获取类别
        rel_dir = image_path.parent.relative_to(LORA_PROMPTS_DIR)
        if str(rel_dir) == ".":
            file_category = "root"
        else:
            file_category = str(rel_dir).replace("\\", "/")

        categories.add(file_category)

        # 获取 lora 名称
        file_name = image_path.name
        base_name = (
            file_name.rsplit("_", 1)[0]
            if "_" in file_name
            else file_name.rsplit(".", 1)[0]
        )

        all_references.append(
            {
                "file_name": file_name,
                "category": file_category,
                "lora_name": base_name,
                "image_url": f"/api/image?path={str(image_path)}",
                "prompt": metadata["prompt"],
                "negative_prompt": metadata["negative_prompt"],
                "width": metadata["width"],
                "height": metadata["height"],
                "steps": metadata["steps"],
                "sampler": metadata["sampler"],
                "cfg_scale": metadata["cfg_scale"],
                "seed": metadata["seed"],
                "model": metadata["model"],
            }
        )

    # 更新缓存
    cache_data = {
        "hash": cache_manager.compute_hash(all_references),
        "data": all_references,
        "total": len(all_references),
        "categories": sorted(list(categories)),
    }
    cache_manager.set_memory_cache(category_key, cache_data)
    cache_manager.save_to_disk(category_key, cache_data)

    filtered_references = all_references

    # 搜索筛选
    if search:
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

    elapsed = time.time() - start_time
    logger.info(
        f"扫描完成: {len(paginated_references)} 条数据, 耗时: {elapsed*1000:.2f}ms"
    )

    return {
        "categories": sorted(list(categories)),
        "references": paginated_references,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": end_idx < total,
    }


# ===== API 路由 =====


async def get_categories(request: web.Request) -> web.Response:
    """获取所有类别列表"""
    if not LORA_PROMPTS_DIR.exists():
        return web.json_response({"categories": []})

    categories = set()
    try:
        for item in LORA_PROMPTS_DIR.iterdir():
            if item.is_dir():
                categories.add(item.name)
        categories.add("root")
    except Exception as e:
        logger.error(f"Error getting categories: {e}")

    return web.json_response({"categories": sorted(list(categories))})


async def get_references(request: web.Request) -> web.Response:
    """获取图像和metadata列表（支持分页和搜索）"""
    start = time.time()

    category = request.query.get("category", None)
    search = request.query.get("search", None)
    try:
        offset = int(request.query.get("offset", 0))
        limit = int(request.query.get("limit", 200))
    except ValueError:
        offset = 0
        limit = 200

    result = scan_lora_prompts(category, search, offset, limit)

    elapsed = (time.time() - start) * 1000
    logger.info(f"API 响应: {len(result['references'])} 条, 耗时: {elapsed:.2f}ms")

    return web.json_response(result)


async def get_image(request: web.Request) -> web.Response:
    """获取图像文件"""
    try:
        rel_path = request.query.get("path", "")
        if not rel_path:
            return web.Response(status=400, text="Missing path parameter")

        image_path = Path(rel_path)

        # 安全检查
        try:
            image_path = image_path.resolve()
            lora_prompts_abs = LORA_PROMPTS_DIR.resolve()

            if not str(image_path).startswith(str(lora_prompts_abs)):
                logger.warning(f"Access denied: path not under lora_prompts")
                return web.Response(status=403, text="Access denied")
        except Exception as e:
            logger.error(f"Path validation error: {e}")
            return web.Response(status=403, text="Access denied")

        if not image_path.exists():
            return web.Response(status=404, text="File not found")

        # 检查文件类型
        allowed_exts = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
        if not image_path.suffix.lower() in allowed_exts:
            return web.Response(status=403, text="Invalid file type")

        # 读取并返回图像
        with open(image_path, "rb") as f:
            content = f.read()

        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }.get(image_path.suffix.lower(), "image/jpeg")

        return web.Response(body=content, content_type=content_type)

    except Exception as e:
        logger.error(f"Error serving image: {e}")
        return web.Response(status=500, text="Internal server error")


async def serve_index(request: web.Request) -> web.Response:
    """提供主页面"""
    index_path = SCRIPT_DIR / "index.html"
    if index_path.exists():
        with open(index_path, "r", encoding="utf-8") as f:
            return web.Response(text=f.read(), content_type="text/html")
    return web.Response(status=404, text="Index page not found")


async def serve_static(request: web.Request) -> web.Response:
    """提供静态文件"""
    filename = request.match_info.get("filename", "")
    static_path = STATIC_DIR / filename

    if static_path.exists() and static_path.is_file():
        content_type_map = {
            ".css": "text/css",
            ".js": "application/javascript",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".json": "application/json",
        }
        content_type = content_type_map.get(
            static_path.suffix.lower(), "application/octet-stream"
        )

        with open(static_path, "rb") as f:
            return web.Response(body=f.read(), content_type=content_type)

    return web.Response(status=404, text="File not found")


# ===== 应用设置 =====


def create_app() -> web.Application:
    """创建并配置aiohttp应用"""
    app = web.Application()

    app.router.add_get("/api/categories", get_categories)
    app.router.add_get("/api/references", get_references)
    app.router.add_get("/api/image", get_image)
    app.router.add_get("/static/{filename:.*}", serve_static)
    app.router.add_get("/", serve_index)
    app.router.add_get("/index.html", serve_index)

    return app


async def main(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
    """启动服务器"""
    app = create_app()

    logger.info(f"Starting Prompt Reader server (Ultra Optimized)...")
    logger.info(f"Lora prompts directory: {LORA_PROMPTS_DIR}")
    logger.info(f"Using orjson: {ORJSON_AVAILABLE}")
    logger.info(f"Open your browser and navigate to: http://{host}:{port}")

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

    logger.info(f"Server running on http://{host}:{port}")

    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
        await runner.cleanup()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Prompt Reader - 超优化版本")
    parser.add_argument(
        "--host", default=DEFAULT_HOST, help="服务器地址 (默认: 127.0.0.1)"
    )
    parser.add_argument(
        "--port", type=int, default=DEFAULT_PORT, help="服务器端口 (默认: 8765)"
    )

    args = parser.parse_args()

    asyncio.run(main(args.host, args.port))
