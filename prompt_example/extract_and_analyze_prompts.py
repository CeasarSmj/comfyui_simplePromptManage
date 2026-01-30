"""
从图像文件中提取提示词并进行深度分析
支持PNG和JPEG格式，提供多种文本分析手段来发现优质提示词的规律
"""
import json
import os
import re
from collections import Counter, defaultdict
from itertools import combinations
from PIL import Image


# ============================================================================
# 提取模块
# ============================================================================

def extract_prompt_from_png(image_path):
    """从PNG文件中提取提示词"""
    try:
        img = Image.open(image_path)
        if hasattr(img, 'text'):
            text_data = img.text
            # 尝试多个可能的字段名
            for key in ['parameters', 'prompt', 'Comment', 'Description', 'tEXt']:
                if key in text_data and text_data[key]:
                    return text_data[key]
    except Exception as e:
        print(f"处理PNG文件 {image_path} 时出错: {e}")
    return None

def extract_prompt_from_jpeg(image_path):
    """从JPEG文件中提取提示词"""
    try:
        img = Image.open(image_path)
        if hasattr(img, 'info'):
            info = img.info
            # 尝试多个可能的字段名
            for key in ['comment', 'UserComment', 'parameters', 'prompt', 'ImageDescription', 'Description']:
                if key in info and info[key]:
                    return info[key]
        # 检查EXIF数据
        if hasattr(img, '_getexif'):
            exif = img._getexif()
            if exif:
                # EXIF UserComment在37510
                if 37510 in exif:
                    try:
                        return exif[37510].decode('utf-8')
                    except:
                        pass
    except Exception as e:
        print(f"处理JPEG文件 {image_path} 时出错: {e}")
    return None

def extract_prompts_from_directory(directory_path):
    """遍历目录，提取所有图像的提示词"""
    results = []
    
    if not os.path.exists(directory_path):
        print(f"目录不存在: {directory_path}")
        return results
    
    image_files = []
    for filename in os.listdir(directory_path):
        filepath = os.path.join(directory_path, filename)
        if os.path.isfile(filepath):
            ext = filename.lower()
            if ext.endswith(('.png', '.jpg', '.jpeg')):
                image_files.append((filename, filepath))
    
    print(f"找到 {len(image_files)} 个图像文件")
    
    for filename, filepath in image_files:
        print(f"正在处理: {filename}")
        prompt = None
        
        if filename.lower().endswith('.png'):
            prompt = extract_prompt_from_png(filepath)
        elif filename.lower().endswith(('.jpg', '.jpeg')):
            prompt = extract_prompt_from_jpeg(filepath)
        
        if prompt:
            results.append({
                "filename": filename,
                "prompt": prompt
            })
            print(f"  ✓ 成功提取提示词 (长度: {len(prompt)})")
        else:
            print(f"  ✗ 未找到提示词")
    
    return results


# ============================================================================
# 清理模块
# ============================================================================

