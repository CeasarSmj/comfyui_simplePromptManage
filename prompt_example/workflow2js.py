#!/usr/bin/env python3
"""
从 generate 目录的图像中提取 ComfyUI workflow metadata
转换为 selected 目录下 JSON 格式保存

使用方法:
    python workflow2js.py

功能:
    1. 读取 generate 目录下所有图像文件的 metadata
    2. 从 ComfyUI workflow JSON 中提取关键参数
    3. 保存为与 selected 目录相同格式的 JSON 文件
"""

import os
import json
import re
import time
from pathlib import Path
from PIL import Image
from typing import Dict, Any, Optional

# ===== 配置 =====
SCRIPT_DIR = Path(__file__).parent
GENERATE_DIR = SCRIPT_DIR / "generate"


# ===== 提取函数 =====

def extract_prompt_from_workflow(workflow: Dict[str, Any]) -> tuple[str, str]:
    """从 ComfyUI workflow 中提取 prompt"""
    # 查找 CLIPTextEncode 节点获取 prompt
    prompt_text = ""
    negative_prompt = ""
    
    for node in workflow.get("nodes", []):
        node_type = node.get("type", "")
        
        # 查找 CLIPTextEncode 节点（包含 prompt）
        if node_type == "CLIPTextEncode":
            widgets = node.get("widgets_values", [])
            if widgets and isinstance(widgets, list) and len(widgets) > 0:
                text = str(widgets[0])
                if text:
                    # 判断是否是 negative prompt
                    if "negative" in text.lower() or "nsfw" in text.lower():
                        negative_prompt = text
                    elif "low quality" in text.lower() or "worst quality" in text.lower():
                        negative_prompt = text
                    elif not prompt_text or len(text) > len(prompt_text):
                        prompt_text = text
    
    return prompt_text, negative_prompt


def extract_negative_from_workflow(workflow: Dict[str, Any], positive: str) -> str:
    """从 ComfyUI workflow 中提取 negative prompt"""
    # 查找 CLIPTextEncode 节点中的 negative prompt
    for node in workflow.get("nodes", []):
        if node.get("type") == "CLIPTextEncode":
            widgets = node.get("widgets_values", [])
            if widgets and isinstance(widgets, list) and len(widgets) > 0:
                text = str(widgets[0])
                # 判断是否是 negative prompt
                if text and text != positive and (
                    "negative" in text.lower() or 
                    "nsfw" in text.lower() or
                    "bad" in text.lower() or
                    "low quality" in text.lower() or
                    "worst quality" in text.lower() or
                    any(kw in text.lower() for kw in ["lowres", "blurry", "deformed", "ugly", "bad anatomy"])
                ):
                    return text
    return ""


def extract_sampler_params_from_workflow(workflow: Dict[str, Any]) -> Dict[str, str]:
    """从 ComfyUI workflow 中提取采样参数"""
    params = {
        "steps": "",
        "sampler": "",
        "cfg_scale": "",
        "seed": "",
        "width": "",
        "height": "",
        "model": ""
    }
    
    # 查找 KSampler 节点
    for node in workflow.get("nodes", []):
        if node.get("type") in ["KSampler", "KSamplerAdvanced"]:
            widgets = node.get("widgets_values", [])
            if widgets and isinstance(widgets, list):
                # KSampler 的 widgets_values 格式: [seed, steps, cfg, sampler_name, scheduler, denoise, model, positive, negative, latent_image]
                if len(widgets) >= 5:
                    params["seed"] = str(widgets[0]) if widgets[0] is not None else ""
                    params["steps"] = str(widgets[1]) if widgets[1] is not None else ""
                    params["cfg_scale"] = str(widgets[2]) if widgets[2] is not None else ""
                    params["sampler"] = str(widgets[3]) if widgets[3] is not None else ""
    
    # 查找 EmptyLatentImage 节点获取宽高
    for node in workflow.get("nodes", []):
        if node.get("type") == "EmptyLatentImage":
            widgets = node.get("widgets_values", [])
            if widgets and isinstance(widgets, list) and len(widgets) >= 2:
                params["width"] = str(widgets[0]) if widgets[0] is not None else ""
                params["height"] = str(widgets[1]) if widgets[1] is not None else ""
    
    # 查找 CheckpointLoaderSimple 节点获取模型
    for node in workflow.get("nodes", []):
        if node.get("type") == "CheckpointLoaderSimple":
            widgets = node.get("widgets_values", [])
            if widgets and isinstance(widgets, list) and len(widgets) > 0:
                params["model"] = str(widgets[0]) if widgets[0] is not None else ""
    
    return params


