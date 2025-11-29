// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { alpha } from "@mui/material";
import * as _ from "lodash-es";
import { Fragment } from "react";
import { makeStyles } from "tss-react/mui";

import { HighlightedText } from "@lichtblick/suite-base/components/HighlightedText";
import {
  TimelinePositionedEvent,
  DataSourceEvent,
} from "@lichtblick/suite-base/context/EventsContext";

const useStyles = makeStyles<void, "eventMetadata" | "eventSelected">()(
  (theme, _params, classes) => ({
    spacer: {
      cursor: "default",
      height: theme.spacing(1),
      gridColumn: "span 2",
    },
    event: {
      display: "contents",
      cursor: "pointer",
      "&:hover": {
        [`.${classes.eventMetadata}`]: {
          backgroundColor: alpha(theme.palette.info.main, theme.palette.action.hoverOpacity),
          borderColor: theme.palette.info.main,
        },
      },
    },
    eventSelected: {
      [`.${classes.eventMetadata}`]: {
        backgroundColor: alpha(theme.palette.info.main, theme.palette.action.activatedOpacity),
        borderColor: theme.palette.info.main,
        boxShadow: `0 0 0 1px ${theme.palette.info.main}`,
      },
    },
    eventHovered: {
      [`.${classes.eventMetadata}`]: {
        backgroundColor: alpha(theme.palette.info.main, theme.palette.action.hoverOpacity),
        borderColor: theme.palette.info.main,
      },
    },
    eventMetadata: {
      padding: theme.spacing(1),
      backgroundColor: theme.palette.background.default,
      borderRight: `1px solid ${theme.palette.divider}`,
      borderBottom: `1px solid ${theme.palette.divider}`,

      "&:nth-of-type(odd)": {
        borderLeft: `1px solid ${theme.palette.divider}`,
      },
      "&:first-of-type": {
        borderTop: `1px solid ${theme.palette.divider}`,
        borderTopLeftRadius: theme.shape.borderRadius,
      },
      "&:nth-of-type(2)": {
        borderTop: `1px solid ${theme.palette.divider}`,
        borderTopRightRadius: theme.shape.borderRadius,
      },
      "&:nth-last-of-type(2)": {
        borderBottomRightRadius: theme.shape.borderRadius,
      },
      "&:nth-last-of-type(3)": {
        borderBottomLeftRadius: theme.shape.borderRadius,
      },
    },
  }),
);

/**
 * Formats the duration of an event into a human-readable string.
 * Converts nanoseconds to appropriate units (seconds, milliseconds, microseconds, nanoseconds).
 *
 * @param event - The data source event containing duration information
 * @returns A formatted duration string with appropriate units
 *
 * @example
 * ```typescript
 * formatEventDuration({ durationNanos: "1000000000" }) // "1s"
 * formatEventDuration({ durationNanos: "1000000" }) // "1ms"
 * formatEventDuration({ durationNanos: "0" }) // "-"
 * ```
 */
function formatEventDuration(event: DataSourceEvent) {
  if (event.durationNanos === "0") {
    // instant
    return "-";
  }

  if (!event.durationNanos) {
    return "";
  }

  const intDuration = BigInt(event.durationNanos);

  if (intDuration >= BigInt(1e9)) {
    return `${Number(intDuration / BigInt(1e9))}s`;
  }

  if (intDuration >= BigInt(1e6)) {
    return `${Number(intDuration / BigInt(1e6))}ms`;
  }

  if (intDuration >= BigInt(1e3)) {
    return `${Number(intDuration / BigInt(1e3))}µs`;
  }

  return `${event.durationNanos}ns`;
}

/**
 * Props for the EventViewComponent
 */
type EventViewComponentProps = {
  /** The timeline positioned event to display */
  event: TimelinePositionedEvent;
  /** Filter string for highlighting text */
  filter: string;
  /** Pre-formatted time string for display */
  formattedTime: string;
  /** Whether the event is currently being hovered */
  isHovered: boolean;
  /** Whether the event is currently selected */
  isSelected: boolean;
  /** Callback when the event is clicked */
  onClick: (event: TimelinePositionedEvent) => void;
  /** Callback when hover starts */
  onHoverStart: (event: TimelinePositionedEvent) => void;
  /** Callback when hover ends */
  onHoverEnd: (event: TimelinePositionedEvent) => void;
};

/**
 * A component that displays a single event in a timeline with metadata fields.
 * Shows event information in a key-value format with syntax highlighting for search terms.
 *
 * Features:
 * - Displays event start time and duration
 * - Shows all event metadata as key-value pairs
 * - Highlights search terms in both keys and values
 * - Supports hover and selection states
 * - Responsive grid layout with proper spacing
 *
 * @param params - The component props
 * @returns A React element displaying the event information
 */
function EventViewComponent(params: EventViewComponentProps): React.JSX.Element {
  const { event, filter, formattedTime, isHovered, isSelected, onClick, onHoverStart, onHoverEnd } =
    params;
  const { classes, cx } = useStyles();

  const fields = _.compact([
    ["start", formattedTime],
    Number(event.event.durationNanos) > 0 && ["duration", formatEventDuration(event.event)],
    ...Object.entries(event.event.metadata),
  ]);

  return (
    <div
      data-testid="sidebar-event"
      className={cx(classes.event, {
        [classes.eventSelected]: isSelected,
        [classes.eventHovered]: isHovered,
      })}
      onClick={() => {
        onClick(event);
      }}
      onMouseEnter={() => {
        onHoverStart(event);
      }}
      onMouseLeave={() => {
        onHoverEnd(event);
      }}
    >
      {fields.map(([key, value]) => (
        <Fragment key={key}>
          <div className={classes.eventMetadata}>
            <HighlightedText text={key ?? ""} highlight={filter} />
          </div>
          <div className={classes.eventMetadata}>
            <HighlightedText text={value ?? ""} highlight={filter} />
          </div>
        </Fragment>
      ))}
      <div className={classes.spacer} />
    </div>
  );
}

/**
 * A memoized event view component that displays timeline events with metadata.
 * Optimized for performance by preventing unnecessary re-renders when props haven't changed.
 *
 * @component
 * @example
 * ```tsx
 * <EventView
 *   event={timelineEvent}
 *   filter="search term"
 *   formattedTime="12:34:56"
 *   isHovered={false}
 *   isSelected={true}
 *   onClick={handleEventClick}
 *   onHoverStart={handleHoverStart}
 *   onHoverEnd={handleHoverEnd}
 * />
 * ```
 */
export const EventView = React.memo(EventViewComponent);
