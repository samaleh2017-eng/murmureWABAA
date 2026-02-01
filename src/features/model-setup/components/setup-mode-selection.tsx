import { Monitor, Lock, Zap, Download, Info } from 'lucide-react';
import { Button } from '@/components/button';
import { Typography } from '@/components/typography';
import { useTranslation } from '@/i18n';
import appIcon from '@/assets/app-icon.png';

interface SetupModeSelectionProps {
    onContinue: () => void;
}

export const SetupModeSelection = ({ onContinue }: SetupModeSelectionProps) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="flex flex-col items-center space-y-8 max-w-md w-full">
                <img
                    src={appIcon}
                    alt="Murmure"
                    className="w-20 h-20 rounded-2xl"
                />

                <Typography.MainTitle className="text-center text-xl">
                    {t('How would you like to transcribe?')}
                </Typography.MainTitle>

                <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-6">
                    <div className="flex items-center justify-center">
                        <div className="p-4 rounded-xl bg-zinc-700/50">
                            <Monitor className="w-10 h-10 text-sky-400" />
                        </div>
                    </div>

                    <div className="text-center">
                        <Typography.Title className="text-lg mb-2">
                            {t('Offline')}
                        </Typography.Title>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Lock className="w-4 h-4 text-green-400" />
                            <span className="text-sm">
                                {t('100% private')}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm">
                                {t('Free forever')}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Download className="w-4 h-4 text-sky-400" />
                            <span className="text-sm">
                                {t('~350MB download')}
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={onContinue}
                        className="w-full bg-gradient-to-r from-sky-800 via-sky-700 to-sky-800 hover:from-sky-500 hover:via-sky-500 hover:to-sky-500"
                        size="lg"
                    >
                        {t('Continue')}
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <Info className="w-4 h-4" />
                    <span>
                        {t('Internet connection required for initial download')}
                    </span>
                </div>
            </div>
        </div>
    );
};
