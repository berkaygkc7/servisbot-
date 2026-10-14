// Route preloader helper to load page chunks in idle time or on link hover
const preloaded = new Set<string>();

const routeLoaders: Record<string, () => Promise<unknown>> = {
    '/dashboard': () => import('../pages/DashboardHome'),
    '/dashboard/students': () => import('../pages/Students'),
    '/dashboard/payments': () => import('../pages/Payments'),
    '/dashboard/contracts': () => import('../pages/Contracts'),
    '/dashboard/vehicles': () => import('../pages/Vehicles'),
    '/dashboard/drivers': () => import('../pages/Drivers'),
    '/dashboard/routes': () => import('../pages/RoutesPage'),
    '/dashboard/expenses': () => import('../pages/Expenses'),
    '/dashboard/timesheets': () => import('../pages/UniversalTimesheets'),
    '/dashboard/settings': () => import('../pages/Settings'),
    '/print-contract': () => import('../pages/PrintContract'),
    '/print-preview': () => import('../pages/PrintPreview'),
};

export const preloadRoute = (path: string) => {
    if (preloaded.has(path)) return;
    const loader = routeLoaders[path];
    if (loader) {
        preloaded.add(path);
        loader().catch(() => preloaded.delete(path));
    }
};

export const preloadCommonRoutes = () => {
    // Run during browser idle time or after initial render
    if (typeof window === 'undefined') return;

    const run = () => {
        // Preload most frequently accessed pages in sequence with small gaps
        const priorityPaths = [
            '/dashboard/students',
            '/dashboard/payments',
            '/dashboard/contracts',
            '/dashboard/vehicles',
            '/print-contract',
            '/print-preview',
        ];

        priorityPaths.forEach((path, idx) => {
            setTimeout(() => {
                preloadRoute(path);
            }, 600 + idx * 350);
        });
    };

    if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(run);
    } else {
        setTimeout(run, 1000);
    }
};
