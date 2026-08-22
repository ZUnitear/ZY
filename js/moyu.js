/**
 * moyu.js - 摸鱼小记功能
 * 功能：记录工作地点、工作时长、摸鱼内容，支持地点库管理
 */

// ==================== 初始化 ====================
window.initMoyu = function () {
    // 绑定顶部按钮入口
    const moyuEntry = document.getElementById('moyu-btn');
    if (moyuEntry) {
        moyuEntry.addEventListener('click', function () {
            window.openMoyuModal();
        });
    }

    // 初始化时间筛选
    window.initMoyuTimeFilter();

    // 绑定关闭按钮
    const closeBtn = document.getElementById('close-moyu-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            const modal = document.getElementById('moyu-modal');
            if (modal) {
                if (typeof hideModal === 'function') hideModal(modal);
                else modal.style.display = 'none';
            }
        });
    }
};

// ==================== 弹窗管理 ====================
window.openMoyuModal = function () {
    const modal = document.getElementById('moyu-modal');
    if (!modal) return;

    // 清除未读标记
    if (typeof window.clearMoyuUnread === 'function') {
        window.clearMoyuUnread();
    }

    // 显示弹窗
    if (typeof showModal === 'function') {
        showModal(modal);
    } else if (typeof window.homeShowModal === 'function') {
        window.homeShowModal(modal);
    } else {
        modal.style.display = 'flex';
    }

    // 渲染内容
    window.renderMoyuCurrent();
    window.renderMoyuRecords();
    window.renderMoyuLocations();

    // 默认显示当前标签页
    window.switchMoyuTab('current');
};

// ==================== 标签页切换 ====================
window.switchMoyuTab = function (tab) {
    const currentPanel = document.getElementById('moyu-current-panel');
    const recordsPanel = document.getElementById('moyu-records-panel');
    const currentTab = document.getElementById('moyu-tab-current');
    const recordsTab = document.getElementById('moyu-tab-records');

    if (!currentPanel || !recordsPanel || !currentTab || !recordsTab) return;

    if (tab === 'current') {
        currentPanel.style.display = 'block';
        recordsPanel.style.display = 'none';
        currentTab.classList.add('active');
        currentTab.style.background = 'rgba(var(--accent-color-rgb), 0.16)';
        currentTab.style.color = 'var(--accent-color)';
        recordsTab.classList.remove('active');
        recordsTab.style.background = 'transparent';
        recordsTab.style.color = 'var(--text-secondary)';
    } else {
        currentPanel.style.display = 'none';
        recordsPanel.style.display = 'block';
        currentTab.classList.remove('active');
        currentTab.style.background = 'transparent';
        currentTab.style.color = 'var(--text-secondary)';
        recordsTab.classList.add('active');
        recordsTab.style.background = 'rgba(var(--accent-color-rgb), 0.16)';
        recordsTab.style.color = 'var(--accent-color)';
    }
};

