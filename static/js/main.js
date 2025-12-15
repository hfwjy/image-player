class WeatherDisplay {
    constructor() {
        this.currentCategory = '台海温度';
        this.currentImageIndex = 0;
        this.images = {};
        this.autoPlayInterval = null;
        this.isPlaying = true;
        this.playbackSpeed = 2000; // 默认1倍速
        this.isUploadSectionVisible = false;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadImages();
        this.startAutoPlay();
        this.updatePlaybackSpeed();
    }

    bindEvents() {
        // 类别按钮点击事件
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCategory(e.target.closest('.category-btn').dataset.category);
            });
        });

        // 时间滑块事件
        const slider = document.getElementById('timeSlider');
        slider.addEventListener('input', (e) => {
            this.stopAutoPlay();
            this.showImage(parseInt(e.target.value) - 1);
        });

        // 播放速度选择事件
        document.getElementById('playbackSpeed').addEventListener('change', (e) => {
            this.playbackSpeed = parseInt(e.target.value);
            this.updatePlaybackSpeed();
        });

        // 播放/暂停按钮事件
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            this.togglePlayPause();
        });

        // 上传按钮显示/隐藏事件
        document.getElementById('uploadToggleBtn').addEventListener('click', () => {
            this.toggleUploadSection();
        });

        // 上传表单提交事件
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.uploadImages();
        });

        // 文件选择变化时显示文件名
        document.getElementById('fileInput').addEventListener('change', function() {
            const statusDiv = document.getElementById('uploadStatus');
            if (this.files.length > 0) {
                statusDiv.textContent = `已选择 ${this.files.length} 个文件`;
                statusDiv.className = 'upload-status';
            } else {
                statusDiv.textContent = '';
            }
        });

        // 窗口大小变化时调整图片显示
        window.addEventListener('resize', () => {
            this.adjustImageSize();
        });
    }

    adjustImageSize() {
        const img = document.querySelector('.weather-image');
        if (img) {
            // 重置图片尺寸，让CSS自动处理
            img.style.width = '';
            img.style.height = '';
            img.style.maxWidth = '';
            img.style.maxHeight = '';
        }
    }

    toggleUploadSection() {
        const uploadSection = document.getElementById('uploadSection');
        const uploadToggleBtn = document.getElementById('uploadToggleBtn');
        
        if (this.isUploadSectionVisible) {
            uploadSection.style.display = 'none';
            uploadToggleBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 上传数据';
        } else {
            uploadSection.style.display = 'block';
            uploadToggleBtn.innerHTML = '<i class="fas fa-times"></i> 关闭上传';
        }
        
        this.isUploadSectionVisible = !this.isUploadSectionVisible;
    }

    async loadImages() {
        try {
            const response = await fetch('/get_images');
            this.images = await response.json();
            this.updateCategoryButtons();
            this.updateCurrentDisplay();
        } catch (error) {
            console.error('加载图片失败:', error);
            const statusDiv = document.getElementById('uploadStatus');
            statusDiv.textContent = '加载图片失败，请刷新页面重试';
            statusDiv.className = 'upload-status error';
        }
    }

    updateCategoryButtons() {
        document.querySelectorAll('.category-btn').forEach(btn => {
            const category = btn.dataset.category;
            const hasImages = this.images[category] && this.images[category].length > 0;
            btn.style.opacity = hasImages ? '1' : '0.6';
            btn.disabled = !hasImages;
        });
    }

    updateCurrentDisplay() {
        const categoryImages = this.images[this.currentCategory];
        if (categoryImages && categoryImages.length > 0) {
            this.showImage(this.currentImageIndex);
        } else {
            // 显示提示信息
            const container = document.getElementById('imageContainer');
            container.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-cloud-sun fa-3x"></i>
                    <p>${this.currentCategory} 暂无数据</p>
                    <div style="margin-top: 15px; font-size: 14px; color: rgba(255, 255, 255, 0.5);">
                        点击上方"上传数据"按钮添加图片
                    </div>
                </div>
            `;
            
            // 更新时间显示为默认值
            const defaultTime = new Date(2023, 0, 1, 1, 0, 0);
            document.getElementById('currentImageTime').innerHTML = `<i class="far fa-clock"></i> ${defaultTime.toLocaleString('zh-CN')}`;
            
            // 重置滑块
            document.getElementById('timeSlider').value = 1;
        }
    }

    switchCategory(category) {
        // 更新按钮状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.disabled = false;
        });
        
        const targetBtn = document.querySelector(`[data-category="${category}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        this.currentCategory = category;
        this.currentImageIndex = 0;
        this.updateCurrentDisplay();
        if (this.isPlaying) {
            this.startAutoPlay();
        }
    }

    showImage(index) {
        const categoryImages = this.images[this.currentCategory];
        if (!categoryImages || categoryImages.length === 0) {
            this.updateCurrentDisplay();
            return;
        }

        // 确保索引在有效范围内
        if (index < 0) index = 0;
        if (index >= categoryImages.length) index = categoryImages.length - 1;
        
        this.currentImageIndex = index;
        
        const imageData = categoryImages[index];
        
        // 更新图片显示 - 使用包装器确保正确布局
        const container = document.getElementById('imageContainer');
        container.innerHTML = `
            <div class="image-wrapper">
                <img src="${imageData.url}" 
                     alt="${this.currentCategory} - ${imageData.time}"
                     class="weather-image"
                     onload="this.style.opacity='1'"
                     onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\"image-error\"><i class=\"fas fa-exclamation-triangle\"></i><p>图片加载失败</p></div>';">
                <div class="image-time-overlay">
                    <i class="far fa-clock"></i> ${imageData.time}
                </div>
            </div>
        `;
        
        // 设置图片初始透明度，实现渐变效果
        const img = container.querySelector('.weather-image');
        if (img) {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            
            // 添加点击查看大图功能
            img.addEventListener('click', () => {
                this.showFullscreenImage(img.src);
            });
        }
        
        // 更新顶部时间显示
        document.getElementById('currentImageTime').innerHTML = `<i class="far fa-clock"></i> ${imageData.time}`;
        
        // 更新滑块
        const slider = document.getElementById('timeSlider');
        slider.value = index + 1;
        slider.max = categoryImages.length;
        
        // 更新时间标签
        this.updateTimeLabels(categoryImages.length);
    }

    showFullscreenImage(imageSrc) {
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';
        overlay.innerHTML = `
            <img src="${imageSrc}" class="fullscreen-image">
            <button class="close-fullscreen">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(overlay);
        
        // 点击任意位置关闭全屏
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.closest('.close-fullscreen')) {
                document.body.removeChild(overlay);
            }
        });
        
        // ESC键关闭全屏
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        
        document.addEventListener('keydown', closeOnEscape);
    }

    updateTimeLabels(totalImages) {
        const labelsContainer = document.querySelector('.time-labels');
        if (totalImages >= 48) {
            // 显示时间标签
            const startTime = '01:00';
            const midTime1 = '12:00';
            const midTime2 = '23:00';
            const endTime = '次日00:00';
            
            labelsContainer.innerHTML = `
                <span><i class="far fa-clock"></i> ${startTime}</span>
                <span>${midTime1}</span>
                <span>${midTime2}</span>
                <span><i class="fas fa-clock"></i> ${endTime}</span>
            `;
        } else if (totalImages > 0) {
            // 动态计算时间标签
            const hoursPerImage = 24 / totalImages;
            const labels = [];
            
            // 显示4个等间距的时间点
            for (let i = 0; i < 4; i++) {
                const hour = Math.floor(i * (totalImages - 1) / 3);
                const time = new Date(2023, 0, 1, 1, 0, 0);
                time.setHours(time.getHours() + hour);
                
                let label = '';
                if (i === 0) {
                    label = `<i class="far fa-clock"></i> 01:00`;
                } else if (i === 3) {
                    label = `<i class="fas fa-clock"></i> 次日00:00`;
                } else {
                    const hourStr = time.getHours().toString().padStart(2, '0');
                    label = `${hourStr}:00`;
                }
                
                labels.push(`<span>${label}</span>`);
            }
            
            labelsContainer.innerHTML = labels.join('');
        } else {
            labelsContainer.innerHTML = `
                <span><i class="far fa-clock"></i> 01:00</span>
                <span>12:00</span>
                <span>23:00</span>
                <span><i class="fas fa-clock"></i> 次日00:00</span>
            `;
        }
    }

    nextImage() {
        const categoryImages = this.images[this.currentCategory];
        if (!categoryImages || categoryImages.length === 0) return;

        let nextIndex = this.currentImageIndex + 1;
        if (nextIndex >= categoryImages.length) {
            nextIndex = 0; // 循环到第一张
        }
        
        this.showImage(nextIndex);
    }

    startAutoPlay() {
        this.stopAutoPlay();
        const categoryImages = this.images[this.currentCategory];
        if (categoryImages && categoryImages.length > 1 && this.isPlaying) {
            this.autoPlayInterval = setInterval(() => {
                this.nextImage();
            }, this.playbackSpeed);
        }
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        const playPauseBtn = document.getElementById('playPauseBtn');
        const icon = playPauseBtn.querySelector('i');
        
        if (this.isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
            this.startAutoPlay();
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i> 播放';
            this.stopAutoPlay();
        }
    }

    updatePlaybackSpeed() {
        // 如果正在播放，重启播放器以应用新速度
        if (this.isPlaying) {
            this.startAutoPlay();
        }
    }

    async uploadImages() {
        const form = document.getElementById('uploadForm');
        const fileInput = document.getElementById('fileInput');
        const categorySelect = document.getElementById('categorySelect');
        const statusDiv = document.getElementById('uploadStatus');
        
        // 验证类别
        const category = categorySelect.value;
        if (!category) {
            statusDiv.textContent = '请选择数据类别';
            statusDiv.className = 'upload-status error';
            return;
        }
        
        // 验证文件
        const files = fileInput.files;
        if (files.length === 0) {
            statusDiv.textContent = '请选择要上传的图片文件';
            statusDiv.className = 'upload-status error';
            return;
        }
        
        if (files.length > 48) {
            statusDiv.textContent = `最多只能上传48张图片，您选择了${files.length}张`;
            statusDiv.className = 'upload-status error';
            return;
        }

        // 创建FormData对象
        const formData = new FormData();
        formData.append('category', category);
        
        // 添加所有文件
        for (let i = 0; i < files.length; i++) {
            formData.append('files[]', files[i]);
        }

        try {
            statusDiv.textContent = '正在上传，请稍候...';
            statusDiv.className = 'upload-status';

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                statusDiv.textContent = `✅ ${result.message}`;
                statusDiv.className = 'upload-status success';
                
                // 延迟一下再重新加载图片，给服务器处理时间
                setTimeout(async () => {
                    await this.loadImages();
                    
                    // 自动切换到上传的类别
                    this.switchCategory(result.category);
                    
                    // 重置表单（保留类别选择）
                    fileInput.value = '';
                    
                    // 3秒后清除成功消息
                    setTimeout(() => {
                        statusDiv.textContent = '';
                        statusDiv.className = 'upload-status';
                        
                        // 自动隐藏上传区域
                        this.toggleUploadSection();
                    }, 3000);
                }, 1000);
                
            } else {
                statusDiv.textContent = `❌ ${result.error || '上传失败'}`;
                statusDiv.className = 'upload-status error';
                
                // 5秒后清除错误消息
                setTimeout(() => {
                    statusDiv.textContent = '';
                    statusDiv.className = 'upload-status';
                }, 5000);
            }
        } catch (error) {
            console.error('上传错误:', error);
            statusDiv.textContent = `❌ 上传失败: ${error.message}`;
            statusDiv.className = 'upload-status error';
            
            // 5秒后清除错误消息
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'upload-status';
            }, 5000);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.weatherDisplay = new WeatherDisplay();
});