import { useState } from 'react';
import { Key, Cpu, Server, Sliders, Save, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';
import { saveSettings } from '../../shared/utils/storage';
import { SUPPORTED_MODELS, SUPPORTED_EMBEDDING_MODELS } from '../../shared/constants';
import clsx from 'clsx';

export default function SettingsPanel() {
  const { settings, setSettings, setIsSettingsOpen } = useExtensionStore();
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const update = (key: string, value: string | number | boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSettings(localSettings);
    await saveSettings(localSettings);
    await chrome.runtime.sendMessage({
      type: 'SETTINGS_SET',
      payload: localSettings,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 animate-slide-in">
      {/* Back button */}
      <button
        onClick={() => setIsSettingsOpen(false)}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <h2 className="text-sm font-semibold text-white">Settings</h2>

      {/* API Keys */}
      <div className="glass-card p-3 space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Key size={13} className="text-brand-400" />
          <span className="text-xs font-medium text-slate-300">API Keys</span>
        </div>

        {/* OpenAI */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500">OpenAI (анализ экрана, база знаний)</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={localSettings.openaiApiKey}
              onChange={(e) => update('openaiApiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 pr-9
                         text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50
                         transition-colors"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* Anthropic — Computer Use for precise cursor */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 flex items-center gap-1">
            Anthropic
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-medium">ТОЧНЫЙ КУРСОР</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={localSettings.anthropicApiKey}
              onChange={(e) => update('anthropicApiKey', e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 pr-9
                         text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50
                         transition-colors"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-600">
            Если указан — гид видит экран и летит точно в элемент, как Clicky.
          </p>
        </div>

        <p className="text-[10px] text-slate-600">Ключи хранятся локально, никуда не отправляются.</p>
      </div>

      {/* Model selection */}
      <div className="glass-card p-3 space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Cpu size={13} className="text-purple-400" />
          <span className="text-xs font-medium text-slate-300">Models</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500">Chat Model</label>
          <select
            id="model-select"
            value={localSettings.model}
            onChange={(e) => update('model', e.target.value)}
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2
                       text-xs text-white focus:outline-none focus:border-brand-500/50 transition-colors"
          >
            {SUPPORTED_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-500">Embedding Model</label>
          <select
            id="embedding-model-select"
            value={localSettings.embeddingModel}
            onChange={(e) => update('embeddingModel', e.target.value)}
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2
                       text-xs text-white focus:outline-none focus:border-brand-500/50 transition-colors"
          >
            {SUPPORTED_EMBEDDING_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Endpoint */}
      <div className="glass-card p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Server size={13} className="text-amber-400" />
          <span className="text-xs font-medium text-slate-300">API Endpoint</span>
        </div>
        <input
          id="base-url-input"
          type="text"
          value={localSettings.baseUrl}
          onChange={(e) => update('baseUrl', e.target.value)}
          className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2
                     text-xs text-white focus:outline-none focus:border-brand-500/50 transition-colors"
        />
        <p className="text-[10px] text-slate-600">
          Use custom URL for Azure OpenAI or local Ollama.
        </p>
      </div>

      {/* Advanced */}
      <div className="glass-card p-3 space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Sliders size={13} className="text-emerald-400" />
          <span className="text-xs font-medium text-slate-300">Advanced</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500">Max Tokens</label>
            <input
              type="number"
              value={localSettings.maxTokens}
              onChange={(e) => update('maxTokens', parseInt(e.target.value))}
              min={256} max={4096} step={128}
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-2 py-1.5
                         text-xs text-white focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500">Temperature</label>
            <input
              type="number"
              value={localSettings.temperature}
              onChange={(e) => update('temperature', parseFloat(e.target.value))}
              min={0} max={1} step={0.1}
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-2 py-1.5
                         text-xs text-white focus:outline-none focus:border-brand-500/50"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-500">
            Analysis Debounce (ms) — how long to wait after page load
          </label>
          <input
            type="range"
            value={localSettings.debounceMs}
            onChange={(e) => update('debounceMs', parseInt(e.target.value))}
            min={1000} max={10000} step={500}
            className="w-full accent-brand-500"
          />
          <p className="text-[10px] text-slate-500 text-right">{localSettings.debounceMs}ms</p>
        </div>
      </div>

      {/* Save */}
      <button
        id="save-settings"
        onClick={handleSave}
        className={clsx(
          'btn-primary w-full flex items-center justify-center gap-2',
          saved && 'bg-emerald-600 hover:bg-emerald-500'
        )}
      >
        <Save size={14} />
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
