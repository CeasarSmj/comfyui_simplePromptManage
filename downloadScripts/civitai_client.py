"""
CivitAI API客户端 - 从CivitAI获取模型信息、下载预览图像和元数据
简化版本，针对comfyui_promptmanage的Lora模型集成
"""

import asyncio
import logging
import os
import json
import hashlib
import aiohttp
from typing import Optional, Dict, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)


class CivitaiClient:
    """CivitAI API 客户端 - 获取Lora模型信息"""

    _instance = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_instance(cls):
        """获取单例实例"""
        async with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def __init__(self):
        """初始化CivitAI客户端"""
        if hasattr(self, "_initialized"):
            return
        self._initialized = True
        self.base_url = "https://civitai.com/api/v1"
        self.timeout = aiohttp.ClientTimeout(total=30)

    async def download_file(
        self, url: str, save_path: str, progress_callback=None
    ) -> Tuple[bool, str]:
        """
        下载文件

        Args:
            url: 下载URL
            save_path: 保存路径
            progress_callback: 进度回调函数（已废弃，保留用于兼容）

        Returns:
            (success, message/path)
        """
        try:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)

            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        logger.warning(f"Failed to download file: HTTP {resp.status}")
                        return False, f"HTTP {resp.status}"

                    content = await resp.read()
                    with open(save_path, "wb") as f:
                        f.write(content)

            return True, save_path
        except asyncio.TimeoutError:
            logger.warning(f"Timeout downloading file: {url}")
            return False, "Timeout"
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            if os.path.exists(save_path):
                try:
                    os.remove(save_path)
                except:
                    pass
            return False, str(e)

    async def get_model_by_hash(
        self, model_hash: str
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        通过SHA256 hash获取模型信息

        Args:
            model_hash: 模型的SHA256 hash值

        Returns:
            (model_data, error_message)
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(
                    f"{self.base_url}/model-versions/by-hash/{model_hash}"
                ) as resp:
                    if resp.status == 404:
                        return None, "模型在CivitAI上未找到"
                    if resp.status != 200:
                        return None, f"API错误: HTTP {resp.status}"

                    data = await resp.json()
                    return data, None
        except asyncio.TimeoutError:
            return None, "请求超时"
        except Exception as e:
            logger.error(f"获取模型信息失败: {e}")
            return None, str(e)

    async def download_preview_image(self, image_url: str, save_path: str) -> bool:
        """
        下载预览图像

        Args:
            image_url: 图像URL
            save_path: 保存路径

        Returns:
            success
        """
        try:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)

            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(image_url) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        with open(save_path, "wb") as f:
                            f.write(content)
                        return True
                    else:
                        logger.warning(f"Failed to download preview image: HTTP {resp.status}")
                        return False
        except asyncio.TimeoutError:
            logger.warning(f"Timeout downloading preview image: {image_url}")
            return False
        except Exception as e:
            logger.error(f"Error downloading preview image: {e}")
            return False

    async def get_model_info(
        self, model_id: int
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        获取模型完整信息

        Args:
            model_id: CivitAI模型ID

        Returns:
            (model_data, error_message)
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(f"{self.base_url}/models/{model_id}") as resp:
                    if resp.status == 404:
                        return None, "模型不存在"
                    if resp.status != 200:
                        return None, f"API错误: HTTP {resp.status}"

                    data = await resp.json()
                    return data, None
        except asyncio.TimeoutError:
            return None, "请求超时"
        except Exception as e:
            logger.error(f"获取模型信息失败: {e}")
            return None, str(e)


def calculate_sha256(file_path: str) -> str:
    """计算文件的SHA256 hash"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()
