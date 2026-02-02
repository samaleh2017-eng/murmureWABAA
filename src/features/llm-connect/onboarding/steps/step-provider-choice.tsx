import { useTranslation } from 'react-i18next';
import { Typography } from '@/components/typography';
import { motion } from 'framer-motion';
import { Server, Cloud, Zap, Shield, DollarSign, Cpu } from 'lucide-react';
import clsx from 'clsx';

export type ProviderType = 'local' | 'cloud';

interface StepProviderChoiceProps {
    onSelect: (type: ProviderType) => void;
}

export const StepProviderChoice = ({ onSelect }: StepProviderChoiceProps) => {
    const { t } = useTranslation();

    const options = [
        {
            type: 'local' as ProviderType,
            icon: Server,
            title: t('Local (Ollama)'),
            subtitle: t('Free & Private'),
            description: t('Run AI models on your computer. No API key needed.'),
            features: [
                { icon: Shield, text: t('100% private - data stays local') },
                { icon: DollarSign, text: t('Free forever') },
                { icon: Cpu, text: t('Requires Ollama installation') },
            ],
            color: 'emerald',
            recommended: false,
        },
        {
            type: 'cloud' as ProviderType,
            icon: Cloud,
            title: t('Cloud Providers'),
            subtitle: t('OpenAI, Google, Anthropic...'),
            description: t('Use powerful cloud APIs. Requires an API key.'),
            features: [
                { icon: Zap, text: t('Fastest response times') },
                { icon: Cloud, text: t('No installation required') },
                { icon: DollarSign, text: t('Pay per use (API costs)') },
            ],
            color: 'sky',
            recommended: true,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center max-w-3xl mx-auto space-y-8 py-8"
        >
            <div className="text-center space-y-4">
                <Typography.MainTitle className="text-3xl">
                    {t('Choose your LLM provider')}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-lg text-zinc-400">
                    {t('Select how you want to process your transcriptions')}
                </Typography.Paragraph>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {options.map((option, index) => (
                    <motion.button
                        key={option.type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * (index + 1) }}
                        onClick={() => onSelect(option.type)}
                        className={clsx(
                            'relative flex flex-col p-6 rounded-xl border-2 transition-all text-left group',
                            'hover:scale-[1.02] hover:shadow-lg',
                            option.color === 'emerald'
                                ? 'border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-950/20'
                                : 'border-zinc-700 hover:border-sky-500/50 hover:bg-sky-950/20'
                        )}
                    >
                        {option.recommended && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-sky-500 text-white text-xs font-semibold rounded-full">
                                {t('Recommended')}
                            </div>
                        )}

                        <div className="flex items-start gap-4 mb-4">
                            <div
                                className={clsx(
                                    'p-3 rounded-lg',
                                    option.color === 'emerald'
                                        ? 'bg-emerald-950 text-emerald-400'
                                        : 'bg-sky-950 text-sky-400'
                                )}
                            >
                                <option.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-zinc-100">
                                    {option.title}
                                </h3>
                                <p
                                    className={clsx(
                                        'text-sm',
                                        option.color === 'emerald'
                                            ? 'text-emerald-400'
                                            : 'text-sky-400'
                                    )}
                                >
                                    {option.subtitle}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-zinc-400 mb-4">
                            {option.description}
                        </p>

                        <div className="space-y-2 mt-auto">
                            {option.features.map((feature, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 text-sm text-zinc-300"
                                >
                                    <feature.icon className="w-4 h-4 text-zinc-500" />
                                    {feature.text}
                                </div>
                            ))}
                        </div>

                        <div
                            className={clsx(
                                'mt-6 py-2 px-4 rounded-lg text-center text-sm font-medium transition-colors',
                                option.color === 'emerald'
                                    ? 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20'
                                    : 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20'
                            )}
                        >
                            {t('Select')} →
                        </div>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};
