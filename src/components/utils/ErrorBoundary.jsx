import React from "react";

/**
 * Error Boundary component to catch JavaScript errors in component tree
 * and display a fallback UI instead of crashing the entire application
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log error to console for debugging
        console.error("Error caught by ErrorBoundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const { FallbackComponent } = this.props;

            if (FallbackComponent) {
                return <FallbackComponent error={this.state.error} errorInfo={this.state.errorInfo} />;
            }

            // Default fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">
                            Something went wrong
                        </h2>
                        <p className="text-gray-600 mb-4">
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        <div className="bg-gray-100 p-4 rounded mb-4 text-left">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Error Details:</p>
                            <p className="text-xs text-gray-600 font-mono break-all">
                                {this.state.error?.toString()}
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md cursor-pointer transition"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;