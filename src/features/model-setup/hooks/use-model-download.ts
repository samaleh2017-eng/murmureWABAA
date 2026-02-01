import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface DownloadProgress {
    percent: number;
    downloaded_mb: number;
    total_mb: number;
    speed_mb_s: number;
    is_downloading: boolean;
    is_complete: boolean;
    error: string | null;
}

interface UseModelDownloadReturn {
    progress: DownloadProgress;
    isModelAvailable: boolean | null;
    startDownload: () => Promise<void>;
    cancelDownload: () => Promise<void>;
    checkModelAvailability: () => Promise<void>;
}

const defaultProgress: DownloadProgress = {
    percent: 0,
    downloaded_mb: 0,
    total_mb: 350,
    speed_mb_s: 0,
    is_downloading: false,
    is_complete: false,
    error: null,
};

let globalProgress: DownloadProgress = { ...defaultProgress };
let globalIsModelAvailable: boolean | null = null;
const listeners: Set<() => void> = new Set();

const notifyListeners = () => {
    listeners.forEach((listener) => listener());
};

export const useModelDownload = (): UseModelDownloadReturn => {
    const [progress, setProgress] = useState<DownloadProgress>(globalProgress);
    const [isModelAvailable, setIsModelAvailable] = useState<boolean | null>(
        globalIsModelAvailable
    );

    useEffect(() => {
        const updateState = () => {
            setProgress({ ...globalProgress });
            setIsModelAvailable(globalIsModelAvailable);
        };

        listeners.add(updateState);

        return () => {
            listeners.delete(updateState);
        };
    }, []);

    useEffect(() => {
        const checkModel = async () => {
            if (globalIsModelAvailable === null) {
                try {
                    const available =
                        await invoke<boolean>('is_model_available');
                    globalIsModelAvailable = available;
                    if (available) {
                        globalProgress = {
                            ...globalProgress,
                            is_complete: true,
                        };
                    }
                    notifyListeners();
                } catch (error) {
                    console.error('Failed to check model availability:', error);
                    globalIsModelAvailable = false;
                    notifyListeners();
                }
            }
        };

        checkModel();
    }, []);

    useEffect(() => {
        const unlisteners: Promise<UnlistenFn>[] = [];

        unlisteners.push(
            listen<DownloadProgress>('download-progress', (event) => {
                globalProgress = event.payload;
                notifyListeners();
            })
        );

        unlisteners.push(
            listen('download-complete', () => {
                globalProgress = {
                    ...globalProgress,
                    percent: 100,
                    is_downloading: false,
                    is_complete: true,
                    error: null,
                };
                globalIsModelAvailable = true;
                notifyListeners();
            })
        );

        unlisteners.push(
            listen<string>('download-error', (event) => {
                globalProgress = {
                    ...globalProgress,
                    is_downloading: false,
                    error: event.payload,
                };
                notifyListeners();
            })
        );

        unlisteners.push(
            listen('download-cancelled', () => {
                globalProgress = { ...defaultProgress };
                notifyListeners();
            })
        );

        return () => {
            unlisteners.forEach((unlisten) => {
                unlisten.then((fn) => fn());
            });
        };
    }, []);

    const startDownload = useCallback(async () => {
        try {
            globalProgress = {
                ...globalProgress,
                is_downloading: true,
                error: null,
            };
            notifyListeners();
            await invoke('start_model_download');
        } catch (error) {
            console.error('Failed to start download:', error);
            globalProgress = {
                ...globalProgress,
                is_downloading: false,
                error: String(error),
            };
            notifyListeners();
        }
    }, []);

    const cancelDownload = useCallback(async () => {
        try {
            await invoke('cancel_model_download');
        } catch (error) {
            console.error('Failed to cancel download:', error);
        }
    }, []);

    const checkModelAvailability = useCallback(async () => {
        try {
            const available = await invoke<boolean>('is_model_available');
            globalIsModelAvailable = available;
            if (available) {
                globalProgress = { ...globalProgress, is_complete: true };
            }
            notifyListeners();
        } catch (error) {
            console.error('Failed to check model availability:', error);
        }
    }, []);

    return {
        progress,
        isModelAvailable,
        startDownload,
        cancelDownload,
        checkModelAvailability,
    };
};
