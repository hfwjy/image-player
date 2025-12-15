"""
图片轮播系统主程序
支持持久化存储和固定时间起点
"""
import os
import json
from datetime import datetime
from flask import Flask, render_template, jsonify, send_from_directory, request, send_file
from config import settings

app = Flask(__name__)

# 初始化存储目录
settings.init_storage()

def get_group_images(group_name):
    """获取指定组的图片列表"""
    group_dir = os.path.join(settings.IMAGES_DIR, group_name)
    
    if not os.path.exists(group_dir):
        return []
    
    images = []
    for i in range(1, settings.IMAGES_PER_GROUP + 1):
        image_found = False
        for ext in settings.ALLOWED_EXTENSIONS:
            filename = f"{group_name}_{i:03d}{ext}"
            filepath = os.path.join(group_dir, filename)
            
            if os.path.exists(filepath):
                images.append({
                    "filename": filename,
                    "path": f"{group_name}/{filename}",
                    "index": i,
                    "full_path": filepath
                })
                image_found = True
                break
        
        # 如果没有找到对应图片，创建空记录
        if not image_found:
            images.append({
                "filename": f"{group_name}_{i:03d}.jpg",
                "path": f"{group_name}/{group_name}_{i:03d}.jpg",
                "index": i,
                "placeholder": True
            })
    
    return images

@app.route("/")
def index():
    """主页面"""
    return render_template(
        "index.html",
        groups=settings.IMAGE_GROUPS,
        duration=settings.DISPLAY_DURATION,
        start_year=settings.START_TIME.year,
        start_month=settings.START_TIME.month,
        start_day=settings.START_TIME.day
    )

@app.route("/images/<group>/<filename>")
def serve_image(group, filename):
    """提供图片文件（从持久化存储）"""
    try:
        group_dir = os.path.join(settings.IMAGES_DIR, group)
        return send_from_directory(group_dir, filename)
    except Exception as e:
        # 如果图片不存在，返回404
        print(f"❌ 图片加载失败: {group}/{filename} - {e}")
        return jsonify({"error": "Image not found"}), 404

@app.route("/api/group/<group_name>")
def get_group_data(group_name):
    """获取指定组的图片数据"""
    if group_name not in settings.IMAGE_GROUPS:
        return jsonify({"error": "Group not found"}), 404
    
    images = get_group_images(group_name)
    has_data = any(not img.get("placeholder", False) for img in images)
    
    return jsonify({
        "group": group_name,
        "images": images,
        "total": len(images),
        "has_data": has_data,
        "duration": settings.DISPLAY_DURATION
    })

@app.route("/api/current_time")
def get_current_time():
    """获取服务器当前时间和固定起始时间"""
    now = datetime.now()
    
    return jsonify({
        "server_time": now.isoformat(),
        "start_time": settings.START_TIME.isoformat(),
        "fixed_start_date": "2023-01-01",
        "fixed_start_time": "01:00:00",
        "total_hours": 48
    })

@app.route("/api/config")
def get_config():
    """获取应用配置"""
    return jsonify({
        "groups": settings.IMAGE_GROUPS,
        "images_per_group": settings.IMAGES_PER_GROUP,
        "duration_per_image": settings.DISPLAY_DURATION,
        "start_date": settings.START_TIME.strftime("%Y-%m-%d"),
        "start_time": settings.START_TIME.strftime("%H:%M:%S")
    })

@app.route("/api/upload", methods=["POST"])
def upload_image():
    """上传图片文件到持久化存储"""
    try:
        if "file" not in request.files:
            return jsonify({"error": "没有选择文件"}), 400
        
        file = request.files["file"]
        group = request.form.get("group", "")
        index = request.form.get("index", "")
        
        if file.filename == "":
            return jsonify({"error": "文件名为空"}), 400
        
        if not group or not index:
            return jsonify({"error": "请指定组名和序号"}), 400
        
        if group not in settings.IMAGE_GROUPS:
            return jsonify({"error": "无效的组名"}), 400
        
        # 确保扩展名合法
        _, ext = os.path.splitext(file.filename)
        if ext.lower() not in settings.ALLOWED_EXTENSIONS:
            return jsonify({"error": f"不支持的文件格式，请使用: {', '.join(settings.ALLOWED_EXTENSIONS)}"}), 400
        
        # 创建文件名
        filename = f"{group}_{int(index):03d}{ext}"
        group_dir = os.path.join(settings.IMAGES_DIR, group)
        
        # 确保目录存在
        os.makedirs(group_dir, exist_ok=True)
        
        # 保存文件到持久化存储
        filepath = os.path.join(group_dir, filename)
        file.save(filepath)
        
        print(f"✅ 文件已保存到持久存储: {filepath}")
        
        return jsonify({
            "success": True,
            "message": "文件上传成功",
            "path": f"{group}/{filename}",
            "storage_path": filepath
        })
    
    except Exception as e:
        print(f"❌ 文件上传失败: {e}")
        return jsonify({"error": f"上传失败: {str(e)}"}), 500

@app.route("/api/storage_info")
def get_storage_info():
    """获取存储信息（用于调试）"""
    storage_info = {
        "base_path": settings.BASE_STORAGE_PATH,
        "images_dir": settings.IMAGES_DIR,
        "persistent_path": settings.PERSISTENT_STORAGE_PATH,
        "exists": os.path.exists(settings.IMAGES_DIR),
        "is_writable": os.access(settings.BASE_STORAGE_PATH if os.path.exists(settings.BASE_STORAGE_PATH) else "/", os.W_OK)
    }
    
    # 统计各组的文件数量
    for group in settings.IMAGE_GROUPS:
        group_dir = os.path.join(settings.IMAGES_DIR, group)
        if os.path.exists(group_dir):
            files = [f for f in os.listdir(group_dir) if os.path.isfile(os.path.join(group_dir, f))]
            storage_info[f"{group}_count"] = len(files)
    
    return jsonify(storage_info)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 启动图片轮播系统...")
    print(f"📂 存储路径: {settings.IMAGES_DIR}")
    print(f"📅 时间起点: {settings.START_TIME}")
    print(f"🌐 访问地址: http://localhost:{port}")
    
    app.run(host="0.0.0.0", port=port, debug=False)