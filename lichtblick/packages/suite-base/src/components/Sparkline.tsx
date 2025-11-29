// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useCallback } from "react";
import { makeStyles } from "tss-react/mui";

import { Immutable } from "@lichtblick/suite";
import AutoSizingCanvas from "@lichtblick/suite-base/components/AutoSizingCanvas";

/**
 * Represents a single data point in the sparkline
 */
export type SparklinePoint = {
  /** The numeric value of the data point */
  value: number;
  /** The timestamp of the data point */
  timestamp: number;
};

/**
 * Props for the Sparkline component
 */
type SparklineProps = {
  /** Array of data points to display in the sparkline */
  points: Immutable<SparklinePoint[]>;
  /** Width of the sparkline in pixels */
  width: number;
  /** Height of the sparkline in pixels */
  height: number;
  /** Time range for the sparkline in milliseconds */
  timeRange: number;
  /** Optional maximum value for scaling. If not provided, uses the maximum value from the data */
  maximum?: number;
  /** Optional current timestamp for positioning. Defaults to current time */
  nowStamp?: number;
};

const useStyles = makeStyles()((theme) => ({
  root: {
    flex: "none",
    backgroundColor: theme.palette.grey[300],
  },
}));

/**
 * Draws the sparkline chart on the canvas
 *
 * @param points - Array of data points to draw
 * @param maximum - Maximum value for scaling
 * @param timeRange - Time range in milliseconds
 * @param nowStamp - Current timestamp for positioning
 * @param context - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param color - Line color
 */
function draw(
  points: Immutable<SparklinePoint[]>,
  maximum: number,
  timeRange: number,
  nowStamp: number,
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  const maxValue = Math.max(maximum, ...points.map(({ value }) => value));
  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.strokeStyle = color;
  let first = true;
  for (const { value, timestamp } of points) {
    const x = ((timeRange + timestamp - nowStamp) / timeRange) * width;
    const y = (1 - value / maxValue) * height;
    if (first) {
      context.moveTo(x, y);
      first = false;
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

/**
 * A sparkline chart component that displays a small line chart with data points over time.
 * Useful for showing trends and patterns in time-series data.
 *
 * @component
 * @example
 * ```tsx
 * <Sparkline
 *   points={[
 *     { value: 10, timestamp: 1000 },
 *     { value: 20, timestamp: 2000 },
 *     { value: 15, timestamp: 3000 }
 *   ]}
 *   width={200}
 *   height={50}
 *   timeRange={5000}
 * />
 * ```
 */
export function Sparkline(props: SparklineProps): React.JSX.Element {
  const { classes, theme } = useStyles();
  const drawCallback = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      draw(
        props.points,
        props.maximum ?? 0,
        props.timeRange,
        props.nowStamp ?? Date.now(),
        context,
        width,
        height,
        theme.palette.text.primary,
      );
    },
    [props.maximum, props.nowStamp, props.points, props.timeRange, theme.palette],
  );
  return (
    <div className={classes.root} style={{ height: props.height, width: props.width }}>
      <AutoSizingCanvas draw={drawCallback} />
    </div>
  );
}
