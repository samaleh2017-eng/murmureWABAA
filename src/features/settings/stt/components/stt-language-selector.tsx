import { useTranslation } from '@/i18n';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { SUPPORTED_LANGUAGES } from '../hooks/use-stt-settings';

interface STTLanguageSelectorProps {
    value: string;
    onChange: (language: string) => void;
    disabled?: boolean;
}

export const STTLanguageSelector = ({
    value,
    onChange,
    disabled = false,
}: STTLanguageSelectorProps) => {
    const { t } = useTranslation();

    return (
        <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled}
        >
            <SelectTrigger className="w-full" data-testid="stt-language-selector">
                <SelectValue placeholder={t('Select language')} />
            </SelectTrigger>
            <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem
                        key={lang.code}
                        value={lang.code}
                        data-testid={`stt-language-option-${lang.code}`}
                    >
                        {lang.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