def clean_prompt(prompt):
    """清理提示词，去除特殊字符和多余空格"""
    # 替换换行符为空格
    prompt = prompt.replace('\n', ' ').replace('\r', ' ')
    
    # 尝试提取纯提示词部分（去除 JSON 格式的参数）
    # 查找 Negative prompt 关键字
    if 'Negative prompt:' in prompt:
        # 只保留负向提示词之前的部分
        prompt = prompt.split('Negative prompt:')[0]
    
    # 检测是否包含完整的 JSON 对象（ComfyUI workflow）
    # 如果以 { 开头且包含大量 "type":, "model": 等字段，可能是 JSON
    if prompt.startswith('{') and '"type"' in prompt and '"model"' in prompt:
        # 尝试提取 prompt 字段
        prompt_match = re.search(r'"prompt"\s*:\s*\{.*?"text"\s*:\s*"([^"]+)"', prompt, re.DOTALL)
        if prompt_match:
            prompt = prompt_match.group(1)
        else:
            # 如果无法提取，尝试找到最后一个文本字段
            text_matches = re.findall(r'"text"\s*:\s*"([^"]+)"', prompt)
            if text_matches:
                prompt = ' '.join(text_matches)
            else:
                # 如果都没有，跳过这个提示词
                return ''
    
    # 去除常见参数字段
    prompt = re.sub(r'Steps:\s*\d+', '', prompt)
    prompt = re.sub(r'Sampler:\s*[^,\n]+', '', prompt)
    prompt = re.sub(r'CFG scale:\s*[\d.]+', '', prompt)
    prompt = re.sub(r'Seed:\s*\d+', '', prompt)
    prompt = re.sub(r'Size:\s*\d+x\d+', '', prompt)
    prompt = re.sub(r'Model hash:\s*[^,\n]+', '', prompt)
    prompt = re.sub(r'Model:\s*[^,\n]+', '', prompt)
    prompt = re.sub(r'Denoising strength:\s*[\d.]+', '', prompt)
    
    # 去除 lora 标签
    prompt = re.sub(r'<lora:[^>]+>', '', prompt)
    # 去除 embedding 标签
    prompt = re.sub(r'<embed:[^>]+>', '', prompt)
    prompt = re.sub(r'<[^>]+>', '', prompt)
    
    # 去除权重语法 (word:1.2)
    prompt = re.sub(r'\([^)]+:\d+\.?\d*\)', '', prompt)
    prompt = re.sub(r'\[[^]]+:\d+\.?\d*\]', '', prompt)
    
    # 去除空括号但保留内容
    prompt = re.sub(r'\(([^)]+)\)', r'\1', prompt)
    prompt = re.sub(r'\[([^\]]+)\]', r'\1', prompt)
    
    # 去除转义字符
    prompt = re.sub(r'\\', '', prompt)
    
    # 去除 JSON 格式的干扰项
    # 去除带引号的键值对（包括嵌套的花括号）
    prompt = re.sub(r'\{[^}]*"type"[^}]*\}', '', prompt)
    prompt = re.sub(r'\{[^}]*"model"[^}]*\}', '', prompt)
    prompt = re.sub(r'\{[^}]*"clip"[^}]*\}', '', prompt)
    prompt = re.sub(r'\{[^}]*"vae"[^}]*\}', '', prompt)
    prompt = re.sub(r'\{[^}]*"resource-stack"[^}]*\}', '', prompt)
    # 去除其他带引号的键值对
    prompt = re.sub(r'"[^"]+"\s*:\s*"([^"]*)"', r'\1', prompt)
    prompt = re.sub(r'"[^"]+"\s*:\s*[^,\s}]+', '', prompt)
    
    # 去除单独的数字和符号
    prompt = re.sub(r'\b0\b', '', prompt)
    prompt = re.sub(r'\b1\b', '', prompt)
    prompt = re.sub(r'\b2\b', '', prompt)
    prompt = re.sub(r'\s*}\s*', '', prompt)
    prompt = re.sub(r'\s*\{\s*', '', prompt)
    
    # 去除 BREAK 等特殊标记
    prompt = re.sub(r'\bBREAK\b', ',', prompt)
    
    # 清理多余空格和逗号
    prompt = re.sub(r'\s+', ' ', prompt)
    prompt = re.sub(r',\s*,', ',', prompt)
    prompt = re.sub(r'^\s*,\s*', '', prompt)
    prompt = re.sub(r'\s*,\s*$', '', prompt)
    prompt = prompt.strip(', ')
    
    # 如果清理后为空或只有空白字符，返回空字符串
    if not prompt or prompt.isspace():
        return ''
    
    return prompt

def extract_words(prompt):
    """提取单词（逗号分隔）"""
    words = [w.strip().lower() for w in prompt.split(',')]
    # 过滤掉空字符串和过短的词
    words = [w for w in words if w and len(w) > 1 and not w.isdigit()]
    return words


# ============================================================================
# 分类模块
# ============================================================================

