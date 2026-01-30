"""
Lora更新服务 - 从CivitAI获取Lora模型信息并保存metadata和预览图像
"""

import os
import json
import logging
import asyncio
import hashlib
from typing import Optional, Dict, List, Tuple
from pathlib import Path
from .civitai_client import CivitaiClient, calculate_sha256

logger = logging.getLogger(__name__)


class LoraUpdateService:
    """Lora模型更新服务"""

    def __init__(self, lora_dir: str):
        """
        初始化Lora更新服务

        Args:
            lora_dir: Lora模型目录路径
        """
        self.lora_dir = lora_dir
        self.civitai_client = None

    async def initialize(self):
        """初始化CivitAI客户端"""
        self.civitai_client = await CivitaiClient.get_instance()

    async def update_lora_metadata(
        self, lora_file_path: str, progress_callback=None
    ) -> Tuple[bool, str]:
        """
        更新单个Lora模型的元数据

        通过计算文件hash，从CivitAI获取模型信息，保存metadata和预览图像

        Args:
            lora_file_path: Lora文件完整路径
            progress_callback: 进度回调函数（已废弃，保留用于兼容）

        Returns:
            (success, message)
        """
        if not os.path.exists(lora_file_path):
            return False, f"文件不存在: {lora_file_path}"

        if not self.civitai_client:
            await self.initialize()

        try:
            # 1. 计算文件hash
            logger.info(f"计算 {os.path.basename(lora_file_path)} 的SHA256...")
            file_hash = calculate_sha256(lora_file_path)
            logger.info(f"SHA256: {file_hash}")

            # 2. 从CivitAI获取模型信息
            logger.info(f"从CivitAI查询模型信息...")
            model_data, error = await self.civitai_client.get_model_by_hash(file_hash)

            if error:
                return False, f"CivitAI查询失败: {error}"

            if not model_data:
                return False, "CivitAI上未找到此模型"

            # 3. 保存metadata
            metadata = self._prepare_metadata(lora_file_path, model_data, file_hash)
            metadata_path = self._get_metadata_path(lora_file_path)

            os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)

            logger.info(f"已保存metadata: {metadata_path}")

            # 4. 下载预览图像
            success_count = 0
            if model_data.get("images") and len(model_data["images"]) > 0:
                for idx, image in enumerate(
                    model_data["images"][:3]
                ):  # 最多下载3张图像
                    image_url = image.get("url")
                    if image_url:
                        success = await self._download_preview_image(
                            image_url, lora_file_path, idx
                        )
                        if success:
                            success_count += 1

            logger.info(f"已下载 {success_count} 张预览图像")

            return True, f"更新成功，已保存metadata和{success_count}张预览图像"

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"更新Lora metadata失败: {e}", exc_info=True)
            return False, f"更新失败: {str(e)}"

    async def batch_update_lora_metadata(
        self, lora_files: List[str], progress_callback=None
    ) -> Tuple[int, int, List[str]]:
        """
        批量更新Lora模型元数据

        Args:
            lora_files: Lora文件路径列表
            progress_callback: 进度回调函数（已废弃，保留用于兼容）

        Returns:
            (成功数, 失败数, 失败文件列表)
        """
        success_count = 0
        failed_files = []

        for idx, lora_file in enumerate(lora_files):
            try:
                success, message = await self.update_lora_metadata(
                    lora_file, progress_callback
                )

                if success:
                    success_count += 1
                    logger.info(
                        f"[{idx+1}/{len(lora_files)}] ✓ {os.path.basename(lora_file)}"
                    )
                else:
                    failed_files.append(lora_file)
                    logger.warning(
                        f"[{idx+1}/{len(lora_files)}] ✗ {os.path.basename(lora_file)}: {message}"
                    )

            except Exception as e:
                failed_files.append(lora_file)
                logger.error(f"处理 {lora_file} 时出错: {e}")

        return success_count, len(lora_files) - success_count, failed_files

    def _prepare_metadata(
        self, lora_file_path: str, civitai_data: Dict, file_hash: str
    ) -> Dict:
        """准备要保存的metadata"""

        base_name = os.path.basename(lora_file_path)
        file_name = os.path.splitext(base_name)[0]

        # 提取基本信息
        model_name = civitai_data.get("name", file_name)

        # 提取触发词
        trained_words = []
        if civitai_data.get("trainedWords"):
            # trainedWords可能是列表或逗号分隔字符串
            words_data = civitai_data.get("trainedWords")
            if isinstance(words_data, list):
                trained_words = words_data
            elif isinstance(words_data, str):
                trained_words = [w.strip() for w in words_data.split(",")]

        # 提取模型ID
        model_id = civitai_data.get("modelId")
        version_id = civitai_data.get("id")

        # 获取第一张图像的预览URL（用于后续参考）
        preview_url = None
        if civitai_data.get("images") and len(civitai_data["images"]) > 0:
            preview_url = civitai_data["images"][0].get("url")

        # 构建metadata
        metadata = {
            "file_name": file_name,
            "file_path": os.path.abspath(lora_file_path),
            "model_name": model_name,
            "sha256": file_hash,
            "size": os.path.getsize(lora_file_path),
            "preview_url": preview_url,
            "notes": civitai_data.get("description", ""),
            "from_civitai": True,
            "civitai": {
                "id": version_id,
                "modelId": model_id,
                "name": civitai_data.get("name", ""),
                "trainedWords": trained_words,
                "description": civitai_data.get("description", ""),
                "baseModel": civitai_data.get("baseModel", "Unknown"),
                "createdAt": civitai_data.get("createdAt", ""),
                "status": civitai_data.get("status", ""),
            },
        }

        return metadata

    def _get_metadata_path(self, lora_file_path: str) -> str:
        """获取metadata文件路径"""
        base = os.path.splitext(lora_file_path)[0]
        return base + ".metadata.json"

    async def _download_preview_image(
        self, image_url: str, lora_file_path: str, index: int = 0
    ) -> bool:
        """
        下载预览图像

        Args:
            image_url: 图像URL
            lora_file_path: Lora文件路径
            index: 图像索引（用于多张图像）

        Returns:
            success
        """
        try:
            # 构建预览图像保存路径
            base = os.path.splitext(lora_file_path)[0]

            # 根据图像格式确定扩展名
            if "jpg" in image_url or "jpeg" in image_url:
                ext = ".jpg"
            elif "png" in image_url:
                ext = ".png"
            elif "gif" in image_url:
                ext = ".gif"
            elif "webp" in image_url:
                ext = ".webp"
            else:
                ext = ".jpg"  # 默认

            if index == 0:
                preview_path = base + ext
            else:
                preview_path = base + f"_preview{index}" + ext

            logger.info(f"下载预览图像: {image_url} -> {preview_path}")
            success = await self.civitai_client.download_preview_image(
                image_url, preview_path
            )

            if success:
                logger.info(f"已保存预览图像: {preview_path}")

            return success

        except Exception as e:
            logger.error(f"下载预览图像失败: {e}")
            return False

    def scan_local_loras(self) -> List[str]:
        """
        扫描本地Lora文件

        Returns:
            Lora文件路径列表
        """
        lora_files = []

        if not os.path.exists(self.lora_dir):
            logger.warning(f"Lora目录不存在: {self.lora_dir}")
            return lora_files

        # 扫描所有.safetensors文件
        for root, dirs, files in os.walk(self.lora_dir):
            for file in files:
                if file.endswith(".safetensors"):
                    full_path = os.path.join(root, file)
                    # 检查是否已有metadata（跳过已更新的）
                    metadata_path = full_path.replace(".safetensors", ".metadata.json")
                    if not os.path.exists(metadata_path):
                        lora_files.append(full_path)

        return lora_files
