# Declarative Workflow Builder for Microsoft Agent Framework

A React application for visually composing Microsoft Agent Framework declarative workflow YAML on a canvas.

## Overview

This project provides an editor for building workflow definitions interactively without manually writing YAML from scratch. You can:

- choose a target style such as Python or C#
- load built-in sample workflows
- import YAML from a local file
- add actions on the canvas and edit them from the inspector
- copy the generated YAML directly for use in your app or service

The editor is implemented in the UI app under `src/ui`, while the workflow model, graph generation, YAML parsing, and tests live alongside the feature code.

## Features

- Visual workflow editing with draggable and connectable nodes
- Container-based branches such as `If` and `ConditionGroup`
- Support for nested actions under `Then`, `Else`, and condition blocks
- YAML preview and export from the right-side panel
- Sample workflows for common patterns and scenarios
- Type-safe domain logic and graph layout utilities

## Project Structure

```text
.
├── docs/
│   ├── declarative-workflow-spec-ja.md
│   └── workflow-builder-plan.md
├── src/
│   └── ui/
│       ├── package.json
│       ├── public/
│       └── src/
│           ├── App.tsx
│           ├── features/
│           │   └── workflow-builder/
│           └── ...
└── README.md
```

## Getting Started

```bash
cd src/ui
npm install
npm run dev
```

Then open the local Vite app in your browser, typically at http://localhost:5173.

## Available Scripts

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start the development server                         |
| `npm run build`      | Run TypeScript build and produce a production bundle |
| `npm test`           | Run the Vitest test suite once                       |
| `npm run test:watch` | Run Vitest in watch mode                             |
| `npm run lint`       | Run the project linter                               |
| `npm run format`     | Format the code with Prettier                        |

## Usage

1. Select a workflow style such as Python or C#.
2. Add at least one action to lock the style.
3. Load a sample workflow or import your own YAML file.
4. Click nodes on the canvas to edit them in the inspector.
5. Copy the generated YAML from the preview panel.

`If` and `ConditionGroup` nodes render as containers, and their child actions are placed inside `Then`, `Else`, or condition blocks.

## Architecture Notes

The codebase is organized by responsibility:

- `src/features/workflow-builder/domain/` — model logic without UI or layout dependencies
- `src/features/workflow-builder/graph/` — graph and edge generation from the workflow model
- `src/features/workflow-builder/components/` — React components for the editor UI
- `src/features/workflow-builder/utils/` — YAML generation and parsing

The dependency direction is intentionally one-way: `domain -> graph -> components`.

## Tech Stack

- React 19
- TypeScript
- Vite
- @xyflow/react
- yaml
- Vitest
- Oxlint
- Prettier

## Documentation

- [Declarative workflow YAML specification notes](docs/declarative-workflow-spec-ja.md) — specification and implementation notes
- [Development plan and implementation status](docs/workflow-builder-plan.md) — architecture decisions, planning, and remaining work

## License

This project is provided as-is for development and experimentation within the repository context.
