/**
 * call-records.js - 通讯记录功能
 * 从所有会话中聚合通话记录，支持按伴侣筛选
 */
(function() {
  'use strict';

  const APP_PREFIX = window.APP_PREFIX || 'CHAT_APP_V3_';

  // 缓存的通话记录
  let allCallRecords = [];
  let currentFilter = 'all';

  // ========== 工具函数 ==========

  function formatDate(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDay(d, today)) return '今天';
    if (isSameDay(d, yesterday)) return '昨天';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function formatTime(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    if (isSameDay(d, today)) return timeStr;
    if (isSameDay(d, yesterday)) return `昨天 ${timeStr}`;
    return timeStr;
  }

  function formatDuration(detail) {
    if (!detail) return { text: '未接听', isMissed: true };
    // detail 格式如 "03:25"（分:秒）
    const parts = detail.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      return { text: `${mins}分${secs}秒`, isMissed: false, totalSeconds: mins * 60 + secs };
    }
    return { text: detail, isMissed: false, totalSeconds: 0 };
  }

  function getCallTypeClass(icon) {
    if (icon === 'fa-phone-slash') return 'missed';
    if (icon === 'fa-video') return 'video';
    return 'voice';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function getAvatarInitial(name) {
    if (!name) return '?';
    return name.charAt(0);
  }

  function getAvatarColor(seed) {
    // 简单的字符串哈希生成渐变色
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 75%), hsl(${(hue + 30) % 360}, 70%, 70%))`;
  }

  // ========== 数据聚合 ==========

  async function collectAllCallRecords() {
    const sessions = window.sessionList || [];
    const records = [];

    for (const session of sessions) {
      try {
        // 读取会话设置，获取梦角名字
        const settingsKey = `${APP_PREFIX}${session.id}_chatSettings`;
        const sessionSettings = await localforage.getItem(settingsKey);
        const partnerName = (sessionSettings && sessionSettings.partnerName) || session.name || '梦角';

        const msgKey = `${APP_PREFIX}${session.id}_chatMessages`;
        const messages = await localforage.getItem(msgKey);
        if (!Array.isArray(messages)) continue;

        for (const msg of messages) {
          if (msg.type === 'call-event') {
            records.push({
              id: msg.id,
              sessionId: session.id,
              partnerName: partnerName,
              callIcon: msg.callIcon || 'fa-phone',
              callDetail: msg.callDetail,
              text: msg.text,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            });
          }
        }
      } catch (e) {
        console.warn('[call-records] 读取会话失败:', session.id, e);
      }
    }

    // 按时间倒序
    records.sort((a, b) => b.timestamp - a.timestamp);
    return records;
  }

  // ========== 渲染 ==========

  function renderCallRecords() {
    const listEl = document.getElementById('call-records-list');
    if (!listEl) return;

    // 筛选
    let filtered = allCallRecords;
    if (currentFilter !== 'all') {
      filtered = allCallRecords.filter(r => r.sessionId === currentFilter);
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="cr-empty">
          <i class="fas fa-phone-slash"></i>
          <div>暂无通话记录</div>
        </div>
      `;
      updateStats(filtered);
      return;
    }

    // 按日期分组
    const groups = {};
    filtered.forEach(record => {
      const dateLabel = formatDate(record.timestamp);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(record);
    });

    let html = '';
    for (const [dateLabel, items] of Object.entries(groups)) {
      html += `<div class="cr-date-group">`;
      html += `<div class="cr-date-label">${escapeHtml(dateLabel)}</div>`;
      for (const record of items) {
        const dur = formatDuration(record.callDetail);
        const typeClass = getCallTypeClass(record.callIcon);
        const iconName = record.callIcon || 'fa-phone';
        const initial = getAvatarInitial(record.partnerName);
        const bgColor = getAvatarColor(record.partnerName);
        const timeStr = formatTime(record.timestamp);
        const durColor = dur.isMissed ? 'color:#ff6b6b;' : '';

        html += `
          <div class="cr-call-item" onclick="window.CallRecords.jumpToChat('${record.sessionId}')" title="点击跳转到聊天">
            <div class="cr-avatar" style="background: ${bgColor};">${escapeHtml(initial)}</div>
            <div class="cr-call-info">
              <div class="cr-call-top">
                <span class="cr-call-name">${escapeHtml(record.partnerName)}</span>
                <i class="fas ${escapeHtml(iconName)} cr-call-type-icon ${typeClass}"></i>
              </div>
              <div class="cr-call-bottom">
                <span class="cr-call-duration" style="${durColor}">${escapeHtml(dur.text)}</span>
                <span class="cr-call-time">${escapeHtml(timeStr)}</span>
              </div>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    listEl.innerHTML = html;
    updateStats(filtered);
  }

  function updateStats(records) {
    const totalEl = document.getElementById('cr-stat-total');
    const durEl = document.getElementById('cr-stat-duration');

    if (totalEl) totalEl.textContent = records.length;

    if (durEl) {
      let totalSecs = 0;
      records.forEach(r => {
        const dur = formatDuration(r.callDetail);
        if (!dur.isMissed && dur.totalSeconds) {
          totalSecs += dur.totalSeconds;
        }
      });
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      if (mins > 0) {
        durEl.textContent = `${mins}:${String(secs).padStart(2,'0')}`;
      } else {
        durEl.textContent = `${secs}秒`;
      }
    }
  }

  async function renderPartnerFilter() {
    const select = document.getElementById('cr-partner-filter');
    if (!select) return;

    const sessions = window.sessionList || [];
    let html = '<option value="all">全部伴侣</option>';

    for (const session of sessions) {
      try {
        const settingsKey = `${APP_PREFIX}${session.id}_chatSettings`;
        const sessionSettings = await localforage.getItem(settingsKey);
        const name = (sessionSettings && sessionSettings.partnerName) || session.name || '梦角';
        const selected = currentFilter === session.id ? 'selected' : '';
        html += `<option value="${escapeHtml(session.id)}" ${selected}>${escapeHtml(name)}</option>`;
      } catch (e) {
        const name = session.name || '梦角';
        const selected = currentFilter === session.id ? 'selected' : '';
        html += `<option value="${escapeHtml(session.id)}" ${selected}>${escapeHtml(name)}</option>`;
      }
    }

    select.innerHTML = html;
  }

  // ========== 交互 ==========

  function filterByPartner(sessionId) {
    currentFilter = sessionId;
    renderCallRecords();
  }

  function jumpToChat(sessionId) {
    // 关闭弹窗
    const modal = document.getElementById('call-records-modal');
    if (modal && typeof window.homeHideModal === 'function') {
      window.homeHideModal(modal);
    } else if (modal) {
      modal.style.display = 'none';
    }
    // 跳转到对应会话
    if (typeof window.switchSession === 'function') {
      window.switchSession(sessionId);
    } else if (typeof window.homeHideHomePage === 'function') {
      // 如果在 home 页，先跳回聊天页
      window.location.hash = sessionId;
      window.homeHideHomePage();
    } else {
      window.location.hash = sessionId;
      window.location.reload();
    }
  }

  // ========== 打开/关闭 ==========

  async function openCallRecordsModal() {
    const modal = document.getElementById('call-records-modal');
    if (!modal) return;

    // 显示弹窗
    if (typeof window.homeShowModal === 'function') {
      window.homeShowModal(modal);
    } else if (typeof showModal === 'function') {
      showModal(modal);
    } else {
      modal.style.display = 'flex';
    }

    // 渲染筛选器
    renderPartnerFilter(); // 异步加载，不阻塞弹窗显示

    // 加载并渲染通话记录
    const loadingEl = document.getElementById('call-records-list');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div class="cr-empty">
          <i class="fas fa-spinner fa-spin"></i>
          <div>加载中...</div>
        </div>
      `;
    }

    allCallRecords = await collectAllCallRecords();
    renderCallRecords();
  }

  function closeCallRecordsModal() {
    const modal = document.getElementById('call-records-modal');
    if (modal) {
      if (typeof window.homeHideModal === 'function') {
        window.homeHideModal(modal);
      } else if (typeof hideModal === 'function') {
        hideModal(modal);
      } else {
        modal.style.display = 'none';
      }
    }
  }

  // ========== 初始化 ==========

  function init() {
    // 绑定关闭按钮
    const closeBtn = document.getElementById('close-call-records-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCallRecordsModal);
    }

    // 绑定筛选器
    const filter = document.getElementById('cr-partner-filter');
    if (filter) {
      filter.addEventListener('change', function(e) {
        filterByPartner(e.target.value);
      });
    }
  }

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露到全局
  window.CallRecords = {
    openCallRecordsModal,
    closeCallRecordsModal,
    filterByPartner,
    jumpToChat,
    renderCallRecords,
    collectAllCallRecords
  };

})();
