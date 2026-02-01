import { X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { DownloadProgress } from '@/features/model-setup/hooks/use-model-download';
import clsx from 'clsx';

interface StatusBarProps {
    modelStatus: 'downloading' | 'ready' | 'not-installed';
    downloadProgress?: DownloadProgress;
    onCancelDownload?: () => void;
    version: string;
}

export const StatusBar = ({
    modelStatus,
    downloadProgress,
    onCancelDownload,
    version,
}: StatusBarProps) => {
    const { t } = useTranslation();

    const renderStatusIndicator = () => {
        switch (modelStatus) {
            case 'downloading':
                return (
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                );
            case 'ready':
                return <span className="w-2 h-2 rounded-full bg-green-400" />;
            case 'not-installed':
                return <span className="w-2 h-2 rounded-full bg-zinc-500" />;
            default:
                return null;
        }
    };

    const renderContent = () => {
        if (
            modelStatus === 'downloading' &&
            downloadProgress != null &&
            downloadProgress.is_downloading
        ) {
            const percent = Math.round(downloadProgress.percent);
            const speed = downloadProgress.speed_mb_s.toFixed(1);

            return (
                <div className="flex items-center gap-3 flex-1">
                    {renderStatusIndicator()}
                    <span className="text-xs text-zinc-300">
                        {t('Downloading')} {percent}%
                    </span>
                    <div className="w-24 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-sky-500 transition-all duration-300"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <span className="text-xs text-zinc-500">{speed}MB/s</span>
                    {onCancelDownload != null && (
                        <button
                            onClick={onCancelDownload}
                            className="p-1 hover:bg-zinc-700 rounded transition-colors"
                            aria-label={t('Cancel download')}
                        >
                            <X className="w-3 h-3 text-zinc-400" />
                        </button>
                    )}
                </div>
            );
        }

        if (modelStatus === 'ready') {
            return (
                <div className="flex items-center gap-2">
                    {renderStatusIndicator()}
                    <span className="text-xs text-zinc-300">Parakeet V3 ✓</span>
                </div>
            );
        }

        if (modelStatus === 'not-installed') {
            return (
                <div className="flex items-center gap-2">
                    {renderStatusIndicator()}
                    <span className="text-xs text-zinc-400">
                        {t('Model not installed')}
                    </span>
                </div>
            );
        }

        return null;
    };

    return (
        <div
            className={clsx(
                'fixed bottom-0 left-0 right-0 h-8',
                'bg-zinc-800/80 backdrop-blur-sm border-t border-zinc-700',
                'flex items-center justify-between px-4',
                'z-50'
            )}
        >
            <div className="flex items-center gap-4 flex-1">
                {renderContent()}
            </div>
            <span className="text-xs text-zinc-500">v{version}</span>
        </div>
    );
};
