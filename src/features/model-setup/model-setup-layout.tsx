import { Outlet } from '@tanstack/react-router';

export const ModelSetupLayout = () => {
    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            <Outlet />
        </div>
    );
};
