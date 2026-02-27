/**
 * Feedback Component -- floating button + modal to submit GitHub issues
 */

export class Feedback {
  constructor() {
    this._createButton();
    this._createModal();
    this._bindEvents();
  }

  _createButton() {
    this.btn = document.createElement('button');
    this.btn.className = 'feedback-btn';
    this.btn.title = '反馈';
    this.btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
  }

  _createModal() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'feedback-overlay hidden';

    this.overlay.innerHTML = `
      <div class="feedback-backdrop"></div>
      <div class="feedback-modal">
        <button class="feedback-close">&times;</button>
        <h3 class="feedback-title">反馈</h3>
        <p class="feedback-desc">向GitHub仓库提交问题</p>
        <form class="feedback-form">
          <label class="feedback-label">
            标题
            <input type="text" class="feedback-input" name="title"
                   placeholder="简要描述您的建议或问题" required />
          </label>
          <label class="feedback-label">
            类型
            <select class="feedback-select" name="type">
              <option value="suggestion">功能建议</option>
              <option value="bug">问题报告</option>
              <option value="content">内容纠正</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label class="feedback-label">
            描述
            <textarea class="feedback-textarea" name="body" rows="5"
                      placeholder="可选：提供更多详情..."></textarea>
          </label>
          <button type="submit" class="feedback-submit">提交</button>
          <div class="feedback-status"></div>
        </form>
      </div>
    `;
  }

  _bindEvents() {
    this.btn.addEventListener('click', () => this.show());
    this.overlay.querySelector('.feedback-backdrop').addEventListener('click', () => this.hide());
    this.overlay.querySelector('.feedback-close').addEventListener('click', () => this.hide());

    const form = this.overlay.querySelector('.feedback-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._submit(form);
    });
  }

  show() {
    this.overlay.classList.remove('hidden');
    const status = this.overlay.querySelector('.feedback-status');
    status.textContent = '';
    status.className = 'feedback-status';
    this.overlay.querySelector('.feedback-submit').disabled = false;
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  async _submit(form) {
    const title = form.title.value.trim();
    const type = form.type.value;
    const body = form.body.value.trim();
    const submitBtn = this.overlay.querySelector('.feedback-submit');
    const status = this.overlay.querySelector('.feedback-status');

    if (!title) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    status.textContent = '';
    status.className = 'feedback-status';

    const labelMap = {
      suggestion: 'enhancement',
      bug: 'bug',
      content: 'content',
      other: 'feedback',
    };

    const issueBody = [
      body,
      '',
      '---',
      `> Source: 三国演义可视化反馈`,
      `> Type: ${type}`,
      `> Page: ${location.href}`,
    ].join('\n');

    try {
      const res = await fetch('/api/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[${type}] ${title}`,
          body: issueBody,
          labels: [labelMap[type] || 'feedback'],
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        status.textContent = `问题 #${data.issueNumber} 已创建`;
        status.className = 'feedback-status success';
        form.reset();
        setTimeout(() => this.hide(), 2000);
      } else {
        status.textContent = data.error || '提交失败，请重试';
        status.className = 'feedback-status error';
      }
    } catch (err) {
      status.textContent = '网络错误，请检查连接';
      status.className = 'feedback-status error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '提交';
    }
  }

  getButton() {
    return this.btn;
  }

  getOverlay() {
    return this.overlay;
  }
}
