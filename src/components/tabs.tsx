import * as React from 'react';
import clsx from 'clsx';

interface TabsContextType {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | null>(null);

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

export const Tabs = ({ value, onValueChange, children, className }: TabsProps) => {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
};

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

export const TabsList = ({ children, className }: TabsListProps) => {
    return (
        <div
            className={clsx(
                'inline-flex h-10 items-center justify-center rounded-lg bg-zinc-800/50 p-1',
                className
            )}
        >
            {children}
        </div>
    );
};

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export const TabsTrigger = ({ value, children, className }: TabsTriggerProps) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('TabsTrigger must be used within Tabs');

    const isActive = context.value === value;

    return (
        <button
            onClick={() => context.onValueChange(value)}
            className={clsx(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                isActive
                    ? 'bg-zinc-900 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
                className
            )}
        >
            {children}
        </button>
    );
};

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export const TabsContent = ({ value, children, className }: TabsContentProps) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('TabsContent must be used within Tabs');

    if (context.value !== value) return null;

    return (
        <div
            className={clsx(
                'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                className
            )}
        >
            {children}
        </div>
    );
};
