// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  Copy16Regular,
  Copy20Regular,
  Copy24Regular,
  Checkmark16Filled,
  Checkmark20Filled,
  Checkmark24Filled,
} from "@fluentui/react-icons";
import {
  Button,
  ButtonProps,
  IconButton,
  IconButtonProps,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useCallback, useState, PropsWithChildren, useMemo, ReactElement } from "react";

import clipboard from "@lichtblick/suite-base/util/clipboard";

/**
 * Props for the CopyButton component
 */
type CopyButtonProps = PropsWithChildren<{
  /** Function that returns the text to copy to clipboard */
  getText: () => string;
  /** Size of the button */
  size?: "small" | "medium" | "large";
  /** Size of the icon */
  iconSize?: "small" | "medium" | "large";
  /** Color theme for the button */
  color?: ButtonProps["color"];
  /** CSS class name for styling */
  className?: string;
  /** Edge positioning for IconButton */
  edge?: IconButtonProps["edge"];
}>;

/**
 * A button component that copies text to the clipboard with visual feedback.
 * Can be rendered as either an icon button or a text button with children.
 *
 * @component
 * @example
 * ```tsx
 * // As an icon button
 * <CopyButton getText={() => "Hello World"} />
 *
 * // As a text button
 * <CopyButton getText={() => "Hello World"}>
 *   Copy Text
 * </CopyButton>
 * ```
 */
function CopyButtonComponent(props: CopyButtonProps): ReactElement {
  const {
    children,
    className,
    color = "primary",
    edge,
    size = "medium",
    iconSize = "medium",
    getText,
  } = props;
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  /**
   * Memoized check icon based on icon size
   */
  const checkIcon = useMemo(() => {
    switch (iconSize) {
      case "small":
        return <Checkmark16Filled primaryFill={theme.palette.success.main} />;
      case "medium":
        return <Checkmark20Filled primaryFill={theme.palette.success.main} />;
      case "large":
        return <Checkmark24Filled primaryFill={theme.palette.success.main} />;
    }
  }, [iconSize, theme.palette.success.main]);

  /**
   * Memoized copy icon based on icon size
   */
  const copyIcon = useMemo(() => {
    switch (iconSize) {
      case "small":
        return <Copy16Regular />;
      case "medium":
        return <Copy20Regular />;
      case "large":
        return <Copy24Regular />;
    }
  }, [iconSize]);

  /**
   * Handles the copy action to clipboard with visual feedback
   */
  const handleCopy = useCallback(() => {
    clipboard
      .copy(getText())
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 1500);
      })
      .catch((err: unknown) => {
        console.warn(err);
      });
  }, [getText]);

  if (children == undefined) {
    return (
      <Tooltip arrow title={copied ? "Copied" : "Copy to clipboard"}>
        <IconButton
          edge={edge}
          className={className}
          size={size}
          onClick={handleCopy}
          color={copied ? "success" : color}
        >
          {copied ? checkIcon : copyIcon}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      size={size}
      className={className}
      onClick={handleCopy}
      color="inherit"
      startIcon={copied ? checkIcon : copyIcon}
    >
      <Typography color={copied ? "text.primary" : color} variant="body2">
        {children}
      </Typography>
    </Button>
  );
}

export default React.memo(CopyButtonComponent);
