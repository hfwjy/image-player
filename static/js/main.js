/**
 * 图片轮播系统 - 主JavaScript文件
 * 时间从2023年1月1日01:00开始
 */
class FixedTimeImageCarousel {
    constructor() {
        // 基础配置
        this.groups = [];
        this.currentGroup = '';
        this.images = [];
        this.currentIndex = 0;
        this.totalImages = 48;
        this.duration = 3000;
        
        // 播放控制
        this.timer = null;
        this.isPlaying = true;
        this.speedMultiplier = 1;
        this.isDragging = false;
        
        // 缓存管理
        this.preloadedImages = new Map();
        this.isLoading = false;
        
        // 时间配置（固定为2023-01-01 01:00:00）
        this.startDate = new Date(2023, 0, 1, 1, 0, 0); // 月份从0开始
        
        // 状态统计
        this.viewCount = 0;
        
        // 初始化
        this.init();
    }
    
    init() {
        console.log('🚀 初始化固定时间图片轮播系统...');
        console.log('📅 时间起点:', this.startDate.toLocaleString('zh-CN'));
        
        this.initElements();
        this.initEvents();
        this.loadConfig();
        this.initClock();
        this.initHideCursor();
        this.initViewCounter();
    }
    
    initElements() {
        // 图片显示
        this.imageElement = document.getElementById('current-image');
        
        // 时间显示
        this.systemClock = document.getElementById('system-clock');
        this.currentRange = document.getElementById('current-range');
        this.endRange = document.getElementById('end-range');
        this.displayDate = document.getElementById('display-date');
        this.displayTime = document.getElementById('display-time');
        
        // 信息显示
        this.currentGroupElement = document.getElementById('current-group');
        this.currentIndexElement = document.getElementById('current-index');
        this.totalImagesElement = document.getElementById('total-images');
        this.statusText = document.getElementById('status-text');
        
        // 时间轴元素
        this.progressFill = document.getElementById('progress-fill');
        this.progressHandle = document.getElementById('progress-handle');
        this.handleTime = document.getElementById('handle-time');
        this.currentMarker = document.getElementById('current-marker');
        this.progressTrack = document.getElementById('progress-track');
        
        // 控制元素
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.playIcon = document.getElementById('play-icon');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.jumpStartBtn = document.getElementById('jump-start-btn');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedDisplay = document.getElementById('speed-display');
        
        // 组选择按钮
        this.groupButtons = document.querySelectorAll('.group-btn');
        
        // 快速跳转按钮
        this.navButtons = document.querySelectorAll('.nav-btn');
        
        // 上传相关元素
        this.uploadPanel = document.querySelector('.upload-panel');
        this.uploadToggle = document.getElementById('upload-toggle');
        this.closeUpload = document.getElementById('close-upload');
        this.uploadSubmit = document.getElementById('upload-submit');
        this.uploadResult = document.getElementById('upload-result');
        
        // 更新总图片数显示
        this.totalImagesElement.textContent = this.totalImages.toString().padStart(2, '0');
        
        // 更新初始时间范围显示
        this.updateTimeRangeDisplay();
    }
    
    initEvents() {
        // 播放控制
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.prevHour());
        this.nextBtn.addEventListener('click', () => this.nextHour());
        this.jumpStartBtn.addEventListener('click', () => this.jumpToHour(0));
        
        // 速度控制
        this.speedSlider.addEventListener('input', (e) => {
            this.speedMultiplier = parseFloat(e.target.value);
            this.speedDisplay.textContent = `${this.speedMultiplier}x`;
            
            if (this.isPlaying) {
                this.startAutoPlay();
            }
            
            this.updateStatus(`播放速度: ${this.speedMultiplier}倍`);
        });
        
