import { Download, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/button';
import { Typography } from '@/components/typography';
import { useTranslation } from '@/i18n';
import appIcon from '@/assets/app-icon.png';
import { DownloadProgress } from '../hooks/use-model-download';

interface SetupModelInfoProps {
    onDownload: () => void;
    onRetry: () => void;
    progress: DownloadProgress;
}

const ProgressBar = ({ value, label }: { value: number; label: string }) => {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-sky-500 transition-all duration-300 rounded-full"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
};

export const SetupModelInfo = ({
    onDownload,
    onRetry,
    progress,
}: SetupModelInfoProps) => {
    const { t } = useTranslation();
    const hasError = progress.error !== null;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="flex flex-col items-center space-y-8 max-w-lg w-full">
                <img
                    src={appIcon}
                    alt="Murmure"
                    className="w-20 h-20 rounded-2xl"
                />

                <Typography.MainTitle className="text-center text-xl">
                    {t('Speech recognition model')}
                </Typography.MainTitle>

                <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6 space-y-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Typography.Title className="text-lg">
                                    Parakeet V3
                                </Typography.Title>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                    {t('Recommended')}
                                </span>
                            </div>
                            <Typography.Paragraph className="text-xs">
                                {t("NVIDIA's state-of-the-art model")}
                            </Typography.Paragraph>
                            <Typography.Paragraph className="text-xs">
                                {t('25 European languages')}
                            </Typography.Paragraph>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Download className="w-4 h-4" />
                            <span className="text-sm">350 MB</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <ProgressBar value={85} label={t('accuracy')} />
                        <ProgressBar value={95} label={t('speed')} />
                    </div>
                </div>

                {hasError ? (
                    <div className="w-full space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{progress.error}</span>
                        </div>
                        <Button
                            onClick={onRetry}
                            className="w-full bg-gradient-to-r from-sky-800 via-sky-700 to-sky-800 hover:from-sky-500 hover:via-sky-500 hover:to-sky-500"
                            size="lg"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('Retry download')}
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={onDownload}
                        disabled={progress.is_downloading}
                        className="w-full bg-gradient-to-r from-sky-800 via-sky-700 to-sky-800 hover:from-sky-500 hover:via-sky-500 hover:to-sky-500 disabled:opacity-50"
                        size="lg"
                    >
                        {progress.is_downloading
                            ? t('Downloading...')
                            : t('Download and install')}
                    </Button>
                )}

                <a
                    href="https://huggingface.co/nvidia/parakeet-tdt_ctc-0.6b-int8-onnx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-zinc-400 hover:text-sky-400 transition-colors text-sm"
                >
                    <ExternalLink className="w-4 h-4" />
                    {t('Learn more on HuggingFace')}
                </a>
            </div>
        </div>
    );
};
