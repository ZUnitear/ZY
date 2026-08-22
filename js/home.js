/**
 * 主页模块 - 同心账单
 * 负责主页的显示、自定义设置、功能导航等
 */

(function() {
    'use strict';

    // ========== 全局状态 ==========
    let currentAvatarTarget = 'me';
    let currentProfileTarget = 'me';
    let currentIconTarget = null;

    // ========== 主页绑定会话存储路由 ==========
    // 开关状态始终全局存储（不随会话变化）
    let homeSessionBindEnabled = localStorage.getItem('home_session_bind') === 'true';

    /**
     * 获取 Home 存储键名
     * 开启绑定会话时：键名带 SESSION_ID 前缀，按会话隔离
     * 关闭时：使用原始全局键名
     */
    function homeKey(key) {
        if (homeSessionBindEnabled && window.SESSION_ID) {
            return `home_${window.SESSION_ID}_${key}`;
        }
        return key;
    }

    /** 读取 Home 设置（自动路由） */
    function homeGetItem(key) {
        return localStorage.getItem(homeKey(key));
    }

    /** 写入 Home 设置（自动路由） */
    function homeSetItem(key, value) {
        localStorage.setItem(homeKey(key), value);
    }

    /** 读取大容量设置（优先 localforage，回退 localStorage） */
    async function homeGetLargeItem(key) {
        const k = homeKey(key);
        if (typeof localforage !== 'undefined') {
            const val = await localforage.getItem(k);
            if (val !== null) return val;
        }
        return localStorage.getItem(k);
    }

    /** 写入大容量设置（使用 localforage） */
    function homeSetLargeItem(key, value) {
        if (typeof localforage !== 'undefined') {
            return localforage.setItem(homeKey(key), value);
        }
        localStorage.setItem(homeKey(key), value);
        return Promise.resolve();
    }

    /** 删除 Home 设置（自动路由） */
    function homeRemoveItem(key) {
        localStorage.removeItem(homeKey(key));
    }

    /** 读取全局 Home 设置（不受开关影响） */
    function homeGetGlobal(key) {
        return localStorage.getItem(key);
    }

    /** 写入全局 Home 设置（不受开关影响） */
    function homeSetGlobal(key, value) {
        // 同时写入 localStorage 和 localforage，确保各模块都能读取
        try {
            localStorage.setItem(key, value);
        } catch(e) {}
        if (typeof localforage !== 'undefined') {
            localforage.setItem(key, value).catch(() => {});
        }
        // 派发事件，通知其他模块数据已更新
        window.dispatchEvent(new CustomEvent('homeGlobalUpdated', { detail: { key, value } }));
    }

    // 暴露到全局供其他模块（如朋友圈）使用
    window.homeGetGlobal = homeGetGlobal;
    window.homeSetGlobal = homeSetGlobal;
    window.homeGetItem = homeGetItem;

    /** 删除全局 Home 设置（不受开关影响） */
    function homeRemoveGlobal(key) {
        localStorage.removeItem(key);
    }

    /** 读取预设列表（使用 localforage，支持大容量） */
    function homeGetPresets(key) {
        if (typeof localforage !== 'undefined') {
            return localforage.getItem(key);
        }
        return Promise.resolve(JSON.parse(localStorage.getItem(key) || '[]'));
    }

    /** 保存预设列表（使用 localforage，支持大容量） */
    function homeSetPresets(key, value) {
        if (typeof localforage !== 'undefined') {
            return localforage.setItem(key, value);
        }
        localStorage.setItem(key, JSON.stringify(value));
        return Promise.resolve();
    }

    // ========== 预设配置 ==========
    const bgPresets = {
        default: 'linear-gradient(135deg, #f5f0f9 0%, #faf8fb 50%, #f8f6f9 100%)',
        sunset: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        ocean: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        lavender: 'linear-gradient(135deg, #e8d5f5 0%, #f5e6cc 100%)',
        forest: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
        night: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)'
    };

    const pageBgPresets = {
        default: 'linear-gradient(135deg, #fafafa 0%, #f5f0f9 100%)',
        pink: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e6 100%)',
        blue: 'linear-gradient(135deg, #f0f7ff 0%, #e0f0ff 100%)',
        green: 'linear-gradient(135deg, #f0fff4 0%, #e0f5e8 100%)',
        purple: 'linear-gradient(135deg, #f8f5ff 0%, #f0e8ff 100%)',
        warm: 'linear-gradient(135deg, #fff8f0 0%, #fff0e0 100%)'
    };

    const themePresets = {
        default: { title: '#3a3a3a', subtitle: '#8a8a8a', accent: '#b8a9c9', time: '#3a3a3a', iconColor: '#6b5b7b', iconBg: '#ffffff', iconBorder: '#f0f0f0' },
        sakura:  { title: '#5a3e3e', subtitle: '#c48b8b', accent: '#f8bbd0', time: '#5a3e3e', iconColor: '#8b5a5a', iconBg: '#fff5f5', iconBorder: '#fce4ec' },
        ocean:   { title: '#2c4a5a', subtitle: '#6a9fb5', accent: '#a8d8ea', time: '#2c4a5a', iconColor: '#4a7a9a', iconBg: '#f0f9ff', iconBorder: '#e0f0ff' },
        forest:  { title: '#2e4a2e', subtitle: '#6b9b6b', accent: '#a8d5a8', time: '#2e4a2e', iconColor: '#4a7a4a', iconBg: '#f0fff4', iconBorder: '#e0f5e8' },
        sunset:  { title: '#5a3a2a', subtitle: '#c48b5a', accent: '#ffd4a8', time: '#5a3a2a', iconColor: '#8a5a3a', iconBg: '#fff8f0', iconBorder: '#fff0e0' },
        night:   { title: '#e0e0e0', subtitle: '#a0a0a0', accent: '#78909c', time: '#e0e0e0', iconColor: '#a0a0b0', iconBg: '#2a2a3a', iconBorder: '#3a3a4a' }
    };

    const defaultAppIcons = {
        chat: '<i class="fas fa-comment-alt"></i>',
        mailbox: '<i class="fas fa-envelope"></i>',
        moyu: '<i class="fas fa-fish"></i>',
        'call-records': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        diary: '<i class="fas fa-clipboard-list"></i>',
        fortune: '<i class="fas fa-star-and-crescent"></i>',
        mood: '<i class="fas fa-calendar-day"></i>',
        calendar: '<i class="fas fa-calendar-alt"></i>',
        decide: '<i class="fas fa-balance-scale"></i>',
        stats: '<i class="fas fa-chart-bar"></i>',
        accounting: '<i class="fas fa-coins"></i>'
    };

    const defaultAppOrder = ['chat', 'mailbox', 'moyu', 'call-records', 'diary', 'fortune', 'mood', 'calendar', 'decide', 'stats', 'accounting', 'map'];
    let appOrder = [...defaultAppOrder];
    let isEditMode = false;

    let currentTheme = { ...themePresets.default };
    let customAppIcons = {};
    let profileData = {
        me: {
            name: '我',
            id: '@my_profile',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
            signature: '"今天也要加油呀 ✨"',
            startDate: '' // 留空则默认从会话开始第一天计算
        },
        partner: {
            name: '梦角',
            id: '@dream_partner',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=partner',
            signature: '"和你在一起的每一天都很开心 💕"',
            startDate: '' // 留空则默认从会话开始第一天计算
        }
    };

    /**
     * 计算在一起天数
     * @param {string} startDate - 自定义开始日期 (YYYY-MM-DD)
     * @returns {number} 在一起天数
     */
    function calculateTogetherDays(startDate) {
        let start;
        if (startDate) {
            start = new Date(startDate);
        } else {
            // 默认从会话开始第一天计算（从全局获取 sessionList）
            const sessions = typeof window.sessionList !== 'undefined' ? window.sessionList : 
                            (typeof sessionList !== 'undefined' ? sessionList : null);
            const firstSession = sessions && sessions.length > 0 
                ? sessions[sessions.length - 1] 
                : null;
            if (firstSession && firstSession.createdAt) {
                start = new Date(firstSession.createdAt);
            } else {
                start = new Date(); // 如果没有会话，从今天开始
            }
        }
        const today = new Date();
        const diffTime = today - start;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays + 1); // 至少为1天
    }

    // ========== 时间更新 ==========
    function updateTime() {
        const timeEl = document.getElementById('home-time-display');
        const dateEl = document.getElementById('home-date-display');
        if (!timeEl || !dateEl) return;

        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}`;

        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        dateEl.textContent = `${months[now.getMonth()]}${now.getDate()}日 ${days[now.getDay()]}`;
    }

    // ========== 主页显示/隐藏 ==========
    window.showHomePage = function() {
        const homeContainer = document.getElementById('home-container');
        const chatArea = document.querySelector('.main-chat-area');
        const header = document.querySelector('.header');
        const inputArea = document.querySelector('.input-area-wrapper');
        const pageBg = document.getElementById('home-page-bg');

        // 允许 body 滚动
        document.body.classList.add('home-active');

        if (homeContainer) {
            homeContainer.classList.add('active');
            homeContainer.style.display = 'flex';
        }
        if (pageBg) pageBg.style.display = 'block';
        if (chatArea) chatArea.style.display = 'none';
        if (header) header.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';

        // 隐藏加载动画
        const welcomeAnimation = document.getElementById('welcome-animation');
        if (welcomeAnimation) welcomeAnimation.style.display = 'none';

        updateTime();
    };

    window.hideHomePage = function() {
        const homeContainer = document.getElementById('home-container');
        const chatArea = document.querySelector('.main-chat-area');
        const header = document.querySelector('.header');
        const inputArea = document.querySelector('.input-area-wrapper');
        const pageBg = document.getElementById('home-page-bg');

        // 恢复 body 不滚动
        document.body.classList.remove('home-active');

        if (homeContainer) {
            homeContainer.classList.remove('active');
            homeContainer.style.display = 'none';
        }
        if (pageBg) pageBg.style.display = 'none';
        if (chatArea) chatArea.style.display = '';
        if (header) header.style.display = '';
        if (inputArea) inputArea.style.display = '';
    };

    // ========== 萌宠屋页面切换 ==========

    window.showPetPage = function() {
        const homeContainer = document.getElementById('home-container');
        const petContainer = document.getElementById('pet-container');
        const chatArea = document.querySelector('.main-chat-area');
        const header = document.querySelector('.header');
        const inputArea = document.querySelector('.input-area-wrapper');
        const storyScreen = document.getElementById('story-screen');
        const gameScreen = document.getElementById('game-screen');

        // 隐藏主页
        if (homeContainer) {
            homeContainer.classList.remove('active');
            homeContainer.style.display = 'none';
        }
        // 隐藏聊天区域
        if (chatArea) chatArea.style.display = 'none';
        if (header) header.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';

        // 允许 body 滚动
        document.body.classList.add('home-active');

        // 显示萌宠屋
        if (petContainer) {
            petContainer.style.display = 'block';
        }

        // 判断是否有存档（只要存档中有currentPet就跳过剧情）
        const savedDataRaw = localStorage.getItem('pixelPetGame');
        let hasValidSave = false;
        if (savedDataRaw) {
            try {
                const savedData = JSON.parse(savedDataRaw);
                hasValidSave = savedData && savedData.currentPet;
            } catch(e) {}
        }

        if (hasValidSave) {
            // 有存档，直接显示游戏界面（只在未显示时才切换，避免弹窗被重置）
            if (gameScreen && !gameScreen.classList.contains('active')) {
                if (storyScreen) storyScreen.classList.remove('active');
                gameScreen.classList.add('active');
            }
        } else {
            // 无存档，显示剧情界面
            if (gameScreen) gameScreen.classList.remove('active');
            if (storyScreen) storyScreen.classList.add('active');
            
            // 立即绑定故事框点击事件
            const storyBox = document.getElementById('story-box');
            const storyText = document.getElementById('story-text');
            if (storyBox && storyText && !window._storyBoxBound) {
                window._storyBoxBound = true;
                window._currentStoryIndex = 0;
                storyText.textContent = "在一个阳光明媚的下午，你和爱人走在回家的路上...";
                storyBox.addEventListener('click', function() {
                    const STORY_TEXTS = [
                        "在一个阳光明媚的下午，你和爱人走在回家的路上...",
                        "路过街角时，你听到一阵细微的叫声从草丛中传来",
                        "拨开枝叶，你发现了几只毛茸茸的小家伙正眨着眼睛看着你",
                        "它们看起来又饿又累，似乎是被遗弃在这里",
                        "你蹲下身，轻轻伸出手...",
                        "小家伙们犹豫了一下，然后慢慢靠近你",
                        "那一刻，你决定给它们一个温暖的家"
                    ];
                    window._currentStoryIndex++;
                    if (window._currentStoryIndex < STORY_TEXTS.length) {
                        storyText.style.opacity = '0';
                        setTimeout(() => {
                            storyText.textContent = STORY_TEXTS[window._currentStoryIndex];
                            storyText.style.opacity = '1';
                        }, 200);
                    } else {
                        storyScreen.classList.remove('active');
                        document.getElementById('transition-screen').classList.add('active');
                    }
                });
            }
        }

        // 初始化宠物游戏（每次都调用init，init内部会判断是否需要绑定事件）
        setTimeout(() => {
            try {
                if (typeof window.initPetGame === 'function') {
                    window.initPetGame();
                }
            } catch (e) {
                console.error('initPetGame error:', e);
            }
        }, 100);
    };

    // 确保萌宠屋所需的全局函数始终可用（防止pet-game.js未加载完成时点击无响应）
    if (!window.showPetSelection) {
        window.showPetSelection = function() {
            const transitionScreen = document.getElementById('transition-screen');
            const startScreen = document.getElementById('start-screen');
            if (transitionScreen) transitionScreen.classList.remove('active');
            if (startScreen) startScreen.classList.add('active');
        };
    }
    if (!window.selectPet) {
        window.selectPet = function(type) {
            // 高亮选中的宠物卡片
            document.querySelectorAll('.pet-container .pet-card').forEach(c => c.classList.remove('selected'));
            const card = document.querySelector(`.pet-container .pet-card[data-pet="${type}"]`);
            if (card) card.classList.add('selected');
            window._selectedPetType = type;
            // 显示取名弹窗
            const nameModal = document.getElementById('name-modal');
            const petTypes = window.PET_TYPES || {};
            const petInfo = petTypes[type] || {};
            if (nameModal) {
                const imgEl = document.getElementById('name-modal-img');
                const typeEl = document.getElementById('name-modal-pet-type');
                const descEl = document.getElementById('name-modal-pet-desc');
                if (imgEl) imgEl.textContent = petInfo.emoji || '🐱';
                if (typeEl) typeEl.textContent = petInfo.name || type;
                if (descEl) descEl.textContent = petInfo.personality || '';
                nameModal.classList.add('show');
            }
        };
    }
    if (!window.startGame) {
        window.startGame = function() {
            const nameInput = document.getElementById('pet-name-input');
            const ownerInput = document.getElementById('owner-name-input');
            const petName = nameInput ? nameInput.value.trim() : '';
            const ownerName = ownerInput ? ownerInput.value.trim() : '';
            if (!petName) { alert('请给宠物取个名字'); return; }
            // 关闭取名弹窗，等init完成后由pet-game.js接管
            const nameModal = document.getElementById('name-modal');
            if (nameModal) nameModal.classList.remove('show');
            const startScreen = document.getElementById('start-screen');
            if (startScreen) startScreen.classList.remove('active');
        };
    }
    if (!window.cancelNaming) {
        window.cancelNaming = function() {
            const nameModal = document.getElementById('name-modal');
            if (nameModal) nameModal.classList.remove('show');
        };
    }

    window.hidePetPage = function() {
        const petContainer = document.getElementById('pet-container');
        const homeContainer = document.getElementById('home-container');

        // 隐藏萌宠屋
        if (petContainer) {
            petContainer.style.display = 'none';
        }

        // 显示主页
        if (homeContainer) {
            homeContainer.classList.add('active');
            homeContainer.style.display = 'flex';
        }
        // body 滚动保持（因为还在主页）
    };

    // ========== 自定义面板 ==========
    window.openCustomizePanel = function() {
        const overlay = document.getElementById('customize-overlay');
        if (overlay) overlay.classList.add('active');
        // 更新主页绑定会话开关UI
        window.updateHomeSessionBindUI && window.updateHomeSessionBindUI();
    };

    window.closeCustomizePanel = function(e) {
        if (e && e.target !== e.currentTarget) return;
        const overlay = document.getElementById('customize-overlay');
        if (overlay) overlay.classList.remove('active');
    };

    // ========== 页面背景 ==========
    window.setPageBg = function(preset) {
        const bg = pageBgPresets[preset];
        if (!bg) return;

        const pageBg = document.getElementById('home-page-bg');
        if (pageBg) pageBg.style.background = bg;

        document.querySelectorAll('#page-bg-presets .bg-preset').forEach(el => {
            el.classList.toggle('active', el.dataset.bg === preset);
        });

        homeSetItem('home_page_bg', preset);
        
        // 同步到聊天界面
        syncBgToChat(bg);
    };

    window.uploadPageBg = function() {
        const input = document.getElementById('page-bg-upload-input');
        if (input) input.click();
    };

    window.handlePageBgUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const url = e.target.result;
            const bgValue = `url(${url}) center/cover no-repeat`;
            const pageBg = document.getElementById('home-page-bg');
            if (pageBg) pageBg.style.background = bgValue;

            document.querySelectorAll('#page-bg-presets .bg-preset').forEach(el => el.classList.remove('active'));
            homeSetItem('home_page_bg_custom', url);
            homeSetItem('home_page_bg', 'custom');
            
            // 同步到聊天界面
            syncBgToChat(bgValue);
        };
        reader.readAsDataURL(file);
    };

    // ========== 保存背景到预设（使用 localforage 避免 localStorage 大小限制） ==========
    window.savePageBgToPreset = async function() {
        const pageBg = document.getElementById('home-page-bg');
        if (!pageBg) return;
        
        const currentBg = pageBg.style.background;
        if (!currentBg || currentBg === '') {
            (window.showNotification || function(){})('请先设置页面背景', 'warning');
            return;
        }
        
        // 获取当前自定义背景URL
        let savedCustomUrl = homeGetItem('home_page_bg_custom');
        if (!savedCustomUrl && currentBg.includes('url(')) {
            const match = currentBg.match(/url\(["']?([^"')]+)["']?\)/);
            if (match) savedCustomUrl = match[1];
        }
        
        if (!savedCustomUrl) {
            (window.showNotification || function(){})('当前没有自定义背景可保存', 'warning');
            return;
        }
        
        // 从 localforage 读取预设列表
        let customPresets = await homeGetPresets('home_page_bg_presets');
        if (!Array.isArray(customPresets)) customPresets = [];
        
        // 检查是否已存在
        if (customPresets.includes(savedCustomUrl)) {
            (window.showNotification || function(){})('该背景已在预设中', 'info');
            return;
        }
        
        // 最多保存10个预设
        if (customPresets.length >= 10) {
            customPresets.shift();
        }
        
        customPresets.push(savedCustomUrl);
        await homeSetPresets('home_page_bg_presets', customPresets);
        
        // 添加到UI
        renderPageBgPresets();
        (window.showNotification || function(){})('已保存到预设', 'success');
    };

    window.saveCardBgToPreset = async function() {
        const heroBg = document.getElementById('hero-bg-inner');
        if (!heroBg) return;

        const currentBg = heroBg.style.background;
        if (!currentBg || currentBg === '') {
            (window.showNotification || function(){})('请先设置卡片背景', 'warning');
            return;
        }

        // 获取当前自定义背景URL（优先从大容量存储读取）
        let savedCustomUrl = await homeGetLargeItem('home_card_bg_custom');
        if (!savedCustomUrl && currentBg.includes('url(')) {
            const match = currentBg.match(/url\(["']?([^"')]+)["']?\)/);
            if (match) savedCustomUrl = match[1];
        }
        
        if (!savedCustomUrl) {
            (window.showNotification || function(){})('当前没有自定义背景可保存', 'warning');
            return;
        }
        
        // 从 localforage 读取预设列表
        let customPresets = await homeGetPresets('home_card_bg_presets');
        if (!Array.isArray(customPresets)) customPresets = [];
        
        // 检查是否已存在
        if (customPresets.includes(savedCustomUrl)) {
            (window.showNotification || function(){})('该背景已在预设中', 'info');
            return;
        }
        
        // 最多保存10个预设
        if (customPresets.length >= 10) {
            customPresets.shift();
        }
        
        customPresets.push(savedCustomUrl);
        await homeSetPresets('home_card_bg_presets', customPresets);
        
        // 添加到UI
        renderCardBgPresets();
        (window.showNotification || function(){})('已保存到预设', 'success');
    };

    // 渲染页面背景预设
    async function renderPageBgPresets() {
        const container = document.getElementById('page-bg-presets');
        if (!container) return;
        
        // 移除旧的自定义预设
        container.querySelectorAll('.bg-preset-custom').forEach(el => el.remove());
        
        const customPresets = await homeGetPresets('home_page_bg_presets');
        if (!Array.isArray(customPresets)) return;
        
        customPresets.forEach((url, index) => {
            const preset = document.createElement('div');
            preset.className = 'bg-preset bg-preset-custom';
            preset.style.background = `url(${url}) center/cover no-repeat`;
            preset.onclick = function() {
                const pageBg = document.getElementById('home-page-bg');
                if (pageBg) pageBg.style.background = `url(${url}) center/cover no-repeat`;
                homeSetItem('home_page_bg_custom', url);
                homeSetItem('home_page_bg', 'custom');
                document.querySelectorAll('#page-bg-presets .bg-preset').forEach(el => el.classList.remove('active'));
                preset.classList.add('active');
                syncBgToChat(`url(${url}) center/cover no-repeat`);
            };
            
            // 添加删除按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.innerHTML = '×';
            deleteBtn.style.cssText = 'position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:#ff4757;color:#fff;border-radius:50%;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;';
            deleteBtn.onclick = async function(e) {
                e.stopPropagation();
                const presets = await homeGetPresets('home_page_bg_presets');
                if (Array.isArray(presets)) {
                    presets.splice(index, 1);
                    await homeSetPresets('home_page_bg_presets', presets);
                }
                renderPageBgPresets();
                (window.showNotification || function(){})('已删除预设', 'success');
            };
            preset.style.position = 'relative';
            preset.appendChild(deleteBtn);
            container.appendChild(preset);
        });
    }

    // 渲染卡片背景预设
    async function renderCardBgPresets() {
        const container = document.getElementById('bg-presets');
        if (!container) return;

        // 移除旧的自定义预设
        container.querySelectorAll('.bg-preset-custom').forEach(el => el.remove());

        // 获取当前保存的背景，用于同步 active 状态
        const savedBg = homeGetItem('home_card_bg');
        const savedCustomUrl = await homeGetLargeItem('home_card_bg_custom');

        const customPresets = await homeGetPresets('home_card_bg_presets');
        if (!Array.isArray(customPresets)) return;

        customPresets.forEach((url, index) => {
            const preset = document.createElement('div');
            preset.className = 'bg-preset bg-preset-custom';
            preset.style.background = `url(${url}) center/cover no-repeat`;

            // 同步 active 状态：如果当前保存的是这个自定义背景，标记为 active
            if (savedBg === 'custom' && savedCustomUrl === url) {
                preset.classList.add('active');
            }

            preset.onclick = async function() {
                const heroBg = document.getElementById('hero-bg-inner');
                if (heroBg) heroBg.style.background = `url(${url}) center/cover no-repeat`;
                await homeSetLargeItem('home_card_bg_custom', url);
                homeSetItem('home_card_bg', 'custom');
                document.querySelectorAll('#bg-presets .bg-preset').forEach(el => el.classList.remove('active'));
                preset.classList.add('active');
            };

            // 添加删除按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.innerHTML = '×';
            deleteBtn.style.cssText = 'position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:#ff4757;color:#fff;border-radius:50%;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;';
            deleteBtn.onclick = async function(e) {
                e.stopPropagation();
                const presets = await homeGetPresets('home_card_bg_presets');
                if (Array.isArray(presets)) {
                    presets.splice(index, 1);
                    await homeSetPresets('home_card_bg_presets', presets);
                }
                renderCardBgPresets();
                (window.showNotification || function(){})('已删除预设', 'success');
            };
            preset.style.position = 'relative';
            preset.appendChild(deleteBtn);
            container.appendChild(preset);
        });
    }

    // ========== 卡片背景 ==========
    window.setCardBg = function(preset) {
        const bg = bgPresets[preset];
        if (!bg) return;

        const heroBg = document.getElementById('hero-bg-inner');
        if (heroBg) heroBg.style.background = bg;

        document.querySelectorAll('#bg-presets .bg-preset').forEach(el => {
            el.classList.toggle('active', el.dataset.bg === preset);
        });

        const isDark = preset === 'night';
        document.querySelectorAll('.hero-title, .hero-subtitle').forEach(el => {
            el.style.color = isDark ? 'rgba(255,255,255,0.9)' : '';
        });

        // 同步朋友圈日夜模式
        const momentsContainer = document.getElementById('moments-container');
        if (momentsContainer) {
            momentsContainer.classList.toggle('dark-mode', isDark);
            console.log('[Home] dark mode sync:', { preset, isDark, hasClass: momentsContainer.classList.contains('dark-mode') });
            // 强制应用深色模式样式（调试用）
            if (isDark) {
                momentsContainer.style.background = '#1a1a1a';
                momentsContainer.style.color = '#e0e0e0';
            }
        }

        homeSetItem('home_card_bg', preset);
    };

    window.uploadCardBg = function() {
        const input = document.getElementById('bg-upload-input');
        if (input) input.click();
    };

    window.handleBgUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            const url = e.target.result;
            const heroBg = document.getElementById('hero-bg-inner');
            if (heroBg) heroBg.style.background = `url(${url}) center/cover no-repeat`;

            document.querySelectorAll('#bg-presets .bg-preset').forEach(el => el.classList.remove('active'));
            // 使用大容量存储保存自定义背景 URL
            await homeSetLargeItem('home_card_bg_custom', url);
            homeSetItem('home_card_bg', 'custom');
        };
        reader.readAsDataURL(file);
    };

    // ========== 头像设置 ==========
    // 立即从 localStorage 读取，避免在 loadSavedSettings 之前使用默认值
    let avatarSyncEnabled = localStorage.getItem('home_avatar_sync') !== 'false';
    window._getAvatarSyncEnabled = () => avatarSyncEnabled;

    window.toggleAvatarSync = function() {
        avatarSyncEnabled = !avatarSyncEnabled;
        const toggle = document.getElementById('avatar-sync-toggle');
        if (toggle) {
            toggle.classList.toggle('active', avatarSyncEnabled);
        }
        localStorage.setItem('home_avatar_sync', avatarSyncEnabled ? 'true' : 'false');
    };

    // ========== 背景绑定设置 ==========
    // 立即从 localStorage 读取，避免在 loadSavedSettings 之前使用默认值
    let bgSyncEnabled = localStorage.getItem('home_bg_sync') !== 'false';
    window._getBgSyncEnabled = () => bgSyncEnabled;

    window.toggleBgSync = function() {
        bgSyncEnabled = !bgSyncEnabled;
        const toggle = document.getElementById('bg-sync-toggle');
        if (toggle) {
            toggle.classList.toggle('active', bgSyncEnabled);
        }
        localStorage.setItem('home_bg_sync', bgSyncEnabled ? 'true' : 'false');

        // 关闭绑定时，清除 chatContainer 上残留的内联背景样式
        // 以免遮挡后续通过外观设置更改的 --chat-bg-image
        if (!bgSyncEnabled) {
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.style.removeProperty('background');
            }
        }
    };

    // ========== 主页绑定会话开关 ==========
    window.toggleHomeSessionBind = function() {
        homeSessionBindEnabled = !homeSessionBindEnabled;
        // 全局存储开关状态（不随会话变化）
        localStorage.setItem('home_session_bind', homeSessionBindEnabled ? 'true' : 'false');
        const toggle = document.getElementById('home-session-bind-toggle');
        if (toggle) {
            toggle.classList.toggle('active', homeSessionBindEnabled);
        }
        // 切换后重新加载设置（从新的存储位置读取）
        loadSavedSettings().catch(() => {});
    };

    // 更新主页绑定会话开关UI
    window.updateHomeSessionBindUI = function() {
        const toggle = document.getElementById('home-session-bind-toggle');
        if (toggle) {
            toggle.classList.toggle('active', homeSessionBindEnabled);
        }
    }

    /**
     * 同步背景到聊天界面
     */
    function syncBgToChat(bgValue) {
        if (!bgSyncEnabled) return;
        
        // 保存到聊天设置的背景（仅保存设置，不直接修改 DOM）
        if (window.settings) {
            window.settings.chatBackground = bgValue;
            // 触发保存
            if (typeof window.throttledSaveData === 'function') {
                window.throttledSaveData();
            }
        }
        
        // 不再直接修改 chatContainer.style.background，
        // 避免内联样式优先级过高，遮挡外观设置中的 --chat-bg-image
        // 聊天页背景由外观设置独立控制
        
        // 更新聊天设置中的背景显示
        const chatBgPreview = document.getElementById('chat-bg-preview');
        if (chatBgPreview) {
            chatBgPreview.style.background = bgValue;
        }
    }

    /**
     * 从聊天界面同步背景到Home
     */
    window.syncChatBgToHome = function(bgValue) {
        if (!bgSyncEnabled) return;
        
        const pageBg = document.getElementById('home-page-bg');
        if (!pageBg) return;
        
        if (!bgValue) {
            // 重置为默认背景
            pageBg.style.background = '';
            homeRemoveItem('home_page_bg_custom');
            homeRemoveItem('home_page_bg');
        } else {
            pageBg.style.background = bgValue;
            // 保存为自定义背景
            homeSetItem('home_page_bg_custom', bgValue);
            homeSetItem('home_page_bg', 'custom');
        }
    };

    window.changeAvatar = function(who) {
        currentAvatarTarget = who;
        const input = document.getElementById('avatar-upload-input');
        if (input) input.click();
    };

    window.handleAvatarUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const url = e.target.result;

            const avatarEl = document.getElementById(`avatar-${currentAvatarTarget}`);
            if (avatarEl) avatarEl.src = url;

            const customizeAvatar = document.getElementById(`customize-avatar-${currentAvatarTarget}`);
            if (customizeAvatar) customizeAvatar.src = url;

            if (profileData[currentAvatarTarget]) {
                profileData[currentAvatarTarget].avatar = url;
            }

            // 头像始终全局存储（不受开关影响）
            homeSetGlobal(`home_avatar_${currentAvatarTarget}`, url);
            homeSetGlobal(`profile_${currentAvatarTarget}`, JSON.stringify(profileData[currentAvatarTarget]));

            // 头像绑定开启时：同步到聊天界面
            if (avatarSyncEnabled) {
                // 更新聊天界面头像 DOM
                const chatAvatarEl = currentAvatarTarget === 'me'
                    ? document.getElementById('my-avatar')
                    : document.getElementById('partner-avatar');
                if (chatAvatarEl) {
                    chatAvatarEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }

                // 同步到聊天设置内存
                if (window.settings) {
                    if (currentAvatarTarget === 'me') {
                        window.settings.myAvatar = url;
                    } else {
                        window.settings.partnerAvatar = url;
                    }
                }

                // 直接保存头像到 localforage（不依赖 saveData，确保立即可用）
                const avatarKey = currentAvatarTarget === 'me' ? 'myAvatar' : 'partnerAvatar';
                if (typeof localforage !== 'undefined' && window.SESSION_ID && window.APP_PREFIX) {
                    const storageKey = `${window.APP_PREFIX}${window.SESSION_ID}_${avatarKey}`;
                    // 同时保存到 localStorage 作为同步备份
                    try {
                        localStorage.setItem(storageKey, url);
                    } catch(e) {}
                    localforage.setItem(storageKey, url).catch(() => {});
                }
            }

            // 同时触发 saveData 保存其他设置
            if (typeof window.saveData === 'function') {
                window.saveData();
            } else if (typeof window.throttledSaveData === 'function') {
                window.throttledSaveData();
            }
        };
        reader.readAsDataURL(file);
    };

    // ========== 图标颜色设置 ==========
    const iconColorPresets = {
        'default': '#6b5b7b',
        'purple': '#8b7ab8',
        'pink': '#d4849c',
        'blue': '#5a8ab8',
        'green': '#6b9b6b',
        'orange': '#c98b5a'
    };

    window.setIconColor = function(colorName) {
        const color = iconColorPresets[colorName] || iconColorPresets['default'];
        applyIconColor(color);
        homeSetItem('home_icon_color', color);
        homeSetItem('home_icon_color_name', colorName);

        // 更新预设选中状态
        document.querySelectorAll('.icon-color-preset').forEach(el => {
            el.classList.toggle('active', el.dataset.color === colorName);
        });

        // 更新颜色选择器
        const colorInput = document.getElementById('icon-color-custom');
        if (colorInput) colorInput.value = color;
    };

    window.setIconColorCustom = function(color) {
        applyIconColor(color);
        homeSetItem('home_icon_color', color);
        homeRemoveItem('home_icon_color_name');

        // 清除预设选中状态
        document.querySelectorAll('.icon-color-preset').forEach(el => {
            el.classList.remove('active');
        });
    };

    function applyIconColor(color) {
        document.documentElement.style.setProperty('--app-icon-color', color);
    }

    // ========== 签名编辑 ==========
    window.updateHeroSubtitle = function(value) {
        const subtitle = document.getElementById('hero-subtitle');
        if (subtitle) subtitle.textContent = value;
        homeSetItem('home_hero_subtitle', value);
    };

    // ========== 主题系统 ==========
    function applyTheme(name) {
        try {
            const theme = themePresets[name];
            if (!theme) {
                console.warn('Theme not found:', name);
                return;
            }

            currentTheme = { ...theme };
            renderTheme();

            document.querySelectorAll('.theme-preset').forEach(el => {
                el.classList.toggle('active', el.dataset.theme === name);
            });

            // 更新颜色选择器（注意 HTML ID 使用短横线命名）
            const colorInputMap = {
                'title': 'color-title',
                'subtitle': 'color-subtitle',
                'accent': 'color-accent',
                'time': 'color-time',
                'iconColor': 'color-icon-color',
                'iconBg': 'color-icon-bg',
                'iconBorder': 'color-icon-border'
            };
            const hexMap = {
                'title': 'hex-title',
                'subtitle': 'hex-subtitle',
                'accent': 'hex-accent',
                'time': 'hex-time',
                'iconColor': 'hex-icon-color',
                'iconBg': 'hex-icon-bg',
                'iconBorder': 'hex-icon-border'
            };
            Object.keys(colorInputMap).forEach(key => {
                const input = document.getElementById(colorInputMap[key]);
                const hex = document.getElementById(hexMap[key]);
                if (input && theme[key]) input.value = theme[key];
                if (hex && theme[key]) hex.textContent = theme[key];
            });

            homeSetItem('home_theme', name);
            homeRemoveItem('home_theme_custom');
        } catch (e) {
            console.error('applyTheme error:', e);
        }
    }
    window.applyTheme = applyTheme;

    window.updateThemeColor = function(key, value) {
        currentTheme[key] = value;
        renderTheme();

        const hexMap = { title: 'hex-title', subtitle: 'hex-subtitle', accent: 'hex-accent', time: 'hex-time', iconColor: 'hex-icon-color', iconBg: 'hex-icon-bg', iconBorder: 'hex-icon-border' };
        const hexEl = document.getElementById(hexMap[key]);
        if (hexEl) hexEl.textContent = value;

        document.querySelectorAll('.theme-preset').forEach(el => el.classList.remove('active'));
        homeSetItem('home_theme_custom', JSON.stringify(currentTheme));
        homeRemoveItem('home_theme');
    };

    function renderTheme() {
        try {
            const t = currentTheme;

            // 更新主标题和副标题
            const heroTitle = document.getElementById('hero-title');
            const heroSubtitle = document.getElementById('hero-subtitle');
            if (heroTitle) heroTitle.style.color = t.title;
            if (heroSubtitle) heroSubtitle.style.color = t.subtitle;

            // 更新时间和日期显示
            document.querySelectorAll('.time-display').forEach(el => el.style.color = t.time);
            document.querySelectorAll('.date-display').forEach(el => el.style.color = t.subtitle);

            // 更新所有文字颜色（包括各种标签和名称）
            document.querySelectorAll('.app-name').forEach(el => el.style.color = t.subtitle);
            
            // 底部导航栏文字和图标与功能软件一致（使用 iconColor）
            document.querySelectorAll('.home-nav-label').forEach(el => {
                el.style.color = t.iconColor;
            });
            document.querySelectorAll('.home-nav-icon').forEach(el => {
                el.style.color = t.iconColor;
            });
            // 选中状态使用 accent 颜色
            document.querySelectorAll('.home-nav-item.active .home-nav-label').forEach(el => {
                el.style.color = t.accent;
            });
            document.querySelectorAll('.home-nav-item.active .home-nav-icon').forEach(el => {
                el.style.color = t.accent;
            });

            // 更新 Home 界面功能图标（使用 iconColor，与底部栏图标颜色绑定）
            document.querySelectorAll('.app-icon').forEach(el => {
                el.style.background = t.iconBg;
                el.style.borderColor = t.iconBorder;
                el.style.color = t.iconColor;
            });

            // 仅更新 Home 容器内的设置项样式，不影响聊天界面
            const homeContainer = document.getElementById('home-container');
            if (homeContainer) {
                // Home 容器内的 accent 颜色
                homeContainer.style.setProperty('--home-accent-color', t.accent);
            }
        } catch (e) {
            console.error('renderTheme error:', e);
        }
    }

    /**
     * 同步更新设置中的功能图标样式（仅限 Home 界面）
     */
    function syncSettingsIcons(theme) {
        // 仅更新 Home 容器内的设置项，不影响聊天界面
        const homeContainer = document.getElementById('home-container');
        if (!homeContainer) return;
        
        // 更新 Home 容器内的高级功能图标
        const advancedItems = homeContainer.querySelectorAll('#advanced-modal .settings-item');
        advancedItems.forEach(el => {
            el.style.background = theme.iconBg;
            el.style.borderColor = theme.iconBorder;
            const icon = el.querySelector('i');
            if (icon) {
                icon.style.color = theme.iconColor;
                icon.style.backgroundColor = hexToRgba(theme.iconColor, 0.1);
            }
            const text = el.querySelector('span');
            if (text) text.style.color = theme.subtitle;
        });

        // 更新 Home 容器内的设置卡片图标
        const settingsCards = homeContainer.querySelectorAll('.settings-card');
        settingsCards.forEach(el => {
            const icon = el.querySelector('i');
            if (icon) {
                icon.style.setProperty('color', theme.iconColor, 'important');
                icon.style.setProperty('background-color', hexToRgba(theme.iconColor, 0.1), 'important');
            }
            const text = el.querySelector('span');
            if (text) text.style.color = theme.subtitle;
        });
    }

    /**
     * 将十六进制颜色转换为 rgba
     */
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // ========== 功能图标替换 ==========
    window.selectIconTarget = function(app) {
        currentIconTarget = app;
        renderIconGrid();
        const input = document.getElementById('app-icon-upload-input');
        if (input) input.click();
    };

    window.handleAppIconUpload = function(event) {
        const file = event.target.files[0];
        if (!file || !currentIconTarget) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const url = e.target.result;
            customAppIcons[currentIconTarget] = url;

            const iconEl = document.querySelector(`.app-icon[data-app="${currentIconTarget}"]`);
            if (iconEl) {
                iconEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
            }

            renderIconGrid();
            homeSetItem('home_app_icons', JSON.stringify(customAppIcons));
            currentIconTarget = null;
        };
        reader.readAsDataURL(file);
    };

    window.resetAppIcon = function(app) {
        if (!app || !customAppIcons[app]) return;
        delete customAppIcons[app];

        const iconEl = document.querySelector(`.app-icon[data-app="${app}"]`);
        if (iconEl) {
            iconEl.innerHTML = defaultAppIcons[app];
        }

        renderIconGrid();
        homeSetItem('home_app_icons', JSON.stringify(customAppIcons));
    };

    window.resetAllAppIcons = function() {
        if (Object.keys(customAppIcons).length === 0) return;
        customAppIcons = {};

        Object.keys(defaultAppIcons).forEach(app => {
            const iconEl = document.querySelector(`.app-icon[data-app="${app}"]`);
            if (iconEl) {
                iconEl.innerHTML = defaultAppIcons[app];
            }
        });

        renderIconGrid();
        homeRemoveItem('home_app_icons');
    };

    function renderIconGrid() {
        const grid = document.getElementById('icon-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const nameMap = { chat:'聊天', mailbox:'信封', moyu:'摸鱼', 'call-records':'通讯', diary:'朝夕心记', fortune:'运势', mood:'心晴', calendar:'日历', decide:'抉择', stats:'统计', accounting:'记账' };

        Object.keys(defaultAppIcons).forEach(app => {
            const item = document.createElement('div');
            item.className = 'icon-grid-item' + (currentIconTarget === app ? ' active' : '');

            const preview = document.createElement('div');
            preview.className = 'icon-grid-preview';
            if (customAppIcons[app]) {
                preview.innerHTML = `<img src="${customAppIcons[app]}" alt="${app}">`;
            } else {
                preview.innerHTML = defaultAppIcons[app];
            }

            const label = document.createElement('span');
            label.className = 'icon-grid-label';
            label.textContent = nameMap[app] || app;

            // 点击预览区域上传图标
            preview.onclick = (e) => {
                e.stopPropagation();
                window.selectIconTarget(app);
            };

            // 如果已自定义，添加清除按钮
            if (customAppIcons[app]) {
                const clearBtn = document.createElement('span');
                clearBtn.className = 'icon-grid-clear';
                clearBtn.innerHTML = '<i class="fas fa-times"></i>';
                clearBtn.title = '恢复默认';
                clearBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.resetAppIcon(app);
                };
                item.appendChild(clearBtn);
            }

            item.appendChild(preview);
            item.appendChild(label);
            grid.appendChild(item);
        });
    }

    // ========== 个人资料页 ==========
    window.showProfile = function(who) {
        currentProfileTarget = who;
        const data = profileData[who];
        if (!data) return;

        const avatarImg = document.getElementById('profile-avatar-img');
        const editAvatarImg = document.getElementById('profile-edit-avatar-img');
        const nameEl = document.getElementById('profile-name');
        const idEl = document.getElementById('profile-id');
        const signatureEl = document.getElementById('profile-signature');
        const daysEl = document.getElementById('profile-days');

        if (avatarImg) avatarImg.src = data.avatar;
        if (editAvatarImg) editAvatarImg.src = data.avatar;
        if (nameEl) nameEl.textContent = data.name;
        if (idEl) idEl.textContent = data.id;
        if (signatureEl) signatureEl.textContent = data.signature;
        // 计算在一起天数
        const days = calculateTogetherDays(data.startDate);
        if (daysEl) daysEl.textContent = days;

        const viewMode = document.getElementById('profile-view-mode');
        const editMode = document.getElementById('profile-edit-mode');
        if (viewMode) viewMode.style.display = 'block';
        if (editMode) editMode.style.display = 'none';

        const overlay = document.getElementById('profile-overlay');
        if (overlay) overlay.classList.add('active');
    };

    window.closeProfile = function(e) {
        if (e && e.target !== e.currentTarget) return;
        const overlay = document.getElementById('profile-overlay');
        if (overlay) overlay.classList.remove('active');
    };

    window.openProfileEdit = function() {
        const data = profileData[currentProfileTarget];
        const editName = document.getElementById('edit-name');
        const editId = document.getElementById('edit-id');
        const editSignature = document.getElementById('edit-signature');
        const editStartDate = document.getElementById('edit-start-date');
        const editAvatarImg = document.getElementById('profile-edit-avatar-img');

        if (editName) editName.value = data.name;
        if (editId) editId.value = data.id;
        if (editSignature) editSignature.value = data.signature.replace(/^"|"$/g, '');
        if (editStartDate) editStartDate.value = data.startDate || '';
        if (editAvatarImg) editAvatarImg.src = data.avatar;

        const viewMode = document.getElementById('profile-view-mode');
        const editMode = document.getElementById('profile-edit-mode');
        if (viewMode) viewMode.style.display = 'none';
        if (editMode) editMode.style.display = 'block';
    };

    window.cancelProfileEdit = function() {
        const viewMode = document.getElementById('profile-view-mode');
        const editMode = document.getElementById('profile-edit-mode');
        if (viewMode) viewMode.style.display = 'block';
        if (editMode) editMode.style.display = 'none';
    };

    window.saveProfileEdit = function() {
        const editName = document.getElementById('edit-name');
        const editId = document.getElementById('edit-id');
        const editSignature = document.getElementById('edit-signature');
        const editStartDate = document.getElementById('edit-start-date');

        const name = editName ? editName.value.trim() : '';
        const id = editId ? editId.value.trim() : '';
        const signature = editSignature ? editSignature.value.trim() : '';
        const startDate = editStartDate ? editStartDate.value : '';

        if (!name) {
            alert('请输入昵称');
            return;
        }

        const data = profileData[currentProfileTarget];
        data.name = name;
        data.id = id || '@' + name;
        data.signature = `"${signature}"`;
        data.startDate = startDate;

        homeSetItem(`profile_${currentProfileTarget}`, JSON.stringify(data));

        // 同步到全局存储并派发事件，确保朋友圈等模块能实时感知昵称变更
        if (typeof homeSetGlobal === 'function') {
            homeSetGlobal(`profile_${currentProfileTarget}`, JSON.stringify(data));
        }

        // 昵称始终同步到聊天设置（确保强绑定）
        if (window.settings) {
            if (currentProfileTarget === 'me') {
                window.settings.myName = name;
            } else {
                window.settings.partnerName = name;
            }
            // 直接调用 saveData() 保存（throttledSaveData 有 500ms 延迟，可能来不及保存就刷新）
            if (typeof window.saveData === 'function') {
                window.saveData();
            } else if (typeof window.throttledSaveData === 'function') {
                window.throttledSaveData();
            }
            // 更新聊天界面的显示
            if (typeof window.updateUI === 'function') {
                window.updateUI();
            }
        }

        updateHeroTitleFromProfiles();
        window.showProfile(currentProfileTarget);
    };

    window.changeAvatarFromProfile = function() {
        currentAvatarTarget = currentProfileTarget;
        const input = document.getElementById('avatar-upload-input');
        if (input) input.click();
    };

    function updateHeroTitleFromProfiles() {
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle) {
            heroTitle.textContent = `${profileData.me.name} & ${profileData.partner.name}`;
        }
    }

    // ========== 消息通知横幅 ==========
    let _notificationTimer = null;

    /**
     * 显示消息通知横幅（类似锁屏通知）
     * @param {Object} options
     * @param {string} options.sender - 发送者名称
     * @param {string} options.text - 消息内容
     * @param {string} [options.avatar] - 头像 URL
     * @param {string} [options.time] - 时间文本
     */
    window.showHomeNotification = function(options) {
        const el = document.getElementById('home-notification');
        if (!el) return;

        // 清除之前的定时器
        if (_notificationTimer) {
            clearTimeout(_notificationTimer);
            _notificationTimer = null;
        }

        // 填充内容
        const avatarEl = document.getElementById('notification-avatar');
        const nameEl = document.getElementById('notification-name');
        const textEl = document.getElementById('notification-text');
        const timeEl = document.getElementById('notification-time');

        if (nameEl) nameEl.textContent = options.sender || '对方';
        if (textEl) textEl.textContent = options.text || '';
        if (timeEl) {
            if (options.time) {
                timeEl.textContent = options.time;
            } else {
                const now = new Date();
                timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            }
        }
        if (avatarEl) {
            if (options.avatar) {
                avatarEl.src = options.avatar;
                avatarEl.style.display = 'block';
            } else {
                // 优先从 profileData 获取，其次用默认头像
                const fallbackAvatar = (profileData && profileData.partner && profileData.partner.avatar) || 'https://api.dicebear.com/7.x/avataaars/svg?seed=partner';
                avatarEl.src = fallbackAvatar;
                avatarEl.style.display = 'block';
            }
        }

        // 显示通知
        el.classList.remove('hide');
        // 触发重排以重新播放动画
        void el.offsetHeight;
        el.classList.add('show');

        // 显示聊天图标小红点
        const chatBadge = document.getElementById('chat-badge');
        if (chatBadge) chatBadge.style.display = 'block';

        // 5秒后自动消失
        _notificationTimer = setTimeout(() => {
            window.dismissHomeNotification(false);
        }, 5000);
    };

    /**
     * 关闭通知横幅
     * @param {boolean} clicked - 是否被点击（点击则进入聊天界面）
     */
    window.dismissHomeNotification = function(clicked) {
        const el = document.getElementById('home-notification');
        if (!el) return;

        if (_notificationTimer) {
            clearTimeout(_notificationTimer);
            _notificationTimer = null;
        }

        el.classList.remove('show');
        el.classList.add('hide');

        // 隐藏聊天图标小红点（如果点击了通知或进入聊天）
        if (clicked) {
            const chatBadge = document.getElementById('chat-badge');
            if (chatBadge) chatBadge.style.display = 'none';
        }

        // 如果被点击，进入聊天界面
        if (clicked && typeof window.hideHomePage === 'function') {
            setTimeout(() => {
                window.hideHomePage();
            }, 200);
        }
    };

    // ========== 弹窗工具函数（独立实现，不依赖 core.js） ==========
    window.homeShowModal = function(modalElement) {
        if (!modalElement) return;
        // 清除之前的定时器
        if (modalElement._hideTimeout) {
            clearTimeout(modalElement._hideTimeout);
            modalElement._hideTimeout = null;
        }
        // 将弹窗移动到 body 末尾，确保不在 home-container 内部
        if (modalElement.parentElement !== document.body) {
            document.body.appendChild(modalElement);
        }
        // 强制显示在最上层
        modalElement.style.cssText = 'display: flex !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 99999 !important; align-items: center !important; justify-content: center !important; background-color: rgba(0, 0, 0, 0.6) !important;';
        // 隐藏 header 和 input-area，彻底避免遮挡
        const header = document.querySelector('.header');
        if (header) header.style.visibility = 'hidden';
        const inputArea = document.querySelector('.input-area-wrapper');
        if (inputArea) inputArea.style.visibility = 'hidden';
        // 重置内容动画 - 先重置为初始状态，然后触发动画
        const content = modalElement.querySelector('.modal-content');
        if (content) {
            // 先设置为初始状态（隐藏）
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px) scale(0.95)';
            // 强制重绘
            void content.offsetWidth;
            // 触发动画到最终状态
            content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            content.style.opacity = '1';
            content.style.transform = 'translateY(0) scale(1)';
        }
    }

    // ========== 功能翻页 ==========
    let currentAppsPage = 0;

    window.switchAppsPage = function(pageIndex) {
        const pages = document.querySelectorAll('.apps-page');
        const dots = document.querySelectorAll('.apps-dot');
        if (pageIndex < 0 || pageIndex >= pages.length) return;
        pages.forEach((p, i) => p.classList.toggle('active', i === pageIndex));
        dots.forEach((d, i) => d.classList.toggle('active', i === pageIndex));
        currentAppsPage = pageIndex;
    };

    // 触摸滑动翻页
    (function() {
        const pager = document.getElementById('apps-pager');
        if (!pager) return;
        let startX = 0;
        pager.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        pager.addEventListener('touchend', (e) => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) window.switchAppsPage(currentAppsPage + 1);
                else window.switchAppsPage(currentAppsPage - 1);
            }
        }, { passive: true });
    })();

    // ========== 功能导航 ==========
    window.openApp = function(app) {
        const appActions = {
            'chat': () => {
                // 隐藏聊天图标小红点
                const chatBadge = document.getElementById('chat-badge');
                if (chatBadge) chatBadge.style.display = 'none';
                window.hideHomePage();
            },
            'mailbox': () => {
                const modal = document.getElementById('envelope-modal');
                if (modal) {
                    if (typeof renderEnvelopeLists === 'function') renderEnvelopeLists();
                    homeShowModal(modal);
                }
            },
            'moyu': () => {
                // 隐藏摸鱼小记小红点
                const moyuBadge = document.getElementById('moyu-badge');
                if (moyuBadge) moyuBadge.style.display = 'none';
                const modal = document.getElementById('moyu-modal');
                if (modal) {
                    homeShowModal(modal);
                    // 渲染内容
                    if (typeof window.renderMoyuCurrent === 'function') window.renderMoyuCurrent();
                    if (typeof window.renderMoyuRecords === 'function') window.renderMoyuRecords();
                    if (typeof window.renderMoyuLocations === 'function') window.renderMoyuLocations();
                    if (typeof window.switchMoyuTab === 'function') window.switchMoyuTab('current');
                }
            },
            'call-records': () => {
                if (typeof window.CallRecords !== 'undefined' && typeof window.CallRecords.openCallRecordsModal === 'function') {
                    window.CallRecords.openCallRecordsModal();
                } else {
                    const modal = document.getElementById('call-records-modal');
                    if (modal) homeShowModal(modal);
                }
            },
            'diary': () => {
                const modal = document.getElementById('diary-modal');
                if (!modal) {
                    console.error('diary-modal not found');
                    return;
                }
                // 确保弹窗在 body 下
                if (modal.parentElement !== document.body) {
                    document.body.appendChild(modal);
                }
                // 显示弹窗
                homeShowModal(modal);
                // 触发渲染（如果 diary.js 已加载）
                if (typeof window.openDiaryModal === 'function') {
                    window.openDiaryModal();
                }
            },
            'fortune': () => {
                if (typeof generateFortune === 'function') generateFortune();
                const modal = document.getElementById('fortune-lenormand-modal');
                if (modal) homeShowModal(modal);
            },
            'mood': () => {
                const modal = document.getElementById('mood-modal');
                if (modal) homeShowModal(modal);
            },
            'calendar': () => {
                // 绑定到聊天界面顶部的日历功能
                if (typeof window.openMiniCalendar === 'function') {
                    window.openMiniCalendar();
                } else if (typeof openMiniCalendar === 'function') {
                    openMiniCalendar();
                }
            },
            'decide': () => {
                const modal = document.getElementById('decision-menu-modal');
                if (modal) homeShowModal(modal);
            },
            'stats': () => {
                const modal = document.getElementById('stats-modal');
                if (modal) homeShowModal(modal);
            },
            'accounting': () => {
                if (typeof window.openAccountingModal === 'function') {
                    window.openAccountingModal();
                } else {
                    const modal = document.getElementById('accounting-modal');
                    if (modal) homeShowModal(modal);
                }
            },
            'pet': () => {
                // 切换到萌宠屋页面（内嵌，非跳转）
                window.showPetPage();
            },
            'ta-phone': () => {
                if (typeof window.TaPhoneApp !== 'undefined') {
                    window.TaPhoneApp.showTaPhone();
                } else {
                    (window.showNotification || function(){})('TA的手机加载中...', 'info');
                    const script = document.createElement('script');
                    var basePath = window.location.pathname.replace(/\/[^\/]*$/, '/') || '/';
                    script.src = basePath + 'js/ta-phone.js';
                    script.onload = function() {
                        if (typeof window.TaPhoneApp !== 'undefined') window.TaPhoneApp.showTaPhone();
                        else (window.showNotification || function(){})('TA的手机加载失败', 'error');
                    };
                    script.onerror = function() {
                        (window.showNotification || function(){})('TA的手机加载失败', 'error');
                    };
                    document.head.appendChild(script);
                }
            },
            'shop': () => {
                if (typeof window.ShopApp !== 'undefined') {
                    window.ShopApp.showShop();
                } else {
                    (window.showNotification || function(){})('商城加载中...', 'info');
                    const script = document.createElement('script');
                    var basePath = window.location.pathname.replace(/\/[^\/]*$/, '/') || '/';
                    script.src = basePath + 'js/shop.js';
                    script.onload = function() {
                        if (typeof window.ShopApp !== 'undefined') window.ShopApp.showShop();
                        else (window.showNotification || function(){})('商城加载失败', 'error');
                    };
                    script.onerror = function() {
                        (window.showNotification || function(){})('商城加载失败', 'error');
                    };
                    document.head.appendChild(script);
                }
            },
            'map': () => {
                if (typeof window.MapApp !== 'undefined') {
                    window.MapApp.show();
                } else {
                    // 动态加载 map.js（使用绝对路径避免预览环境路径问题）
                    (window.showNotification || function(){})('地图加载中...', 'info');
                    const script = document.createElement('script');
                    var basePath = window.location.pathname.replace(/\/[^\/]*$/, '/') || '/';
                    script.src = basePath + 'js/features/map.js';
                    script.onload = function() {
                        if (typeof window.MapApp !== 'undefined') {
                            window.MapApp.show();
                        } else {
                            (window.showNotification || function(){})('地图加载失败，请刷新重试', 'error');
                        }
                    };
                    script.onerror = function() {
                        (window.showNotification || function(){})('地图加载失败，请检查网络', 'error');
                    };
                    document.head.appendChild(script);
                }
            },
            'moments': () => {
                // 显示朋友圈页面
                if (typeof window.showMoments === 'function') {
                    window.showMoments();
                } else {
                    // 动态加载朋友圈模块
                    fetch('moments.html')
                        .then(response => response.text())
                        .then(html => {
                            const div = document.createElement('div');
                            div.innerHTML = html;
                            document.body.appendChild(div);
                            // 执行脚本
                            const scripts = div.querySelectorAll('script');
                            scripts.forEach(script => {
                                const newScript = document.createElement('script');
                                newScript.textContent = script.textContent;
                                document.body.appendChild(newScript);
                            });
                            setTimeout(() => window.showMoments(), 100);
                        })
                        .catch(err => console.error('加载朋友圈失败:', err));
                }
            }
        };

        if (appActions[app]) {
            const result = appActions[app]();
            if (result && typeof result.then === 'function') {
                result.catch(e => console.error('打开应用失败:', app, e));
            }
        } else {
            console.log('打开应用:', app);
        }
    };

    window.switchNav = function(el, item) {
        document.querySelectorAll('.home-nav-item').forEach(n => n.classList.remove('active'));
        el.classList.add('active');

        const navActions = {
            'appearance': () => {
                window.openCustomizePanel();
            },
            'cards': () => {
                const modal = document.getElementById('custom-replies-modal');
                if (modal) {
                    if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
                    homeShowModal(modal);
                }
            },
            'chat': () => {
                // 聊天设置 - 直接打开聊天设置弹窗
                const modal = document.getElementById('chat-modal');
                if (modal) homeShowModal(modal);
            },
            'stats': () => {
                const modal = document.getElementById('stats-modal');
                if (modal) homeShowModal(modal);
            },
            'moments': () => {
                // 朋友圈 - 打开覆盖式页面
                window.showMomentsPage();
            }
        };

        if (navActions[item]) {
            navActions[item]();
        }
    };

    // ========== 朋友圈页面显示/隐藏 ==========
    // 记录进入朋友圈前的页面状态
    let _preMomentsState = {};

    window.showMomentsPage = function() {
        const homeContainer = document.getElementById('home-container');
        const momentsContainer = document.getElementById('moments-container');
        const chatArea = document.querySelector('.main-chat-area');
        const header = document.querySelector('.header');
        const inputArea = document.querySelector('.input-area-wrapper');

        // 清除朋友圈小红点
        if (typeof MomentsApp !== 'undefined' && MomentsApp.clearMomentsBadge) {
            MomentsApp.clearMomentsBadge();
        }

        // 记录进入前的显示状态
        _preMomentsState = {
            chatArea: chatArea ? chatArea.style.display : '',
            header: header ? header.style.display : '',
            inputArea: inputArea ? inputArea.style.display : ''
        };

        // 隐藏主页
        if (homeContainer) {
            homeContainer.classList.remove('active');
            homeContainer.style.display = 'none';
        }
        // 隐藏聊天区域
        if (chatArea) chatArea.style.display = 'none';
        if (header) header.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';

        // 允许 body 滚动
        document.body.classList.add('home-active');

        // 显示朋友圈
        if (momentsContainer) {
            momentsContainer.style.display = 'block';
            momentsContainer.classList.add('active');
        }

        // 初始化朋友圈（同步头像）
        setTimeout(() => {
            try {
                if (typeof window.MomentsApp !== 'undefined' && window.MomentsApp.init) {
                    window.MomentsApp.init();
                }
            } catch (e) {
                console.error('MomentsApp init error:', e);
            }
        }, 100);
    };

    window.hideMomentsPage = function() {
        const momentsContainer = document.getElementById('moments-container');
        const homeContainer = document.getElementById('home-container');
        const chatArea = document.querySelector('.main-chat-area');
        const header = document.querySelector('.header');
        const inputArea = document.querySelector('.input-area-wrapper');

        // 隐藏朋友圈
        if (momentsContainer) {
            momentsContainer.style.display = 'none';
            momentsContainer.classList.remove('active');
        }

        // 显示主页
        if (homeContainer) {
            homeContainer.classList.add('active');
            homeContainer.style.display = 'flex';
        }

        // 恢复进入前的聊天区域状态（不强制显示）
        if (chatArea) chatArea.style.display = _preMomentsState.chatArea || '';
        if (header) header.style.display = _preMomentsState.header || '';
        if (inputArea) inputArea.style.display = _preMomentsState.inputArea || '';

        // 移除底部栏的 active 状态
        document.querySelectorAll('.home-nav-item').forEach(n => n.classList.remove('active'));

        // 停止访客在线定时器
        if (typeof MomentsApp !== 'undefined' && MomentsApp.stopOnlineVisitorTimer) {
            MomentsApp.stopOnlineVisitorTimer();
        }
    };

    // ========== 加载保存的设置 ==========
    async function loadSavedSettings() {
        // 头像绑定开关（全局）
        const savedAvatarSync = localStorage.getItem('home_avatar_sync');
        if (savedAvatarSync !== null) {
            avatarSyncEnabled = savedAvatarSync === 'true';
        }
        const avatarToggle = document.getElementById('avatar-sync-toggle');
        if (avatarToggle) {
            avatarToggle.classList.toggle('active', avatarSyncEnabled);
        }

        // 背景绑定开关（全局）
        const savedBgSync = localStorage.getItem('home_bg_sync');
        if (savedBgSync !== null) {
            bgSyncEnabled = savedBgSync === 'true';
        }
        const bgToggle = document.getElementById('bg-sync-toggle');
        if (bgToggle) {
            bgToggle.classList.toggle('active', bgSyncEnabled);
        }

        // 图标颜色
        const savedIconColor = homeGetItem('home_icon_color');
        const savedIconColorName = homeGetItem('home_icon_color_name');
        if (savedIconColor) {
            applyIconColor(savedIconColor);
            // 更新颜色选择器
            const colorInput = document.getElementById('icon-color-custom');
            if (colorInput) colorInput.value = savedIconColor;
            // 更新预设选中状态
            if (savedIconColorName) {
                document.querySelectorAll('.icon-color-preset').forEach(el => {
                    el.classList.toggle('active', el.dataset.color === savedIconColorName);
                });
            }
        }

        // 页面背景
        const savedPageBg = homeGetItem('home_page_bg');
        if (savedPageBg === 'custom') {
            const customUrl = homeGetItem('home_page_bg_custom');
            if (customUrl) {
                const pageBg = document.getElementById('home-page-bg');
                if (pageBg) pageBg.style.background = `url(${customUrl}) center/cover no-repeat`;
            }
        } else if (savedPageBg && pageBgPresets[savedPageBg]) {
            window.setPageBg(savedPageBg);
        }

        // 卡片背景
        const savedBg = homeGetItem('home_card_bg');
        if (savedBg === 'custom') {
            const customUrl = await homeGetLargeItem('home_card_bg_custom');
            if (customUrl) {
                const heroBg = document.getElementById('hero-bg-inner');
                if (heroBg) heroBg.style.background = `url(${customUrl}) center/cover no-repeat`;
            }
        } else if (savedBg && bgPresets[savedBg]) {
            window.setCardBg(savedBg);
        }

        // 加载个人资料数据（头像和昵称优先级最高）
        ['me', 'partner'].forEach(who => {
            // 先重置为默认值，避免残留上一个会话的数据
            const defaults = who === 'me' ? {
                name: '我', id: '@my_profile',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
                signature: '"今天也要加油呀 ✨"', startDate: ''
            } : {
                name: '梦角', id: '@dream_partner',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=partner',
                signature: '"和你在一起的每一天都很开心 💕"', startDate: ''
            };
            profileData[who] = { ...defaults };

            // 头像和昵称：优先从聊天设置同步，如果没有则从 Home 全局存储读取
            if (window.settings) {
                const settingAvatar = who === 'me' ? window.settings.myAvatar : window.settings.partnerAvatar;
                const settingName = who === 'me' ? window.settings.myName : window.settings.partnerName;
                
                if (settingAvatar) {
                    profileData[who].avatar = settingAvatar;
                } else {
                    // 聊天设置没有头像，从 Home 全局存储读取
                    const savedAvatar = homeGetGlobal(`home_avatar_${who}`);
                    if (savedAvatar) profileData[who].avatar = savedAvatar;
                }
                
                if (settingName) {
                    profileData[who].name = settingName;
                }
            } else {
                // 聊天设置不可用，从 Home 全局存储读取
                const savedAvatar = homeGetGlobal(`home_avatar_${who}`);
                if (savedAvatar) profileData[who].avatar = savedAvatar;
            }

            // 从 Home 存储读取完整的资料数据（昵称、头像、签名、起始日期等）
            const savedProfile = homeGetItem(`profile_${who}`);
            if (savedProfile) {
                try {
                    const parsed = JSON.parse(savedProfile);
                    if (parsed.name) profileData[who].name = parsed.name;
                    if (parsed.avatar) profileData[who].avatar = parsed.avatar;
                    if (parsed.signature) profileData[who].signature = parsed.signature;
                    if (parsed.startDate) profileData[who].startDate = parsed.startDate;
                    if (parsed.id) profileData[who].id = parsed.id;
                } catch(e) {}
            }

            // 更新头像 DOM（必须在数据加载完成后执行）
            const avatarEl = document.getElementById(`avatar-${who}`);
            const customizeAvatar = document.getElementById(`customize-avatar-${who}`);
            const heroAvatar = document.getElementById(`hero-avatar-${who}`);
            if (avatarEl) avatarEl.src = profileData[who].avatar;
            if (customizeAvatar) customizeAvatar.src = profileData[who].avatar;
            if (heroAvatar) heroAvatar.src = profileData[who].avatar;
        });

        updateHeroTitleFromProfiles();

        // 签名
        const savedSubtitle = homeGetItem('home_hero_subtitle');
        if (savedSubtitle) {
            const subtitle = document.getElementById('hero-subtitle');
            const subtitleInput = document.getElementById('customize-subtitle-input');
            if (subtitle) subtitle.textContent = savedSubtitle;
            if (subtitleInput) subtitleInput.value = savedSubtitle;
        }

        // 主题
        const savedThemeName = homeGetItem('home_theme');
        if (savedThemeName && themePresets[savedThemeName]) {
            applyTheme(savedThemeName);
        } else {
            const savedCustomTheme = homeGetItem('home_theme_custom');
            if (savedCustomTheme) {
                try {
                    const parsed = JSON.parse(savedCustomTheme);
                    currentTheme = { ...themePresets.default, ...parsed };
                    renderTheme();
                    const colorInputMap = {
                        'title': 'color-title',
                        'subtitle': 'color-subtitle',
                        'accent': 'color-accent',
                        'time': 'color-time',
                        'iconColor': 'color-icon-color',
                        'iconBg': 'color-icon-bg',
                        'iconBorder': 'color-icon-border'
                    };
                    const hexMap = {
                        'title': 'hex-title',
                        'subtitle': 'hex-subtitle',
                        'accent': 'hex-accent',
                        'time': 'hex-time',
                        'iconColor': 'hex-icon-color',
                        'iconBg': 'hex-icon-bg',
                        'iconBorder': 'hex-icon-border'
                    };
                    Object.keys(parsed).forEach(key => {
                        const input = document.getElementById(colorInputMap[key]);
                        if (input) input.value = parsed[key];
                        const hexEl = document.getElementById(hexMap[key]);
                        if (hexEl) hexEl.textContent = parsed[key];
                    });
                    document.querySelectorAll('.theme-preset').forEach(el => el.classList.remove('active'));
                } catch(e) {}
            }
        }

        // 自定义功能图标
        const savedIcons = homeGetItem('home_app_icons');
        if (savedIcons) {
            try {
                customAppIcons = JSON.parse(savedIcons);
                Object.keys(customAppIcons).forEach(app => {
                    const iconEl = document.querySelector(`.app-icon[data-app="${app}"]`);
                    if (iconEl && customAppIcons[app]) {
                        iconEl.innerHTML = `<img src="${customAppIcons[app]}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
                    }
                });
            } catch(e) {}
        }

        // 加载保存的应用顺序
        const savedOrder = homeGetItem('home_app_order');
        if (savedOrder) {
            try {
                appOrder = JSON.parse(savedOrder);
                reorderAppItems();
            } catch(e) {}
        } else {
            // 首次加载：按默认顺序重新分页（每页8个）并保存
            reorderAppItems();
            saveAppOrder();
        }

        renderIconGrid();
        
        // 渲染自定义背景预设
        renderPageBgPresets();
        renderCardBgPresets();
    }

    /**
     * 根据 appOrder 重新排序应用图标
     */
    function reorderAppItems() {
        const pager = document.getElementById('apps-pager');
        if (!pager) return;

        // 收集所有 app-item 并建立映射
        const allItems = [];
        const itemMap = new Map();
        pager.querySelectorAll('.app-item').forEach(item => {
            const app = item.querySelector('.app-icon')?.dataset.app;
            if (app) {
                itemMap.set(app, item);
                allItems.push(item);
            }
        });

        // 按保存的顺序排列
        const orderedItems = [];
        appOrder.forEach(app => {
            const item = itemMap.get(app);
            if (item) orderedItems.push(item);
        });
        // 添加未排序的项目（新增的 app）
        allItems.forEach(item => {
            const app = item.querySelector('.app-icon')?.dataset.app;
            if (app && !appOrder.includes(app)) {
                orderedItems.push(item);
            }
        });

        // 按每页 8 个重新分配到页面
        rebalancePagesWithItems(orderedItems);
    }

    /**
     * 将指定的 item 列表按每页 8 个分配到页面（复用已有页面或创建新页面）
     */
    function rebalancePagesWithItems(orderedItems) {
        const pager = document.getElementById('apps-pager');
        const dotsContainer = document.getElementById('apps-dots');
        if (!pager || !dotsContainer) return;

        // 移除旧的 apps-page
        pager.querySelectorAll('.apps-page').forEach(p => p.remove());
        dotsContainer.innerHTML = '';

        const totalPages = Math.max(1, Math.ceil(orderedItems.length / 8));

        for (let p = 0; p < totalPages; p++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'apps-page' + (p === 0 ? ' active' : '');
            pageDiv.id = `apps-page-${p + 1}`;

            const gridDiv = document.createElement('div');
            gridDiv.className = 'apps-grid';

            for (let i = p * 8; i < Math.min((p + 1) * 8, orderedItems.length); i++) {
                gridDiv.appendChild(orderedItems[i]);
            }

            pageDiv.appendChild(gridDiv);
            pager.insertBefore(pageDiv, dotsContainer);

            const dot = document.createElement('span');
            dot.className = 'apps-dot' + (p === 0 ? ' active' : '');
            dot.onclick = () => window.switchAppsPage(p);
            dotsContainer.appendChild(dot);
        }

        if (currentAppsPage >= totalPages) {
            currentAppsPage = totalPages - 1;
        }
        window.switchAppsPage(currentAppsPage);
    }

    // ========== 初始化 ==========
    window.initHomePage = async function() {
        // 清理旧的底部栏颜色设置（已废弃）
        localStorage.removeItem('home_nav_colors');

        // 清理 chatContainer 上可能残留的内联背景样式
        // （之前版本 syncBgToChat 会设置此样式，现在已由外观设置独立控制）
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.style.removeProperty('background');
        }

        await loadSavedSettings();

        // 更新标题显示
        updateHeroTitleFromProfiles();

        // 初始化应用拖拽功能
        initAppDragAndDrop();
    };

    // ========== 应用图标长按拖拽功能 ==========
    // 使用事件委托，将 touchstart/mousedown 绑定到 pager 容器上，
    // 这样 rebalancePages 重建网格后事件仍然有效
    let _dragLongPressTimer = null;
    let _dragIsDragging = false;
    let _dragDraggedItem = null;
    let _dragCurrentGrid = null;
    let _dragAutoScrollTimer = null;
    let _dragStartX, _dragStartY;

    function initAppDragAndDrop() {
        const pager = document.getElementById('apps-pager');
        if (!pager) return;

        // 事件委托：绑定到 pager 容器
        pager.addEventListener('touchstart', _handleTouchStart, { passive: false });
        pager.addEventListener('mousedown', _handleMouseDown);

        // 全局移动和结束事件
        document.addEventListener('touchmove', _handleTouchMove, { passive: false });
        document.addEventListener('touchend', _handleTouchEnd);
        document.addEventListener('mousemove', _handleMouseMove);
        document.addEventListener('mouseup', _handleMouseUp);
    }

    function _handleTouchStart(e) {
        const item = e.target.closest('.app-item');
        if (!item) return;

        _dragStartX = e.touches[0].clientX;
        _dragStartY = e.touches[0].clientY;
        _dragCurrentGrid = item.closest('.apps-grid');

        _dragLongPressTimer = setTimeout(() => {
            _startDrag(item);
        }, 500);
    }

    function _handleMouseDown(e) {
        const item = e.target.closest('.app-item');
        if (!item) return;

        _dragStartX = e.clientX;
        _dragStartY = e.clientY;
        _dragCurrentGrid = item.closest('.apps-grid');

        _dragLongPressTimer = setTimeout(() => {
            _startDrag(item);
        }, 500);
    }

    function _handleTouchMove(e) {
        if (_dragLongPressTimer && !_dragIsDragging) {
            clearTimeout(_dragLongPressTimer);
            _dragLongPressTimer = null;
            return;
        }
        if (_dragIsDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            _handleDragMove(touch.clientX, touch.clientY);
        }
    }

    function _handleMouseMove(e) {
        if (_dragLongPressTimer && !_dragIsDragging) {
            clearTimeout(_dragLongPressTimer);
            _dragLongPressTimer = null;
            return;
        }
        if (_dragIsDragging) {
            e.preventDefault();
            _handleDragMove(e.clientX, e.clientY);
        }
    }

    function _handleTouchEnd(e) {
        if (_dragLongPressTimer) {
            clearTimeout(_dragLongPressTimer);
            _dragLongPressTimer = null;
        }
        if (_dragIsDragging) {
            _endDrag();
        }
    }

    function _handleMouseUp(e) {
        if (_dragLongPressTimer) {
            clearTimeout(_dragLongPressTimer);
            _dragLongPressTimer = null;
        }
        if (_dragIsDragging) {
            _endDrag();
        }
    }

    function _startDrag(item) {
        _dragIsDragging = true;
        _dragDraggedItem = item;
        item.classList.add('dragging');

        // 动态获取所有网格（因为 rebalancePages 会重建网格）
        const grids = document.querySelectorAll('.apps-grid');
        grids.forEach(g => g.classList.add('drag-mode'));

        // 震动反馈
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    function _handleDragMove(x, y) {
        if (!_dragDraggedItem) return;

        const pager = document.getElementById('apps-pager');
        if (!pager) return;
        const pagerRect = pager.getBoundingClientRect();
        const edgeThreshold = 60;

        const isNearLeftEdge = x < pagerRect.left + edgeThreshold;
        const isNearRightEdge = x > pagerRect.right - edgeThreshold;

        pager.classList.remove('drag-left', 'drag-right');
        if (isNearLeftEdge && currentAppsPage > 0) {
            pager.classList.add('drag-left');
        } else if (isNearRightEdge && currentAppsPage < document.querySelectorAll('.apps-page').length - 1) {
            pager.classList.add('drag-right');
        }

        if (_dragAutoScrollTimer) {
            clearTimeout(_dragAutoScrollTimer);
            _dragAutoScrollTimer = null;
        }

        if (isNearLeftEdge && currentAppsPage > 0) {
            _dragAutoScrollTimer = setTimeout(() => {
                pager.classList.remove('drag-left', 'drag-right');
                switchAppsPage(currentAppsPage - 1);
                const newGrid = document.querySelectorAll('.apps-grid')[currentAppsPage];
                if (newGrid) {
                    newGrid.appendChild(_dragDraggedItem);
                    _dragCurrentGrid = newGrid;
                }
            }, 400);
        } else if (isNearRightEdge) {
            const totalPages = document.querySelectorAll('.apps-page').length;
            if (currentAppsPage < totalPages - 1) {
                _dragAutoScrollTimer = setTimeout(() => {
                    pager.classList.remove('drag-left', 'drag-right');
                    switchAppsPage(currentAppsPage + 1);
                    const newGrid = document.querySelectorAll('.apps-grid')[currentAppsPage];
                    if (newGrid) {
                        newGrid.appendChild(_dragDraggedItem);
                        _dragCurrentGrid = newGrid;
                    }
                }, 400);
            }
        }

        const elementBelow = document.elementFromPoint(x, y);
        const targetItem = elementBelow?.closest('.app-item');

        if (targetItem && targetItem !== _dragDraggedItem) {
            const targetGrid = targetItem.closest('.apps-grid');
            if (targetGrid) {
                const allItems = [...targetGrid.querySelectorAll('.app-item')];
                const targetIndex = allItems.indexOf(targetItem);
                const draggedIndex = allItems.indexOf(_dragDraggedItem);

                if (draggedIndex !== -1) {
                    if (draggedIndex < targetIndex) {
                        targetItem.after(_dragDraggedItem);
                    } else {
                        targetItem.before(_dragDraggedItem);
                    }
                } else {
                    targetGrid.appendChild(_dragDraggedItem);
                    const updatedItems = [...targetGrid.querySelectorAll('.app-item')];
                    const updatedTargetIndex = updatedItems.indexOf(targetItem);
                    const newDraggedIndex = updatedItems.indexOf(_dragDraggedItem);

                    if (newDraggedIndex < updatedTargetIndex) {
                        targetItem.after(_dragDraggedItem);
                    } else {
                        targetItem.before(_dragDraggedItem);
                    }
                    _dragCurrentGrid = targetGrid;
                }
            }
        }
    }

    function _endDrag() {
        if (_dragAutoScrollTimer) {
            clearTimeout(_dragAutoScrollTimer);
            _dragAutoScrollTimer = null;
        }
        if (_dragDraggedItem) {
            _dragDraggedItem.classList.remove('dragging');
        }
        // 动态获取所有网格
        const grids = document.querySelectorAll('.apps-grid');
        grids.forEach(g => g.classList.remove('drag-mode'));
        const pager = document.getElementById('apps-pager');
        if (pager) pager.classList.remove('drag-left', 'drag-right');
        _dragIsDragging = false;
        _dragDraggedItem = null;
        _dragCurrentGrid = null;

        // 保存新顺序
        saveAppOrder();

        // 重新平衡页面
        rebalancePages();
    }

    /**
     * 重新平衡页面（确保每页最多8个应用）
     */
    function rebalancePages() {
        const pager = document.getElementById('apps-pager');
        if (!pager) return;

        // 收集所有项目（按当前 DOM 顺序）
        const allItems = [];
        pager.querySelectorAll('.app-item').forEach(item => {
            allItems.push(item);
        });

        // 复用统一的分页逻辑
        rebalancePagesWithItems(allItems);
    }

    function saveAppOrder() {
        const grids = document.querySelectorAll('.apps-grid');
        const newOrder = [];
        grids.forEach(grid => {
            grid.querySelectorAll('.app-item').forEach(item => {
                const app = item.querySelector('.app-icon')?.dataset.app;
                if (app) newOrder.push(app);
            });
        });
        appOrder = newOrder;
        homeSetItem('home_app_order', JSON.stringify(appOrder));
    }

    /**
     * 同步更新 Home 界面的昵称（供外部调用）
     */
    window.updateHomeNicknames = function() {
        if (window.settings) {
            if (window.settings.myName) {
                profileData.me.name = window.settings.myName;
            }
            if (window.settings.partnerName) {
                profileData.partner.name = window.settings.partnerName;
            }
        }
        updateHeroTitleFromProfiles();
    };

    /**
     * 同步更新 Home 界面的头像（供外部调用）
     * @param {string} who - 'me' 或 'partner'
     * @param {string} url - 头像图片 URL
     */
    window.updateHomeAvatar = function(who, url) {
        if (!who || !url || !profileData[who]) return;

        // 更新数据（头像始终全局存储）
        profileData[who].avatar = url;
        homeSetGlobal(`home_avatar_${who}`, url);
        homeSetGlobal(`profile_${who}`, JSON.stringify(profileData[who]));

        // 更新所有显示位置
        // 1. 个人资料页头像
        const avatarEl = document.getElementById(`avatar-${who}`);
        if (avatarEl) avatarEl.src = url;

        // 2. 自定义面板头像
        const customizeAvatar = document.getElementById(`customize-avatar-${who}`);
        if (customizeAvatar) customizeAvatar.src = url;

        // 3. 主页大卡片头像
        const heroAvatar = document.getElementById(`hero-avatar-${who}`);
        if (heroAvatar) heroAvatar.src = url;

        // 4. 聊天界面头像（仅在头像绑定开启时同步）
        if (avatarSyncEnabled) {
            const chatAvatarEl = who === 'me'
                ? document.getElementById('my-avatar')
                : document.getElementById('partner-avatar');
            if (chatAvatarEl) {
                chatAvatarEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            }

            // 同步到聊天设置内存
            if (window.settings) {
                if (who === 'me') {
                    window.settings.myAvatar = url;
                } else if (who === 'partner') {
                    window.settings.partnerAvatar = url;
                }
            }

            // 直接保存头像到 localforage（不依赖 saveData，确保立即可用）
            const avatarKey = who === 'me' ? 'myAvatar' : 'partnerAvatar';
            if (typeof localforage !== 'undefined' && window.SESSION_ID && window.APP_PREFIX) {
                const storageKey = `${window.APP_PREFIX}${window.SESSION_ID}_${avatarKey}`;
                // 同时保存到 localStorage 作为同步备份
                try {
                    localStorage.setItem(storageKey, url);
                } catch(e) {}
                localforage.setItem(storageKey, url).catch(() => {});
            }
        }

        // 同时触发 saveData 保存其他设置
        if (typeof window.saveData === 'function') {
            window.saveData();
        } else if (typeof window.throttledSaveData === 'function') {
            window.throttledSaveData();
        }
    };

    // 会话切换弹窗
    window.showSessionSwitcher = function() {
        const sessionList = window.sessionList || [];
        const currentSessionId = window.SESSION_ID;

        if (sessionList.length <= 1) {
            (window.showNotification || function(){})('只有一个会话，无法切换', 'warning');
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 100002;
            display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease;
        `;
        overlay.innerHTML = `<style>@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }</style>`;

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: var(--secondary-bg); border-radius: 18px;
            padding: 20px; width: 85%; max-width: 320px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            animation: popIn 0.22s cubic-bezier(.34,1.56,.64,1);
        `;
        panel.innerHTML = `
            <style>@keyframes popIn { from { opacity: 0; transform: scale(.93) } to { opacity: 1; transform: scale(1) } }</style>
            <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-exchange-alt" style="color: var(--accent-color);"></i>
                切换会话
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 50vh; overflow-y: auto;">
                ${sessionList.map(s => `
                    <button class="session-switch-item ${s.id === currentSessionId ? 'active' : ''}" data-id="${s.id}" style="
                        display: flex; align-items: center; gap: 10px;
                        padding: 12px 14px; border-radius: 12px;
                        border: 1.5px solid ${s.id === currentSessionId ? 'var(--accent-color)' : 'var(--border-color)'};
                        background: ${s.id === currentSessionId ? 'rgba(var(--accent-color-rgb),0.1)' : 'var(--primary-bg)'};
                        color: var(--text-primary); font-size: 13px; cursor: pointer;
                        font-family: var(--font-family); text-align: left;
                        transition: all 0.15s;
                    ">
                        <i class="fas fa-${s.id === currentSessionId ? 'check-circle' : 'circle'}" style="color: ${s.id === currentSessionId ? 'var(--accent-color)' : 'var(--text-secondary)'};"></i>
                        <span style="flex: 1; font-weight: ${s.id === currentSessionId ? '700' : '500'};">${s.name}</span>
                        <span style="font-size: 11px; color: var(--text-secondary);">${new Date(s.createdAt).toLocaleDateString()}</span>
                    </button>
                `).join('')}
            </div>
            <div style="margin-top: 14px; display: flex; gap: 10px;">
                <button id="session-switch-cancel" style="flex: 1; padding: 11px; border: 1.5px solid var(--border-color); border-radius: 12px; background: none; color: var(--text-secondary); font-size: 13px; cursor: pointer; font-family: var(--font-family);">取消</button>
                <button id="session-switch-new" style="flex: 1; padding: 11px; border: none; border-radius: 12px; background: var(--accent-color); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: var(--font-family);">新建会话</button>
            </div>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // 取消按钮
        panel.querySelector('#session-switch-cancel').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        // 新建会话按钮
        panel.querySelector('#session-switch-new').onclick = () => {
            overlay.remove();
            if (typeof window.createNewSession === 'function') {
                window.createNewSession(true).then(() => {
                    window.location.reload();
                });
            }
        };

        // 会话项点击
        panel.querySelectorAll('.session-switch-item').forEach(btn => {
            btn.onclick = () => {
                const sessionId = btn.dataset.id;
                if (sessionId === currentSessionId) {
                    overlay.remove();
                    return;
                }
                overlay.remove();
                window.location.hash = sessionId;
                window.location.reload();
            };
            btn.onmouseenter = () => {
                if (!btn.classList.contains('active')) {
                    btn.style.borderColor = 'var(--accent-color)';
                    btn.style.background = 'rgba(var(--accent-color-rgb),0.05)';
                }
            };
            btn.onmouseleave = () => {
                if (!btn.classList.contains('active')) {
                    btn.style.borderColor = 'var(--border-color)';
                    btn.style.background = 'var(--primary-bg)';
                }
            };
        });
    };

    // 从聊天设置同步数据到 Home 页（供 core.js 调用）
    // 注意：头像和昵称的同步已在 loadSavedSettings 中处理，这里只处理其他数据
    window.syncHomePageData = function() {
        // 更新标题显示
        updateHeroTitleFromProfiles();
    };

    // 暴露给外部调用（由 core.js 的 loadData 完成后调用）
    // DOM 加载完成后只初始化时间更新，设置加载等 loadData 完成后再执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            updateTime();
            setInterval(updateTime, 1000);
        });
    } else {
        updateTime();
        setInterval(updateTime, 1000);
    }

    // 主题预设点击 - 直接绑定到 document 确保一定能触发
    document.addEventListener('click', function(e) {
        const preset = e.target.closest('.theme-preset');
        if (preset && preset.dataset.theme) {
            e.preventDefault();
            e.stopPropagation();
            applyTheme(preset.dataset.theme);
        }
    }, true); // 使用捕获阶段

})();
