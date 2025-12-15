from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
import os
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import shutil
from PIL import Image
import io

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# 支持的图片格式
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

# 创建必要的目录
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
for category in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], category), exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_images')
def get_images():
    """获取所有图片信息"""
    images_data = {}
    
    for category in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
        category_path = os.path.join(app.config['UPLOAD_FOLDER'], category)
        if os.path.exists(category_path):
            images = []
            # 获取按名称排序的图片
            files = sorted([f for f in os.listdir(category_path) if allowed_file(f)])
            for i, filename in enumerate(files[:48]):  # 限制最多48张
                # 计算时间：从2023-01-01 01:00:00开始，每张图间隔1小时
                image_time = datetime(2023, 1, 1, 1, 0, 0) + timedelta(hours=i)
                images.append({
                    'url': f'/uploads/{category}/{filename}',
                    'time': image_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'hour': i + 1
                })
            images_data[category] = images
        else:
            images_data[category] = []
    
    return jsonify(images_data)

@app.route('/upload', methods=['POST'])
def upload_images():
    """上传一组图片"""
    try:
        # 检查是否有文件被上传
        if 'files[]' not in request.files:
            return jsonify({'error': '没有文件被上传', 'received_files': []}), 400
        
        category = request.form.get('category', '')
        if not category or category not in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
            return jsonify({'error': '请选择正确的类别', 'received_category': category}), 400
        
        files = request.files.getlist('files[]')
        
        # 检查文件数量
        if len(files) == 0:
            return jsonify({'error': '没有选择任何文件'}), 400
        
        # 不再限制必须48张，可以接受任意数量但最多48张
        if len(files) > 48:
            return jsonify({'error': f'最多只能上传48张图片，您选择了{len(files)}张'}), 400
        
        # 清空目标文件夹
        target_folder = os.path.join(app.config['UPLOAD_FOLDER'], category)
        shutil.rmtree(target_folder, ignore_errors=True)
        os.makedirs(target_folder, exist_ok=True)
        
        # 按顺序保存文件
        uploaded_files = []
        
        # 首先按文件名排序
        sorted_files = sorted(files, key=lambda x: x.filename)
        
        for i, file in enumerate(sorted_files):
            if file and file.filename != '' and allowed_file(file.filename):
                # 生成新的文件名，保持扩展名
                extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
                new_filename = f"{i+1:03d}.{extension}"
                filepath = os.path.join(target_folder, new_filename)
                
                # 压缩图片以减少大小
                try:
                    img = Image.open(file.stream)
                    
                    # 将图片转换为RGB模式（如果是RGBA）
                    if img.mode in ('RGBA', 'LA', 'P'):
                        img = img.convert('RGB')
                    
                    # 调整图片大小（最大宽度1920像素）
                    max_width = 1920
                    if img.width > max_width:
                        ratio = max_width / img.width
                        new_height = int(img.height * ratio)
                        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                    
                    # 保存压缩后的图片
                    img.save(filepath, 'JPEG', quality=85, optimize=True)
                    uploaded_files.append(new_filename)
                except Exception as e:
                    print(f"图片压缩失败: {e}")
                    # 如果压缩失败，保存原始文件
                    file.save(filepath)
                    uploaded_files.append(new_filename)
            else:
                return jsonify({'error': f'文件 {file.filename if file else "未知"} 格式不支持'}), 400
        
        print(f"成功上传 {len(uploaded_files)} 张图片到 {category}")
        
        return jsonify({
            'success': True,
            'message': f'成功上传{len(uploaded_files)}张图片',
            'category': category,
            'count': len(uploaded_files)
        })
        
    except Exception as e:
        print(f"上传错误: {str(e)}")
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

@app.route('/uploads/<category>/<filename>')
def uploaded_file(category, filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], category), filename)

# 错误处理
@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': '文件太大，总大小不能超过100MB'}), 413

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)