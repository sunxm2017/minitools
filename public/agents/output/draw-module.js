/**
 * DrawModule - 通用页面手写/标注模块
 */

(function(global) {
    'use strict';

    const defaults = {
        zIndex: 9999,
        defaultColor: '#d00',
        defaultWidth: 3,
        colors: [
            '#d00',      // 红色
            '#27ae60',   // 绿色
            '#3498db',   // 蓝色
            '#f39c12',   // 橙色
            '#8e44ad',   // 紫色
            '#2c3e50',   // 深蓝灰
            '#000000',   // 黑色 ← 新增
            '#ffffff',   // 白色 ← 新增
            '#95a5a6',   // 灰色 ← 新增
            '#e91e63',   // 粉红 ← 新增
            '#00bcd4',   // 青色 ← 新增
            '#ffeb3b',   // 黄色 ← 新增
        ],
        showControls: true,
        controlsPosition: 'bottom',
        autoSaveBg: true,
    };

    let config = {};
    let isDrawMode = false;
    let isDrawing = false;
    let currentPath = null;
    let points = [];
    let currentColor = '';
    let currentWidth = 0;
    
    let drawLayer = null;
    let drawControls = null;

    function getPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onStart(e) {
        if (!isDrawMode) return;
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        points = [pos];

        currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        currentPath.setAttribute('stroke', currentColor);
        currentPath.setAttribute('stroke-width', currentWidth);
        currentPath.setAttribute('stroke-linecap', 'round');
        currentPath.setAttribute('stroke-linejoin', 'round');
        currentPath.setAttribute('fill', 'none');
        currentPath.setAttribute('d', `M ${pos.x} ${pos.y}`);

        drawLayer.appendChild(currentPath);
    }

    function onMove(e) {
        if (!isDrawMode || !isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        points.push(pos);

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }
        currentPath.setAttribute('d', d);
    }

    function onEnd() {
        isDrawing = false;
        currentPath = null;
        points = [];
    }

    function onResize() {
        if (drawLayer) {
            drawLayer.setAttribute('width', window.innerWidth);
            drawLayer.setAttribute('height', window.innerHeight);
        }
    }

    function preventScroll(e) {
        if (isDrawMode) {
            e.preventDefault();
        }
    }

    function clear() {
        if (drawLayer) drawLayer.innerHTML = '';
    }

    function disable() {
        isDrawMode = false;
        isDrawing = false;
        if (drawLayer) {
            drawLayer.style.pointerEvents = 'none';
            drawLayer.style.cursor = 'default';
        }
        if (drawControls) drawControls.style.display = 'none';
        document.body.style.overflow = '';
        
        document.dispatchEvent(new CustomEvent('drawmode:off'));
    }

    function save(filename) {
        if (!drawLayer || drawLayer.innerHTML === '') {
            console.warn('[DrawModule] \u6ca1\u6709\u7b14\u8ff9\u53ef\u4fdd\u5b58');  // "没有笔迹可保存"
            return;
        }

        const svgData = new XMLSerializer().serializeToString(drawLayer);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (config.autoSaveBg) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            const link = document.createElement('a');
            link.download = (filename || '\u624b\u5199\u7b14\u8bb0_' + new Date().getTime()) + '.png';  // "手写笔记_"
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    function createDrawLayer() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'draw-module-layer';
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: ${config.zIndex};
            pointer-events: none;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
        `;
        
        svg.setAttribute('width', window.innerWidth);
        svg.setAttribute('height', window.innerHeight);
        
        document.body.appendChild(svg);
        return svg;
    }

    function createControls() {
        const panel = document.createElement('div');
        panel.id = 'draw-module-controls';
        
        const pos = config.controlsPosition === 'top' ? 'top: 20px;' : 'bottom: 20px;';
        panel.style.cssText = `
            position: fixed;
            left: 50%;
            transform: translateX(-50%);
            ${pos}
            display: none;
            align-items: center;
            gap: 12px;
            background: rgba(255,255,255,0.95);
            padding: 10px 18px;
            border-radius: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: ${config.zIndex + 1};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            flex-wrap: wrap;
            justify-content: center;
        `;

        let colorHtml = '<div style="display:flex;gap:5px;align-items:center;">';
        config.colors.forEach((color, idx) => {
            const active = idx === 0 ? 'border-color:#333;transform:scale(1.15);' : '';
            colorHtml += `<div class="dm-color-btn" data-color="${color}" style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;transition:all 0.2s;${active}"></div>`;
        });
        colorHtml += '</div>';

        // \u7c97\u7ec6 = "粗细", \u7c97\u7ec6\u8c03\u6574 = "粗细调整"
        const sizeHtml = `
            <div style="display:flex;align-items:center;gap:6px;color:#333;font-size:13px;">
                <span>\u7c97\u7ec6</span>
                <input type="range" id="dm-brush-size" min="1" max="15" value="${config.defaultWidth}" style="width:70px;cursor:pointer;">
                <span id="dm-size-value" style="min-width:28px;">${config.defaultWidth}px</span>
            </div>
        `;

        const btnStyle = 'padding:6px 14px;font-size:13px;border:none;border-radius:4px;color:#fff;cursor:pointer;transition:opacity 0.2s;';
        // \u6e05\u9664 = "清除", \u4fdd\u5b58 = "保存", \u5173\u95ed = "关闭"
        const buttonsHtml = `
            <button id="dm-btn-clear" style="${btnStyle}background:#7f8c8d;">\u6e05\u9664</button>
            <button id="dm-btn-save" style="${btnStyle}background:#27ae60;">\u4fdd\u5b58</button>
            <button id="dm-btn-close" style="${btnStyle}background:#e74c3c;">\u5173\u95ed</button>
        `;

        panel.innerHTML = colorHtml + sizeHtml + buttonsHtml;
        document.body.appendChild(panel);

        drawControls = panel;

        const cBtns = panel.querySelectorAll('.dm-color-btn');
        cBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                cBtns.forEach(b => {
                    b.style.borderColor = '#fff';
                    b.style.transform = 'scale(1)';
                });
                this.style.borderColor = '#333';
                this.style.transform = 'scale(1.15)';
                currentColor = this.dataset.color;
            });
        });

        const sInput = panel.querySelector('#dm-brush-size');
        const sValue = panel.querySelector('#dm-size-value');
        sInput.addEventListener('input', function() {
            currentWidth = parseInt(this.value);
            sValue.textContent = currentWidth + 'px';
        });

        panel.querySelector('#dm-btn-clear').addEventListener('click', clear);
        panel.querySelector('#dm-btn-save').addEventListener('click', function() {
            save();
        });
        panel.querySelector('#dm-btn-close').addEventListener('click', disable);
    }

    const DrawModule = {
        init: function(options) {
            if (drawLayer) this.destroy();

            config = Object.assign({}, defaults, options);
            currentColor = config.defaultColor;
            currentWidth = config.defaultWidth;

            drawLayer = createDrawLayer();
            
            if (config.showControls) {
                createControls();
            }

            drawLayer.addEventListener('mousedown', onStart);
            drawLayer.addEventListener('mousemove', onMove);
            drawLayer.addEventListener('mouseup', onEnd);
            drawLayer.addEventListener('mouseleave', onEnd);
            drawLayer.addEventListener('touchstart', onStart, { passive: false });
            drawLayer.addEventListener('touchmove', onMove, { passive: false });
            drawLayer.addEventListener('touchend', onEnd);
            drawLayer.addEventListener('touchcancel', onEnd);
            window.addEventListener('resize', onResize);

            document.addEventListener('touchmove', preventScroll, { passive: false });

            return this;
        },

        toggle: function() {
            if (isDrawMode) {
                this.disable();
            } else {
                this.enable();
            }
            return isDrawMode;
        },

        enable: function() {
            if (!drawLayer) this.init();
            isDrawMode = true;
            drawLayer.style.pointerEvents = 'auto';
            drawLayer.style.cursor = 'crosshair';
            if (drawControls) drawControls.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            document.dispatchEvent(new CustomEvent('drawmode:on'));
            return this;
        },

        disable: function() {
            disable();
            return this;
        },

        clear: function() {
            clear();
            return this;
        },

        save: function(filename) {
            save(filename);
            return this;
        },

        setColor: function(color) {
            currentColor = color;
            return this;
        },

        setWidth: function(width) {
            currentWidth = Math.max(1, Math.min(15, parseInt(width)));
            return this;
        },

        isActive: function() {
            return isDrawMode;
        },

        destroy: function() {
            this.disable();
            
            if (drawLayer) {
                drawLayer.removeEventListener('mousedown', onStart);
                drawLayer.removeEventListener('mousemove', onMove);
                drawLayer.removeEventListener('mouseup', onEnd);
                drawLayer.removeEventListener('mouseleave', onEnd);
                drawLayer.removeEventListener('touchstart', onStart);
                drawLayer.removeEventListener('touchmove', onMove);
                drawLayer.removeEventListener('touchend', onEnd);
                drawLayer.removeEventListener('touchcancel', onEnd);
                drawLayer.remove();
                drawLayer = null;
            }

            if (drawControls) {
                drawControls.remove();
                drawControls = null;
            }

            window.removeEventListener('resize', onResize);
            document.removeEventListener('touchmove', preventScroll);

            config = {};
            return this;
        }
    };

    global.DrawModule = DrawModule;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DrawModule;
    }
    if (typeof define === 'function' && define.amd) {
        define(function() { return DrawModule; });
    }

})(typeof window !== 'undefined' ? window : this);