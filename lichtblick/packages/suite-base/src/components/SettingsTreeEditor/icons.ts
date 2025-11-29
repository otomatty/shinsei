// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview SettingsTreeEditor アイコン定義
 *
 * SettingsTreeEditorコンポーネントシステムで使用されるアイコンマッピングを提供します。
 * Material-UIのアイコンコンポーネントと設定システムで使用されるアイコン名を関連付けます。
 *
 * 使用可能なアイコンは以下のカテゴリに分類されます：
 * - **操作系**: Add, Clear, Delete, Share, Move系
 * - **表示制御**: Expand, Collapse, FolderOpen, Folder
 * - **センサー系**: Camera, Radar, Points（LiDAR）
 * - **UI要素**: Settings, Grid, Background, Timeline
 * - **3D/ビュー系**: Cube, ImageProjection, Cells
 * - **フラグ・マーカー**: Flag, Star, Circle, Check
 * - **その他**: Clock, Topic, Walk, World, Hive等
 */

import Clock from "@mui/icons-material/AccessTime";
import Add from "@mui/icons-material/Add";
import Addchart from "@mui/icons-material/Addchart";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Points from "@mui/icons-material/BlurOn";
import Check from "@mui/icons-material/Check";
import Circle from "@mui/icons-material/Circle";
import Clear from "@mui/icons-material/Clear";
import Delete from "@mui/icons-material/Delete";
import Walk from "@mui/icons-material/DirectionsWalk";
import Flag from "@mui/icons-material/Flag";
import Folder from "@mui/icons-material/Folder";
import FolderOpen from "@mui/icons-material/FolderOpen";
import Grid from "@mui/icons-material/GridOn";
import Hive from "@mui/icons-material/HiveOutlined";
import Shapes from "@mui/icons-material/Interests";
import World from "@mui/icons-material/Language";
import Background from "@mui/icons-material/Layers";
import Map from "@mui/icons-material/Map";
import MoveDown from "@mui/icons-material/MoveDown";
import MoveUp from "@mui/icons-material/MoveUp";
import NorthWest from "@mui/icons-material/NorthWest";
import NoteFilled from "@mui/icons-material/Note";
import Note from "@mui/icons-material/NoteOutlined";
import Move from "@mui/icons-material/OpenWith";
import Camera from "@mui/icons-material/PhotoCamera";
import PrecisionManufacturing from "@mui/icons-material/PrecisionManufacturing";
import Radar from "@mui/icons-material/Radar";
import Settings from "@mui/icons-material/Settings";
import Share from "@mui/icons-material/Share";
import SouthEast from "@mui/icons-material/SouthEast";
import Star from "@mui/icons-material/StarOutline";
import Timeline from "@mui/icons-material/Timeline";
import Topic from "@mui/icons-material/Topic";
import Collapse from "@mui/icons-material/UnfoldLess";
import Expand from "@mui/icons-material/UnfoldMore";
import Cells from "@mui/icons-material/ViewComfy";
import Cube from "@mui/icons-material/ViewInAr";
import ImageProjection from "@mui/icons-material/Vrpano";

import { SettingsIcon } from "@lichtblick/suite";

/**
 * SettingsTreeEditorで使用可能なアイコンの定義マップ
 *
 * このマップは、設定システムで使用されるアイコン名（SettingsIcon型）と
 * 対応するMaterial-UIアイコンコンポーネントを関連付けます。
 *
 * アイコンは以下の用途で使用されます：
 * - 設定ノードのアイコン表示（NodeEditor）
 * - アクションメニューのアイコン表示（NodeActionsMenu）
 * - フィールドラベルのアイコン表示（FieldEditor）
 *
 * @constant {Record<SettingsIcon, React.ComponentType>}
 *
 * @example
 * ```tsx
 * // 設定ノードでアイコンを使用
 * const nodeSettings = {
 *   label: "Camera Settings",
 *   icon: "Camera", // iconsマップから Camera コンポーネントが選択される
 *   fields: { ... }
 * };
 *
 * // NodeEditorコンポーネント内での使用
 * const IconComponent = settings.icon ? icons[settings.icon] : undefined;
 * ```
 *
 * @example
 * アイコンカテゴリ別の使用例：
 * ```tsx
 * // センサー関連
 * icon: "Camera"     // カメラ設定
 * icon: "Radar"      // レーダー設定
 * icon: "Points"     // 点群（LiDAR）設定
 *
 * // UI制御
 * icon: "Settings"   // 設定画面
 * icon: "Grid"       // グリッド表示
 * icon: "Background" // 背景レイヤー
 *
 * // 操作
 * icon: "Add"        // 追加操作
 * icon: "Delete"     // 削除操作
 * icon: "Move"       // 移動操作
 * ```
 */
const icons: Record<SettingsIcon, typeof Add> = {
  Add,
  Addchart,
  AutoAwesome,
  Background,
  Camera,
  Cells,
  Check,
  Circle,
  Clear,
  Clock,
  Collapse,
  Cube,
  Delete,
  Expand,
  Flag,
  Folder,
  FolderOpen,
  Grid,
  Hive,
  ImageProjection,
  Map,
  Move,
  MoveDown,
  MoveUp,
  NorthWest,
  Note,
  NoteFilled,
  Points,
  PrecisionManufacturing,
  Radar,
  Settings,
  Shapes,
  Share,
  SouthEast,
  Star,
  Timeline,
  Topic,
  Walk,
  World,
};

export { icons };
