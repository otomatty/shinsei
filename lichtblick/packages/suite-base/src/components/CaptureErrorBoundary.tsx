// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import { Component, PropsWithChildren, ReactNode } from "react";

/**
 * Props for the CaptureErrorBoundary component
 */
type Props = {
  /** Callback function to handle errors when they occur */
  onError: (err: Error) => void;
};

/**
 * State for the CaptureErrorBoundary component
 */
type State = {
  /** Whether an error has occurred in the component tree */
  hadError: boolean;
};

/**
 * An error boundary component that catches JavaScript errors in its child component tree
 * and calls a callback function when an error occurs. Unlike the standard ErrorBoundary,
 * this component does not display fallback UI - it simply captures the error and calls
 * the provided onError callback.
 *
 * When an error occurs, the component stops rendering its children to prevent further
 * errors from the same source.
 *
 * @component
 * @example
 * ```tsx
 * <CaptureErrorBoundary onError={(error) => console.error('Caught error:', error)}>
 *   <MyComponent />
 * </CaptureErrorBoundary>
 * ```
 */
export class CaptureErrorBoundary extends Component<PropsWithChildren<Props>, State> {
  public override state: State = {
    hadError: false,
  };

  /**
   * Lifecycle method called when an error occurs in the component tree.
   * Updates the state to indicate an error occurred and calls the onError callback.
   *
   * @param error - The error that was thrown
   */
  public override componentDidCatch(error: Error): void {
    this.setState({ hadError: true });
    this.props.onError(error);
  }

  /**
   * Renders the children if no error has occurred, otherwise renders nothing.
   *
   * @returns The children components or an empty fragment
   */
  public override render(): ReactNode {
    // Avoid rendering children since the children are what caused the error
    if (this.state.hadError) {
      return <></>;
    }

    return this.props.children;
  }
}
