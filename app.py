from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import shutil

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
    
    return jsonify(images_data)

@app.route('/upload', methods=['POST'])
def upload_images():
    """上传一组图片"""
    if 'files' not in request.files:
        return jsonify({'error': '没有文件被上传'}), 400
    
    category = request.form.get('category')
    if not category or category not in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
        return jsonify({'error': '请选择正确的类别'}), 400
    
    files = request.files.getlist('files')
    if len(files) != 48:
        return jsonify({'error': '请确保上传48张图片'}), 400
    
    # 清空目标文件夹
    target_folder = os.path.join(app.config['UPLOAD_FOLDER'], category)
    shutil.rmtree(target_folder, ignore_errors=True)
    os.makedirs(target_folder, exist_ok=True)
    
    # 按顺序保存文件
    uploaded_files = []
    for i, file in enumerate(sorted(files, key=lambda x: x.filename)):
        if file and allowed_file(file.filename):
            # 统一命名格式
            filename = f"{i+1:03d}.{file.filename.rsplit('.', 1)[1].lower()}"
            file.save(os.path.join(target_folder, filename))
            uploaded_files.append(filename)
    
    return jsonify({
        'success': True,
        'message': f'成功上传{len(uploaded_files)}张图片',
        'category': category
    })

@app.route('/uploads/<category>/<filename>')
def uploaded_file(category, filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], category), filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)