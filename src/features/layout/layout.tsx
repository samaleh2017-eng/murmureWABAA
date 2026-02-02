import { Outlet, useNavigate } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '../../components/sidebar';
import { AppSidebar } from './app-sidebar/app-sidebar';
import clsx from 'clsx';
import { Bounce, ToastContainer, toast } from 'react-toastify';
import { StatusBar } from '@/components/status-bar';
import { useModelDownload } from '@/features/model-setup/hooks/use-model-download';
import { useGetVersion } from './hooks/use-get-version';
import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from '@/i18n';

export const Layout = () => {
    const { progress, isModelAvailable, cancelDownload } = useModelDownload();
    const version = useGetVersion();
    const navigate = useNavigate();
    const hasRedirected = useRef(false);
    const { t } = useTranslation();

    useEffect(() => {
        const unlisten = listen<string>('transcription-error', (event) => {
            toast.error(t('Transcription failed') + ': ' + event.payload);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [t]);

    useEffect(() => {
        if (
            isModelAvailable === false &&
            !progress.is_downloading &&
            !progress.is_complete &&
            !hasRedirected.current
        ) {
            hasRedirected.current = true;
            navigate({ to: '/setup' });
        }
    }, [
        isModelAvailable,
        progress.is_downloading,
        progress.is_complete,
        navigate,
    ]);

    const getModelStatus = (): 'downloading' | 'ready' | 'not-installed' => {
        if (progress.is_downloading) {
            return 'downloading';
        }
        if (isModelAvailable === true || progress.is_complete) {
            return 'ready';
        }
        return 'not-installed';
    };

    return (
        <SidebarProvider defaultOpen={true} className="bg-zinc-900 dark">
            <AppSidebar />
            <SidebarInset
                className={clsx(
                    'bg-zinc-900',
                    'text-white',
                    'pr-8',
                    'pt-8',
                    'pb-12',
                    'flex',
                    'items-center',
                    'pl-[16rem]'
                )}
            >
                <div
                    className="max-w-[800px] w-full"
                    data-testid="murmure-content"
                >
                    <Outlet />
                </div>
            </SidebarInset>
            <StatusBar
                modelStatus={getModelStatus()}
                downloadProgress={progress}
                onCancelDownload={cancelDownload}
                version={version}
            />
            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                transition={Bounce}
            />
        </SidebarProvider>
    );
};