def categorize_word(word):
    """基于关键词的智能词语分类"""
    word_lower = word.lower()
    
    # 质量相关关键词
    quality_keywords = {
        'masterpiece', 'best quality', 'highres', 'absurdres', 'ultra detailed',
        'detailed', 'high resolution', 'newest', 'amazing quality', 'very aesthetic',
        '8k', 'uhd', '4k', 'perfect', 'excellent', 'top quality', 'professional',
        'highly detailed', 'intricate details', 'finest', 'superb', 'quality'
    }
    
    # 风格相关关键词
    style_keywords = {
        'semi-realism', 'illustration', 'painting', 'digital', 'anime', 'realistic',
        'photorealistic', 'impressionism', 'oil painting', 'watercolor', 'sketch',
        'drawing', 'art', 'style', 'render', 'artstyle', 'cartoon', 'manga'
    }
    
    # 角色相关关键词
    character_keywords = {
        '1girl', 'solo', '1woman', 'mature woman', 'young woman', 'girl', 'woman',
        '1boy', 'boy', 'man', 'male', 'female', 'child', 'teen', 'adult'
    }
    
    # 表情相关关键词
    expression_keywords = {
        'smile', 'smiling', 'blush', 'blushing', 'sad', 'pout', 'looking at viewer',
        'embarrassed', 'smirk', 'maliciously', 'happy', 'angry', 'shy', 'surprised',
        'expression', 'face', 'eyes', 'mouth', 'open mouth', 'parted lips'
    }
    
    # 光影相关关键词
    lighting_keywords = {
        'volumetric lighting', 'soft lighting', 'cinematic lighting', 'dramatic lighting',
        'ray tracing', 'ambient occlusion', 'light', 'soft light', 'backlighting',
        'dappled light', 'rim light', 'god rays', 'lighting', 'glow', 'glowing',
        'brightness', 'dark', 'shadow', 'shadows'
    }
    
    # 构图相关关键词
    composition_keywords = {
        'depth of field', 'blurry background', 'blurred background', 'dutch angle',
        'from side', 'from above', 'from below', 'dynamic angle', 'fisheye lens',
        'cowboy shot', 'close up', 'portrait', 'full body', 'upper body', 'shot',
        'angle', 'view', 'perspective', 'composition', 'focus', 'background'
    }
    
    # 环境相关关键词
    environment_keywords = {
        'simple background', 'white background', 'black background', 'outdoor',
        'indoor', 'night', 'snow', 'rain', 'forest', 'beach', 'room', 'sky',
        'weather', 'scene', 'background', 'environment', 'atmosphere'
    }
    
    # 着装相关关键词
    clothing_keywords = {
        'maid', 'kimono', 'dress', 'swimsuit', 'uniform', 'sweater', 'shorts',
        'stockings', 'gloves', 'hat', 'shoes', 'clothing', 'clothes', 'wear',
        'outfit', 'costume', 'fashion', 'fabric', 'lace', 'silk', 'cloth'
    }
    
    # 身体特征相关关键词
    body_keywords = {
        'large breasts', 'medium breasts', 'small breasts', 'slim', 'mature body',
        'long hair', 'short hair', 'black hair', 'blonde hair', 'hair', 'eyes',
        'skin', 'body', 'figure', 'shape', 'breasts', 'chest', 'face'
    }
    
    # 质感相关关键词
    texture_keywords = {
        'texture', 'smooth', 'rough', 'glossy', 'matte', 'shiny', 'metallic',
        'fabric', 'soft', 'hard', 'grain', 'film grain', 'blur', 'sharp', 'crisp'
    }
    
    # 动作相关关键词
    action_keywords = {
        'sitting', 'standing', 'lying', 'walking', 'running', 'jumping', 'pose',
        'action', 'motion', 'dynamic', 'static', 'holding', 'wearing', 'carrying'
    }
    
    # 优先级分类（有些词可能属于多个类别，按优先级判断）
    if any(kw in word_lower for kw in quality_keywords):
        return '质量'
    elif any(kw in word_lower for kw in style_keywords):
        return '风格'
    elif any(kw in word_lower for kw in body_keywords):
        return '着装'  # 身体特征归入着装类
    elif any(kw in word_lower for kw in clothing_keywords):
        return '着装'
    elif any(kw in word_lower for kw in expression_keywords):
        return '表情'
    elif any(kw in word_lower for kw in action_keywords):
        return '动作'
    elif any(kw in word_lower for kw in lighting_keywords):
        return '环境'  # 光影归入环境类
    elif any(kw in word_lower for kw in environment_keywords):
        return '环境'
    elif any(kw in word_lower for kw in composition_keywords):
        return '构图'
    elif any(kw in word_lower for kw in texture_keywords):
        return '质感'
    elif any(kw in word_lower for kw in character_keywords):
        return '其它'  # 角色标识归入其它
    else:
        return '其它'


# ============================================================================
# 分析模块
# ============================================================================

def find_word_sequences(words, min_length=2, min_occurrence=2):
    """查找经常一起出现的词序列（n-grams）"""
    from collections import defaultdict
    
    sequences = defaultdict(int)
    
    for i in range(len(words) - min_length + 1):
        sequence = tuple(words[i:i+min_length])
        sequences[sequence] += 1
    
    # 过滤低频序列
    return {seq: count for seq, count in sequences.items() if count >= min_occurrence}