// ==================== 当前面板渲染 ====================
window.renderMoyuCurrent = function () {
    const panel = document.getElementById('moyu-current-panel');
    if (!panel) return;

    // 如果没有当前记录，显示提示
    if (!window.currentMoyuRecord) {
        panel.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <i class="fas fa-fish" style="font-size: 36px; margin-bottom: 12px; opacity: 0.3;"></i>
                <div style="font-size: 13px;">暂无摸鱼记录</div>
                <div style="font-size: 11px; margin-top: 8px; opacity: 0.7; line-height: 1.6;">
                    梦角会在此生成<br>
                    记录生活的摸鱼记录
                </div>
                <div style="margin-top: 16px; padding: 12px; background: rgba(var(--accent-color-rgb), 0.08); border-radius: 10px; border: 1px dashed rgba(var(--accent-color-rgb), 0.3);">
                    <div style="font-size: 11px; color: var(--text-secondary);">
                        <i class="fas fa-info-circle" style="margin-right: 4px;"></i>
                        请在「设置」→「摸鱼记录」中<br>添加字卡并等待梦角记录
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const record = window.currentMoyuRecord;
    const session = window.moyuWorkSession;

    // 构建活动列表（分条显示）
    let activitiesHtml = '';
    if (session && session.activities && session.activities.length > 0) {
        activitiesHtml = session.activities.map((act, idx) => {
            const time = new Date(act.time);
            const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0') + ':' + time.getSeconds().toString().padStart(2, '0');
            return `
                <div style="background: var(--primary-bg); border-radius: 8px; padding: 10px 12px; margin-bottom: ${idx < session.activities.length - 1 ? '8px' : '0'}; position: relative;">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; opacity: 0.7;">
                        <i class="fas fa-clock" style="margin-right: 2px; font-size: 9px;"></i>${timeStr}
                    </div>
                    <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">${window.escapeHtml(act.content)}</div>
                </div>
            `;
        }).join('');
    } else if (record.note) {
        // 兼容旧格式（非会话记录）
        activitiesHtml = `
            <div style="background: var(--primary-bg); border-radius: 8px; padding: 10px 12px; position: relative;">
                <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; opacity: 0.7;">
                    <i class="fas fa-clock" style="margin-right: 2px; font-size: 9px;"></i>${record.createdAt ? new Date(record.createdAt).getHours().toString().padStart(2,'0') + ':' + new Date(record.createdAt).getMinutes().toString().padStart(2,'0') : ''}
                </div>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">${window.escapeHtml(record.note)}</div>
            </div>
        `;
    }

    // 计算剩余工作时间
    let remainingHtml = '';
    if (session && session.endTime) {
        const now = Date.now();
        const remaining = session.endTime - now;
        if (remaining > 0) {
            const remainMin = Math.floor(remaining / 60000);
            const remainHour = Math.floor(remainMin / 60);
            const remainMinLeft = remainMin % 60;
            const remainStr = remainHour > 0 ? `${remainHour}小时${remainMinLeft}分钟` : `${remainMinLeft}分钟`;
            remainingHtml = `
                <div style="font-size: 11px; color: var(--accent-color); background: rgba(var(--accent-color-rgb), 0.08); padding: 6px 10px; border-radius: 8px; margin-bottom: 12px; text-align: center;">
                    <i class="fas fa-hourglass-half" style="margin-right: 4px;"></i>剩余工作时间 ${remainStr}
                </div>
            `;
        }
    }

    panel.innerHTML = `
        <div style="text-align: center; margin-bottom: 12px;">
            <span style="font-size: 11px; color: var(--text-secondary); background: rgba(var(--accent-color-rgb), 0.1); padding: 4px 10px; border-radius: 10px;">
                <i class="fas fa-clock" style="margin-right: 4px;"></i>当前摸鱼记录
            </span>
        </div>
        <div class="moyu-record-item" style="background: var(--secondary-bg); border-radius: 12px; padding: 14px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-map-marker-alt" style="color: var(--accent-color); font-size: 12px;"></i>
                    <span style="font-weight: 600; font-size: 14px;">${window.escapeHtml(record.location)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 12px; color: var(--text-secondary); background: rgba(var(--accent-color-rgb), 0.1); padding: 2px 8px; border-radius: 10px;">
                        <i class="fas fa-clock" style="font-size: 10px; margin-right: 2px;"></i>${record.hours}h
                    </span>
                </div>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
                <i class="fas fa-calendar" style="margin-right: 4px;"></i>${record.date}
            </div>
            ${remainingHtml}
            <div style="margin-top: 8px;">
                ${activitiesHtml}
            </div>
        </div>
    `;
};

// ==================== 统计渲染 ====================
window.renderMoyuStats = function () {
    const totalCountEl = document.getElementById('moyu-total-count');
    const totalHoursEl = document.getElementById('moyu-total-hours');
    const locationCountEl = document.getElementById('moyu-location-count');

    if (!totalCountEl || !totalHoursEl || !locationCountEl) return;

    // 计算统计数据
    const records = moyuRecords || [];
    const locations = moyuLocations || [];

    const totalCount = records.length;
    const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

    totalCountEl.textContent = totalCount;
    totalHoursEl.textContent = totalHours.toFixed(1);
    locationCountEl.textContent = locations.length;
};

// ==================== 记录列表渲染 ====================
window.renderMoyuRecords = function () {
    const listEl = document.getElementById('moyu-records-list');
    if (!listEl) return;

    let records = moyuRecords || [];

    // 应用时间筛选
    const filterType = window.moyuFilterType || 'all';
    const startDate = window.moyuFilterStartDate;
    const endDate = window.moyuFilterEndDate;

    if (filterType !== 'all') {
        const now = new Date();
        let filterStart = null;
        let filterEnd = null;

        switch (filterType) {
            case 'today':
                filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                filterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filterEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case 'month':
                filterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filterEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case 'custom':
                if (startDate && endDate) {
                    filterStart = new Date(startDate);
                    filterEnd = new Date(endDate);
                    filterEnd.setDate(filterEnd.getDate() + 1);
                }
                break;
        }

        if (filterStart && filterEnd) {
            records = records.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate >= filterStart && recordDate < filterEnd;
            });
        }
    }

    if (records.length === 0) {
        listEl.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <i class="fas fa-fish" style="font-size: 36px; margin-bottom: 12px; opacity: 0.3;"></i>
                <div style="font-size: 13px;">该时间段内没有记录~</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">尝试调整时间筛选范围</div>
            </div>
        `;
        return;
    }

    // 按日期倒序排列
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    listEl.innerHTML = sortedRecords.map((record, index) => {
        const originalIndex = records.indexOf(record);
        
        // 解析活动列表
        let activities = [];
        if (record.activities && Array.isArray(record.activities)) {
            // 新格式：有 activities 数组
            activities = record.activities;
        } else if (record.note && record.note.includes('• ')) {
            // 中间格式：note 是列表文本
            const lines = record.note.split('\n').filter(line => line.trim().startsWith('• '));
            activities = lines.map((line, idx) => ({
                content: line.replace(/^•\s*/, ''),
                time: record.createdAt ? new Date(record.createdAt).getTime() + idx * 60000 : Date.now()
            }));
        } else if (record.note) {
            // 旧格式：纯文本
            activities = [{
                content: record.note,
                time: record.createdAt ? new Date(record.createdAt).getTime() : Date.now()
            }];
        }

        // 生成活动列表 HTML（默认只显示2条）
        const displayCount = 2;
        const hasMore = activities.length > displayCount;
        const displayedActivities = activities.slice(0, displayCount);
        const hiddenActivities = activities.slice(displayCount);

        const activitiesHtml = displayedActivities.map((act, idx) => {
            const time = new Date(act.time);
            const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0') + ':' + time.getSeconds().toString().padStart(2, '0');
            return `
                <div style="background: var(--primary-bg); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; position: relative;">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; opacity: 0.7;">
                        <i class="fas fa-clock" style="margin-right: 2px; font-size: 9px;"></i>${timeStr}
                    </div>
                    <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">${window.escapeHtml(act.content)}</div>
                </div>
            `;
        }).join('');

        const hiddenActivitiesHtml = hiddenActivities.map((act, idx) => {
            const time = new Date(act.time);
            const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0') + ':' + time.getSeconds().toString().padStart(2, '0');
            return `
                <div style="background: var(--primary-bg); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; position: relative; display: none;" class="hidden-activity-${originalIndex}">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; opacity: 0.7;">
                        <i class="fas fa-clock" style="margin-right: 2px; font-size: 9px;"></i>${timeStr}
                    </div>
                    <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">${window.escapeHtml(act.content)}</div>
                </div>
            `;
        }).join('');

        const expandBtn = hasMore ? `
            <button onclick="window.toggleMoyuRecordExpand(${originalIndex})" id="moyu-expand-btn-${originalIndex}" style="width: 100%; padding: 8px; background: rgba(var(--accent-color-rgb), 0.08); border: 1px dashed rgba(var(--accent-color-rgb), 0.3); border-radius: 8px; color: var(--accent-color); font-size: 12px; cursor: pointer; font-family: var(--font-family); margin-top: 4px;">
                <i class="fas fa-chevron-down" style="margin-right: 4px;"></i>展开更多 (${hiddenActivities.length}条)
            </button>
        ` : '';

        return `
            <div class="moyu-record-item" style="background: var(--secondary-bg); border-radius: 12px; padding: 14px; margin-bottom: 10px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-map-marker-alt" style="color: var(--accent-color); font-size: 12px;"></i>
                        <span style="font-weight: 600; font-size: 14px;">${window.escapeHtml(record.location)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; color: var(--text-secondary); background: rgba(var(--accent-color-rgb), 0.1); padding: 2px 8px; border-radius: 10px;">
                            <i class="fas fa-clock" style="font-size: 10px; margin-right: 2px;"></i>${record.hours}h
                        </span>
                        <button onclick="window.deleteMoyuRecord(${originalIndex})" style="background: none; border: none; color: #ff6b6b; cursor: pointer; padding: 4px; font-size: 12px;" title="删除">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
                    <i class="fas fa-calendar" style="margin-right: 4px;"></i>${record.date}
                </div>
                <div style="margin-top: 8px;">
                    ${activitiesHtml}
                    ${hiddenActivitiesHtml}
                    ${expandBtn}
                </div>
            </div>
        `;
    }).join('');
};

// 展开/收起记录
window.toggleMoyuRecordExpand = function (index) {
    const hiddenItems = document.querySelectorAll(`.hidden-activity-${index}`);
    const btn = document.getElementById(`moyu-expand-btn-${index}`);

    if (!btn) return;

    const isExpanded = btn.dataset.expanded === 'true';

    if (isExpanded) {
        // 收起
        hiddenItems.forEach(item => item.style.display = 'none');
        btn.innerHTML = `<i class="fas fa-chevron-down" style="margin-right: 4px;"></i>展开更多 (${hiddenItems.length}条)`;
        btn.dataset.expanded = 'false';
    } else {
        // 展开
        hiddenItems.forEach(item => item.style.display = 'block');
        btn.innerHTML = `<i class="fas fa-chevron-up" style="margin-right: 4px;"></i>收起`;
        btn.dataset.expanded = 'true';
    }
};

// ==================== 时间筛选功能 ====================
// 初始化时间筛选
window.initMoyuTimeFilter = function () {
    const presetSelect = document.getElementById('moyu-filter-preset');
    const customRange = document.getElementById('moyu-custom-date-range');
    const startInput = document.getElementById('moyu-filter-start');
    const endInput = document.getElementById('moyu-filter-end');
    const filterInfo = document.getElementById('moyu-filter-info');

    if (!presetSelect) return;

    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    if (startInput) startInput.value = today;
    if (endInput) endInput.value = today;

    // 预设选择变化
    presetSelect.addEventListener('change', function () {
        const value = this.value;
        window.moyuFilterType = value;

        if (value === 'custom') {
            customRange.style.display = 'flex';
            filterInfo.textContent = '请选择自定义日期范围';
        } else {
            customRange.style.display = 'none';
            updateFilterInfo(value);
            window.renderMoyuRecords();
        }
    });

    // 自定义日期变化
    if (startInput) {
        startInput.addEventListener('change', function () {
            window.moyuFilterStartDate = this.value;
            if (window.moyuFilterType === 'custom' && window.moyuFilterEndDate) {
                updateFilterInfo('custom');
                window.renderMoyuRecords();
            }
        });
    }

    if (endInput) {
        endInput.addEventListener('change', function () {
            window.moyuFilterEndDate = this.value;
            if (window.moyuFilterType === 'custom' && window.moyuFilterStartDate) {
                updateFilterInfo('custom');
                window.renderMoyuRecords();
            }
        });
    }

    // 初始化筛选状态
    window.moyuFilterType = 'all';
};

// 更新筛选信息显示
function updateFilterInfo(filterType) {
    const filterInfo = document.getElementById('moyu-filter-info');
    if (!filterInfo) return;

    const now = new Date();
    let infoText = '';

    switch (filterType) {
        case 'all':
            infoText = '显示全部记录';
            break;
        case 'today':
            infoText = `今天 (${now.toLocaleDateString('zh-CN')})`;
            break;
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            infoText = `${weekAgo.toLocaleDateString('zh-CN')} 至 ${now.toLocaleDateString('zh-CN')}`;
            break;
        case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            infoText = `${monthAgo.toLocaleDateString('zh-CN')} 至 ${now.toLocaleDateString('zh-CN')}`;
            break;
        case 'custom':
            if (window.moyuFilterStartDate && window.moyuFilterEndDate) {
                infoText = `${window.moyuFilterStartDate} 至 ${window.moyuFilterEndDate}`;
            } else {
                infoText = '请选择完整的日期范围';
            }
            break;
    }

    filterInfo.textContent = infoText;
}

// ==================== 地点库渲染 ====================
window.renderMoyuLocations = function () {
    const listEl = document.getElementById('moyu-locations-list');
    if (!listEl) return;

    const locations = moyuLocations || [];

    if (locations.length === 0) {
        listEl.innerHTML = `
            <div style="text-align: center; padding: 30px 20px; color: var(--text-secondary);">
                <i class="fas fa-map-marked-alt" style="font-size: 32px; margin-bottom: 10px; opacity: 0.3;"></i>
                <div style="font-size: 13px;">还没有添加地点~</div>
            </div>
        `;
        return;
    }

    listEl.innerHTML = locations.map((loc, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--secondary-bg); border-radius: 10px; margin-bottom: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-map-pin" style="color: var(--accent-color); font-size: 12px;"></i>
                <span style="font-size: 14px;">${window.escapeHtml(loc)}</span>
            </div>
            <button onclick="window.removeMoyuLocation(${index})" style="background: none; border: none; color: #ff6b6b; cursor: pointer; padding: 4px 8px; font-size: 12px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
};

// ==================== 删除记录 ====================
window.deleteMoyuRecord = function (index) {
    if (!confirm('确定要删除这条记录吗？')) return;

    if (moyuRecords && index >= 0 && index < moyuRecords.length) {
        moyuRecords.splice(index, 1);
        if (typeof throttledSaveData === 'function') throttledSaveData();
        window.renderMoyuStats();
        window.renderMoyuRecords();
        if (typeof showNotification === 'function') showNotification('记录已删除', 'success');
    }
};

// ==================== 地点库管理 ====================
window.addMoyuLocation = function () {
    const input = document.getElementById('moyu-new-location-input');
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
        if (typeof showNotification === 'function') showNotification('请输入地点名称', 'error');
        return;
    }

    // 检查重复
    if (!moyuLocations) moyuLocations = [];
    if (moyuLocations.includes(name)) {
        if (typeof showNotification === 'function') showNotification('该地点已存在', 'error');
        return;
    }

    // 添加地点
    moyuLocations.push(name);
    if (typeof throttledSaveData === 'function') throttledSaveData();

    // 清空输入
    input.value = '';

    // 刷新显示
    window.renderMoyuStats();
    window.renderMoyuLocations();

    if (typeof showNotification === 'function') showNotification('地点添加成功', 'success');
};

window.removeMoyuLocation = function (index) {
    if (!confirm('确定要删除这个地点吗？')) return;

    if (moyuLocations && index >= 0 && index < moyuLocations.length) {
        moyuLocations.splice(index, 1);
        if (typeof throttledSaveData === 'function') throttledSaveData();
        window.renderMoyuStats();
        window.renderMoyuLocations();
        if (typeof showNotification === 'function') showNotification('地点已删除', 'success');
    }
};

// ==================== 工具函数 ====================
window.escapeHtml = function (str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};
