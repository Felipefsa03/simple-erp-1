import React, { Component, ErrorInfo } from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {}
  render() { return this.props.children; }
}

export function App() {
  return <ErrorBoundary>hello</ErrorBoundary>;
}
