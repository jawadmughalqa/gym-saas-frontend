import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors inside the main content area and shows a
 * friendly recovery card instead of a blank/crashed screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to an error tracking service (Sentry etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[300px] items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
                <CardTitle className="text-base">Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <p className="text-sm text-muted-foreground font-mono bg-muted rounded px-3 py-2 break-all">
                  {this.state.error.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={this.handleReset}>
                  Try again
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  Reload page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
