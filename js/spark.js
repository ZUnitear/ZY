/**
 * 火花功能 - Streak
 * 连续聊天超过3天出现火花图标，断聊后变灰，连续3天重燃
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'chat_streak_data';
  const STREAK_THRESHOLD = 3;      // 出现火花所需连续天数
  const REKINDLE_THRESHOLD = 3;    // 重燃所需连续天数

  // 火花数据
  let streakData = {
    currentStreak: 0,      // 当前连续天数
    maxStreak: 0,          // 历史最高连续天数
    rekindleCount: 0,      // 重燃次数
    lastChatDate: null,    // 最后聊天日期 (YYYY-MM-DD)
    isActive: false,       // 火花是否燃烧中
    rekindleProgress: 0,   // 重燃进度（0-3）
    history: []            // 历史记录 [{date, userMsg, partnerMsg}]
  };

  // ========== 工具函数 ==========

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getDateDiff(date1, date2) {
    const d1 = new Date(date1 + 'T00:00:00');
    const d2 = new Date(date2 + 'T00:00:00');
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function loadStreakData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        streakData = { ...streakData, ...parsed };
        // 兼容性修复：旧数据中 maxStreak 可能未正确同步
        if (streakData.isActive && streakData.currentStreak > streakData.maxStreak) {
          streakData.maxStreak = streakData.currentStreak;
        }
      }
    } catch(e) {}
  }

  function saveStreakData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData));
    } catch(e) {}
  }

  // ========== 核心逻辑 ==========

  /**
   * 记录一次聊天（用户发送消息时调用）
   */
  function recordChat() {
    const today = getTodayStr();

    // 今天已经记录过，不重复处理
    if (streakData.lastChatDate === today) return;

    const diff = streakData.lastChatDate ? getDateDiff(streakData.lastChatDate, today) : 999;
    const hasEverHadSpark = streakData.maxStreak >= STREAK_THRESHOLD;

    if (diff === 1) {
      // 连续聊天
      if (streakData.isActive) {
        // 火花继续燃烧
        streakData.currentStreak++;
        if (streakData.currentStreak > streakData.maxStreak) {
          streakData.maxStreak = streakData.currentStreak;
        }
      } else if (hasEverHadSpark) {
        // 曾经有过火花，现在是重燃进度中
        streakData.currentStreak++;
        streakData.rekindleProgress++;
        if (streakData.rekindleProgress >= REKINDLE_THRESHOLD) {
          // 重燃成功
          streakData.isActive = true;
          streakData.rekindleCount++;
          streakData.rekindleProgress = 0;
          if (streakData.currentStreak > streakData.maxStreak) {
            streakData.maxStreak = streakData.currentStreak;
          }
          showSparkNotification('🔥 火花重燃！连续聊天 ' + streakData.currentStreak + ' 天');
        }
      } else {
        // 从未有过火花，首次积累中
        streakData.currentStreak++;
        if (streakData.currentStreak >= STREAK_THRESHOLD) {
          streakData.isActive = true;
          streakData.maxStreak = streakData.currentStreak;
          streakData.rekindleProgress = 0;
          showSparkNotification('🔥 火花出现！已连续聊天 ' + streakData.currentStreak + ' 天');
        }
      }
    } else if (diff > 1) {
      // 断聊了
      if (streakData.isActive) {
        streakData.isActive = false;
        streakData.rekindleProgress = 0;
        showSparkNotification('💨 火花已熄灭，连续聊天可重燃');
      }
      // 重置为第一天
      streakData.currentStreak = 1;
      if (hasEverHadSpark) {
        streakData.rekindleProgress = 1;
      } else {
        streakData.rekindleProgress = 0;
      }
    } else {
      // diff <= 0 同一天或异常，不处理
      return;
    }

    streakData.lastChatDate = today;
    saveStreakData();
    updateSparkUI();
  }

  /**
   * 记录对方消息（确保双方都有消息才算聊过）
   */
  function recordPartnerChat() {
    // 对方消息只标记当天有互动，实际计数在用户发送时处理
    // 这里可以扩展为需要双方都有消息才算的逻辑
  }

  // ========== UI 更新 ==========

  function updateSparkUI() {
    const icon = document.getElementById('spark-icon');
    const badge = document.getElementById('spark-badge');
    if (!icon) return;

    if (streakData.isActive) {
      icon.className = 'spark-icon active';
      icon.style.display = 'flex';
      if (badge) {
        badge.textContent = streakData.currentStreak;
        badge.style.display = 'block';
      }
    } else if (streakData.currentStreak > 0 || streakData.rekindleProgress > 0) {
      // 有连续记录但火花未激活（重燃中或刚断）
      icon.className = 'spark-icon inactive';
      icon.style.display = 'flex';
      if (badge) {
        const days = streakData.rekindleProgress || streakData.currentStreak;
        badge.textContent = days;
        badge.style.display = days > 0 ? 'block' : 'none';
      }
    } else {
      icon.style.display = 'none';
    }
  }

  function showSparkNotification(text) {
    if (typeof showNotification === 'function') {
      showNotification(text, 'info', 3000);
    }
  }

  // ========== 弹窗 ==========

  function openSparkModal() {
    const overlay = document.getElementById('spark-modal-overlay');
    if (!overlay) return;

    const flame = document.getElementById('spark-modal-flame');
    const title = document.getElementById('spark-modal-title');
    const subtitle = document.getElementById('spark-modal-subtitle');
    const streakDays = document.getElementById('spark-streak-days');
    const rekindleCount = document.getElementById('spark-rekindle-count');
    const info = document.getElementById('spark-rekindle-info');

    if (streakData.isActive) {
      if (flame) { flame.textContent = '🔥'; }
      title.textContent = '火花燃烧中';
      subtitle.textContent = '保持连续聊天，让火花更旺！';
      if (info) {
        info.className = 'spark-rekindle-info';
        info.querySelector('.rekindle-text').textContent = '✨ 火花状态良好';
        info.querySelector('.rekindle-sub').textContent = '继续保持连续聊天吧！';
      }
    } else if (streakData.rekindleProgress > 0) {
      if (flame) { flame.textContent = '💫'; }
      title.textContent = '正在重燃火花';
      subtitle.textContent = '连续聊天中，火花即将重燃！';
      if (info) {
        info.className = 'spark-rekindle-info needed';
        const need = REKINDLE_THRESHOLD - streakData.rekindleProgress;
        info.querySelector('.rekindle-text').textContent = '💡 还需连续聊天';
        info.querySelector('.rekindle-sub').textContent = '再聊 ' + need + ' 天即可重燃火花！';
      }
    } else {
      if (flame) { flame.textContent = '💨'; }
      title.textContent = '火花已熄灭';
      subtitle.textContent = '昨天没有聊天，火花变灰了...';
      if (info) {
        info.className = 'spark-rekindle-info needed';
        info.querySelector('.rekindle-text').textContent = '💡 还需连续聊天';
        info.querySelector('.rekindle-sub').textContent = '再聊 ' + REKINDLE_THRESHOLD + ' 天即可重燃火花！';
      }
    }

    streakDays.textContent = streakData.currentStreak;
    rekindleCount.textContent = streakData.rekindleCount;

    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
  }

  function closeSparkModal() {
    const overlay = document.getElementById('spark-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
    }
  }

  // ========== 初始化 ==========

  function init() {
    // 确保弹窗在 body 直接子级（避免被父容器 overflow:hidden 裁剪）
    var overlay = document.getElementById('spark-modal-overlay');
    if (overlay && overlay.parentElement && overlay.parentElement.tagName !== 'BODY') {
      document.body.appendChild(overlay);
    }
    loadStreakData();
    updateSparkUI();
  }

  // 页面加载时初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露到全局
  window.SparkApp = {
    recordChat,
    recordPartnerChat,
    openSparkModal,
    closeSparkModal,
    getData: () => ({ ...streakData })
  };

})();
