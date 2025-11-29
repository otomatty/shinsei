// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";

/**
 * Selector function to extract the player name from the message pipeline context
 * @param ctx - The message pipeline context
 * @returns The name of the current player
 */
const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

/**
 * DocumentTitleAdapter component that automatically updates the browser document title
 * based on the currently selected player name. This provides better user experience
 * by showing the current data source in the browser tab.
 *
 * The title format differs based on the platform:
 * - On Mac: Shows just the player name
 * - On other platforms: Shows "Player Name – Lichtblick"
 *
 * @component
 * @returns An empty React fragment (this component has no visual representation)
 *
 * @example
 * ```tsx
 * <DocumentTitleAdapter />
 * ```
 */
export default function DocumentTitleAdapter(): React.JSX.Element {
  const playerName = useMessagePipeline(selectPlayerName);

  useEffect(() => {
    if (!playerName) {
      window.document.title = "Lichtblick";
      return;
    }
    window.document.title = navigator.userAgent.includes("Mac")
      ? playerName
      : `${playerName} – Lichtblick`;
  }, [playerName]);

  return <></>;
}
