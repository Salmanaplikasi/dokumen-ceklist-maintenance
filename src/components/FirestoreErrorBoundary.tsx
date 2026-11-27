import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class FirestoreErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'Terjadi kendala saat menghubungkan ke database.';
    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.error) {
        readable = `Akses database (${parsed.operationType || 'operasi'} pada ${parsed.path || 'koleksi'}): ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return {
      hasError: true,
      errorMessage: readable,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-extrabold text-slate-900">
                Terjadi Kendala Sinkronisasi Data
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 break-words">
                {this.state.errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F2942] hover:bg-slate-800 text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