def find_mutually_exclusive_pairs(category_words, min_occurrence=2):
    """查找互斥的词汇对（在同一个类别中，很少一起出现）"""
    mutually_exclusive = []
    
    # 获取所有词汇的出现次数
    word_counts = Counter()
    for words in category_words:
        word_counts.update(words)
    
    # 获取高频词
    frequent_words = {word for word, count in word_counts.items() if count >= min_occurrence}
    
    # 检查所有高频词对
    for word1, word2 in combinations(frequent_words, 2):
        co_occurrence = 0
        for words in category_words:
            if word1 in words and word2 in words:
                co_occurrence += 1
        
        # 如果共现次数很低，可能是互斥的
        if co_occurrence == 0:
            mutually_exclusive.append((word1, word2))
    
    return mutually_exclusive

def analyze_prompt_structure(words):
    """分析单个提示词的结构"""
    structure = {
        'has_quality_start': False,
        'quality_words': [],
        'word_count': len(words),
        'category_distribution': Counter()
    }
    
    # 检查开头是否有质量词
    for i, word in enumerate(words[:10]):
        category = categorize_word(word)
        structure['category_distribution'][category] += 1
        if category == '质量':
            structure['has_quality_start'] = True
            structure['quality_words'].append(word)
        elif structure['quality_words'] and category != '质量':
            break
    
    # 统计完整分布
    for word in words:
        structure['category_distribution'][categorize_word(word)] += 1
    
    return structure

def analyze_prompts(data):
    """深度分析提示词数据"""
    print("\n开始深度分析...")
    
    # 基础统计
    all_words = []
    categorized_words = defaultdict(list)
    prompt_structures = []
    
    for item in data:
        prompt = item['prompt']
        cleaned_prompt = clean_prompt(prompt)
        words = extract_words(cleaned_prompt)
        
        all_words.extend(words)
        
        # 按类别分组
        for word in words:
            category = categorize_word(word)
            categorized_words[category].append(word)
        
        # 分析结构
        structure = analyze_prompt_structure(words)
        prompt_structures.append({
            'filename': item['filename'],
            'structure': structure,
            'words': words
        })
    
    # 词频统计
    word_counter = Counter(all_words)
    
    # 按类别统计
    category_stats = {}
    for category, words in categorized_words.items():
        category_stats[category] = Counter(words)
    
    # 查找常用2-gram和3-gram
    print("  分析常用词序列...")
    all_word_lists = [item['words'] for item in prompt_structures]
    
    bigrams = defaultdict(int)
    trigrams = defaultdict(int)
    
    for words in all_word_lists:
        for i in range(len(words) - 1):
            bigrams[tuple(words[i:i+2])] += 1
        for i in range(len(words) - 2):
            trigrams[tuple(words[i:i+3])] += 1
    
    # 过滤高频序列
    common_bigrams = {seq: count for seq, count in bigrams.items() if count >= 2}
    common_trigrams = {seq: count for seq, count in trigrams.items() if count >= 2}
    
    # 分析互斥词汇
    print("  分析互斥词汇...")
    mutually_exclusive = {}
    for category, words in categorized_words.items():
        if category in ['着装', '表情', '环境']:
            # 按提示词分组
            word_lists_by_prompt = []
            for item in prompt_structures:
                category_words = [w for w in item['words'] if categorize_word(w) == category]
                if category_words:
                    word_lists_by_prompt.append(category_words)
            
            if len(word_lists_by_prompt) > 1:
                exclusive_pairs = find_mutually_exclusive_pairs(word_lists_by_prompt)
                if exclusive_pairs:
                    mutually_exclusive[category] = exclusive_pairs[:10]  # 限制数量
    
    # 综合分析结果
    return {
        'word_frequency': word_counter.most_common(100),
        'category_stats': {cat: counter.most_common(30) for cat, counter in category_stats.items()},
        'common_bigrams': sorted(common_bigrams.items(), key=lambda x: x[1], reverse=True)[:30],
        'common_trigrams': sorted(common_trigrams.items(), key=lambda x: x[1], reverse=True)[:20],
        'mutually_exclusive': mutually_exclusive,
        'prompt_structures': prompt_structures,
        'total_prompts': len(data),
        'total_words': len(all_words),
        'unique_words': len(set(all_words)),
        'avg_words_per_prompt': len(all_words) / len(data) if data else 0
    }


# ============================================================================
# 输出模块
# ============================================================================

