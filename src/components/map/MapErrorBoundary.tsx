import { Component, type ErrorInfo, type ReactNode } from 'react';
import MapFallback from './MapFallback';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    center?: [number, number];
    className?: string;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Map rendering error caught by MapErrorBoundary:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <MapFallback
                    type="error"
                    title="Harita Görüntüleme Hatası"
                    description={this.state.error?.message || "Harita yüklenirken beklenmeyen bir hata oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin."}
                    center={this.props.center}
                    className={this.props.className}
                    onRetry={this.handleRetry}
                />
            );
        }
        return this.props.children;
    }
}

export default MapErrorBoundary;
