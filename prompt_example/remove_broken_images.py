import os
from PIL import Image

def is_image_broken(file_path):
    """
    检查图像是否损坏
    """
    try:
        with Image.open(file_path) as img:
            img.verify()
        return False  # 图像没有损坏
    except Exception:
        return True  # 图像已损坏

def remove_broken_images(directory):
    """
    遍历指定目录及其子目录中的所有图像文件，删除损坏的图像
    """
    # 支持的图像格式
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp', '.ico'}
    
    removed_count = 0
    total_count = 0
    
    print(f"开始扫描目录: {directory}")
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_ext = os.path.splitext(file)[1].lower()
            
            if file_ext in image_extensions:
                file_path = os.path.join(root, file)
                total_count += 1
                
                print(f"正在检查: {file_path}")
                
                if is_image_broken(file_path):
                    print(f"发现损坏图像: {file_path}")
                    
                    try:
                        os.remove(file_path)
                        print(f"已删除损坏图像: {file_path}")
                        removed_count += 1
                    except Exception as e:
                        print(f"删除文件时出错 {file_path}: {str(e)}")
    
    print(f"\n扫描完成！总共检查了 {total_count} 个图像文件，删除了 {removed_count} 个损坏的图像。")

if __name__ == "__main__":
    # 获取当前脚本所在目录
    current_directory = os.path.dirname(os.path.abspath(__file__)) or "."
    
    # 如果想检查特定目录，可以修改这里
    target_directory = current_directory
    
    remove_broken_images(target_directory)