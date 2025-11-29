// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { CSSProperties, ClipboardEvent, useCallback } from "react";
import { makeStyles } from "tss-react/mui";

const DEFAULT_END_TEXT_LENGTH = 16;

const useStyles = makeStyles()(() => ({
  root: {
    display: "flex",
    justifyContent: "flex-start",
    overflow: "hidden",
    userSelect: "all",
  },
  start: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flexShrink: 1,
  },
  end: {
    whiteSpace: "nowrap",
    flexBasis: "content",
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

/**
 * Props for the TextMiddleTruncate component
 */
type Props = {
  /** The text to display with middle truncation */
  text: string;
  /** Number of characters to show at the end. Defaults to 16 */
  endTextLength?: number;
  /** Optional CSS class name for styling */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
};

/**
 * A component that displays text with middle truncation, showing the beginning and end
 * of the text with ellipsis in the middle when space is limited.
 *
 * The component intelligently splits the text to avoid breaking at whitespace
 * and provides proper clipboard copy functionality for the full text.
 *
 * @component
 * @example
 * ```tsx
 * <TextMiddleTruncate
 *   text="This is a very long text that needs to be truncated"
 *   endTextLength={20}
 * />
 * ```
 */
export default function TextMiddleTruncate({
  text,
  endTextLength,
  className,
  style,
}: Props): React.JSX.Element {
  const { classes, cx } = useStyles();
  let startTextLen = Math.max(
    0,
    text.length -
      (endTextLength == undefined || endTextLength === 0 ? DEFAULT_END_TEXT_LENGTH : endTextLength),
  );
  // Don't split at or immediately after whitespace.
  while (startTextLen < text.length && text.charAt(startTextLen).match(/\s/)) {
    startTextLen += 2;
  }
  const startText = text.substring(0, startTextLen);
  const endText = text.substring(startTextLen);

  /**
   * Handles copying the full text to clipboard, preventing the default behavior
   * that would copy text with newlines due to the split DOM structure.
   */
  const onCopy = useCallback(
    (event: ClipboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const clipboardData = event.clipboardData;
      clipboardData.setData("text/plain", text);
    },
    [text],
  );

  if (!startText) {
    return (
      <div className={cx(classes.end, className)} style={style}>
        {endText}
      </div>
    );
  }

  return (
    <div
      data-testid="text-middle-truncate"
      className={cx(className, classes.root)}
      title={text}
      style={style}
      onCopy={onCopy}
    >
      <div className={classes.start}>{startText}</div>
      <div className={classes.end}>{endText}</div>
    </div>
  );
}
