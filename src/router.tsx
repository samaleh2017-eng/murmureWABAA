import {
    createRouter,
    createRoute,
    createRootRoute,
    Navigate,
    Outlet,
} from '@tanstack/react-router';
import { Home } from './features/home/home';
import { Layout } from './features/layout/layout';
import { About } from './features/about/about';
import { Shortcuts } from './features/settings/shortcuts/shortcuts';
import { CustomDictionary } from './features/settings/custom-dictionary/custom-dictionary';
import { FormattingRules } from './features/settings/formatting-rules/formatting-rules';
import { System } from './features/settings/system/system';
import { STTSettings } from './features/settings/stt/stt-settings';
import { LLMConnect } from './features/llm-connect/llm-connect';
import { ModelSetupLayout } from './features/model-setup/model-setup-layout';
import { ModelSetup } from './features/model-setup/model-setup';

const rootRoute = createRootRoute({
    component: () => <Outlet />,
});

const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'layout',
    component: Layout,
});

const setupLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'setup-layout',
    component: ModelSetupLayout,
});

const indexRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/',
    component: Home,
});

const settingsShortcutsRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/settings/shortcuts',
    component: Shortcuts,
});

const personalizeCustomDictionaryRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/personalize/custom-dictionary',
    component: CustomDictionary,
});

const personalizeFormattingRulesRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/personalize/formatting-rules',
    component: FormattingRules,
});

const personalizeLLMConnectRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/personalize/llm-connect',
    component: LLMConnect,
});

const settingsSystemRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/settings/system',
    component: System,
});

const settingsSTTRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/settings/stt',
    component: STTSettings,
});

const settingsIndexRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/settings',
    component: () => <Navigate to="/settings/shortcuts" />,
});

const personalizeIndexRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/personalize',
    component: () => <Navigate to="/personalize/custom-dictionary" />,
});

const aboutRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: '/about',
    component: About,
});

const setupRoute = createRoute({
    getParentRoute: () => setupLayoutRoute,
    path: '/setup',
    component: ModelSetup,
});

const routeTree = rootRoute.addChildren([
    layoutRoute.addChildren([
        indexRoute,
        settingsIndexRoute,
        settingsShortcutsRoute,
        settingsSystemRoute,
        settingsSTTRoute,
        personalizeIndexRoute,
        personalizeCustomDictionaryRoute,
        personalizeFormattingRulesRoute,
        personalizeLLMConnectRoute,
        aboutRoute,
    ]),
    setupLayoutRoute.addChildren([setupRoute]),
]);

export const router = createRouter({ routeTree });
