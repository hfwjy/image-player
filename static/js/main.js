class WeatherDisplay {
    constructor() {
        this.currentCategory = '台海温度';
        this.currentImageIndex = 0;
        this.images = {};
        this.autoPlayInterval = null;
        this.autoPlaySpeed = 2000; // 2秒切换一张
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadImages();
        this.startAutoPlay();
    }

    bindEvents() {
        // 类别按钮点击事件
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });

        // 时间滑块事件
        const slider = document.getElementById('timeSlider');
        slider.addEventListener('input', (e) => {
            this.stopAutoPlay();
            this.showImage(parseInt(e.target.value) - 1);
        });

        // 上传表单提交事件
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.uploadImages();
        });
    }

    async loadImages() {
        try {
            const response = await fetch('/get_images');
            this.images = await response.json();
            this.updateCategoryButtons();
            if (this.images[this.currentCategory]?.length > 0) {
                this.showImage(0);
            }
        } catch (error) {
            console.error('加载图片失败:', error);
        }
    }

    updateCategoryButtons() {
        document.querySelectorAll('.category-btn').forEach(btn => {
            const category = btn.dataset.category;
            const hasImages = this.images[category]?.length > 0;
            btn.style.opacity = hasImages ? '1' : '0.6';
        });
    }

    switchCategory(category) {
        if (!this.images[category] || this.images[category].length === 0) {
            alert('该类别暂无数据，请先上传图片');
            return;
        }

        // 更新按钮状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        this.currentCategory = category;
        this.currentImageIndex = 0;
        this.showImage(0);
        this.startAutoPlay();
    }

    showImage(index) {
        const categoryImages = this.images[this.currentCategory];
        if (!categoryImages || categoryImages.length === 0) return;

        // 确保索引在有效范围内
        if (index < 0) index = 0;
        if (index >= categoryImages.length) index = categoryImages.length - 1;
        
        this.currentImageIndex = index;
        
        const imageData = categoryImages[index];
        
        // 更新图片
        const container = document.getElementById('imageContainer');
        container.innerHTML = `
            <img src="${imageData.url}" 
                 alt="${this.currentCategory} - ${imageData.time}"
                 class="weather-image"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg0K'">
        `;
        
        // 更新时间显示
        document.querySelector('.current-time').textContent = imageData.time;
        
        // 更新滑块
        document.getElementById('timeSlider').value = index + 1;
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
        this.autoPlayInterval = setInterval(() => {
            this.nextImage();
        }, this.autoPlaySpeed);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    async uploadImages() {
        const form = document.getElementById('uploadForm');
        const formData = new FormData(form);
        const fileInput = document.getElementById('fileInput');
        const statusDiv = document.getElementById('uploadStatus');
        
        // 获取所有文件
        const files = fileInput.files;
        if (files.length !== 48) {
            statusDiv.textContent = '请选择48张图片';
            statusDiv.className = 'upload-status error';
            return;
        }

        // 按文件名排序
        const sortedFiles = Array.from(files).sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, {numeric: true});
        });

        // 清空FormData并重新添加
        formData.delete('files');
        sortedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            statusDiv.textContent = '上传中...';
            statusDiv.className = 'upload-status';

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                statusDiv.textContent = result.message;
                statusDiv.className = 'upload-status success';
                
                // 重新加载图片
                await this.loadImages();
                
                // 切换到上传的类别
                this.switchCategory(result.category);
                
                // 重置表单
                form.reset();
            } else {
                statusDiv.textContent = result.error || '上传失败';
                statusDiv.className = 'upload-status error';
            }
        } catch (error) {
            statusDiv.textContent = '上传失败: ' + error.message;
            statusDiv.className = 'upload-status error';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.weatherDisplay = new WeatherDisplay();
});