import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Typography } from '@/components/typography';
import { useTranslation } from '@/i18n';
import appIcon from '@/assets/app-icon.png';

interface SetupCompleteProps {
    onComplete: () => void;
}

export const SetupComplete = ({ onComplete }: SetupCompleteProps) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="flex flex-col items-center space-y-8 max-w-md w-full">
                <img
                    src={appIcon}
                    alt="Murmure"
                    className="w-20 h-20 rounded-2xl"
                />

                <div className="flex items-center justify-center p-4 rounded-full bg-green-500/20">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                </div>

                <div className="text-center space-y-2">
                    <Typography.MainTitle className="text-xl">
                        {t('Download complete')}
                    </Typography.MainTitle>
                    <Typography.Paragraph>
                        {t(
                            'Parakeet V3 is ready to use. You can now transcribe speech offline.'
                        )}
                    </Typography.Paragraph>
                </div>

                <Button
                    onClick={onComplete}
                    className="w-full bg-gradient-to-r from-sky-800 via-sky-700 to-sky-800 hover:from-sky-500 hover:via-sky-500 hover:to-sky-500"
                    size="lg"
                >
                    {t('Start using Murmure')}
                </Button>
            </div>
        </div>
    );
};
