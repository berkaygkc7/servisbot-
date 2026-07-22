import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <h1 className="text-xl font-bold text-red-600 mb-2">Bir hata oluştu</h1>
                        <p className="text-slate-600 mb-4">Uygulama beklenmedik bir hatayla karşılaştı.</p>
                        <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto text-red-800 border border-red-200">
                            {this.state.error?.message}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Sayfayı Yenile
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
