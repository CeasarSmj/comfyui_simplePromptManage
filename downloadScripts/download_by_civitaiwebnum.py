"""
CivitAI图像下载工具
从selected_img_list.txt读取图像ID列表，使用Selenium下载图像并将元数据写入PNG文件和JSON文件
"""

import os
import json
import requests
from PIL import Image, PngImagePlugin
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import time
import sys

# 配置
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent  # 项目根目录
LIST_FILE = PROJECT_ROOT / "prompt_example" / "selected_img_list.txt"
OUTPUT_DIR = PROJECT_ROOT / "prompt_example" / "selected"
OUTPUT_DIR.mkdir(exist_ok=True)

# CivitAI API配置
GENERATION_DATA_API = "https://civitai.com/api/trpc/image.getGenerationData"
IMAGE_BASE_URL = "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA"

# 请求头
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
}


def get_selenium_driver():
    """创建Selenium Chrome driver"""
    chrome_options = Options()
    chrome_options.add_argument('--headless=new')  # 使用新的headless模式，减少错误
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-software-rasterizer')  # 禁用软件光栅化
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-logging')
    chrome_options.add_argument('--log-level=3')  # 只显示致命错误
    chrome_options.add_argument('--disable-features=VizDisplayCompositor')
    chrome_options.add_argument('--disable-webgl')  # 禁用 WebGL
    chrome_options.add_argument('--disable-webgl2')  # 禁用 WebGL2
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    # 禁用一些会导致错误的特性
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    return webdriver.Chrome(options=chrome_options)


def get_image_info_from_page(image_id: int, driver):
    """从CivitAI页面获取图像URL和基本信息"""
    url = f"https://civitai.com/images/{image_id}"
    driver.get(url)

    # 等待页面加载完成
    time.sleep(10)

    image_data = driver.execute_script("""
        if (typeof window.__NEXT_DATA__ !== 'undefined') {
            const queries = window.__NEXT_DATA__.props.pageProps.trpcState.json.queries;
            for (const query of queries) {
                const data = query.state.data;
                if (data && data.id === parseInt(window.location.pathname.split('/').pop())) {
                    return {
                        url: data.url,
                        width: data.width,
                        height: data.height,
                        name: data.name
                    };
                }
            }
        }
        return null;
    """)

    return image_data


def get_generation_data(image_id: int):
    """通过API获取图像的生成参数"""
    try:
        params = {
            "input": json.dumps({"json": {"id": image_id}})
        }
        response = requests.get(GENERATION_DATA_API, params=params, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            data = response.json()
            return data['result']['data']['json']
        else:
            print(f"  Error fetching generation data: HTTP {response.status_code}")
            return None
    except requests.Timeout:
        print(f"  Timeout fetching generation data")
        return None
    except Exception as e:
        print(f"  Error fetching generation data: {e}")
        return None


def download_image(image_url: str, save_path: str) -> bool:
    """下载图像文件"""
    try:
        response = requests.get(image_url, headers=HEADERS, timeout=60)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"  Failed to download image: HTTP {response.status_code}")
            return False
    except requests.Timeout:
        print(f"  Timeout downloading image")
        return False
    except Exception as e:
        print(f"  Error downloading image: {e}")
        return False


def write_metadata_to_image(image_path: str, gen_data: dict, image_info: dict):
    """将元数据写入PNG图像文件和JSON文件"""
    try:
        img = Image.open(image_path)

        # 安全获取 meta 数据
        meta = gen_data.get("meta") if gen_data else None
        if meta is None:
            meta = {}

        # 构建metadata字典，参考项目中其他图像的格式
        metadata = {
            "prompt": meta.get("prompt", ""),
            "negative_prompt": meta.get("negativePrompt", ""),
            "steps": str(meta.get("steps", "")),
            "sampler": meta.get("sampler", ""),
            "cfg_scale": str(meta.get("cfgScale", "")),
            "seed": str(meta.get("seed", "")),
            "width": str(image_info.get("width", "")),
            "height": str(image_info.get("height", "")),
            "model": meta.get("Model", ""),
        }

        # 添加LORA信息
        resources = gen_data.get("resources", []) if gen_data else []
        loras = [r for r in resources if r.get("modelType") == "LORA"]
        if loras:
            lora_names = ", ".join([lora.get("modelName", "") for lora in loras])
            metadata["lora_name"] = lora_names

        # 使用PngImagePlugin写入metadata
        pnginfo = PngImagePlugin.PngInfo()
        for key, value in metadata.items():
            pnginfo.add_text(key, str(value))

        # 保存图像（覆盖原文件）
        img.save(image_path, "PNG", pnginfo=pnginfo)
        print(f"  Metadata written to PNG successfully")
        
        # 同时保存 JSON 文件
        save_json_metadata(image_path, metadata)
        print(f"  Metadata written to JSON successfully")

    except Exception as e:
        print(f"  Error writing metadata: {e}")


