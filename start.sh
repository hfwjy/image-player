#!/bin/bash
echo "🚀 启动图片轮播系统..."
echo "📂 存储路径: $STORAGE_PATH"
echo "📅 时间起点: 2023-01-01 01:00:00"

# 检查存储目录权限
if [ ! -d "$STORAGE_PATH" ]; then
    echo "⚠️  存储目录不存在，正在创建..."
    mkdir -p "$STORAGE_PATH"
fi

# 检查目录权限
if [ ! -w "$STORAGE_PATH" ]; then
    echo "❌ 存储目录不可写，请检查权限"
    exit 1
fi

# 启动Gunicorn
exec gunicorn --worker-class gevent \
              --workers 2 \
              --threads 4 \
              --bind 0.0.0.0:$PORT \
              --access-logfile - \
              --error-logfile - \
              app:app