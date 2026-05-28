import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import * as storage from '@/services/storage';
import { chat } from '@/services/ai';

type AiProvider = 'openai' | 'claude' | 'deepseek' | 'custom';
type TestStatus = 'idle' | 'loading' | 'success' | 'error';

const providerLabels: Record<AiProvider, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  custom: 'OpenAI 兼容',
};

const floatingDisplayOptions = [
  { key: 'showTimer', label: '计时器功能', description: '显示播放、暂停和重置计时' },
  { key: 'showQuote', label: '励志标语', description: '显示自定义鼓励语' },
  { key: 'showProgress', label: '题目完成数量', description: '显示今日完成进度' },
] as const;

export default function Settings() {
  const { settings, update } = useSettingsStore();
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasApiKey = Boolean(settings.ai.apiKey);
  const maskedKey = hasApiKey ? `已配置 · ${settings.ai.apiKey.slice(-4).padStart(8, '•')}` : '未配置 API Key';
  const widgetDisplaySummary = floatingDisplayOptions
    .filter((option) => settings.floatingWidget[option.key] !== false)
    .map((option) => option.label.replace('功能', '').replace('题目', ''))
    .join(' / ');
  const widgetSummary = settings.floatingWidget.enabled
    ? settings.floatingWidget.showMode === 'unfinished'
      ? `仅未完成时显示 · ${widgetDisplaySummary || '未选择内容'}`
      : `始终显示 · ${widgetDisplaySummary || '未选择内容'}`
    : '已关闭';

  const handleTestApi = async () => {
    setTestStatus('loading');
    setTestMessage('');
    try {
      const reply = await chat(
        [{ role: 'user', content: '请回复"连接成功"四个字' }],
        settings.ai
      );
      if (reply) {
        setTestStatus('success');
        setTestMessage('连接成功');
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : '连接失败');
    }
  };

  const handleExport = async () => {
    const data = await storage.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      for (const [key, value] of Object.entries(data)) {
        await storage.set(key, value);
      }
      window.location.reload();
    };
    input.click();
  };

  return (
    <div className="page-enter pb-4">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold">设置</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">常用配置放这里，高级项收进弹窗。</p>
        </div>
        <button
          onClick={() => setShowAdvanced(true)}
          className="btn-glass shrink-0 px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--accent)]"
        >
          高级设置
        </button>
      </div>

      <div className="space-y-3">
        <section className="glass-card p-4">
          <label className="block text-sm font-medium mb-2">每日目标</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={20}
              value={settings.dailyGoal}
              onChange={(e) => update({ dailyGoal: Number(e.target.value) })}
              className="w-24 px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-center text-lg font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
            />
            <p className="text-sm text-[var(--text-secondary)]">题 / 天</p>
          </div>
        </section>

        <section className="glass-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">AI 助手</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {providerLabels[settings.ai.provider]} · {settings.ai.model || '未选择模型'}
              </p>
              <p className={`text-xs mt-1 ${hasApiKey ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{maskedKey}</p>
            </div>
            <button
              onClick={() => setShowAdvanced(true)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] text-[var(--accent)] hover:bg-[var(--glass-bg)] transition-colors"
            >
              配置
            </button>
          </div>
          <button
            onClick={handleTestApi}
            disabled={!hasApiKey || testStatus === 'loading'}
            className="btn-glass w-full mt-3 py-2 px-3 rounded-xl border border-[var(--border-glass)] text-sm hover:bg-[var(--bg-secondary)] disabled:opacity-50"
          >
            {testStatus === 'loading' ? '测试中...' : '测试 API 连接'}
          </button>
          {testStatus === 'success' && (
            <p className="text-xs text-[var(--success)] mt-2">{testMessage}</p>
          )}
          {testStatus === 'error' && (
            <p className="text-xs text-[var(--danger)] mt-2">{testMessage}</p>
          )}
        </section>

        <section className="glass-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">悬浮窗</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{widgetSummary}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.floatingWidget.enabled}
                onChange={() => update({ floatingWidget: { ...settings.floatingWidget, enabled: !settings.floatingWidget.enabled } })}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-[var(--accent)]" />
              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
        </section>

        <section className="glass-card p-4">
          <h2 className="text-sm font-semibold mb-2">数据备份</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="btn-glass flex-1 py-2 px-3 rounded-xl border border-[var(--border-glass)] text-sm hover:bg-[var(--bg-secondary)]"
            >
              导出
            </button>
            <button
              onClick={handleImport}
              className="btn-glass flex-1 py-2 px-3 rounded-xl border border-[var(--border-glass)] text-sm hover:bg-[var(--bg-secondary)]"
            >
              导入
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">导出 JSON 文件，用于备份和恢复。</p>
        </section>
      </div>

      {showAdvanced && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 backdrop-blur-sm" onClick={() => setShowAdvanced(false)}>
          <div
            className="slide-up-enter max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--border-glass)] bg-[var(--bg-primary)] p-4 pb-28 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">高级设置</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">API、提示词和悬浮窗细节。</p>
              </div>
              <button
                onClick={() => setShowAdvanced(false)}
                className="rounded-full px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                关闭
              </button>
            </div>

            <div className="space-y-5">
              <section>
                <h3 className="text-sm font-semibold mb-3">AI 配置</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Provider</label>
                    <select
                      value={settings.ai.provider}
                      onChange={(e) =>
                        update({ ai: { ...settings.ai, provider: e.target.value as AiProvider } })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="claude">Claude</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="custom">OpenAI 兼容（自定义）</option>
                    </select>
                    {settings.ai.provider === 'custom' && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">支持 Ollama、vLLM、各种中转站等 OpenAI 兼容接口。</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.ai.apiKey}
                      onChange={(e) => update({ ai: { ...settings.ai, apiKey: e.target.value } })}
                      placeholder="输入你的 API Key"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">模型</label>
                    <input
                      type="text"
                      value={settings.ai.model}
                      onChange={(e) => update({ ai: { ...settings.ai, model: e.target.value } })}
                      placeholder="如 gpt-4o-mini"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Base URL</label>
                    <input
                      type="text"
                      value={settings.ai.baseUrl || ''}
                      onChange={(e) => update({ ai: { ...settings.ai, baseUrl: e.target.value } })}
                      placeholder="留空使用默认地址"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
                    />
                    {settings.ai.provider === 'custom' && !settings.ai.baseUrl && (
                      <p className="text-xs text-[var(--danger)] mt-1">自定义模式下必须填写 Base URL</p>
                    )}
                  </div>
                </div>
              </section>

              <hr className="border-[var(--border-glass)]" />

              <section>
                <h3 className="text-sm font-semibold mb-3">悬浮窗设置</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.floatingWidget.enabled}
                      onChange={() => update({ floatingWidget: { ...settings.floatingWidget, enabled: !settings.floatingWidget.enabled } })}
                      className="rounded"
                    />
                    启用悬浮窗
                  </label>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">显示策略</label>
                    <select
                      value={settings.floatingWidget.showMode}
                      onChange={(e) => update({ floatingWidget: { ...settings.floatingWidget, showMode: e.target.value as 'always' | 'unfinished' } })}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200"
                    >
                      <option value="always">始终显示</option>
                      <option value="unfinished">仅未完成时显示</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-2">显示内容</label>
                    <div className="grid gap-2">
                      {floatingDisplayOptions.map((option) => (
                        <label key={option.key} className="flex items-start gap-2 rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.floatingWidget[option.key] !== false}
                            onChange={() => update({
                              floatingWidget: {
                                ...settings.floatingWidget,
                                [option.key]: settings.floatingWidget[option.key] === false,
                              },
                            })}
                            className="mt-0.5 rounded"
                          />
                          <span>
                            <span className="block font-medium text-[var(--text-primary)]">{option.label}</span>
                            <span className="block text-xs text-[var(--text-secondary)] mt-0.5">{option.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">励志语（每行一条）</label>
                    <textarea
                      value={settings.floatingWidget.quotes.join('\n')}
                      onChange={(e) => update({ floatingWidget: { ...settings.floatingWidget, quotes: e.target.value.split('\n').map((quote) => quote.trim()).filter(Boolean) } })}
                      rows={5}
                      disabled={settings.floatingWidget.showQuote === false}
                      placeholder="坚持就是胜利&#10;每天进步一点点&#10;算法之路，贵在坚持"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-glass)] bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-all duration-200 disabled:opacity-50"
                    />
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">开启“励志标语”后，悬浮窗会按天轮换显示这里的内容。</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
