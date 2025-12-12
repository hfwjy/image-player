// static/js/player.js
document.addEventListener('DOMContentLoaded', function() {
    // 全局状态变量
    const state = {
        images: [],          // 图片数据数组
        currentIndex: 0,     // 当前图片索引
        isPlaying: false,    // 是否正在播放
        playInterval: null,  // 播放定时器
        playSpeed: 1000,     // 播放速度（毫秒）
        totalImages: 48,     // 总图片数量
        isLooping: true,     // 是否循环播放
        showThumbnails: true // 是否显示缩略图
    };

    // DOM元素引用
    const dom = {
        // 图片显示相关
        currentImage: document.getElementById('currentImage'),
        imageWrapper: document.getElementById('imageWrapper'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        noImageMessage: document.getElementById('noImageMessage'),
        
        // 信息显示相关
        timeLabel: document.getElementById('timeLabel'),
        fullTime: document.getElementById('fullTime'),
        currentIndex: document.getElementById('currentIndex'),
        totalImages: document.getElementById('totalImages'),
        currentTimeDisplay: document.getElementById('currentTimeDisplay'),
        
        // 控制相关
        timeSlider: document.getElementById('timeSlider'),
        progressBarBg: document.getElementById('progressBarBg'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        playIcon: document.getElementById('playIcon'),
        pauseIcon: document.getElementById('pauseIcon'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        firstBtn: document.getElementById('firstBtn'),
        lastBtn: document.getElementById('lastBtn'),
        
        // 缩略图相关
        thumbnailContainer: document.getElementById('thumbnailContainer'),
        prevThumbs: document.getElementById('prevThumbs'),
        nextThumbs: document.getElementById('nextThumbs'),
        
        // 速度控制相关
        speedDisplay: document.getElementById('infoSpeed'),
        customSpeedInput: document.getElementById('customSpeedInput'),
        applySpeedBtn: document.getElementById('applySpeedBtn'),
        
        // 状态显示相关
        statusIndicator: document.getElementById('statusIndicator'),
        statusIcon: document.getElementById('statusIcon'),
        statusText: document.getElementById('statusText'),
        infoFilename: document.getElementById('infoFilename'),
        infoTimestamp: document.getElementById('infoTimestamp'),
        infoIndex: document.getElementById('infoIndex'),
        infoProgress: document.getElementById('infoProgress'),
        infoStatus: document.getElementById('infoStatus'),
        infoSpeed: document.getElementById('infoSpeed'),
        
        // 页脚信息
        footerImageCount: document.getElementById('footerImageCount'),
        footerCurrentIndex: document.getElementById('footerCurrentIndex'),
        footerStatus: document.getElementById('footerStatus'),
        
        // 其他控制
        refreshBtn: document.getElementById('refreshBtn'),
        loopPlayback: document.getElementById('loopPlayback'),
        showThumbnails: document.getElementById('showThumbnails')
    };

    // 初始化函数
    async function init() {
        updateStatus('正在加载图片数据...', 'warning');
        
        try {
            // 从后端API获取图片数据
            const response = await fetch('/api/images');
            const result = await response.json();
            
            if (result.success) {
                state.images = result.data;
                state.totalImages = result.total;
                
                updateStatus('数据加载成功', 'success');
                renderUI();
                setupEventListeners();
                loadImage(0); // 加载第一张图片
            } else {
                throw new Error(result.error || '数据加载失败');
            }
        } catch (error) {
            console.error('初始化失败:', error);
            updateStatus('数据加载失败', 'error');
            showNoImageMessage();
        }
    }

    // 渲染UI
    function renderUI() {
        // 设置总图片数
        dom.totalImages.textContent = state.totalImages;
        dom.footerImageCount.textContent = state.totalImages;
        
        // 初始化进度条
        dom.timeSlider.max = state.totalImages - 1;
        updateProgressBar();
        
        // 创建缩略图
        if (state.showThumbnails) {
            createThumbnails();
        }
        
        // 更新状态信息
        updateInfoPanel();
    }

    // 创建缩略图
    function createThumbnails() {
        dom.thumbnailContainer.innerHTML = '';
        
        state.images.forEach((image, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail-item';
            thumbnail.dataset.index = index;
            
            // 添加点击事件
            thumbnail.addEventListener('click', () => {
                loadImage(index);
                pausePlayback();
            });
            
            // 创建缩略图内容
            const img = document.createElement('img');
            img.src = image.filepath;
            img.alt = `缩略图 ${index + 1}`;
            img.onerror = function() {
                this.src = 'https://via.placeholder.com/80x60/cccccc/666666?text=No+Image';
            };
            
            const indexBadge = document.createElement('div');
            indexBadge.className = 'thumbnail-index';
            indexBadge.textContent = index + 1;
            
            thumbnail.appendChild(img);
            thumbnail.appendChild(indexBadge);
            dom.thumbnailContainer.appendChild(thumbnail);
        });
        
        updateActiveThumbnail();
    }

    // 加载图片
    function loadImage(index) {
        if (index < 0 || index >= state.images.length) {
            console.warn('图片索引超出范围:', index);
            return;
        }
        
        // 更新当前索引
        state.currentIndex = index;
        const image = state.images[index];
        
        // 显示加载状态
        dom.currentImage.style.display = 'none';
        dom.loadingSpinner.style.display = 'flex';
        
        // 预加载图片
        const img = new Image();
        img.onload = function() {
            // 更新主图片
            dom.currentImage.src = image.filepath;
            dom.currentImage.alt = image.filename;
            dom.currentImage.style.display = 'block';
            dom.loadingSpinner.style.display = 'none';
            
            // 更新UI
            updateUIAfterImageLoad();
        };
        
        img.onerror = function() {
            console.error('图片加载失败:', image.filepath);
            dom.currentImage.src = 'https://via.placeholder.com/800x600/1a1a2e/ffffff?text=Image+Not+Found';
            dom.currentImage.alt = '图片加载失败';
            dom.currentImage.style.display = 'block';
            dom.loadingSpinner.style.display = 'none';
            
            // 更新UI
            updateUIAfterImageLoad();
        };
        
        img.src = image.filepath;
    }

    // 图片加载后更新UI
    function updateUIAfterImageLoad() {
        const image = state.images[state.currentIndex];
        
        // 更新文本信息
        dom.timeLabel.textContent = image.validTime;
        dom.fullTime.textContent = image.timestamp;
        dom.currentIndex.textContent = state.currentIndex + 1;
        dom.currentTimeDisplay.textContent = `当前: ${image.validTime}`;
        
        // 更新进度条
        dom.timeSlider.value = state.currentIndex;
        updateProgressBar();
        
        // 更新缩略图
        updateActiveThumbnail();
        
        // 更新信息面板
        updateInfoPanel();
        
        // 更新页脚
        updateFooter();
    }

    // 更新进度条
    function updateProgressBar() {
        const progress = ((state.currentIndex + 1) / state.totalImages) * 100;
        dom.progressBarBg.style.width = `${progress}%`;
    }

    // 更新活跃的缩略图
    function updateActiveThumbnail() {
        const thumbnails = document.querySelectorAll('.thumbnail-item');
        thumbnails.forEach(thumb => {
            const index = parseInt(thumb.dataset.index);
            thumb.classList.toggle('active', index === state.currentIndex);
        });
        
        // 滚动到当前缩略图
        const activeThumb = document.querySelector(`.thumbnail-item[data-index="${state.currentIndex}"]`);
        if (activeThumb && dom.thumbnailContainer) {
            const containerWidth = dom.thumbnailContainer.offsetWidth;
            const thumbWidth = activeThumb.offsetWidth;
            const scrollLeft = activeThumb.offsetLeft - (containerWidth / 2) + (thumbWidth / 2);
            
            dom.thumbnailContainer.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    }

    // 更新信息面板
    function updateInfoPanel() {
        const image = state.images[state.currentIndex];
        
        if (image) {
            dom.infoFilename.textContent = image.filename;
            dom.infoTimestamp.textContent = image.timestamp;
            dom.infoIndex.textContent = `${state.currentIndex + 1} / ${state.totalImages}`;
            
            const progressPercent = Math.round(((state.currentIndex + 1) / state.totalImages) * 100);
            dom.infoProgress.textContent = `${state.currentIndex + 1}/${state.totalImages} (${progressPercent}%)`;
            
            dom.infoStatus.textContent = state.isPlaying ? '播放中' : '已停止';
            dom.infoSpeed.textContent = `${state.playSpeed} ms/帧`;
        }
    }

    // 更新页脚
    function updateFooter() {
        dom.footerCurrentIndex.textContent = state.currentIndex + 1;
        dom.footerStatus.textContent = state.isPlaying ? '播放中' : '已停止';
    }

    // 更新状态指示器
    function updateStatus(message, type = 'info') {
        dom.statusText.textContent = message;
        
        // 根据类型设置图标颜色
        const colors = {
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c',
            info: '#3498db'
        };
        
        dom.statusIcon.style.color = colors[type] || colors.info;
    }

    // 播放控制函数
    function startPlayback() {
        if (state.isPlaying) return;
        
        state.isPlaying = true;
        dom.playIcon.style.display = 'none';
        dom.pauseIcon.style.display = 'block';
        updateStatus('播放中', 'success');
        
        state.playInterval = setInterval(() => {
            let nextIndex = state.currentIndex + 1;
            
            // 检查是否到达末尾
            if (nextIndex >= state.totalImages) {
                if (state.isLooping) {
                    nextIndex = 0; // 循环播放
                } else {
                    pausePlayback(); // 停止播放
                    return;
                }
            }
            
            loadImage(nextIndex);
        }, state.playSpeed);
    }

    function pausePlayback() {
        if (!state.isPlaying) return;
        
        state.isPlaying = false;
        dom.playIcon.style.display = 'block';
        dom.pauseIcon.style.display = 'none';
        updateStatus('已暂停', 'warning');
        
        if (state.playInterval) {
            clearInterval(state.playInterval);
            state.playInterval = null;
        }
    }

    function togglePlayback() {
        if (state.isPlaying) {
            pausePlayback();
        } else {
            startPlayback();
        }
    }

    function showPrevious() {
        pausePlayback();
        let prevIndex = state.currentIndex - 1;
        if (prevIndex < 0) prevIndex = state.totalImages - 1;
        loadImage(prevIndex);
    }

    function showNext() {
        pausePlayback();
        let nextIndex = state.currentIndex + 1;
        if (nextIndex >= state.totalImages) nextIndex = 0;
        loadImage(nextIndex);
    }

    function showFirst() {
        pausePlayback();
        loadImage(0);
    }

    function showLast() {
        pausePlayback();
        loadImage(state.totalImages - 1);
    }

    // 设置播放速度
    function setPlaySpeed(speed) {
        state.playSpeed = speed;
        dom.customSpeedInput.value = speed;
        
        // 更新速度按钮状态
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
        });
        
        // 如果正在播放，重启定时器
        if (state.isPlaying) {
            pausePlayback();
            startPlayback();
        }
        
        updateInfoPanel();
    }

    // 显示无图片消息
    function showNoImageMessage() {
        dom.loadingSpinner.style.display = 'none';
        dom.noImageMessage.style.display = 'block';
        dom.currentImage.style.display = 'none';
    }

    // 设置事件监听器
    function setupEventListeners() {
        // 进度条控制
        dom.timeSlider.addEventListener('input', function() {
            const index = parseInt(this.value);
            loadImage(index);
        });

        // 播放控制按钮
        dom.playPauseBtn.addEventListener('click', togglePlayback);
        dom.prevBtn.addEventListener('click', showPrevious);
        dom.nextBtn.addEventListener('click', showNext);
        dom.firstBtn.addEventListener('click', showFirst);
        dom.lastBtn.addEventListener('click', showLast);

        // 键盘快捷键
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT') return; // 忽略输入框
            
            switch(e.key) {
                case ' ':
                case 'Spacebar':
                    e.preventDefault();
                    togglePlayback();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    showPrevious();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    showNext();
                    break;
                case 'Home':
                    e.preventDefault();
                    showFirst();
                    break;
                case 'End':
                    e.preventDefault();
                    showLast();
                    break;
            }
        });

        // 速度控制按钮
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const speed = parseInt(this.dataset.speed);
                setPlaySpeed(speed);
            });
        });

        // 自定义速度应用
        dom.applySpeedBtn.addEventListener('click', function() {
            const speed = parseInt(dom.customSpeedInput.value);
            if (speed >= 100 && speed <= 5000) {
                setPlaySpeed(speed);
            } else {
                alert('速度必须在100-5000毫秒之间');
            }
        });

        // 缩略图导航
        dom.prevThumbs.addEventListener('click', function() {
            dom.thumbnailContainer.scrollBy({
                left: -200,
                behavior: 'smooth'
            });
        });

        dom.nextThumbs.addEventListener('click', function() {
            dom.thumbnailContainer.scrollBy({
                left: 200,
                behavior: 'smooth'
            });
        });

        // 刷新按钮
        dom.refreshBtn.addEventListener('click', async function() {
            updateStatus('刷新图片列表中...', 'warning');
            try {
                const response = await fetch('/api/scan');
                const result = await response.json();
                
                if (result.success) {
                    // 重新初始化
                    await init();
                    updateStatus('图片列表已刷新', 'success');
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('刷新失败:', error);
                updateStatus('刷新失败', 'error');
            }
        });

        // 循环播放选项
        dom.loopPlayback.addEventListener('change', function() {
            state.isLooping = this.checked;
        });

        // 显示缩略图选项
        dom.showThumbnails.addEventListener('change', function() {
            state.showThumbnails = this.checked;
            if (state.showThumbnails) {
                createThumbnails();
            } else {
                dom.thumbnailContainer.innerHTML = '';
            }
        });

        // 自动隐藏控制栏（简化版）
        document.getElementById('autoHideControls').addEventListener('change', function() {
            const controls = document.querySelector('.control-panel');
            if (this.checked) {
                controls.style.opacity = '0.7';
                controls.addEventListener('mouseenter', () => controls.style.opacity = '1');
                controls.addEventListener('mouseleave', () => controls.style.opacity = '0.7');
            } else {
                controls.style.opacity = '1';
                controls.removeEventListener('mouseenter', () => {});
                controls.removeEventListener('mouseleave', () => {});
            }
        });
    }

    // 初始化应用
    init();
});