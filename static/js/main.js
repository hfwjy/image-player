class WeatherDisplay {
    constructor() {
        this.currentCategory = '台海温度';
        this.currentImageIndex = 0;
        this.images = {};
        this.autoPlayInterval = null;
        this.isPlaying = true;
        this.playbackSpeed = 2000;
        this.isUploadSectionVisible = false;
        this.isTransitioning = false;
        this.imageCache = new Map();
        
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
        let sliderTimeout;
        slider.addEventListener('input', (e) => {
            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(() => {
                this.stopAutoPlay();
                this.showImage(parseInt(e.target.value) - 1);
            }, 50);
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

        // 优化窗口大小变化处理
        window.addEventListener('resize', () => {
            this.throttle(() => {
                this.adjustImageSize();
            }, 100)();
        });
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    adjustImageSize() {
        const img = document.querySelector('.weather-image');
        if (img) {
            // 保持原始尺寸，不进行缩放
            img.style.transform = '';
        }
    }

    toggleUploadSection() {
        const uploadSection = document.getElementById('uploadSection');
        const uploadToggleBtn = document.getElementById('uploadToggleBtn');
        
        if (this.isUploadSectionVisible) {
            uploadSection.style.display = 'none';
            uploadToggleBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
        } else {
            uploadSection.style.display = 'block';
            uploadToggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
        
        this.isUploadSectionVisible = !this.isUploadSectionVisible;
    }

    async loadImages() {
        try {
            const response = await fetch('/get_images');
            this.images = await response.json();
            this.updateCategoryButtons();
            this.updateCurrentDisplay();
            
            // 预加载当前类别的图片
            this.preloadImages();
        } catch (error) {
            console.error('加载图片失败:', error);
            const statusDiv = document.getElementById('uploadStatus');
            statusDiv.textContent = '加载图片失败，请刷新页面重试';
            statusDiv.className = 'upload-status error';
        }
    }

    preloadImages() {
        const categoryImages = this.images[this.currentCategory];
        if (!categoryImages || categoryImages.length === 0) return;
        
        // 预加载前3张图片
        for (let i = 0; i < Math.min(3, categoryImages.length); i++) {
            this.preloadImage(categoryImages[i].url);
        }
    }

    preloadImage(url) {
        if (this.imageCache.has(url)) return;
        
        const img = new Image();
        img.src = url;
        this.imageCache.set(url, img);
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
            const container = document.getElementById('imageContainer');
            container.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-cloud-sun fa-2x"></i>
                    <p>${this.currentCategory} 暂无数据</p>
                    <div style="margin-top: 8px; font-size: 12px; color: rgba(255, 255, 255, 0.5);">
                        点击"上传"按钮添加图片
                    </div>
                </div>
            `;
            
            const defaultTime = new Date(2023, 0, 1, 1, 0, 0);
            document.getElementById('currentImageTime').innerHTML = `<i class="far fa-clock"></i> ${defaultTime.toLocaleString('zh-CN')}`;
            document.getElementById('imageTimeOverlay').innerHTML = `<i class="far fa-clock"></i> ${defaultTime.toLocaleString('zh-CN')}`;
            
            document.getElementById('timeSlider').value = 1;
        }
    }

    switchCategory(category) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
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
        this.preloadImages();
        
        if (this.isPlaying) {
            this.startAutoPlay();
        }
        
        setTimeout(() => {
            this.isTransitioning = false;
        }, 300);
    }

    showImage(index) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        const categoryImages = this.images[this.currentCategory];
        if (!categoryImages || categoryImages.length === 0) {
            this.updateCurrentDisplay();
            this.isTransitioning = false;
            return;
        }

        if (index < 0) index = 0;
        if (index >= categoryImages.length) index = categoryImages.length - 1;
        
        this.currentImageIndex = index;
        
        const imageData = categoryImages[index];
        
        // 预加载下一张图片
        if (index + 1 < categoryImages.length) {
            this.preloadImage(categoryImages[index + 1].url);
        }
        
        requestAnimationFrame(() => {
            const container = document.getElementById('imageContainer');
            let imgElement;
            
            if (this.imageCache.has(imageData.url)) {
                const cachedImg = this.imageCache.get(imageData.url);
                imgElement = cachedImg.cloneNode();
                imgElement.style.opacity = '0';
            } else {
                imgElement = document.createElement('img');
                imgElement.src = imageData.url;
                imgElement.style.opacity = '0';
                this.imageCache.set(imageData.url, imgElement.cloneNode());
            }
            
            imgElement.className = 'weather-image performance-optimized';
            imgElement.alt = `${this.currentCategory} - ${imageData.time}`;
            
            const onImageLoad = () => {
                requestAnimationFrame(() => {
                    imgElement.style.opacity = '1';
                    imgElement.style.transition = 'opacity 0.3s ease';
                    
                    // 添加点击查看功能
                    imgElement.addEventListener('click', () => {
                        this.showFullscreenImage(imgElement.src);
                    });
                });
            };
            
            if (imgElement.complete) {
                onImageLoad();
            } else {
                imgElement.onload = onImageLoad;
                imgElement.onerror = () => {
                    console.error('图片加载失败:', imageData.url);
                    imgElement.onerror = null;
                    container.innerHTML = '<div class="image-error"><i class="fas fa-exclamation-triangle"></i><p>图片加载失败</p></div>';
                };
            }
            
            // 更新图片容器
            container.innerHTML = '';
            container.appendChild(imgElement);
            
            // 更新时间显示
            document.getElementById('currentImageTime').innerHTML = `<i class="far fa-clock"></i> ${imageData.time}`;
            document.getElementById('imageTimeOverlay').innerHTML = `<i class="far fa-clock"></i> ${imageData.time}`;
            
            // 更新滑块
            const slider = document.getElementById('timeSlider');
            slider.value = index + 1;
            slider.max = categoryImages.length;
            
            this.updateTimeLabels(categoryImages.length);
            
            setTimeout(() => {
                this.isTransitioning = false;
            }, 300);
        });
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
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.closest('.close-fullscreen')) {
                document.body.removeChild(overlay);
            }
        });
        
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
            labelsContainer.innerHTML = `
                <span>01:00</span>
                <span>12:00</span>
                <span>23:00</span>
                <span>次日00:00</span>
            `;
        } else if (totalImages > 0) {
            const labels = [];
            
            for (let i = 0; i < 4; i++) {
                const hour = Math.floor(i * (totalImages - 1) / 3);
                const time = new Date(2023, 0, 1, 1, 0, 0);
                time.setHours(time.getHours() + hour);
                
                let label = '';
                if (i === 0) {
                    label = '01:00';
                } else if (i === 3) {
                    label = '次日00:00';
                } else {
                    const hourStr = time.getHours().toString().padStart(2, '0');
                    label = `${hourStr}:00`;
                }
                
                labels.push(`<span>${label}</span>`);
            }
            
            labelsContainer.innerHTML = labels.join('');
        } else {
            labelsContainer.innerHTML = `
                <span>01:00</span>
                <span>12:00</span>
                <span>23:00</span>
                <span>次日00:00</span>
            `;
        }
    }

    nextImage() {
        if (this.isTransitioning) return;
        
        const categoryImages = this.images[this.currentCategory];
        if (!categoryImages || categoryImages.length === 0) return;

        let nextIndex = this.currentImageIndex + 1;
        if (nextIndex >= categoryImages.length) {
            nextIndex = 0;
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
        
        if (this.isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            this.startAutoPlay();
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            this.stopAutoPlay();
        }
    }

    updatePlaybackSpeed() {
        if (this.isPlaying) {
            this.startAutoPlay();
        }
    }

    async uploadImages() {
        const form = document.getElementById('uploadForm');
        const fileInput = document.getElementById('fileInput');
        const categorySelect = document.getElementById('categorySelect');
        const statusDiv = document.getElementById('uploadStatus');
        
        const category = categorySelect.value;
        if (!category) {
            statusDiv.textContent = '请选择数据类别';
            statusDiv.className = 'upload-status error';
            return;
        }
        
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

        const formData = new FormData();
        formData.append('category', category);
        
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
                
                setTimeout(async () => {
                    await this.loadImages();
                    
                    this.switchCategory(result.category);
                    
                    fileInput.value = '';
                    
                    setTimeout(() => {
                        statusDiv.textContent = '';
                        statusDiv.className = 'upload-status';
                        
                        if (this.isUploadSectionVisible) {
                            this.toggleUploadSection();
                        }
                    }, 3000);
                }, 1000);
                
            } else {
                statusDiv.textContent = `❌ ${result.error || '上传失败'}`;
                statusDiv.className = 'upload-status error';
                
                setTimeout(() => {
                    statusDiv.textContent = '';
                    statusDiv.className = 'upload-status';
                }, 5000);
            }
        } catch (error) {
            console.error('上传错误:', error);
            statusDiv.textContent = `❌ 上传失败: ${error.message}`;
            statusDiv.className = 'upload-status error';
            
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