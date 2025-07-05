import React, { Component, ReactNode, ErrorInfo } from 'react';
import { CardContent } from "./ui/card";
import { Card } from "./ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChatbotErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chatbot component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <p>Something went wrong. Please try refreshing the page.</p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}