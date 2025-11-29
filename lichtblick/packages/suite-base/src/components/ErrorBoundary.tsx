// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Link, Button, Typography } from "@mui/material";
import { Component, ErrorInfo, PropsWithChildren, ReactNode } from "react";

import Stack from "@lichtblick/suite-base/components/Stack";
import { reportError } from "@lichtblick/suite-base/reportError";
import { AppError } from "@lichtblick/suite-base/util/errors";

import ErrorDisplay from "./ErrorDisplay";

/**
 * Props for the ErrorBoundary component
 */
type Props = {
  /** Optional custom actions to display when an error occurs */
  actions?: React.JSX.Element;
  /** Whether to show detailed error information */
  showErrorDetails?: boolean;
  /** Whether to hide error source locations */
  hideErrorSourceLocations?: boolean;
};

/**
 * State for the ErrorBoundary component
 */
type State = {
  /** Current error information if an error has occurred */
  currentError: { error: Error; errorInfo: ErrorInfo } | undefined;
};

/**
 * Error boundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 *
 * @component
 * @example
 * ```tsx
 * <ErrorBoundary showErrorDetails={true}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<PropsWithChildren<Props>, State> {
  public override state: State = {
    currentError: undefined,
  };

  /**
   * Invoked after an error has been thrown by a descendant component.
   * Reports the error and updates the component state.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Information about the error
   */
  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportError(new AppError(error, errorInfo));
    this.setState({ currentError: { error, errorInfo } });
  }

  /**
   * Renders the error UI if an error has occurred, otherwise renders children.
   *
   * @returns The error display or children components
   */
  public override render(): ReactNode {
    if (this.state.currentError) {
      const actions = this.props.actions ?? (
        <Stack
          fullHeight
          flex="auto"
          alignItems="flex-end"
          justifyContent="flex-end"
          direction="row"
        >
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              this.setState({ currentError: undefined });
            }}
          >
            Dismiss
          </Button>
        </Stack>
      );
      return (
        <ErrorDisplay
          showErrorDetails={this.props.showErrorDetails}
          hideErrorSourceLocations={this.props.hideErrorSourceLocations}
          error={this.state.currentError.error}
          errorInfo={this.state.currentError.errorInfo}
          content={
            <Typography>
              Something went wrong.{" "}
              <Link
                color="inherit"
                onClick={() => {
                  this.setState({ currentError: undefined });
                }}
              >
                Dismiss this error
              </Link>{" "}
              to continue using the app. If the issue persists, try restarting the app.
            </Typography>
          }
          actions={actions}
        />
      );
    }
    return this.props.children;
  }
}
