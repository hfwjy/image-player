"""
应用配置文件
配置持久化存储路径和时间设置
"""
import os
from datetime import datetime

# ===== 存储路径配置 =====
# Railway持久卷路径（在Railway环境中使用）
PERSISTENT_STORAGE_PATH = "/data"
# 应用存储基础路径
BASE_STORAGE_PATH = os.environ.get("STORAGE_PATH", PERSISTENT_STORAGE_PATH)
# 图片存储路径
IMAGES_DIR = os.path.join(BASE_STORAGE_PATH, "images")

# ===== 时间配置 =====
# 固定起始时间：2023年1月1日 01:00:00
START_TIME = datetime(2023, 1, 1, 1, 0, 0)

# ===== 应用配置 =====
# 图片组定义
IMAGE_GROUPS = ["台海温度", "台海风速", "西藏温度", "西藏风速"]
# 每组图片数量
IMAGES_PER_GROUP = 48
# 图片显示时长（毫秒）
DISPLAY_DURATION = 3000

# ===== 文件类型配置 =====
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
ALLOWED_MIMETYPES = {
    "image/jpeg", "image/jpg", "image/png", 
    "image/gif", "image/webp", "image/bmp"
}

# ===== 批量上传配置 =====
# 最大上传文件大小（50MB）
MAX_CONTENT_LENGTH = 50 * 1024 * 1024
# 批量上传最大文件数
MAX_BATCH_FILES = 50

def init_storage():
    """初始化存储目录结构"""
    # 为每个图片组创建目录
    for group in IMAGE_GROUPS:
        group_dir = os.path.join(IMAGES_DIR, group)
        os.makedirs(group_dir, exist_ok=True)
        print(f"✅ 已初始化目录: {group_dir}")
    
    print(f"🎯 存储根目录: {IMAGES_DIR}")
    print(f"📅 时间起点: {START_TIME}")