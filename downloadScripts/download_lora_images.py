#!/usr/bin/env python3
"""
独立的 Lora 图像下载脚本
从 ComfyUI 的 Lora metadata 文件中读取提示词信息，下载示例图并写入 PNG metadata

使用方法:
    python download_images.py [--lora-dir PATH] [--output-dir PATH]

参数:
    --lora-dir: Lora 模型目录路径 (默认: ComfyUI/models/loras)
    --output-dir: 输出目录路径 (默认: lora_prompts)
"""

import os
import json
import argparse
import logging
import sys
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def write_png_metadata(image_path, metadata):
    """将 metadata 写入 PNG 文件的 tEXt 块"""
    try:
        from PIL import Image, PngImagePlugin
        from PIL.PngImagePlugin import PngInfo

        # 打开图像
        img = Image.open(image_path)

        # 创建 PngInfo 对象
        pnginfo = PngInfo()

        # 写入 metadata
        if isinstance(metadata, dict):
            for key, value in metadata.items():
                if value is not None:
                    # 将值转换为字符串
                    str_value = str(value)
                    # PNG 的 tEXt 块只支持 Latin-1 编码，需要处理非 ASCII 字符
                    try:
                        pnginfo.add_text(key, str_value)
                    except UnicodeEncodeError:
                        # 对于非 ASCII 字符，使用 UTF-8 编码并标记
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
        json_path = Path(image_path).with_suffix('.json')
        
        # 添加提取时间戳
        json_metadata = metadata.copy()
        import time
        json_metadata["extracted_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_metadata, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving JSON metadata: {e}")
        return False


def download_image(image_url, save_path):
    """下载图像并保存到指定路径"""
    try:
        import requests
    except ImportError:
        logger.error("requests not installed, run: pip install requests")
        return False

    try:
        # 创建会话，带 User-Agent 头避免 403
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

        response = session.get(image_url, timeout=60)
        if response.status_code == 200:
            with open(save_path, "wb") as f:
                f.write(response.content)
            return True
        else:
            logger.warning(f"Failed to download image: HTTP {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error downloading image {image_url}: {e}")
        return False
    finally:
        session.close()


def scan_and_download(lora_dir, output_dir):
    """
    扫描 Lora 目录，下载提示词示例图并写入 metadata

    Args:
        lora_dir: Lora 模型目录路径
        output_dir: 输出目录路径
    """
    lora_dir = os.path.normpath(lora_dir)
    output_dir = os.path.normpath(output_dir)

    if not os.path.exists(lora_dir):
        logger.error(f"Lora directory not found: {lora_dir}")
        return

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)

    success_count = 0
    failed_count = 0
    skipped_count = 0
    failed_items = []

    logger.info(f"开始扫描 Lora 目录: {lora_dir}")

    # 先统计总图像数
    total_images = 0
    for root, dirs, files in os.walk(lora_dir):
        for file in files:
            if file.endswith(".metadata.json"):
                metadata_path = os.path.join(root, file)
                try:
                    with open(metadata_path, "r", encoding="utf-8") as f:
                        metadata = json.load(f)
                    if "civitai" in metadata and "images" in metadata["civitai"]:
                        images = metadata["civitai"].get("images", [])
                        for img in images:
                            if "meta" in img and "prompt" in img["meta"]:
                                prompt = img["meta"]["prompt"]
                                if prompt and prompt.strip():
                                    total_images += 1
                except Exception:
                    pass

    logger.info(f"找到 {total_images} 个带提示词的图像")

    processed_images = 0

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

                    # 创建示例图目录
                    example_category_dir = os.path.join(output_dir, category)
                    os.makedirs(example_category_dir, exist_ok=True)

                    # 获取模型名称
                    model_name = metadata.get("model_name", metadata.get("file_name", ""))

                    # 检查 civitai 数据中是否有图像和提示词
                    if "civitai" in metadata and "images" in metadata["civitai"]:
                        civitai_data = metadata["civitai"]
                        images = civitai_data.get("images", [])

                        # 遍历所有图像，下载有提示词的图像
                        for idx, img in enumerate(images):
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
                                    c for c in model_name if c.isalnum() or c in (" ", "-", "_")
                                ).strip()
                                filename = f"{safe_model_name}_{idx}.png"
                                save_path = os.path.join(example_category_dir, filename)

                                # 检查同名文件是否存在
                                if os.path.exists(save_path):
                                    logger.debug(f"文件已存在，跳过: {save_path}")
                                    skipped_count += 1
                                    continue

                                # 下载图像
                                logger.info(f"[{processed_images + 1}/{total_images}] 下载: {filename}")
                                if download_image(image_url, save_path):
                                    # 准备 metadata
                                    png_metadata = {
                                        "prompt": prompt,
                                        "negative_prompt": img["meta"].get("negativePrompt", ""),
                                        "steps": img["meta"].get("steps", ""),
                                        "sampler": img["meta"].get("sampler", ""),
                                        "cfg_scale": img["meta"].get("cfgScale", ""),
                                        "seed": img["meta"].get("seed", ""),
                                        "width": img.get("width", ""),
                                        "height": img.get("height", ""),
                                        "model": img["meta"].get("Model", ""),
                                        "lora_name": model_name,
                                        "lora_category": category,
                                    }

                                    # 写入 PNG metadata 和 JSON 文件
                                    if write_png_metadata(save_path, png_metadata):
                                        # 同时保存 JSON 文件
                                        save_json_metadata(save_path, png_metadata)
                                        success_count += 1
                                        logger.info(f"  成功: {filename}")
                                    else:
                                        logger.warning(f"  写入 metadata 失败: {filename}")
                                        failed_count += 1
                                        failed_items.append(image_url)
                                else:
                                    logger.warning(f"  下载失败: {image_url}")
                                    failed_count += 1
                                    failed_items.append(image_url)

                                processed_images += 1

                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON in {metadata_path}: {e}")
                except Exception as e:
                    logger.warning(f"Error processing {metadata_path}: {e}")

    # 打印总结
    logger.info("=" * 50)
    logger.info("下载完成!")
    logger.info(f"  成功: {success_count}")
    logger.info(f"  失败: {failed_count}")
    logger.info(f"  跳过: {skipped_count}")
    if failed_items:
        logger.info(f"  失败的 URL (前10个):")
        for url in failed_items[:10]:
            logger.info(f"    - {url}")
    logger.info("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description="从 Lora metadata 下载提示词示例图并写入 PNG metadata"
    )
    parser.add_argument(
        "--lora-dir",
        type=str,
        default=None,
        help="Lora 模型目录路径 (默认: ComfyUI/models/loras)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="输出目录路径 (默认: lora_prompts)"
    )

    args = parser.parse_args()

    # 确定默认路径
    script_dir = os.path.dirname(os.path.abspath(__file__))

    if args.lora_dir is None:
        # 默认: 相对于插件目录的 ComfyUI/models/loras
        lora_dir = os.path.normpath(os.path.join(script_dir, "..", "..", "models", "loras"))
    else:
        lora_dir = os.path.abspath(args.lora_dir)

    if args.output_dir is None:
        # 默认: 插件目录下的 lora_prompts
        output_dir = os.path.join(script_dir, "lora_prompts")
    else:
        output_dir = os.path.abspath(args.output_dir)

    logger.info(f"Lora 目录: {lora_dir}")
    logger.info(f"输出目录: {output_dir}")

    # 执行下载
    scan_and_download(lora_dir, output_dir)


if __name__ == "__main__":
    main()