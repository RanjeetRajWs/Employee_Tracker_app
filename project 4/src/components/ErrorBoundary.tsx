import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });

        // Log to backend if available
        try {
            fetch('http://localhost:5000/admin/activity-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: localStorage.getItem('appUser') ? JSON.parse(localStorage.getItem('appUser')!).id : 'unknown',
                    userName: localStorage.getItem('appUser') ? JSON.parse(localStorage.getItem('appUser')!).username : 'unknown',
                   action: 'ERROR',
                    details: {
                        error: error.message,
                        stack: error.stack,
                        componentStack: errorInfo.componentStack
                    },
                    timestamp: new Date()
                })
            }).catch(err => console.error('Failed to log error to backend:', err));
        } catch (e) {
            console.error('Failed to send error log:', e);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-100 flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 border border-red-200">
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-red-100 rounded-full">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">
                                    Something went wrong
                                </h1>
                                <p className="text-slate-600">
                                    The application encountered an unexpected error
                                </p>
                            </div>
                        </div>

                        {/* Error Details */}
                        {this.state.error && (
                            <div className="mb-6">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm font-semibold text-red-800 mb-2">
                                        Error Message:
                                    </p>
                                    <p className="text-sm text-red-700 font-mono">
                                        {this.state.error.message}
                                    </p>
                                </div>

                                {process.env.NODE_ENV === 'development' && this.state.error.stack && (
                                    <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                                            Stack Trace (Development Only)
                                        </summary>
                                        <pre className="mt-2 text-xs text-slate-600 overflow-auto max-h-64">
                                            {this.state.error.stack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Reload Application
                            </button>
                            <button
                                onClick={() => window.location.hash = '#/dashboard'}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>

                        {/* Help Text */}
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                                <strong>Need help?</strong> If this error persists, please contact your administrator with the error details above.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
