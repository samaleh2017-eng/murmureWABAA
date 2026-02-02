import { useState } from 'react';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Page } from '@/components/page';
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
import { useContextMappingSettings } from './hooks/use-context-mapping-settings';
import { PatternType, ContextRule } from './context-detection.types';
import { Trash2, Plus, Scan, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PATTERN_TYPES: { value: PatternType; label: string }[] = [
    { value: 'app_name', label: 'App Name' },
    { value: 'process_name', label: 'Process Name' },
    { value: 'url', label: 'URL' },
    { value: 'window_title', label: 'Window Title' },
];

const LLM_MODES = [
    { key: 'general', name: 'General' },
    { key: 'medical', name: 'Medical' },
    { key: 'typescript', name: 'Typescript' },
    { key: 'developer', name: 'Developer' },
    { key: 'email', name: 'Email' },
    { key: 'chat', name: 'Chat' },
    { key: 'translation', name: 'Translation' },
];

interface RuleFormData {
    name: string;
    pattern: string;
    patternType: PatternType;
    targetModeKey: string;
    priority: number;
}

const defaultFormData: RuleFormData = {
    name: '',
    pattern: '',
    patternType: 'process_name',
    targetModeKey: 'general',
    priority: 50,
};

export const ContextDetection = () => {
    const { t } = useTranslation();
    const {
        settings,
        loading,
        saving,
        setAutoDetectionEnabled,
        setDefaultModeKey,
        addRule,
        deleteRule,
        toggleRuleEnabled,
    } = useContextMappingSettings();

    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState<RuleFormData>(defaultFormData);

    const handleAddRule = async () => {
        if (
            formData.name.trim().length === 0 ||
            formData.pattern.trim().length === 0
        ) {
            toast.error(t('Please fill in all required fields'));
            return;
        }

        try {
            await addRule({
                name: formData.name.trim(),
                pattern: formData.pattern.trim(),
                patternType: formData.patternType,
                targetModeKey: formData.targetModeKey,
                priority: formData.priority,
                enabled: true,
            });
            setFormData(defaultFormData);
            setShowAddForm(false);
            toast.success(t('Rule added successfully'));
        } catch {
            toast.error(t('Failed to add rule'));
        }
    };

    const handleDeleteRule = async (rule: ContextRule) => {
        try {
            await deleteRule(rule.id);
            toast.success(t('Rule deleted'));
        } catch {
            toast.error(t('Failed to delete rule'));
        }
    };

    if (loading) {
        return (
            <main>
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
            </main>
        );
    }

    if (settings == null) {
        return (
            <main>
                <div className="flex justify-center items-center h-64">
                    <Typography.Paragraph>
                        {t('Failed to load settings')}
                    </Typography.Paragraph>
                </div>
            </main>
        );
    }

    return (
        <main>
            <div className="space-y-8">
                <Page.Header>
                    <Typography.MainTitle data-testid="context-detection-title">
                        {t('Context Detection')}
                    </Typography.MainTitle>
                    <Typography.Paragraph className="text-zinc-400">
                        {t(
                            'Automatically switch LLM modes based on the active application or website.'
                        )}
                    </Typography.Paragraph>
                </Page.Header>

                <div className="flex justify-center mb-8">
                    <SettingsUI.Container>
                        <SettingsUI.Item>
                            <SettingsUI.Description>
                                <Typography.Title className="flex items-center gap-2">
                                    <Scan className="w-4 h-4 text-zinc-400" />
                                    {t('Auto Detection')}
                                </Typography.Title>
                                <Typography.Paragraph>
                                    {t(
                                        'Enable automatic mode switching based on context rules.'
                                    )}
                                </Typography.Paragraph>
                            </SettingsUI.Description>
                            <Switch
                                checked={settings.autoDetectionEnabled}
                                onCheckedChange={setAutoDetectionEnabled}
                                disabled={saving}
                                data-testid="auto-detection-toggle"
                            />
                        </SettingsUI.Item>

                        <SettingsUI.Separator />

                        <SettingsUI.Item>
                            <SettingsUI.Description>
                                <Typography.Title>
                                    {t('Default Mode')}
                                </Typography.Title>
                                <Typography.Paragraph>
                                    {t(
                                        'Mode to use when no rules match the current context.'
                                    )}
                                </Typography.Paragraph>
                            </SettingsUI.Description>
                            <Select
                                value={settings.defaultModeKey}
                                onValueChange={(value) =>
                                    setDefaultModeKey(value)
                                }
                                disabled={saving}
                            >
                                <SelectTrigger
                                    className="w-40"
                                    data-testid="default-mode-select"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LLM_MODES.map((mode) => (
                                        <SelectItem
                                            key={mode.key}
                                            value={mode.key}
                                        >
                                            {t(mode.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </SettingsUI.Item>
                    </SettingsUI.Container>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Typography.Title>
                            {t('Context Rules')}
                        </Typography.Title>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddForm(!showAddForm)}
                            data-testid="add-rule-button"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            {t('Add Rule')}
                        </Button>
                    </div>

                    {showAddForm && (
                        <div className="border border-zinc-700 rounded-md p-4 space-y-4">
                            <Typography.Title className="text-sm">
                                {t('New Rule')}
                            </Typography.Title>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400">
                                        {t('Rule Name')}
                                    </label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                name: e.target.value,
                                            })
                                        }
                                        placeholder={t(
                                            'e.g., VS Code → Developer'
                                        )}
                                        data-testid="rule-name-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400">
                                        {t('Pattern')}
                                    </label>
                                    <Input
                                        value={formData.pattern}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                pattern: e.target.value,
                                            })
                                        }
                                        placeholder={t('e.g., code')}
                                        data-testid="rule-pattern-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400">
                                        {t('Pattern Type')}
                                    </label>
                                    <Select
                                        value={formData.patternType}
                                        onValueChange={(value: PatternType) =>
                                            setFormData({
                                                ...formData,
                                                patternType: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger data-testid="pattern-type-select">
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
                                        {t('Target Mode')}
                                    </label>
                                    <Select
                                        value={formData.targetModeKey}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                targetModeKey: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger data-testid="target-mode-select">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LLM_MODES.map((mode) => (
                                                <SelectItem
                                                    key={mode.key}
                                                    value={mode.key}
                                                >
                                                    {t(mode.name)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400">
                                        {t('Priority')}
                                    </label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={formData.priority}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                priority:
                                                    parseInt(
                                                        e.target.value,
                                                        10
                                                    ) || 50,
                                            })
                                        }
                                        data-testid="rule-priority-input"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFormData(defaultFormData);
                                        setShowAddForm(false);
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleAddRule}
                                    disabled={saving}
                                    data-testid="save-rule-button"
                                >
                                    {saving && (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    )}
                                    {t('Save Rule')}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {settings.rules.length === 0 ? (
                            <div className="border border-zinc-700 rounded-md p-8 text-center">
                                <Typography.Paragraph>
                                    {t(
                                        'No rules configured. Add a rule to get started.'
                                    )}
                                </Typography.Paragraph>
                            </div>
                        ) : (
                            settings.rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="border border-zinc-700 rounded-md p-4 flex items-center justify-between"
                                    data-testid={`rule-item-${rule.id}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={() =>
                                                toggleRuleEnabled(rule.id)
                                            }
                                            disabled={saving}
                                            data-testid={`rule-toggle-${rule.id}`}
                                        />
                                        <div>
                                            <Typography.Title
                                                className={
                                                    rule.enabled
                                                        ? 'text-white'
                                                        : 'text-zinc-500'
                                                }
                                            >
                                                {rule.name}
                                            </Typography.Title>
                                            <Typography.Paragraph className="text-xs">
                                                {t(
                                                    PATTERN_TYPES.find(
                                                        (pt) =>
                                                            pt.value ===
                                                            rule.patternType
                                                    )?.label || rule.patternType
                                                )}
                                                {': '}
                                                <code className="text-sky-400">
                                                    {rule.pattern}
                                                </code>
                                                {' → '}
                                                {t(
                                                    LLM_MODES.find(
                                                        (m) =>
                                                            m.key ===
                                                            rule.targetModeKey
                                                    )?.name || rule.targetModeKey
                                                )}
                                                {' ('}
                                                {t('Priority')}: {rule.priority}
                                                {')'}
                                            </Typography.Paragraph>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleDeleteRule(rule)}
                                        disabled={saving}
                                        data-testid={`delete-rule-${rule.id}`}
                                    >
                                        <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};
