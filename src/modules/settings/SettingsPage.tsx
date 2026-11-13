import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Input, Select, Toggle } from '../../components/ui';
import { useSetting } from '../../hooks/useSetting';
import { db, exportAllData } from '../../db/database';
import { validateBackupStructure } from '../../db/database';
import { toast } from '../../stores/useToastStore';
import { ChevronRight, Download, Upload, Shield, Smartphone, Trash2, Database } from 'lucide-react';
import type { DashboardWidgetConfig } from '../../db/schema';

const defaultDashboardConfig: DashboardWidgetConfig[] = [
  { widgetId: 'greeting', label: 'Greeting', visible: true, order: 0 },
  { widgetId: 'daily-summary', label: 'Daily Summary', visible: true, order: 1 },
  { widgetId: 'tasks', label: 'Tasks', visible: true, order: 2 },
  { widgetId: 'habits', label: 'Habit Progress', visible: true, order: 3 },
  { widgetId: 'quick-stats', label: 'Quick Stats', visible: true, order: 4 },
  { widgetId: 'goals', label: 'Goals', visible: true, order: 5 },
  { widgetId: 'reminders', label: 'Reminders', visible: true, order: 6 },
  { widgetId: 'quick-actions', label: 'Quick Actions', visible: true, order: 7 },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const [name, setName] = useSetting('name', '');
  const [currency, setCurrency] = useSetting('currency', 'INR');
  const [weightUnit, setWeightUnit] = useSetting<'kg' | 'lbs'>('weightUnit', 'kg');
  const [calorieTarget, setCalorieTarget] = useSetting('calorieTarget', 2200);
  const [proteinTarget, setProteinTarget] = useSetting('proteinTarget', 150);
  const [carbTarget, setCarbTarget] = useSetting('carbTarget', 220);
  const [fatTarget, setFatTarget] = useSetting('fatTarget', 70);
  const [waterTarget, setWaterTarget] = useSetting('waterTarget', 2500);
  const [dashboardConfig, setDashboardConfig] = useSetting<DashboardWidgetConfig[]>('dashboardConfig', defaultDashboardConfig);
  const [clearConfirmStep, setClearConfirmStep] = useState(0);
  const [clearInput, setClearInput] = useState('');
  const [storageInfo, setStorageInfo] = useState<{ used: string; total: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Load storage estimate on mount
  useEffect(() => {
    if ('storage' in navigator) {
      navigator.storage.estimate().then(est => {
        const used = ((est.usage ?? 0) / (1024 * 1024)).toFixed(1);
        const total = ((est.quota ?? 0) / (1024 * 1024)).toFixed(0);
        setStorageInfo({ used, total });
      });
    }
  }, []);

  const exportBackup = async () => {
    try {
      const data = await exportAllData();
      const payload = {
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        totalRecords: Object.values(data).reduce((s, arr) => s + (arr as any[]).length, 0),
        data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeOS_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded!');
    } catch { toast.error('Export failed'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { valid, error } = validateBackupStructure(parsed);
      if (!valid) { toast.error(`Invalid backup: ${error}`); return; }
      const totalRecords = parsed.totalRecords || 'unknown';
      if (!window.confirm(`Import ${totalRecords} records? This will REPLACE all current data.`)) return;
      if (!window.confirm('Are you absolutely sure? This cannot be undone.')) return;
      const { importAllData } = await import('../../db/database');
      await importAllData(parsed.data);
      toast.success('Backup restored successfully!');
    } catch { toast.error('Import failed — invalid file'); }
    setImportOpen(false);
  };

  const toggleWidget = (widgetId: string) => {
    const config = (dashboardConfig ?? defaultDashboardConfig).map(w =>
      w.widgetId === widgetId ? { ...w, visible: !w.visible } : w
    );
    setDashboardConfig(config);
  };

  const moveWidget = (widgetId: string, dir: 'up' | 'down') => {
    const config = [...(dashboardConfig ?? defaultDashboardConfig)].sort((a, b) => a.order - b.order);
    const idx = config.findIndex(w => w.widgetId === widgetId);
    if (dir === 'up' && idx > 0) [config[idx - 1], config[idx]] = [config[idx], config[idx - 1]];
    else if (dir === 'down' && idx < config.length - 1) [config[idx], config[idx + 1]] = [config[idx + 1], config[idx]];
    const reordered = config.map((w, i) => ({ ...w, order: i }));
    setDashboardConfig(reordered);
  };

  const clearAllData = async () => {
    if (clearInput !== 'DELETE MY DATA') { toast.error('Type DELETE MY DATA exactly'); return; }
    try {
      await db.delete();
      // Re-open the fresh database and immediately write the skip-seed flag
      // so neither Safari NOR the installed PWA re-seeds on the next open.
      await db.open();
      const now = new Date().toISOString();
      await db.settings.add({ key: 'skipSeed', value: JSON.stringify(true), updatedAt: now });
      // Keep localStorage flag as well for older iOS versions
      localStorage.setItem('lifeOS_userCleared', 'true');
      toast.success('All data cleared');
      window.location.reload();
    } catch {
      toast.error('Could not clear data — please try again');
    }
  };

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Settings" />
      <div className="px-4 pb-4 flex flex-col gap-4">

        {/* Profile */}
        <SettingSection title="Profile">
          <Input label="Your Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" helper="Shown in the dashboard greeting" />
        </SettingSection>

        {/* Preferences */}
        <SettingSection title="Preferences">
          <Select label="Currency" value={currency} onChange={e => setCurrency(e.target.value)} options={[
            { value: 'INR', label: '₹ Indian Rupee' }, { value: 'USD', label: '$ US Dollar' },
            { value: 'EUR', label: '€ Euro' }, { value: 'GBP', label: '£ British Pound' },
            { value: 'AED', label: 'AED Dirham' }, { value: 'SGD', label: 'SGD Singapore Dollar' },
          ]} />
          <Select label="Weight Unit" value={weightUnit} onChange={e => setWeightUnit(e.target.value as 'kg' | 'lbs')} options={[{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'lbs', label: 'Pounds (lbs)' }]} />
        </SettingSection>

        {/* Fitness Targets */}
        <SettingSection title="Fitness Targets">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Calories (kcal)" type="number" value={String(calorieTarget)} onChange={e => setCalorieTarget(Number(e.target.value))} />
            <Input label="Protein (g)" type="number" value={String(proteinTarget)} onChange={e => setProteinTarget(Number(e.target.value))} />
            <Input label="Carbs (g)" type="number" value={String(carbTarget)} onChange={e => setCarbTarget(Number(e.target.value))} />
            <Input label="Fat (g)" type="number" value={String(fatTarget)} onChange={e => setFatTarget(Number(e.target.value))} />
            <Input label="Water (ml)" type="number" value={String(waterTarget)} onChange={e => setWaterTarget(Number(e.target.value))} />
          </div>
        </SettingSection>

        {/* Dashboard customization */}
        <SettingSection title="Dashboard Widgets">
          <div className="flex flex-col gap-2">
            {(dashboardConfig ?? defaultDashboardConfig).sort((a, b) => a.order - b.order).map((widget, idx, arr) => (
              <div key={widget.widgetId} className="flex items-center gap-3 glass-1 rounded-input px-3 py-2.5">
                <span className="text-sm text-content-primary flex-1">{widget.label}</span>
                <div className="flex gap-1">
                  <button onClick={() => moveWidget(widget.widgetId, 'up')} disabled={idx === 0} className="p-1 glass-1 rounded text-content-muted disabled:opacity-30">▲</button>
                  <button onClick={() => moveWidget(widget.widgetId, 'down')} disabled={idx === arr.length - 1} className="p-1 glass-1 rounded text-content-muted disabled:opacity-30">▼</button>
                </div>
                <Toggle checked={widget.visible} onChange={() => toggleWidget(widget.widgetId)} size="sm" />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setDashboardConfig(defaultDashboardConfig)}>Reset to defaults</Button>
          </div>
        </SettingSection>

        {/* Data & Backup */}
        <SettingSection title="Data & Backup">
          {storageInfo && (
            <div className="glass-1 rounded-input p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-content-muted flex items-center gap-1.5"><Database size={12} />Storage used</span>
                <span className="text-xs font-medium text-content-secondary">{storageInfo.used} MB / ~{storageInfo.total} MB</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full accent-gradient" style={{ width: `${Math.min(parseFloat(storageInfo.used) / parseFloat(storageInfo.total) * 100, 100)}%` }} />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="secondary" leftIcon={<Download size={14} />} onClick={exportBackup} fullWidth>Export Full Backup (JSON)</Button>
            <Button variant="secondary" leftIcon={<Upload size={14} />} onClick={() => setImportOpen(true)} fullWidth>Import Backup</Button>
          </div>
          <p className="text-xs text-warning/80 mt-3 leading-relaxed">
            ⚠ Your data is stored locally on this device. Clearing Safari site data will permanently delete it. Export a backup regularly.
          </p>
          {importOpen && (
            <div className="mt-3">
              <input type="file" accept=".json" onChange={handleImport} className="text-sm text-content-secondary" />
            </div>
          )}
        </SettingSection>

        {/* Privacy & Install */}
        <SettingSection title="More">
          <div className="flex flex-col gap-1">
            <SettingLink icon={<Shield size={16} />} label="Privacy Information" onClick={() => navigate('/settings/privacy')} />
            <SettingLink icon={<Smartphone size={16} />} label="Install on iPhone" onClick={() => navigate('/settings/install')} />
          </div>
        </SettingSection>

        {/* Danger zone */}
        <GlassCard className="border-danger/20">
          <p className="text-xs font-semibold text-danger uppercase tracking-wide mb-3">Danger Zone</p>
          {clearConfirmStep === 0 && (
            <Button variant="danger" onClick={() => setClearConfirmStep(1)} fullWidth leftIcon={<Trash2 size={14} />}>
              Clear All Data
            </Button>
          )}
          {clearConfirmStep === 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-danger">Type <strong>DELETE MY DATA</strong> to confirm:</p>
              <Input value={clearInput} onChange={e => setClearInput(e.target.value)} placeholder="DELETE MY DATA" />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setClearConfirmStep(0); setClearInput(''); }} fullWidth>Cancel</Button>
                <Button variant="danger" onClick={clearAllData} fullWidth disabled={clearInput !== 'DELETE MY DATA'}>Confirm Delete</Button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard>
      <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">{title}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </GlassCard>
  );
}

function SettingLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-2 py-3 hover:glass-1 rounded-input transition-all group">
      <span className="text-content-muted group-hover:text-accent transition-colors">{icon}</span>
      <span className="flex-1 text-sm text-content-secondary text-left">{label}</span>
      <ChevronRight size={14} className="text-content-muted" />
    </button>
  );
}
