import { useTranslation } from '@/i18n';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { LLMProvider, PROVIDER_LABELS } from '../hooks/use-llm-connect';

interface ProviderSelectorProps {
    value: LLMProvider;
    onChange: (provider: LLMProvider) => void;
    disabled?: boolean;
}

const PROVIDERS: LLMProvider[] = [
    'ollama',
    'openai',
    'anthropic',
    'google',
    'openrouter',
];

export const ProviderSelector = ({
    value,
    onChange,
    disabled = false,
}: ProviderSelectorProps) => {
    const { t } = useTranslation();

    return (
        <Select
            value={value}
            onValueChange={(val) => onChange(val as LLMProvider)}
            disabled={disabled}
        >
            <SelectTrigger
                className="w-[200px]"
                data-testid="provider-selector"
            >
                <SelectValue placeholder={t('Select provider')} />
            </SelectTrigger>
            <SelectContent>
                {PROVIDERS.map((provider) => (
                    <SelectItem
                        key={provider}
                        value={provider}
                        data-testid={`provider-option-${provider}`}
                    >
                        {PROVIDER_LABELS[provider]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