def extract_metadata_from_image(image_path: Path) -> Optional[Dict[str, Any]]:
    """从图像文件提取 metadata 并转换为目标格式"""
    try:
        with Image.open(image_path) as img:
            if not hasattr(img, "text"):
                return None
            
            text_data = img.text
            workflow_str = text_data.get("workflow", "")
            prompt_str = text_data.get("prompt", "")
            
            # 尝试解析 workflow JSON
            if workflow_str:
                try:
                    workflow = json.loads(workflow_str)
                except json.JSONDecodeError:
                    # 如果 workflow 不是标准 JSON，尝试从 prompt 中提取
                    workflow = {}
            else:
                workflow = {}
            
            # 提取 prompt 和 negative prompt
            if workflow:
                positive, negative = extract_prompt_from_workflow(workflow)
                if not negative:
                    negative = extract_negative_from_workflow(workflow, positive)
                
                # 从 workflow 提取参数
                params = extract_sampler_params_from_workflow(workflow)
            else:
                # 如果没有 workflow，尝试从 prompt 字段解析
                positive = prompt_str
                negative = ""
                params = {"steps": "", "sampler": "", "cfg_scale": "", "seed": "", "width": "", "height": "", "model": ""}
                
                # 尝试从正则表达式提取参数
                positive, params = parse_prompt_string(positive, params)
            
            # 获取图像尺寸
            width = params.get("width", str(img.width))
            height = params.get("height", str(img.height))
            
            result = {
                "file_name": image_path.name,
                "prompt": positive,
                "negative_prompt": negative,
                "steps": params.get("steps", ""),
                "sampler": params.get("sampler", ""),
                "cfg_scale": params.get("cfg_scale", ""),
                "seed": params.get("seed", ""),
                "model": params.get("model", ""),
                "width": width,
                "height": height,
                "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            return result
    except Exception as e:
        print(f"  ❌ 错误: {image_path.name} - {e}")
        return None


def parse_prompt_string(prompt: str, params: Dict[str, str]) -> tuple[str, Dict[str, str]]:
    """从 prompt 字符串中解析参数"""
    # 提取 steps
    steps_match = re.search(r'Steps:\s*(\d+)', prompt)
    if steps_match and not params["steps"]:
        params["steps"] = steps_match.group(1)
    
    # 提取 sampler
    sampler_match = re.search(r'Sampler:\s*([a-zA-Z0-9_]+)', prompt)
    if sampler_match and not params["sampler"]:
        params["sampler"] = sampler_match.group(1)
    
    # 提取 CFG scale
    cfg_match = re.search(r'CFG scale:\s*([\d.]+)', prompt)
    if cfg_match and not params["cfg_scale"]:
        params["cfg_scale"] = cfg_match.group(1)
    
    # 提取 seed
    seed_match = re.search(r'Seed:\s*(\d+)', prompt)
    if seed_match and not params["seed"]:
        params["seed"] = seed_match.group(1)
    
    # 提取 Size
    size_match = re.search(r'Size:\s*(\d+)x(\d+)', prompt)
    if size_match:
        if not params["width"]:
            params["width"] = size_match.group(1)
        if not params["height"]:
            params["height"] = size_match.group(2)
    
    # 提取 Model
    model_match = re.search(r'Model:\s*([^\n,]+)', prompt)
    if model_match and not params["model"]:
        params["model"] = model_match.group(1).strip()
    
    # 分离正负 prompt
    negative_prompt = ""
    if "Negative prompt:" in prompt:
        parts = prompt.split("Negative prompt:", 1)
        prompt = parts[0].strip()
        negative_prompt = parts[1].strip()
    
    return prompt, negative_prompt


def process_directory(directory: Path) -> Dict[str, int]:
    """处理目录中所有图像的 metadata"""
    stats = {
        "total": 0,
        "success": 0,
        "failed": 0,
        "time": 0
    }
    
    if not directory.exists():
        print(f"❌ 目录不存在: {directory}")
        return stats
    
    print(f"\n📁 处理目录: {directory}")
    print("=" * 60)
    
    start_time = time.time()
    
    # 收集所有图像文件
    image_files = []
    for file in directory.iterdir():
        if file.is_file() and file.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
            image_files.append(file)
    
    stats["total"] = len(image_files)
    stats["skipped"] = 0
    print(f"📊 找到 {stats['total']} 个图像文件")
    
    # 处理每个文件
    for i, image_path in enumerate(image_files, 1):
        # 检查是否已有 json 文件
        json_path = image_path.with_suffix('.json')
        
        # 如果已经有了就跳过
        if json_path.exists():
            stats["skipped"] += 1
            continue
        
        # 提取 metadata
        metadata = extract_metadata_from_image(image_path)
        
        if metadata:
            # 保存为 json 文件
            try:
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)
                stats["success"] += 1
                print(f"  ✅ {i}/{stats['total']}: {image_path.name}")
            except Exception as e:
                print(f"  ❌ 保存失败: {image_path.name} - {e}")
                stats["failed"] += 1
        else:
            stats["failed"] += 1
            print(f"  ❌ {i}/{stats['total']}: {image_path.name} (无 metadata)")
    
    stats["time"] = time.time() - start_time
    
    print("\n" + "=" * 60)
    print(f"✅ 处理完成!")
    print(f"  总计: {stats['total']} 个文件")
    print(f"  成功: {stats['success']} 个")
    print(f"  失败: {stats['failed']} 个")
    print(f"  耗时: {stats['time']:.2f} 秒")
    if stats['success'] > 0:
        print(f"  平均: {stats['time'] / stats['success'] * 1000:.1f} ms/文件")
    
    return stats


