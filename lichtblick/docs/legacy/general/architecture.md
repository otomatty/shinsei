# Lichtblick Web Application Architecture

## Overview

Lichtblick is a web-based robotics data visualization platform built with React and TypeScript. This document describes the overall architecture and component hierarchy of the web application.

## Application Entry Points

### Web Application

- **Entry Point**: `web/src/entrypoint.tsx`
- **Platform**: Browser-based application
- **Build Target**: Static web assets served via HTTP

### Desktop Application

- **Entry Point**: `packages/suite-desktop/src/renderer/index.tsx`
- **Platform**: Electron-based desktop application
- **Build Target**: Native desktop application

### Benchmark Application

- **Entry Point**: `benchmark/src/index.tsx`
- **Platform**: Performance testing and benchmarking
- **Build Target**: Specialized build for performance analysis

## Component Hierarchy

### 1. Root Level Components

```
web/src/entrypoint.tsx
├── WebRoot (packages/suite-web/src/WebRoot.tsx)
│   ├── SharedRoot (packages/suite-base/src/SharedRoot.tsx)
│   │   └── StudioApp (packages/suite-base/src/StudioApp.tsx)
│   │       └── Workspace (packages/suite-base/src/Workspace.tsx)
│   │           ├── AppBar
│   │           ├── Sidebars
│   │           │   ├── Left Sidebar (NewSidebar)
│   │           │   ├── Center Content (PanelLayout)
│   │           │   └── Right Sidebar (NewSidebar)
│   │           └── PlaybackControls
│   └── Provider Stack
```

### 2. Core Components

#### **WebRoot** (`packages/suite-web/src/WebRoot.tsx`)

- **Purpose**: Web-specific root component
- **Responsibilities**:
  - Configure data source factories
  - Initialize extension loaders
  - Wrap application with SharedRoot
  - Provide web-specific services (LocalStorageAppConfiguration)

#### **SharedRoot** (`packages/suite-base/src/SharedRoot.tsx`)

- **Purpose**: Common root wrapper for both Desktop and Web
- **Responsibilities**:
  - Theme provider setup
  - Application configuration context
  - Global CSS and error boundaries
  - Common provider stack initialization

#### **StudioApp** (`packages/suite-base/src/StudioApp.tsx`)

- **Purpose**: Main application structure component
- **Responsibilities**:
  - Provider stack management (User profiles, Layout management, etc.)
  - Workspace component rendering
  - Application-level state management

#### **Workspace** (`packages/suite-base/src/Workspace.tsx`)

- **Purpose**: Primary UI layout and interaction coordinator
- **Responsibilities**:
  - Main UI layout management
  - Sidebar state management
  - Panel layout coordination
  - Keyboard shortcuts and global interactions
  - File drag & drop handling

## UI Layout System

### 3-Column Layout Architecture

The application uses a sophisticated 3-column layout system powered by `react-mosaic-component`:

```
┌─────────────────────────────────────────────────────────────┐
│                        AppBar                               │
├─────────────┬─────────────────────────────┬─────────────────┤
│             │                             │                 │
│ Left        │        Center Content       │ Right           │
│ Sidebar     │        (PanelLayout)        │ Sidebar         │
│             │                             │                 │
│ - Panel     │ ┌─────────┬─────────────┐   │ - Variables     │
│   Settings  │ │ Panel A │   Panel B   │   │ - Performance   │
│ - Topics    │ ├─────────┼─────────────┤   │ - Logs          │
│ - Alerts    │ │      Panel C        │   │ - Events        │
│ - Layouts   │ └─────────────────────────┘   │                 │
│             │                             │                 │
├─────────────┴─────────────────────────────┴─────────────────┤
│                   PlaybackControls                          │
└─────────────────────────────────────────────────────────────┘
```

### Sidebars System (`packages/suite-base/src/components/Sidebars/index.tsx`)

#### Architecture

- **Base Component**: `MosaicWithoutDragDropContext` for 3-way split
- **Layout Nodes**: `"leftbar" | "children" | "rightbar"`
- **Responsive**: Collapsible sidebars with size persistence

#### Left Sidebar Items

- **Panel Settings**: Configure selected panels
- **Topics**: Available ROS topics and data streams
- **Alerts**: System alerts and warnings
- **Layouts**: Layout browser and management

#### Right Sidebar Items

- **Variables**: Global and panel-specific variables
- **Performance**: Performance monitoring (debug mode)
- **Studio Logs**: Application logging settings (debug mode)
- **Events**: Event timeline and management

### Panel Layout System (`packages/suite-base/src/components/PanelLayout.tsx`)

#### Core Architecture

```
PanelLayout
├── MosaicWithoutDragDropContext (Panel arrangement)
│   └── renderTile() → Renders individual panels
│       ├── MosaicWindow (Panel wrapper)
│       │   ├── Suspense (Lazy loading)
│       │   ├── PanelRemounter (Remount control)
│       │   └── Panel HOC
│       │       └── Actual Panel Component
│       └── TabMosaicWrapper (For tab panels)
```

