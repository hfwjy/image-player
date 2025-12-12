# app.py - Railway优化版本
import os
import json
import glob
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, send_from_directory
from flask_cors import CORS
import logging

# 初始化Flask应用
app = Flask(__name__)

# 配置CORS
CORS(app)

# Railway环境变量配置
app.config.update(
    # Railway会自动设置PORT环境变量
    IMAGE_FOLDER=os.environ.get('IMAGE_FOLDER', 'static/images'),
    TOTAL_IMAGES=int(os.environ.get('TOTAL_IMAGES', 48)),
    ALLOWED_EXTENSIONS={'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'},
    MAX_CONTENT_LENGTH=100 * 1024 * 1024,  # 100MB
    # Railway提供持久存储的目录
    PERSISTENT_STORAGE=os.environ.get('PERSISTENT_STORAGE_PATH', '/data')
)

# 确保图片目录存在
image_folder = app.config['IMAGE_FOLDER']
if not os.path.exists(image_folder):
    os.makedirs(image_folder, exist_ok=True)
    app.logger.info(f"创建图片目录: {image_folder}")

def get_image_list():
    """获取本地图片列表（支持多种命名方式）"""
    image_list = []
    image_folder = app.config['IMAGE_FOLDER']
    
    # 支持的文件扩展名
    extensions = app.config['ALLOWED_EXTENSIONS']
    
    # 收集所有图片文件
    image_files = []
    for ext in extensions:
        # 查找各种命名格式
        patterns = [
            f"{image_folder}/*.{ext}",
            f"{image_folder}/*.{ext.upper()}",
            f"{image_folder}/frame_*.{ext}",
            f"{image_folder}/image_*.{ext}",
            f"{image_folder}/pic_*.{ext}",
            f"{image_folder}/[0-9]*.{ext}"
        ]
        
        for pattern in patterns:
            image_files.extend(glob.glob(pattern))
    
    # 去重
    image_files = list(set(image_files))
    
    # 排序函数
    def extract_number(filename):
        import re
        # 尝试提取文件名中的数字
        numbers = re.findall(r'\d+', os.path.basename(filename))
        return int(numbers[0]) if numbers else 0
    
    # 按数字顺序排序，如果没有数字则按文件名排序
    try:
        image_files.sort(key=extract_number)
    except:
        image_files.sort()
    
    # 限制数量
    image_files = image_files[:app.config['TOTAL_IMAGES']]
    
    # 生成图片信息
    base_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for i, file_path in enumerate(image_files):
        filename = os.path.basename(file_path)
        
        # 计算相对路径（用于前端访问）
        rel_path = f"images/{filename}"
        
        # 文件大小
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        
        image_list.append({
            "index": i,
            "filename": filename,
            "filepath": rel_path,
            "fullpath": file_path,
            "validTime": f"+{i:02d}h",
            "timestamp": (base_time + timedelta(hours=i)).strftime("%Y-%m-%d %H:%M"),
            "hourOffset": i,
            "size": file_size,
            "sizeMB": round(file_size / (1024 * 1024), 2) if file_size > 0 else 0
        })
    
    # 如果图片不足，生成占位信息
    if len(image_list) < app.config['TOTAL_IMAGES']:
        app.logger.warning(f"只找到 {len(image_list)} 张图片，期望 {app.config['TOTAL_IMAGES']} 张")
    
    return image_list

@app.route('/')
def index():
    """主页面"""
    return render_template('index.html')

@app.route('/api/images')
def get_images():
    """获取图片列表API"""
    try:
        images = get_image_list()
        
        return jsonify({
            "success": True,
            "data": images,
            "count": len(images),
            "total": app.config['TOTAL_IMAGES'],
            "server": "Railway",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        app.logger.error(f"获取图片列表失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": "服务器错误",
            "details": str(e)
        }), 500

@app.route('/api/health')
def health_check():
    """健康检查端点（Railway需要）"""
    return jsonify({
        "status": "healthy",
        "service": "image-timeline-player",
        "timestamp": datetime.now().isoformat(),
        "environment": os.environ.get('RAILWAY_ENVIRONMENT', 'development'),
        "version": "1.0.0"
    })

@app.route('/api/info')
def server_info():
    """服务器信息"""
    images = get_image_list()
    
    return jsonify({
        "success": True,
        "info": {
            "server": "Flask on Railway",
            "image_folder": app.config['IMAGE_FOLDER'],
            "total_images": app.config['TOTAL_IMAGES'],
            "found_images": len(images),
            "port": os.environ.get('PORT', '未设置'),
            "railway_environment": os.environ.get('RAILWAY_ENVIRONMENT', '未设置'),
            "railway_project_id": os.environ.get('RAILWAY_PROJECT_ID', '未设置'),
            "railway_service_id": os.environ.get('RAILWAY_SERVICE_ID', '未设置')
        }
    })

@app.route('/upload-guide')
def upload_guide():
    """图片上传指南页面"""
    return render_template('upload_guide.html')

# 静态文件路由
@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(app.config['IMAGE_FOLDER'], filename)

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# 错误处理
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "success": False,
        "error": "页面未找到",
        "message": "请访问 / 查看主页面"
    }), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({
        "success": False,
        "error": "服务器内部错误",
        "message": "请联系管理员"
    }), 500

# 启动应用
if __name__ == '__main__':
    # Railway会设置PORT环境变量
    port = int(os.environ.get('PORT', 5000))
    
    # 设置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    app.logger.info(f"启动时序图片播放器服务器...")
    app.logger.info(f"图片目录: {app.config['IMAGE_FOLDER']}")
    app.logger.info(f"期望图片数量: {app.config['TOTAL_IMAGES']}")
    app.logger.info(f"服务器端口: {port}")
    
    # 启动服务器
    app.run(host='0.0.0.0', port=port, debug=False)