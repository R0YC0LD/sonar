import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Uygulama hatasi:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <div className="glass max-w-md rounded-2xl p-6 text-center">
            <div className="mb-2 text-3xl">😕</div>
            <h2 className="mb-2 text-lg font-bold">Bir seyler ters gitti</h2>
            <p className="mb-4 text-sm text-white/60">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-spotify px-5 py-2 text-sm font-bold text-black"
            >
              Yeniden yukle
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
