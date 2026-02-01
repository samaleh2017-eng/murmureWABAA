import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import {
    STTProvider,
    STT_PROVIDER_LABELS,
    ONLINE_PROVIDERS,
} from '../hooks/use-stt-settings';

interface STTProviderSelectorProps {
    value: STTProvider;
    onChange: (provider: STTProvider) => void;
    disabled?: boolean;
}

export const STTProviderSelector = ({
    value,
    onChange,
    disabled = false,
}: STTProviderSelectorProps) => {
    const { t } = useTranslation();

    return (
        <Select
            value={value}
            onValueChange={(val) => onChange(val as STTProvider)}
            disabled={disabled}
        >
            <SelectTrigger className="w-full" data-testid="stt-provider-selector">
                <SelectValue placeholder={t('Select provider')} />
            </SelectTrigger>
            <SelectContent>
                {ONLINE_PROVIDERS.map((provider) => (
                    <SelectItem
                        key={provider}
                        value={provider}
                        data-testid={`stt-provider-option-${provider}`}
                    >
                        <div className="flex items-center gap-2">
                            {provider === 'gemini' && <Sparkles className="w-4 h-4 text-purple-400" />}
                            {STT_PROVIDER_LABELS[provider]}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
