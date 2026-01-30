#!/usr/bin/env python3
"""
图像 Metadata 提取脚本
将 lora_prompts 目录下所有图像的 metadata 提取到同名的 .json 文件中
这样 prompt_reader 就可以直接读取 json 文件，无需每次都打开图像
"""

import os
import json
import time
from pathlib import Path
from PIL import Image
from typing import Dict, Any, Optional

# ===== 配置 =====
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
LORA_PROMPTS_DIR = PROJECT_ROOT / "prompt_example"

# ===== 提取函数 =====

def extract_metadata_from_image(image_path: Path) -> Optional[Dict[str, Any]]:
    """从图像文件提取 metadata"""
    try:
        with Image.open(image_path) as img:
            metadata = {}
            
            # 获取PNG metadata
            if hasattr(img, "text"):
                metadata = img.text.copy()
            
            # 提取常用字段
            result = {
                "file_name": image_path.name,
                "prompt": metadata.get("prompt", ""),
                "negative_prompt": metadata.get("negative_prompt", ""),
                "steps": metadata.get("steps", ""),
                "sampler": metadata.get("sampler", ""),
                "cfg_scale": metadata.get("cfg_scale", ""),
                "seed": metadata.get("seed", ""),
                "model": metadata.get("model", ""),
                "width": metadata.get("width", img.width),
                "height": metadata.get("height", img.height),
                "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            return result
    except Exception as e:
        print(f"  ❌ 错误: {image_path.name} - {e}")
        return None


def extract_metadata_for_directory(directory: Path, force: bool = False) -> Dict[str, int]:
    """
    提取目录中所有图像的 metadata
    
    Args:
        directory: 要处理的目录
        force: 是否强制重新提取（覆盖已有json文件）
    
    Returns:
        统计信息字典
    """
    stats = {
        "total": 0,
        "success": 0,
        "skipped": 0,
        "failed": 0,
        "time": 0
    }
    
    if not directory.exists():
        print(f"❌ 目录不存在: {directory}")
        return stats
    
    print(f"\n📁 处理目录: {directory}")
    print("="*60)
    
    start_time = time.time()
    
    # 收集所有图像文件
    image_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                image_files.append(Path(root) / file)
    
    stats["total"] = len(image_files)
    print(f"📊 找到 {stats['total']} 个图像文件")
    
    # 处理每个文件
    for i, image_path in enumerate(image_files, 1):
        # 检查是否已有json文件
        json_path = image_path.with_suffix('.json')
        
        if json_path.exists() and not force:
            stats["skipped"] += 1
            if i % 100 == 0:
                print(f"  进度: {i}/{stats['total']} | ✅ {stats['success']} | ⏭️  {stats['skipped']} | ❌ {stats['failed']}")
            continue
        
        # 提取 metadata
        metadata = extract_metadata_from_image(image_path)
        
        if metadata:
            # 保存为 json 文件
            try:
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)
                stats["success"] += 1
            except Exception as e:
                print(f"  ❌ 保存失败: {image_path.name} - {e}")
                stats["failed"] += 1
        else:
            stats["failed"] += 1
        
        # 显示进度
        if i % 50 == 0:
            elapsed = time.time() - start_time
            avg_time = elapsed / i * 1000
            print(f"  进度: {i}/{stats['total']} | ✅ {stats['success']} | ⏭️  {stats['skipped']} | ❌ {stats['failed']} | ⏱️  {avg_time:.1f}ms/文件")
    
    stats["time"] = time.time() - start_time
    
    print("\n" + "="*60)
    print(f"✅ 处理完成!")
    print(f"  总计: {stats['total']} 个文件")
    print(f"  成功: {stats['success']} 个")
    print(f"  跳过: {stats['skipped']} 个 (已有json文件)")
    print(f"  失败: {stats['failed']} 个")
    print(f"  耗时: {stats['time']:.2f} 秒")
    if stats['success'] > 0:
        print(f"  平均: {stats['time'] / stats['success'] * 1000:.1f} ms/文件")
    
    return stats


def main():
    """主函数"""
    print("="*60)
    print("  图像 Metadata 提取工具")
    print("="*60)
    print(f"目标目录: {LORA_PROMPTS_DIR}")
    
    if not LORA_PROMPTS_DIR.exists():
        print(f"\n❌ 错误: 目录不存在")
        print(f"   请确保 {LORA_PROMPTS_DIR} 存在")
        return
    
    # 统计信息
    total_stats = {
        "total": 0,
        "success": 0,
        "skipped": 0,
        "failed": 0,
        "time": 0
    }
    
    # 处理根目录
    root_stats = extract_metadata_for_directory(LORA_PROMPTS_DIR)
    for key in total_stats:
        total_stats[key] += root_stats[key]
    
    # 处理子目录
    subdirs = [d for d in LORA_PROMPTS_DIR.iterdir() if d.is_dir()]
    if subdirs:
        print(f"\n📂 找到 {len(subdirs)} 个子目录，开始处理...")
        
        for subdir in sorted(subdirs):
            subdir_stats = extract_metadata_for_directory(subdir)
            for key in total_stats:
                total_stats[key] += subdir_stats[key]
    
    # 总计
    print("\n" + "="*60)
    print("📊 总计统计")
    print("="*60)
    print(f"  总计: {total_stats['total']} 个文件")
    print(f"  成功: {total_stats['success']} 个")
    print(f"  跳过: {total_stats['skipped']} 个")
    print(f"  失败: {total_stats['failed']} 个")
    print(f"  总耗时: {total_stats['time']:.2f} 秒")
    if total_stats['total'] > 0:
        print(f"  平均速度: {total_stats['time'] / total_stats['total'] * 1000:.1f} ms/文件")
    print("\n✅ 所有 metadata 已提取完成!")
    print("   现在可以启动 prompt_reader 了")
    print("="*60)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='提取图像 metadata 到 json 文件')
    parser.add_argument('--force', action='store_true', help='强制重新提取（覆盖已有json文件）')
    
    args = parser.parse_args()
    
    main()
