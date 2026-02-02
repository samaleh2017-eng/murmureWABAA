import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Switch } from '@/components/switch';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { useTranslation } from '@/i18n';
import { useContextMappingSettings } from '@/features/settings/context-detection/hooks/use-context-mapping-settings';
import { PatternType, ContextRule } from '@/features/settings/context-detection/context-detection.types';
import { Trash2, Plus, Scan, Loader2, Pencil, Info } from 'lucide-react';
import { toast } from 'sonner';
import { LLMMode } from '../hooks/use-llm-connect';

const PATTERN_TYPES: { value: PatternType; label: string }[] = [
    { value: 'app_name', label: 'App Name' },
    { value: 'process_name', label: 'Process Name' },
    { value: 'url', label: 'URL' },
    { value: 'window_title', label: 'Window Title' },
];

interface RuleFormData {
    name: string;
    pattern: string;
    patternType: PatternType;
    targetModeKey: string;
    priority: number;
    enabled: boolean;
}

interface ActiveContext {
    app_name: string;
    process_name: string;
    url: string;
    window_title: string;
}

interface ContextRulesTabProps {
    modes: LLMMode[];
}

export const ContextRulesTab = ({ modes }: ContextRulesTabProps) => {
    const { t } = useTranslation();
    const {
        settings,
        loading,
        saving,
        setAutoDetectionEnabled,
        addRule,
        updateRule,
        deleteRule,
    } = useContextMappingSettings();

    const [isDetecting, setIsDetecting] = useState(false);
    const [detectedContext, setDetectedContext] = useState<ActiveContext | null>(null);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState<RuleFormData>({
        name: '',
        pattern: '',
        patternType: 'app_name',
        targetModeKey: modes[0]?.key || '',
        priority: 0,
        enabled: true,
    });

    const handleDetectContext = async () => {
        setIsDetecting(true);
        try {
            const context = await invoke<ActiveContext>('get_active_context');
            setDetectedContext(context);
            toast.success(t('Context detected successfully'));
        } catch {
            toast.error(t('Failed to detect context'));
        } finally {
            setIsDetecting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            pattern: '',
            patternType: 'app_name',
            targetModeKey: modes[0]?.key || '',
            priority: 0,
            enabled: true,
        });
        setShowAddForm(false);
        setEditingRuleId(null);
    };

    const handleAddRule = async () => {
        if (!formData.name.trim() || !formData.pattern.trim()) {
            toast.error(t('Please fill in all required fields'));
            return;
        }
        try {
            await addRule({
                name: formData.name,
                pattern: formData.pattern,
                patternType: formData.patternType,
                targetModeKey: formData.targetModeKey,
                priority: formData.priority,
                enabled: formData.enabled,
            });
            toast.success(t('Rule added successfully'));
            resetForm();
        } catch {
            toast.error(t('Failed to add rule'));
        }
    };

    const handleUpdateRule = async () => {
        if (!editingRuleId || !formData.name.trim() || !formData.pattern.trim()) {
            toast.error(t('Please fill in all required fields'));
            return;
        }
        try {
            await updateRule(editingRuleId, {
                name: formData.name,
                pattern: formData.pattern,
                patternType: formData.patternType,
                targetModeKey: formData.targetModeKey,
                priority: formData.priority,
                enabled: formData.enabled,
            });
            toast.success(t('Rule updated successfully'));
            resetForm();
        } catch {
            toast.error(t('Failed to update rule'));
        }
    };

    const handleEditRule = (rule: ContextRule) => {
        setFormData({
            name: rule.name,
            pattern: rule.pattern,
            patternType: rule.patternType,
            targetModeKey: rule.targetModeKey,
            priority: rule.priority,
            enabled: rule.enabled,
        });
        setEditingRuleId(rule.id);
        setShowAddForm(true);
    };

    const handleDeleteRule = async (rule: ContextRule) => {
        try {
            await deleteRule(rule.id);
            toast.success(t('Rule deleted successfully'));
        } catch {
            toast.error(t('Failed to delete rule'));
        }
    };

    const handleToggleAutoDetection = async (enabled: boolean) => {
        try {
            await setAutoDetectionEnabled(enabled);
            toast.success(
                enabled
                    ? t('Auto-detection enabled')
                    : t('Auto-detection disabled')
            );
        } catch {
            toast.error(t('Failed to update settings'));
        }
    };

    const getModeNameByKey = (key: string): string => {
        const mode = modes.find((m) => m.key === key);
        return mode?.name || key;
    };

    const applyDetectedValue = (type: PatternType) => {
        if (!detectedContext) return;
        let value = '';
        switch (type) {
            case 'app_name':
                value = detectedContext.app_name;
                break;
            case 'process_name':
                value = detectedContext.process_name;
                break;
            case 'url':
                value = detectedContext.url;
                break;
            case 'window_title':
                value = detectedContext.window_title;
                break;
        }
        if (value) {
            setFormData((prev) => ({ ...prev, pattern: value, patternType: type }));
        }
    };

    if (loading || !settings) {
        return (
            <div className="p-8 text-center text-zinc-500">
                <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-sky-950/30 border border-sky-800/50 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
                <div className="text-sm text-zinc-300">
                    <p className="font-medium text-sky-400 mb-1">{t('How it works')}</p>
                    <p>{t('Context Detection automatically switches LLM modes based on the active application. When you use Ctrl+Alt+Space, the system detects your current app and applies the matching mode\'s prompt.')}</p>
                </div>
            </div>

            <SettingsUI.Container>
                <SettingsUI.Item>
                    <SettingsUI.Description>
                        <Typography.Title>{t('Auto-detection')}</Typography.Title>
                        <Typography.Paragraph>
                            {t('Automatically switch LLM mode based on active application')}
                        </Typography.Paragraph>
                    </SettingsUI.Description>
                    <Switch
                        checked={settings.autoDetectionEnabled}
                        onCheckedChange={handleToggleAutoDetection}
                    />
                </SettingsUI.Item>
            </SettingsUI.Container>

            <SettingsUI.Container>
                <SettingsUI.Item className="flex-col! items-start gap-4">
                    <div className="flex w-full items-center justify-between">
                        <SettingsUI.Description>
                            <Typography.Title>{t('Detect Current Context')}</Typography.Title>
                            <Typography.Paragraph>
                                {t('Detect the current active window to help create rules')}
                            </Typography.Paragraph>
                        </SettingsUI.Description>
                        <Button
                            onClick={handleDetectContext}
                            disabled={isDetecting}
                            variant="secondary"
                            size="sm"
                        >
                            {isDetecting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Scan className="w-4 h-4 mr-2" />
                            )}
                            {t('Detect')}
                        </Button>
                    </div>

                    {detectedContext && (
                        <div className="w-full bg-zinc-800/50 rounded-lg p-4 space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-zinc-500">{t('App Name')}:</span>
                                    <button
                                        onClick={() => applyDetectedValue('app_name')}
                                        className="ml-2 text-zinc-200 hover:text-sky-400 transition-colors"
                                    >
                                        {detectedContext.app_name || '-'}
                                    </button>
                                </div>
                                <div>
                                    <span className="text-zinc-500">{t('Process')}:</span>
                                    <button
                                        onClick={() => applyDetectedValue('process_name')}
                                        className="ml-2 text-zinc-200 hover:text-sky-400 transition-colors"
                                    >
                                        {detectedContext.process_name || '-'}
                                    </button>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-zinc-500">{t('URL')}:</span>
                                    <button
                                        onClick={() => applyDetectedValue('url')}
                                        className="ml-2 text-zinc-200 hover:text-sky-400 transition-colors truncate max-w-md"
                                    >
                                        {detectedContext.url || '-'}
                                    </button>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-zinc-500">{t('Window Title')}:</span>
                                    <button
                                        onClick={() => applyDetectedValue('window_title')}
                                        className="ml-2 text-zinc-200 hover:text-sky-400 transition-colors truncate max-w-md"
                                    >
                                        {detectedContext.window_title || '-'}
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                                {t('Click on a value to use it as a pattern')}
                            </p>
                        </div>
                    )}
                </SettingsUI.Item>
            </SettingsUI.Container>

            <SettingsUI.Container>
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <Typography.Title>{t('Context Rules')}</Typography.Title>
                    {!showAddForm && (
                        <Button
                            onClick={() => setShowAddForm(true)}
                            size="sm"
                            variant="secondary"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('Add Rule')}
                        </Button>
                    )}
                </div>

                {showAddForm && (
                    <div className="p-4 bg-zinc-800/30 border-b border-zinc-800 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">
                                    {t('Rule Name')}
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g., WhatsApp Messages')}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">
                                    {t('Target Mode')}
                                </label>
                                <Select
                                    value={formData.targetModeKey}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            targetModeKey: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {modes.map((mode) => (
                                            <SelectItem
                                                key={mode.key || mode.name}
                                                value={mode.key || mode.name}
                                            >
                                                {mode.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">
                                    {t('Pattern Type')}
                                </label>
                                <Select
                                    value={formData.patternType}
                                    onValueChange={(value: PatternType) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            patternType: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PATTERN_TYPES.map((type) => (
                                            <SelectItem
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {t(type.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">
                                    {t('Pattern')}
                                </label>
                                <Input
                                    value={formData.pattern}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            pattern: e.target.value,
                                        }))
                                    }
                                    placeholder={t('e.g., WhatsApp')}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={formData.enabled}
                                    onCheckedChange={(enabled) =>
                                        setFormData((prev) => ({ ...prev, enabled }))
                                    }
                                />
                                <span className="text-sm text-zinc-400">
                                    {t('Enabled')}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetForm}
                                    disabled={saving}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={
                                        editingRuleId
                                            ? handleUpdateRule
                                            : handleAddRule
                                    }
                                    disabled={saving}
                                >
                                    {saving && (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    )}
                                    {editingRuleId ? t('Update') : t('Add')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-zinc-800">
                    {settings.rules.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <Scan className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>{t('No rules configured')}</p>
                            <p className="text-sm mt-1">
                                {t('Add a rule to automatically switch modes')}
                            </p>
                        </div>
                    ) : (
                        settings.rules.map((rule) => (
                            <div
                                key={rule.id}
                                className="p-4 flex items-center justify-between hover:bg-zinc-800/30"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`w-2 h-2 rounded-full ${
                                                rule.enabled
                                                    ? 'bg-emerald-500'
                                                    : 'bg-zinc-600'
                                            }`}
                                        />
                                        <span className="font-medium text-zinc-200">
                                            {rule.name}
                                        </span>
                                    </div>
                                    <div className="text-sm text-zinc-500 mt-1">
                                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs mr-2">
                                            {t(
                                                PATTERN_TYPES.find(
                                                    (p) =>
                                                        p.value ===
                                                        rule.patternType
                                                )?.label || rule.patternType
                                            )}
                                        </span>
                                        <span className="text-zinc-400">
                                            {rule.pattern}
                                        </span>
                                        <span className="mx-2">→</span>
                                        <span className="text-sky-400">
                                            {getModeNameByKey(rule.targetModeKey)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleEditRule(rule)}
                                        disabled={saving}
                                    >
                                        <Pencil className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleDeleteRule(rule)}
                                        disabled={saving}
                                    >
                                        <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SettingsUI.Container>
        </div>
    );
};
