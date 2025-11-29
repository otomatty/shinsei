// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Typography, Link, Divider } from "@mui/material";
import { ErrorInfo, useMemo, useState } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";

const useStyles = makeStyles()((theme) => ({
  grid: {
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    height: "100%",
    padding: theme.spacing(2),
    overflowY: "auto",
  },
  errorDetailStack: {
    fontSize: theme.typography.body2.fontSize,
    lineHeight: "1.3em",
    paddingLeft: theme.spacing(2),
  },
  errorDetailContainer: {
    overflowY: "auto",
    background: theme.palette.background.paper,
    padding: theme.spacing(1),
    minHeight: theme.spacing(10),
  },
  actions: {
    flex: "auto",
    paddingTop: theme.spacing(2),
    textAlign: "right",
  },
}));

/**
 * Remove source locations (which often include file hashes) so storybook screenshots can be
 * deterministic.
 *
 * @param stack - The error stack trace string to sanitize
 * @returns The sanitized stack trace string
 */
function sanitizeStack(stack: string) {
  return stack.replace(/\s+\(.+\)$/gm, "").replace(/\s+https?:\/\/.+$/gm, "");
}

/**
 * Props for the ErrorStacktrace component
 */
type ErrorStacktraceProps = {
  /** The error stack trace string to display */
  stack: string;
  /** Whether to hide source locations from the stack trace */
  hideSourceLocations: boolean;
};

/**
 * A component that displays a formatted error stack trace with syntax highlighting.
 * Handles both error stack traces and React component stack traces.
 *
 * @param props - The component props
 * @returns A React element displaying the formatted stack trace
 */
function ErrorStacktrace({ stack, hideSourceLocations }: ErrorStacktraceProps) {
  const { classes } = useStyles();
  const lines = (hideSourceLocations ? sanitizeStack(stack) : stack)
    .trim()
    .replace(/^\s*at /gm, "")
    .split("\n")
    .map((line) => line.trim());
  return (
    <pre className={classes.errorDetailStack}>
      {lines.map((line, i) => {
        const match = /^(.+)\s(\(.+$)/.exec(line);
        if (!match) {
          return line + "\n";
        }
        return (
          <span key={i}>
            <span>{match[1]} </span>
            <span>{match[2]}</span>
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}

/**
 * Props for the ErrorDisplay component
 */
type ErrorDisplayProps = {
  /** Optional custom title for the error display */
  title?: string;
  /** The error object to display */
  error?: Error;
  /** Additional error information from React error boundaries */
  errorInfo?: ErrorInfo;
  /** Custom content to display in the error message area */
  content?: React.JSX.Element;
  /** Custom action buttons to display at the bottom */
  actions?: React.JSX.Element;
  /** Whether to show error details by default */
  showErrorDetails?: boolean;
  /** Whether to hide source locations from stack traces */
  hideErrorSourceLocations?: boolean;
};

/**
 * A comprehensive error display component that shows error information in a structured format.
 * Includes error messages, stack traces, and custom content with expandable details.
 *
 * Features:
 * - Displays error title, message, and custom content
 * - Expandable error details with stack traces
 * - Support for both JavaScript errors and React component errors
 * - Customizable actions and content
 * - Option to hide source locations for consistent screenshots
 *
 * @component
 * @param props - The component props
 * @returns A React element displaying the error information
 *
 * @example
 * ```tsx
 * <ErrorDisplay
 *   title="Something went wrong"
 *   error={new Error("Network connection failed")}
 *   content={<p>Please check your internet connection and try again.</p>}
 *   actions={<Button onClick={handleRetry}>Retry</Button>}
 * />
 * ```
 */
function ErrorDisplay(props: ErrorDisplayProps): React.JSX.Element {
  const { classes } = useStyles();
  const { error, errorInfo, hideErrorSourceLocations = false } = props;

  const [showErrorDetails, setShowErrorDetails] = useState(props.showErrorDetails ?? false);

  const errorDetails = useMemo(() => {
    if (!showErrorDetails) {
      return ReactNull;
    }

    let stackWithoutMessage = error?.stack ?? "";
    const errorString = error?.toString() ?? "";
    if (stackWithoutMessage.startsWith(errorString)) {
      stackWithoutMessage = stackWithoutMessage.substring(errorString.length);
    }

    return (
      <div>
        <Typography fontWeight="bold">Error stack:</Typography>
        <ErrorStacktrace
          stack={stackWithoutMessage}
          hideSourceLocations={hideErrorSourceLocations}
        />
        {errorInfo && (
          <>
            <Typography fontWeight="bold">Component stack:</Typography>
            <ErrorStacktrace
              stack={`${errorInfo.componentStack}`}
              hideSourceLocations={hideErrorSourceLocations}
            />
          </>
        )}
      </div>
    );
  }, [error, errorInfo, hideErrorSourceLocations, showErrorDetails]);

  return (
    <div className={classes.grid}>
      <Stack gap={2} paddingBottom={2}>
        <Stack>
          <Typography variant="h4" gutterBottom>
            {props.title ?? "The app encountered an unexpected error"}
          </Typography>
          <Typography variant="body1">{props.content}</Typography>
        </Stack>
        <Divider />
        <Typography variant="subtitle2" component="code" fontWeight="bold">
          {error?.message}
        </Typography>
        <Link
          color="secondary"
          onClick={() => {
            setShowErrorDetails(!showErrorDetails);
          }}
        >
          {showErrorDetails ? "Hide" : "Show"} details
        </Link>
      </Stack>
      {errorDetails && <div className={classes.errorDetailContainer}>{errorDetails}</div>}
      {!errorDetails && <div />}
      <div className={classes.actions}>{props.actions}</div>
    </div>
  );
}

export default ErrorDisplay;