#### Panel Management

- **Dynamic Loading**: Panels are lazy-loaded React components
- **Error Boundaries**: Each panel wrapped in error boundary
- **Remounting**: Automatic remount on player changes
- **Configuration**: Per-panel configuration with persistence

## Data Flow Architecture

### Context Providers Stack

The application uses a comprehensive provider stack for state management:

```
AppConfigurationContext
├── AppParametersProvider
│   ├── ColorSchemeThemeProvider
│   │   ├── CssBaseline
│   │   │   ├── ErrorBoundary
│   │   │   │   ├── MultiProvider
│   │   │   │   │   ├── StudioToastProvider
│   │   │   │   │   ├── StudioLogsSettingsProvider
│   │   │   │   │   ├── LayoutStorageContext
│   │   │   │   │   ├── LayoutManagerProvider
│   │   │   │   │   ├── UserProfileLocalStorageProvider
│   │   │   │   │   ├── CurrentLayoutProvider
│   │   │   │   │   ├── AlertsContextProvider
│   │   │   │   │   ├── TimelineInteractionStateProvider
│   │   │   │   │   ├── UserScriptStateProvider
│   │   │   │   │   ├── ExtensionMarketplaceProvider
│   │   │   │   │   ├── ExtensionCatalogProvider
│   │   │   │   │   ├── PlayerManager
│   │   │   │   │   └── EventsProvider
│   │   │   │   └── Workspace
│   │   │   └── (Additional providers)
│   │   └── (Theme and styling)
│   └── (App parameters)
└── (Configuration)
```

### Key State Management

#### Layout Management

- **CurrentLayoutContext**: Active layout state and actions
- **LayoutManagerProvider**: Layout persistence and synchronization
- **PanelStateContext**: Panel-specific state management

#### Data Pipeline

- **PlayerManager**: Data source connection and management
- **MessagePipeline**: Real-time data streaming and processing
- **ExtensionCatalog**: Dynamic panel and extension loading

#### User Interface

- **WorkspaceContext**: Sidebar state, dialogs, and UI interactions
- **ThemeProvider**: Color scheme and styling management
- **ToastProvider**: User notifications and alerts

## File Organization

### Core Application Structure

```
packages/suite-base/src/
├── App.tsx                     # Legacy app structure (deprecated)
├── StudioApp.tsx              # New app structure (current)
├── SharedRoot.tsx             # Common root wrapper
├── Workspace.tsx              # Main workspace component
├── components/
│   ├── AppBar/                # Top toolbar components
│   ├── Sidebars/              # Sidebar system
│   ├── PanelLayout.tsx        # Panel arrangement system
│   ├── PlaybackControls/      # Media controls
│   ├── Panel.tsx              # Panel HOC wrapper
│   └── PanelSettings/         # Panel configuration UI
├── context/                   # React contexts
├── providers/                 # Context providers
├── panels/                    # Individual panel implementations
├── players/                   # Data source players
└── util/                      # Utility functions
```

### Platform-Specific Code

```
packages/suite-web/src/
├── WebRoot.tsx                # Web-specific root
├── index.tsx                  # Web entry point
└── services/                  # Web-specific services

packages/suite-desktop/src/
├── renderer/
│   ├── Root.tsx              # Desktop-specific root
│   └── index.tsx             # Desktop entry point
└── main/                     # Electron main process
```

## Extension System

### Panel Extensions

- **Dynamic Loading**: Panels loaded as React.lazy components
- **Type Safety**: TypeScript interfaces for panel contracts
- **Configuration**: Standardized config/saveConfig pattern
- **Lifecycle**: Automatic mounting/unmounting with error boundaries

### Extension Catalog

- **Registry**: Central catalog of available panels and extensions
- **Loading**: Async module loading with fallbacks
- **Marketplace**: Extension discovery and installation

## Development Guidelines

### Adding New Panels

1. Create panel component in `packages/suite-base/src/panels/`
2. Export from panel index with proper type definitions
3. Register in panel catalog
4. Add to storybook for testing

### Modifying Layout System

- Layout changes should go through `CurrentLayoutActions`
- Maintain backward compatibility with existing layouts
- Test with various panel configurations

### State Management

- Use existing context providers when possible
- Follow the provider pattern for new global state
- Prefer local state for component-specific data

## Performance Considerations

### Code Splitting

- Panels are lazy-loaded to reduce initial bundle size
- Extension loading is deferred until needed
- Route-based splitting for different application modes

### Memory Management

- Panel remounting on player changes prevents memory leaks
- Cleanup in useEffect hooks for subscriptions
- Proper disposal of data streams and connections

### Rendering Optimization

- React.memo for expensive components
- Virtualization for large lists (topics, variables)
- Debounced updates for high-frequency data

---

This architecture provides a scalable, maintainable foundation for the Lichtblick robotics visualization platform, supporting both web and desktop deployments with a rich ecosystem of extensible panels and data sources.
