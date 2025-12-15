class WeatherVisualizer {
    constructor() {
        this.currentGroup = '台海温度';
        this.currentIndex = 0;
        this.images = [];
        this.isPlaying = false;
        this.playbackSpeed = 3;
        this.interval = null;
        this.totalImages = 48;
        this.selectedFiles = [];
        this.isUploading = false;
        
        // 性能优化
        this.imageCache = new Map();
        this.lastLoadTime = 0;
        this.minLoadInterval = 50; // 最小加载间隔，防止过快切换
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        this.initFileUpload();
        await this.loadGroupImages(this.currentGroup);
        this.setupPerformanceMonitoring();
    }
    
    bindEvents() {
        // 分组切换
        document.querySelectorAll('.group-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchGroup(btn.dataset.group));
        });
        
        // 播放控制
        document.getElementById('play-btn').addEventListener('click', () => this.togglePlay());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());
        document.getElementById('prev-btn').addEventListener('click', () => this.prevImage());
        document.getElementById('next-btn').addEventListener('click', () => this.nextImage());
        
        // 速度控制
        const speedSlider = document.getElementById('speed-slider');
        speedSlider.addEventListener('input', (e) => {
            this.playbackSpeed = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = `${this.playbackSpeed}x`;
            if (this.isPlaying) {
                this.startAutoPlay();
            }
        });
        
        // 时间线控制
        const timeSlider = document.getElementById('time-slider');
        timeSlider.addEventListener('input', (e) => {
            const now = Date.now();
            if (now - this.lastLoadTime > this.minLoadInterval) {
                this.jumpToImage(parseInt(e.target.value));
                this.lastLoadTime = now;
            }
        });
        
        // 时间跳转按钮
        document.getElementById('jump-start').addEventListener('click', () => this.jumpToImage(0));
        document.getElementById('jump-prev-hour').addEventListener('click', () => this.prevImage());
        document.getElementById('jump-next-hour').addEventListener('click', () => this.nextImage());
        document.getElementById('jump-end').addEventListener('click', () => this.jumpToImage(this.totalImages - 1));
        
        // 上传按钮
        document.getElementById('upload-toggle-btn').addEventListener('click', () => this.toggleUploadSection());
        document.getElementById('upload-action-btn').addEventListener('click', () => {
            this.toggleUploadSection(true);
        });
        
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextImage();
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'Escape':
                    this.stop();
                    break;
            }
        });
        
        // 图片点击导航
        const imageViewer = document.getElementById('image-viewer');
        imageViewer.addEventListener('click', (e) => {
            if (e.target.id !== 'current-image') return;
            
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            
            // 点击左侧切换到上一张，右侧切换到下一张
            if (x < width / 3) {
                this.prevImage();
            } else if (x > width * 2 / 3) {
                this.nextImage();
            }
        });
        
        // 节流窗口调整
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateTimeline();
            }, 100);
        });
    }
    
    initFileUpload() {
        const fileInput = document.getElementById('file-input');
        const fileDropArea = document.getElementById('file-drop-area');
        const uploadForm = document.getElementById('upload-form');
        const filePreview = document.getElementById('file-preview');
        
        // 拖放功能
        fileDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropArea.style.background = 'rgba(52, 152, 219, 0.1)';
        });
        
        fileDropArea.addEventListener('dragleave', () => {
            fileDropArea.style.background = '';
        });
        
        fileDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropArea.style.background = '';
            
            if (e.dataTransfer.files.length) {
                this.handleFileSelect(e.dataTransfer.files);
            }
        });
        
        // 点击触发文件选择
        fileDropArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 文件选择变化
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });
        
        // 表单提交
        uploadForm.addEventListener('submit', (e) => this.handleUploadSubmit(e));
        
        // 取消按钮
        document.getElementById('upload-cancel-btn').addEventListener('click', () => {
            this.clearFileSelection();
            this.hideUploadSection();
        });
    }
    
    handleFileSelect(files) {
        this.selectedFiles = Array.from(files);
        this.updateFilePreview();
    }
    
    updateFilePreview() {
        const filePreview = document.getElementById('file-preview');
        
        if (this.selectedFiles.length === 0) {
            filePreview.innerHTML = '<div class="no-files">未选择文件</div>';
            return;
        }
        
        let html = '';
        this.selectedFiles.forEach((file, index) => {
            html += `
                <div class="preview-item">
                    <div class="preview-icon">
                        <i class="fas fa-image"></i>
                    </div>
                    <div class="preview-info">
                        <div class="preview-name">${file.name}</div>
                        <div class="preview-size">${this.formatFileSize(file.size)}</div>
                    </div>
                    <button class="remove-btn" type="button" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        filePreview.innerHTML = html;
        
        // 添加删除按钮事件
        filePreview.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.selectedFiles.splice(index, 1);
                this.updateFilePreview();
            });
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    clearFileSelection() {
        this.selectedFiles = [];
        document.getElementById('file-input').value = '';
        this.updateFilePreview();
    }
    
    async handleUploadSubmit(e) {
        e.preventDefault();
        
        if (this.isUploading) return;
        
        const group = document.getElementById('upload-group').value;
        
        if (!group) {
            this.showNotification('请选择分组', 'warning');
            return;
        }
        
        if (this.selectedFiles.length === 0) {
            this.showNotification('请选择要上传的文件', 'warning');
            return;
        }
        
        this.isUploading = true;
        
        let successCount = 0;
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('group', group);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successCount++;
                }
            } catch (error) {
                console.error('上传失败:', error);
            }
        }
        
        this.isUploading = false;
        
        if (successCount > 0) {
            this.showNotification(`成功上传 ${successCount} 个文件`, 'success');
            
            // 如果上传到当前分组，重新加载图片
            if (group === this.currentGroup) {
                await this.loadGroupImages(group);
            }
            
            // 延迟隐藏上传区域
            setTimeout(() => {
                this.clearFileSelection();
                this.hideUploadSection();
            }, 1500);
        } else {
            this.showNotification('上传失败，请重试', 'error');
        }
    }
    
    toggleUploadSection(show = null) {
        const uploadSection = document.getElementById('upload-section');
        
        if (show === null) {
            show = uploadSection.style.display === 'none';
        }
        
        if (show) {
            uploadSection.style.display = 'block';
            document.getElementById('upload-toggle-btn').innerHTML = '<i class="fas fa-times"></i> 关闭';
        } else {
            this.hideUploadSection();
        }
    }
    
    hideUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        uploadSection.style.display = 'none';
        document.getElementById('upload-toggle-btn').innerHTML = '<i class="fas fa-upload"></i> 上传';
    }
    
    async loadGroupImages(group) {
        try {
            const loadingOverlay = document.getElementById('loading-overlay');
            const noImageOverlay = document.getElementById('no-image-overlay');
            
            loadingOverlay.style.display = 'flex';
            noImageOverlay.style.display = 'none';
            
            // 清除缓存
            this.imageCache.clear();
            
            const response = await fetch(`/api/images/${encodeURIComponent(group)}`);
            const data = await response.json();
            
            loadingOverlay.style.display = 'none';
            
            if (data.images && data.images.length > 0) {
                this.images = data.images;
                this.currentGroup = group;
                this.currentIndex = 0;
                this.totalImages = data.images.length;
                
                // 更新UI状态
                this.updateGroupButtons();
                this.updateImage();
                this.updateTimeline();
                
                // 预加载下一张图片
                this.preloadNextImage();
            } else {
                noImageOverlay.style.display = 'flex';
                this.images = [];
                this.totalImages = 0;
            }
        } catch (error) {
            console.error('加载图片失败:', error);
            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('no-image-overlay').style.display = 'flex';
        }
    }
    
    updateGroupButtons() {
        document.querySelectorAll('.group-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.group === this.currentGroup);
        });
    }
    
    updateImage() {
        if (this.images.length === 0) return;
        
        const imageInfo = this.images[this.currentIndex];
        const imgElement = document.getElementById('current-image');
        
        // 从缓存中获取图片
        if (this.imageCache.has(imageInfo.url)) {
            const cachedImg = this.imageCache.get(imageInfo.url);
            imgElement.src = cachedImg.src;
            this.updateUI(imageInfo);
            return;
        }
        
        // 预加载图片
        const preloadImg = new Image();
        preloadImg.onload = () => {
            // 缓存图片
            this.imageCache.set(imageInfo.url, preloadImg);
            
            // 使用requestAnimationFrame确保流畅更新
            requestAnimationFrame(() => {
                imgElement.src = imageInfo.url;
                this.updateUI(imageInfo);
            });
        };
        
        preloadImg.src = imageInfo.url;
    }
    
    updateUI(imageInfo) {
        // 更新基本信息
        document.getElementById('current-time').textContent = imageInfo.time;
        document.getElementById('current-group-name').textContent = this.currentGroup;
        document.getElementById('image-position').textContent = `${this.currentIndex + 1}/${this.totalImages}`;
        
        // 更新时间线
        this.updateTimeline();
        
        // 预加载下一张图片
        this.preloadNextImage();
    }
    
    preloadNextImage() {
        if (this.images.length === 0) return;
        
        const nextIndex = (this.currentIndex + 1) % this.totalImages;
        const nextImageInfo = this.images[nextIndex];
        
        if (!this.imageCache.has(nextImageInfo.url)) {
            const img = new Image();
            img.src = nextImageInfo.url;
            this.imageCache.set(nextImageInfo.url, img);
        }
    }
    
    updateTimeline() {
        if (this.totalImages === 0) return;
        
        const progress = ((this.currentIndex + 1) / this.totalImages) * 100;
        const markerPosition = (this.currentIndex / (this.totalImages - 1)) * 100;
        
        const progressBar = document.getElementById('timeline-progress');
        const marker = document.getElementById('timeline-marker');
        
        // 使用transform而不是left来提升性能
        progressBar.style.width = `${progress}%`;
        marker.style.transform = `translate(-50%, -50%) translateX(${markerPosition}%)`;
        
        // 更新滑块值
        document.getElementById('time-slider').value = this.currentIndex;
    }
    
    async switchGroup(group) {
        if (group === this.currentGroup) return;
        
        this.stop();
        await this.loadGroupImages(group);
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.startAutoPlay();
        }
    }
    
    startAutoPlay() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        
        this.isPlaying = true;
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-pause"></i>';
        document.getElementById('play-btn').classList.add('play');
        
        // 根据速度计算间隔
        const baseInterval = 2000;
        const interval = baseInterval / this.playbackSpeed;
        
        this.interval = setInterval(() => {
            this.nextImage();
        }, interval);
    }
    
    stop() {
        this.isPlaying = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-play"></i>';
        document.getElementById('play-btn').classList.remove('play');
    }
    
    prevImage() {
        if (this.totalImages === 0) return;
        
        const now = Date.now();
        if (now - this.lastLoadTime < this.minLoadInterval) return;
        
        this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.totalImages - 1;
        this.updateImage();
        this.lastLoadTime = now;
    }
    
    nextImage() {
        if (this.totalImages === 0) return;
        
        const now = Date.now();
        if (now - this.lastLoadTime < this.minLoadInterval) return;
        
        this.currentIndex = this.currentIndex < this.totalImages - 1 ? this.currentIndex + 1 : 0;
        this.updateImage();
        this.lastLoadTime = now;
    }
    
    jumpToImage(index) {
        if (index >= 0 && index < this.totalImages) {
            this.currentIndex = index;
            this.updateImage();
        }
    }
    
    setupPerformanceMonitoring() {
        // 使用Intersection Observer来优化图片加载
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 图片进入视口时的优化处理
                }
            });
        }, {
            threshold: 0.1
        });
        
        const image = document.getElementById('current-image');
        observer.observe(image);
    }
    
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                           type === 'error' ? 'exclamation-circle' : 
                           type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 18px;
            border-radius: 8px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 1000;
            min-width: 250px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ${type === 'success' ? 'background: linear-gradient(135deg, #2ecc71, #27ae60);' : ''}
            ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c, #c0392b);' : ''}
            ${type === 'warning' ? 'background: linear-gradient(135deg, #f39c12, #d35400);' : ''}
            ${type === 'info' ? 'background: linear-gradient(135deg, #3498db, #2980b9);' : ''}
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => notification.style.transform = 'translateX(0)', 10);
        
        // 3秒后移除
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 等待页面完全加载后初始化
    setTimeout(() => {
        window.weatherVisualizer = new WeatherVisualizer();
    }, 100);
    
    // 阻止触摸事件的默认行为，提升滚动性能
    document.addEventListener('touchmove', (e) => {
        if (e.target.id === 'time-slider') return;
        e.preventDefault();
    }, { passive: false });
});