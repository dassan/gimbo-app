import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: 'full-page' | 'card'
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback === 'full-page') {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-8 text-center">
          <p className="text-sm font-semibold text-on-surface">Algo deu errado</p>
          <p className="max-w-sm text-xs text-on-surface/50">{error.message}</p>
          <button
            onClick={this.reset}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Recarregar
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-low p-8 text-center">
        <p className="text-sm font-semibold text-on-surface">Esta seção não pôde ser carregada</p>
        <p className="text-xs text-on-surface/50">{error.message}</p>
        <button
          onClick={this.reset}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
        >
          Tentar novamente
        </button>
      </div>
    )
  }
}
