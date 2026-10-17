import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '../../utils/telemetry';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  incidentId: string | null;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    incidentId: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const incidentId = captureException(error, {
      componentStack: errorInfo.componentStack || undefined,
    });
    this.setState({ incidentId });
  }

  private handleCopy = () => {
    if (this.state.incidentId) {
      navigator.clipboard.writeText(`ServisBot Hata Kodu: ${this.state.incidentId}\nMesaj: ${this.state.error?.message || ''}`);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Beklenmeyen Bir Durum Oluştu
            </h1>

            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              İşlem sırasında geçici bir hata meydana geldi. Sistem mühendislerimiz için hata kaydı otomatik olarak oluşturuldu.
            </p>

            {this.state.incidentId && (
              <div className="bg-slate-100 rounded-xl p-3 mb-6 flex items-center justify-between border border-slate-200">
                <div className="text-left">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Hata Referans No</div>
                  <div className="text-sm font-mono font-bold text-slate-800">{this.state.incidentId}</div>
                </div>
                <button
                  onClick={this.handleCopy}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sayfayı Yenile</span>
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Ana Sayfaya Dön</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