def print_analysis(analysis):
    """打印分析结果"""
    print("\n" + "=" * 80)
    print("提示词深度分析报告")
    print("=" * 80)
    
    print(f"\n【基础统计】")
    print(f"  总提示词数量: {analysis['total_prompts']}")
    print(f"  总单词数: {analysis['total_words']}")
    print(f"  唯一单词数: {analysis['unique_words']}")
    print(f"  平均每条提示词词数: {analysis['avg_words_per_prompt']:.1f}")
    
    print("\n" + "=" * 80)
    print("【TOP 50 常用词】")
    print("=" * 80)
    for i, (word, count) in enumerate(analysis['word_frequency'][:50], 1):
        print(f"  {i:2d}. {word:35s} ({count:2d})")
    
    print("\n" + "=" * 80)
    print("【按类别统计】")
    print("=" * 80)
    for category in ['质量', '风格', '着装', '表情', '环境', '构图', '动作', '质感', '其它']:
        if category in analysis['category_stats']:
            print(f"\n【{category}】(共 {len(analysis['category_stats'][category])} 个不同词汇)")
            for i, (word, count) in enumerate(analysis['category_stats'][category][:15], 1):
                print(f"  {i:2d}. {word:35s} ({count:2d})")
    
    print("\n" + "=" * 80)
    print("【常用词序列组合】")
    print("=" * 80)
    print("\n2-gram (两个词经常一起出现):")
    for i, (bigram, count) in enumerate(analysis['common_bigrams'][:20], 1):
        print(f"  {i:2d}. {', '.join(bigram):40s} ({count})")
    
    print("\n3-gram (三个词经常一起出现):")
    for i, (trigram, count) in enumerate(analysis['common_trigrams'][:15], 1):
        print(f"  {i:2d}. {', '.join(trigram):50s} ({count})")
    
    if analysis['mutually_exclusive']:
        print("\n" + "=" * 80)
        print("【潜在互斥词汇对】")
        print("=" * 80)
        for category, pairs in analysis['mutually_exclusive'].items():
            print(f"\n【{category}类别】")
            for i, (word1, word2) in enumerate(pairs[:5], 1):
                print(f"  {i}. {word1:25s} <-> {word2:25s}")
    
    print("\n" + "=" * 80)
    print("【提示词结构分析】")
    print("=" * 80)
    quality_start_count = sum(1 for s in analysis['prompt_structures'] if s['structure']['has_quality_start'])
    print(f"\n  以质量词开头的提示词: {quality_start_count}/{len(analysis['prompt_structures'])} ({quality_start_count/len(analysis['prompt_structures'])*100:.1f}%)")
    
    # 显示前5个提示词的结构
    for i, item in enumerate(analysis['prompt_structures'][:5], 1):
        print(f"\n  文件 {i}: {item['filename']}")
        print(f"    开头质量词: {', '.join(item['structure']['quality_words'])}")
        print(f"    总词数: {item['structure']['word_count']}")
        print(f"    类别分布: {dict(item['structure']['category_distribution'])}")


def save_results(extracted_data, analysis, output_file):
    """保存提取和分析结果到JSON文件"""
    result = {
        'extraction_info': {
            'total_files_processed': len(extracted_data),
            'successful_extractions': len(extracted_data),
            'timestamp': None
        },
        'extracted_prompts': extracted_data,
        'analysis': analysis
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")


# ============================================================================
# 主程序
# ============================================================================

def main():
    """主函数"""
    import sys
    from datetime import datetime
    
    # 默认目录
    default_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'selected')
    
    # 支持命令行参数
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = default_dir
    
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prompt_analysis_result.json')
    
    print("=" * 80)
    print("Stable Diffusion 提示词提取与分析工具")
    print("=" * 80)
    print(f"\n目标目录: {target_dir}")
    print(f"输出文件: {output_file}")
    
    # 步骤1: 提取提示词
    print("\n" + "=" * 80)
    print("步骤 1/2: 从图像中提取提示词")
    print("=" * 80)
    extracted_data = extract_prompts_from_directory(target_dir)
    
    if not extracted_data:
        print("\n未提取到任何提示词，程序退出")
        return
    
    # 步骤2: 分析提示词
    print("\n" + "=" * 80)
    print("步骤 2/2: 分析提示词规律")
    print("=" * 80)
    analysis = analyze_prompts(extracted_data)
    
    # 步骤3: 输出结果
    print_analysis(analysis)
    
    # 步骤4: 保存结果
    save_results(extracted_data, analysis, output_file)
    
    print("\n" + "=" * 80)
    print("分析完成！")
    print("=" * 80)
    print("\n使用建议：")
    print("1. 查看上面的分析报告，了解高频词汇和常用组合")
    print("2. 参考 LLM_analyze_prompt.md 中的指导原则")
    print("3. 基于分析结果，构建适合你的 prompts.json")
    print("4. 将提取的原始提示词和分析结果提供给AI助手进行进一步处理")


if __name__ == "__main__":
    main()
