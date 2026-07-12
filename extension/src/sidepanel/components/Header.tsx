import { Brain, Settings, Power } from 'lucide-react';
import { useExtensionStore } from '../store/extensionStore';
import { saveSettings } from '../../shared/utils/storage';
import clsx from 'clsx';

export default function Header() {
  const { settings, setSettings, setIsSettingsOpen, isSettingsOpen, isLoading } =
    useExtensionStore();

  const toggleEnabled = async () => {
    const newVal = !settings.enabled;
    setSettings({ enabled: newVal });
    await saveSettings({ enabled: newVal });
    await chrome.runtime.sendMessage({
      type: 'SETTINGS_SET',
      payload: { enabled: newVal },
    });
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface-2">
      {/* Logo + Title */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Brain size={16} className="text-white" />
          </div>
          {isLoading && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-400 rounded-full animate-pulse" />
          )}
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white leading-none">
            AI Copilot
          </h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Onboarding Assistant</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Power toggle */}
        <button
          id="toggle-enabled"
          onClick={toggleEnabled}
          title={settings.enabled ? 'Disable extension' : 'Enable extension'}
          className={clsx(
            'p-1.5 rounded-lg transition-all duration-200',
            settings.enabled
              ? 'text-emerald-400 hover:bg-emerald-400/10'
              : 'text-slate-600 hover:bg-white/10'
          )}
        >
          <Power size={15} />
        </button>

        {/* Settings */}
        <button
          id="open-settings"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="Settings"
          className={clsx(
            'p-1.5 rounded-lg transition-all duration-200',
            isSettingsOpen
              ? 'text-brand-400 bg-brand-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          )}
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
}