def save_json_metadata(image_path: str, metadata: dict):
    """将 metadata 保存为同名的 JSON 文件"""
    try:
        json_path = Path(image_path).with_suffix('.json')
        
        # 添加提取时间戳
        json_metadata = metadata.copy()
        json_metadata["extracted_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        json_metadata["file_name"] = Path(image_path).name
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_metadata, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"  Error saving JSON metadata: {e}")


def check_image_exists(image_id: int) -> bool:
    """检查是否已存在以指定id开头的图像文件"""
    for file in OUTPUT_DIR.iterdir():
        if file.is_file() and file.name.startswith(f"{image_id}_"):
            return True
    return False


def process_image(image_id: str, driver):
    """处理单个图像的下载和元数据写入"""
    image_id = int(image_id.strip())
    print(f"\nProcessing image ID: {image_id}")

    # 检查是否已存在该id开头的文件
    if check_image_exists(image_id):
        print(f"  Image already exists, skipping...")
        return True

    # 1. 从页面获取图像URL和基本信息
    print("  Fetching image info from page...")
    image_info = get_image_info_from_page(image_id, driver)
    if not image_info:
        print("  Failed to get image info from page")
        return False

    # 2. 下载图像
    # CivitAI图像URL格式: https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/{url}/original=true,quality=90/{filename}
    image_url = f"{IMAGE_BASE_URL}/{image_info['url']}/original=true,quality=90/{image_info['name']}"
    print(f"  Downloading image...")
    output_filename = f"{image_id}_{image_info['name']}"
    output_path = OUTPUT_DIR / output_filename

    if not download_image(image_url, str(output_path)):
        print("  Failed to download image")
        return False
    print(f"  Image saved to: {output_path}")

    # 3. 获取生成数据
    print("  Fetching generation data...")
    gen_data = get_generation_data(image_id)
    if not gen_data:
        print("  Failed to get generation data")
        return False

    # 4. 将元数据写入图像和JSON文件
    print("  Writing metadata to image and JSON...")
    write_metadata_to_image(str(output_path), gen_data, image_info)

    return True


def main():
    """主函数"""
    # 检查列表文件
    if not LIST_FILE.exists():
        print(f"Error: List file not found: {LIST_FILE}")
        print(f"Please create {LIST_FILE} with image IDs (one per line)")
        sys.exit(1)

    # 读取图像ID列表
    with open(LIST_FILE, 'r', encoding='utf-8') as f:
        image_ids = [line.strip() for line in f if line.strip()]

    if not image_ids:
        print("No image IDs found in the list file")
        sys.exit(1)

    print(f"Found {len(image_ids)} images to download")
    print(f"Output directory: {OUTPUT_DIR}")

    # 创建Selenium driver
    print("\nInitializing Selenium driver...")
    driver = get_selenium_driver()

    try:
        # 处理每个图像
        success_count = 0
        for idx, image_id in enumerate(image_ids, 1):
            print(f"[{idx}/{len(image_ids)}]", end="")
            try:
                if process_image(image_id, driver):
                    success_count += 1
                    print(f"  ✓ Success")
                else:
                    print(f"  ✗ Failed")
            except Exception as e:
                print(f"  ✗ Error processing image: {e}")
                import traceback
                traceback.print_exc()

        # 打印总结
        print(f"\n{'='*50}")
        print(f"Processing complete!")
        print(f"Success: {success_count}/{len(image_ids)}")
        print(f"Failed: {len(image_ids) - success_count}/{len(image_ids)}")
        print(f"{'='*50}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
