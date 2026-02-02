import {
    useShortcut,
    SHORTCUT_CONFIGS,
} from '../settings/shortcuts/hooks/use-shortcut';
import { AudioVisualizer } from './audio-visualizer/audio-visualizer';
import { History } from './history/history';
import { Page } from '@/components/page';
import { Typography } from '@/components/typography';
import { Statistics } from './statistics/statistics';
import { useTranslation } from '@/i18n';
import { Onboarding } from '../onboarding/onboarding';
import { RecordLabel } from '@/components/record-label';
import { ModelIndicator } from './model-indicator/model-indicator';

export const Home = () => {
    const { shortcut: recordShortcut } = useShortcut(SHORTCUT_CONFIGS.record);

    const { t } = useTranslation();
    return (
        <main className="space-y-4 relative">
            <Page.Header>
                <div className="flex items-center justify-between pb-4">
                    <Typography.MainTitle data-testid="home-title">
                        {t('Welcome aboard!')}
                    </Typography.MainTitle>
                    <ModelIndicator />
                </div>
                <Statistics className="absolute -top-4 -right-4" />
                <Onboarding recordShortcut={recordShortcut} />
            </Page.Header>

            <div className="space-y-4">
                <div className="space-y-2 flex flex-col items-center">
                    <Typography.Title>{t('Live input')}</Typography.Title>
                    <div className="rounded-md border border-zinc-700 p-2 space-y-4 relative">
                        <AudioVisualizer bars={34} rows={21} />
                        <RecordLabel />
                    </div>
                </div>

                <div className="flex justify-center">
                    <History />
                </div>
            </div>
        </main>
    );
};