        // 组切换
        this.groupButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.dataset.group;
                if (group && group !== this.currentGroup) {
                    this.selectGroup(group);
                }
            });
        });
        
        // 快速跳转
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const hour = parseInt(btn.dataset.hour);
                if (hour >= 1 && hour <= 48) {
                    this.jumpToHour(hour - 1);
                }
            });
        });
        
        // 时间轴交互
        this.progressTrack.addEventListener('click', (e) => this.handleTimelineClick(e));
        this.progressHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        
        // 上传功能
        this.uploadToggle.addEventListener('click', () => this.toggleUploadPanel());
        this.closeUpload.addEventListener('click', () => this.toggleUploadPanel());
        this.uploadSubmit.addEventListener('click', () => this.uploadImage());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevHour();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextHour();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.jumpToHour(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.jumpToHour(this.totalImages - 1);
                    break;
                case 'u':
                case 'U':
                    e.preventDefault();
                    this.toggleUploadPanel();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    const index = parseInt(e.key) - 1;
                    if (index < this.groups.length) {
                        this.selectGroup(this.groups[index]);
                    }
                    break;
            }
        });
        
        // 图片加载事件
        this.imageElement.addEventListener('load', () => {
            this.imageElement.style.opacity = '1';
        });
        
        this.imageElement.addEventListener('error', () => {
            console.warn('图片加载失败');
            this.imageElement.alt = '图片加载失败';
            this.updateStatus('图片加载失败', 'warning');
        });
        
        // 全局鼠标控制
        this.initMouseControl();
    }
    
    initClock() {
        // 更新系统时钟
        const updateClock = () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            
            this.systemClock.textContent = `${hours}:${minutes}:${seconds}`;
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    initHideCursor() {
        let mouseTimer = null;
        
        const hideCursor = () => {
            document.body.classList.add('hide-cursor');
        };
        
        const showCursor = () => {
            document.body.classList.remove('hide-cursor');
            clearTimeout(mouseTimer);
            mouseTimer = setTimeout(hideCursor, 3000);
        };
        
        document.addEventListener('mousemove', showCursor);
        document.addEventListener('mousedown', showCursor);
        document.addEventListener('wheel', showCursor);
        
        hideCursor();
    }
    
    initMouseControl() {
        let hideTimer = null;
        
        const showControls = () => {
            document.querySelector('.top-bar').classList.remove('hidden');
            document.querySelector('.timeline-section').classList.remove('hidden');
            document.querySelector('.status-bar').classList.remove('hidden');
            
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                document.querySelector('.top-bar').classList.add('hidden');
                document.querySelector('.timeline-section').classList.add('hidden');
                document.querySelector('.status-bar').classList.add('hidden');
            }, 4000);
        };
        
        document.addEventListener('mousemove', showControls);
        document.addEventListener('mousedown', showControls);
        document.addEventListener('wheel', showControls);
        
        showControls();
    }
    
    initViewCounter() {
        this.viewCount = parseInt(localStorage.getItem('viewCount')) || 0;
        this.viewCount++;
        localStorage.setItem('viewCount', this.viewCount.toString());
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            this.groups = config.groups;
            this.duration = config.duration_per_image;
            this.totalImages = config.images_per_group;
            
            console.log('✅ 配置加载成功:', config);
            
            // 默认选择第一组
            if (this.groups.length > 0) {
                await this.selectGroup(this.groups[0]);
            }
            
            this.updateStatus('系统就绪');
        } catch (error) {
            console.error('❌ 配置加载失败:', error);
            
            // 使用默认配置
            this.groups = ['台海温度', '台海风速', '西藏温度', '西藏风速'];
            this.totalImages = 48;
            
            await this.selectGroup(this.groups[0]);
            this.updateStatus('使用本地配置', 'warning');
        }
    }
    
    async selectGroup(groupName) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.currentGroup = groupName;
        this.currentIndex = 0;
        this.preloadedImages.clear();
        
        this.updateStatus(`正在加载 ${groupName}...`);
        
        // 更新UI
        this.updateGroupButtons(groupName);
        
        try {
            const response = await fetch(`/api/group/${groupName}`);
            const data = await response.json();
            
            if (!data.images || data.images.length === 0) {
                console.warn(`组 ${groupName} 没有图片`);
                this.updateStatus(`${groupName} 暂无数据`, 'warning');
                this.isLoading = false;
                return;
            }
            
            this.images = data.images;
            
            // 显示第一张图片
            await this.showImage(0);
            
            // 开始自动播放
            if (this.isPlaying) {
                this.startAutoPlay();
            }
            
            this.updateStatus(`${groupName} 加载完成`);
            this.isLoading = false;
        } catch (error) {
            console.error(`加载组 ${groupName} 失败:`, error);
            this.updateStatus('加载失败', 'error');
            this.isLoading = false;
        }
    }
    
    updateGroupButtons(activeGroup) {
        this.groupButtons.forEach(btn => {
            if (btn.dataset.group === activeGroup) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    async showImage(index) {
        if (index < 0 || index >= this.totalImages) return;
        
        this.currentIndex = index;
        
        // 更新计数器
        this.currentIndexElement.textContent = (index + 1).toString().padStart(2, '0');
        
        // 更新时间显示
        this.updateTimeDisplay();
        
        // 更新进度显示
        this.updateProgressDisplay();
        
        // 获取图片URL
        const image = this.images[index];
        if (!image) {
            console.warn(`图片索引 ${index} 不存在`);
            return;
        }
        
        // 处理占位符图片
        if (image.placeholder) {
            console.log(`图片 ${index + 1} 为占位符`);
            this.imageElement.src = '';
            this.imageElement.alt = '暂无图片数据';
            this.imageElement.style.opacity = '1';
            return;
        }
        
        const imageUrl = `/images/${image.path}`;
        
        // 淡出当前图片
        this.imageElement.style.opacity = '0';
        
        // 加载新图片
        setTimeout(() => {
            this.imageElement.src = imageUrl;
            this.imageElement.alt = `${this.currentGroup} - 第${index + 1}小时`;
        }, 300);
        
        // 预加载下一张图片
        this.preloadNextImage();
    }
    
    updateTimeDisplay() {
        // 计算当前时间（从固定起始时间开始）
        const currentDate = new Date(this.startDate);
        currentDate.setHours(currentDate.getHours() + this.currentIndex);
        
        // 格式化日期和时间
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const hours = currentDate.getHours().toString().padStart(2, '0');
        const minutes = currentDate.getMinutes().toString().padStart(2, '0');
        
        // 更新显示
        this.displayDate.textContent = `${year}/${month}/${day}`;
        this.displayTime.textContent = `${hours}:${minutes}`;
        this.handleTime.textContent = `${hours}:${minutes}`;
    }
    
    updateTimeRangeDisplay() {
        // 计算起始时间
        const startDate = new Date(this.startDate);
        
        // 计算结束时间（48小时后）
        const endDate = new Date(this.startDate);
        endDate.setHours(endDate.getHours() + 48);
        
        // 格式化日期和时间
        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${year}/${month}/${day} ${hours}:${minutes}`;
        };
        
        // 更新显示
        this.currentRange.textContent = formatDateTime(startDate);
        this.endRange.textContent = formatDateTime(endDate);
    }
    
    updateProgressDisplay() {
        // 计算进度百分比
        const progress = ((this.currentIndex + 1) / this.totalImages) * 100;
        
        // 更新进度条
        this.progressFill.style.width = `${progress}%`;
        this.progressHandle.style.left = `${progress}%`;
        
        // 更新当前标记位置
        this.currentMarker.style.left = `${progress}%`;
    }
    
    preloadNextImage() {
        const nextIndex = (this.currentIndex + 1) % this.totalImages;
        const nextImage = this.images[nextIndex];
        if (!nextImage || nextImage.placeholder) return;
        
        const imageUrl = `/images/${nextImage.path}`;
        
        // 如果尚未预加载，则预加载
        if (!this.preloadedImages.has(imageUrl)) {
            const img = new Image();
            img.src = imageUrl;
            this.preloadedImages.set(imageUrl, true);
        }
    }
    
    nextHour() {
        const nextIndex = (this.currentIndex + 1) % this.totalImages;
        this.showImage(nextIndex);
        
        if (this.isPlaying) {
            this.startAutoPlay();
        }
    }
    
    prevHour() {
        const prevIndex = (this.currentIndex - 1 + this.totalImages) % this.totalImages;
        this.showImage(prevIndex);
        
        if (this.isPlaying) {
            this.startAutoPlay();
        }
    }
    
    jumpToHour(hourIndex) {
        if (hourIndex >= 0 && hourIndex < this.totalImages) {
            this.showImage(hourIndex);
            
            if (this.isPlaying) {
                this.startAutoPlay();
            }
            
            this.updateStatus(`跳转到第${hourIndex + 1}小时`);
        }
    }
    
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.playIcon.className = 'fas fa-pause';
            this.startAutoPlay();
            this.updateStatus('播放中');
        } else {
            this.playIcon.className = 'fas fa-play';
            this.stopAutoPlay();
            this.updateStatus('已暂停');
        }
    }
    
    startAutoPlay() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        const interval = this.duration / this.speedMultiplier;
        this.timer = setTimeout(() => {
            this.nextHour();
        }, interval);
    }
    
    stopAutoPlay() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    
    handleTimelineClick(e) {
        const rect = this.progressTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = (clickX / rect.width) * 100;
        
        // 计算对应的小时
        const targetIndex = Math.min(
            Math.max(0, Math.floor((percentage / 100) * this.totalImages)),
            this.totalImages - 1
        );
        
        this.jumpToHour(targetIndex);
        
        if (this.isPlaying) {
            this.startAutoPlay();
        }
    }
    
    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        
        // 暂停自动播放
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.isPlaying = false;
            this.stopAutoPlay();
            this.playIcon.className = 'fas fa-play';
        }
        
        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const rect = this.progressTrack.getBoundingClientRect();
            let clickX = e.clientX - rect.left;
            
            // 限制在轨道范围内
            clickX = Math.max(0, Math.min(clickX, rect.width));
            
            const percentage = (clickX / rect.width) * 100;
            const targetIndex = Math.floor((percentage / 100) * this.totalImages);
            
            if (targetIndex !== this.currentIndex) {
                this.showImage(targetIndex);
            }
        };
        
        const onMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // 恢复播放状态
            if (wasPlaying) {
                this.isPlaying = true;
                this.playIcon.className = 'fas fa-pause';
                this.startAutoPlay();
            }
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    toggleUploadPanel() {
        this.uploadPanel.classList.toggle('active');
    }
    
    async uploadImage() {
        const group = document.getElementById('upload-group').value;
        const index = document.getElementById('upload-index').value;
        const fileInput = document.getElementById('upload-file');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.showUploadResult('请选择要上传的图片文件', 'error');
            return;
        }
        
        const file = fileInput.files[0];
        const formData = new FormData();
        
        formData.append('file', file);
        formData.append('group', group);
        formData.append('index', index);
        
        try {
            this.showUploadResult('正在上传...', 'info');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showUploadResult(`✅ ${result.message}<br>路径: ${result.path}`, 'success');
                
                // 重新加载当前组以显示新上传的图片
                setTimeout(() => {
                    this.selectGroup(this.currentGroup);
                }, 1000);
            } else {
                this.showUploadResult(`❌ 上传失败: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('上传错误:', error);
            this.showUploadResult(`❌ 网络错误: ${error.message}`, 'error');
        }
    }
    
    showUploadResult(message, type) {
        this.uploadResult.innerHTML = message;
        this.uploadResult.className = `upload-result ${type}`;
        this.uploadResult.style.display = 'block';
        
        // 3秒后自动隐藏成功消息
        if (type === 'success') {
            setTimeout(() => {
                this.uploadResult.style.display = 'none';
            }, 3000);
        }
    }
    
    updateStatus(message, type = 'info') {
        this.statusText.textContent = message;
        
        // 根据类型设置颜色
        if (type === 'error') {
            this.statusText.style.color = '#e74c3c';
        } else if (type === 'warning') {
            this.statusText.style.color = '#f39c12';
        } else {
            this.statusText.style.color = '#2ecc71';
        }
        
        // 3秒后恢复默认状态
        setTimeout(() => {
            if (this.isPlaying) {
                this.statusText.textContent = '播放中';
            } else {
                this.statusText.textContent = '已暂停';
            }
            this.statusText.style.color = '#94a3b8';
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 页面加载完成，正在初始化系统...');
    
    // 确保所有资源加载完成后初始化
    if (document.readyState === 'complete') {
        window.carousel = new FixedTimeImageCarousel();
    } else {
        window.addEventListener('load', () => {
            window.carousel = new FixedTimeImageCarousel();
        });
    }
});

// 页面可见性变化处理
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.carousel) {
        window.carousel.stopAutoPlay();
    } else if (!document.hidden && window.carousel && window.carousel.isPlaying) {
        window.carousel.startAutoPlay();
    }
});