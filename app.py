from flask import Flask, render_template, jsonify, send_from_directory, request
import os
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from pathlib import Path

app = Flask(__name__)

# 配置
BASE_DIR = Path(__file__).parent
IMAGE_BASE_DIR = BASE_DIR / "data" / "images"
UPLOAD_FOLDER = IMAGE_BASE_DIR
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# 确保目录存在
IMAGE_BASE_DIR.mkdir(parents=True, exist_ok=True)
for folder in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
    (IMAGE_BASE_DIR / folder).mkdir(exist_ok=True)

# 起始时间：2023年1月1日 01:00:00
START_TIME = datetime(2023, 1, 1, 1, 0, 0)
HOURS_PER_SET = 48

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_image_groups():
    """获取所有图片组信息"""
    groups = {}
    for folder in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
        folder_path = IMAGE_BASE_DIR / folder
        if folder_path.exists():
            images = sorted([f for f in os.listdir(folder_path) 
                           if allowed_file(f)])
            groups[folder] = images
    return groups

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/groups')
def get_groups():
    groups = get_image_groups()
    return jsonify({
        'groups': list(groups.keys()),
        'images': {k: len(v) for k, v in groups.items()}
    })

@app.route('/api/images/<group_name>')
def get_images(group_name):
    if group_name not in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
        return jsonify({'error': 'Invalid group name'}), 400
    
    folder_path = IMAGE_BASE_DIR / group_name
    if not folder_path.exists():
        return jsonify({'images': []})
    
    images = sorted([f for f in os.listdir(folder_path) 
                    if allowed_file(f)])
    
    # 为每张图片生成时间戳
    images_with_time = []
    for i, img in enumerate(images[:HOURS_PER_SET]):
        current_time = START_TIME + timedelta(hours=i)
        images_with_time.append({
            'filename': img,
            'time': current_time.strftime('%Y-%m-%d %H:%M'),
            'index': i,
            'url': f'/images/{group_name}/{img}'
        })
    
    return jsonify({
        'images': images_with_time,
        'group': group_name,
        'total': len(images_with_time)
    })

@app.route('/images/<group_name>/<filename>')
def serve_image(group_name, filename):
    return send_from_directory(IMAGE_BASE_DIR / group_name, filename)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    group = request.form.get('group')
    if not group or group not in ['台海温度', '台海风速', '西藏温度', '西藏风速']:
        return jsonify({'error': 'Invalid group'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        try:
            file.save(IMAGE_BASE_DIR / group / filename)
            return jsonify({
                'success': True, 
                'filename': filename
            })
        except Exception as e:
            return jsonify({'error': f'Save failed: {str(e)}'}), 500
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)