def main():
    """主函数"""
    print("=" * 60)
    print("  ComfyUI Workflow 转 JSON 工具")
    print("=" * 60)
    print(f"目标目录: {GENERATE_DIR}")
    print("\n将从 generate/ 目录下的图像中提取 ComfyUI workflow")
    print("并转换为与 selected/ 目录相同格式的 JSON 文件")
    
    if not GENERATE_DIR.exists():
        print(f"\n❌ 错误: 目录不存在")
        print(f"   请确保 {GENERATE_DIR} 存在")
        return
    
    # 处理目录
    stats = process_directory(GENERATE_DIR)
    
    # 总计
    print("\n" + "=" * 60)
    print("📊 总计统计")
    print("=" * 60)
    print(f"  总计: {stats['total']} 个文件")
    print(f"  成功: {stats['success']} 个")
    print(f"  失败: {stats['failed']} 个")
    print(f"  总耗时: {stats['time']:.2f} 秒")
    if stats['total'] > 0:
        print(f"  平均速度: {stats['time'] / stats['total'] * 1000:.1f} ms/文件")
    print("\n✅ 所有 workflow 已转换为 JSON 文件!")
    print("   JSON 文件保存在与原图相同的目录中")
    print("=" * 60)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='从 ComfyUI workflow 提取 metadata 到 json 文件')
    parser.add_argument('--dir', type=str, help='指定要处理的目录（默认为 generate 目录）')
    
    args = parser.parse_args()
    
    if args.dir:
        GENERATE_DIR = Path(args.dir).resolve()
    
    main()