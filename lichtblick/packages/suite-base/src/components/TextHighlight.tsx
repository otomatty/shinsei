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

import fuzzySort from "fuzzysort";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  root: {
    ".TextHighlight-highlight": {
      color: theme.palette.primary.main,
      fontWeight: "bold",
    },
  },
}));

/**
 * Props for the TextHighlight component
 */
type Props = {
  /** The target string to display and search within */
  targetStr: string;
  /** The search text to highlight within the target string */
  searchText?: string;
};

/**
 * A component that highlights matching text within a target string using fuzzy search.
 * Uses the fuzzysort library to find matches and highlights them with bold, primary-colored text.
 *
 * If no search text is provided, returns the target string unchanged.
 * If no match is found, returns the target string unchanged.
 *
 * @component
 * @param props - The component props
 * @returns A React element with highlighted text or plain text
 *
 * @example
 * ```tsx
 * <TextHighlight
 *   targetStr="Hello World"
 *   searchText="wor"
 * />
 * // Renders: "Hello <highlighted>Wor</highlighted>ld"
 * ```
 */
export default function TextHighlight({
  targetStr = "",
  searchText = "",
}: Props): React.JSX.Element {
  const { classes } = useStyles();

  if (searchText.length === 0) {
    return <>{targetStr}</>;
  }

  const match = fuzzySort.single(searchText, targetStr);
  const result = match
    ? match.highlight("<span class='TextHighlight-highlight'>", "</span>")
    : undefined;

  return (
    <span className={classes.root}>
      {result != undefined && result.length > 0 ? (
        <span dangerouslySetInnerHTML={{ __html: result }} />
      ) : (
        targetStr
      )}
    </span>
  );
}
