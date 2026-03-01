import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });

        // Log to error tracking service (Sentry, etc.)
        if (window.errorTracker) {
            window.errorTracker.captureException(error, { errorInfo });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-bg-light p-6">
                    <div className="max-w-md w-full bg-bg-light rounded-3xl border border-border-light shadow-2xl p-8 space-y-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="h-20 w-20 bg-danger/10 text-danger rounded-full flex items-center justify-center">
                                <AlertTriangle size={40} />
                            </div>
                            
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-text-main">
                                    Something Went Wrong
                                </h1>
                                <p className="text-text-muted font-medium">
                                    The application encountered an unexpected error. Don't worry, your data is safe.
                                </p>
                            </div>

                            {import.meta.env.DEV && this.state.error && (
                                <details className="w-full text-left">
                                    <summary className="cursor-pointer text-xs font-bold text-text-muted hover:text-text-main">
                                        Error Details (Dev Only)
                                    </summary>
                                    <div className="mt-2 p-4 bg-surface-light rounded-xl border border-border-light">
                                        <p className="text-xs font-mono text-danger break-all">
                                            {this.state.error.toString()}
                                        </p>
                                        {this.state.errorInfo && (
                                            <pre className="mt-2 text-xs font-mono text-text-dim overflow-auto max-h-40">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </div>
                                </details>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReload}
                                className="flex-1 h-12 bg-surface-light text-text-main rounded-xl font-bold text-sm hover:bg-border-light transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="flex-1 h-12 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                            >
                                <Home size={18} />
                                Go Home
                            </button>
                        </div>

                        <p className="text-xs text-text-dim text-center">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
