# ⚡ CodeArchi

> **Interactive Codebase Intelligence, Architecture Visualization & Failure Analysis Studio**

[![React](https://img.shields.io/badge/React-19.3-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Synthesizer-ff9a4a?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![CSS3 3D](https://img.shields.io/badge/CSS3_3D-Perspective-8fb8a8?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**CodeArchi** is a developer intelligence platform featuring a dark cyberpunk-terminal aesthetic. It maps complex software architectures, simulates signal propagation across dependency circuit boards, traces runtime stack errors directly to source files, computes blast radiuses for proposed changes, and generates transparent AI insights with code citations.

Everything runs **100% client-side in the browser**—no backend server, no cloud storage, and complete code privacy.

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [Feature Showcase](#-feature-showcase)
  - [1. Hierarchical Architecture Tree](#1--hierarchical-architecture-tree)
  - [2. Interactive Circuit Board (2D & 3D)](#2--interactive-circuit-board-2d--3d)
  - [3. Interactive 3D Laptop Studio](#3--interactive-3d-laptop-studio)
  - [4. Codebase Explorer & ZIP Ingestion](#4--codebase-explorer--zip-ingestion)
  - [5. Failure & Stack Trace Analysis](#5--failure--stack-trace-analysis)
  - [6. Change Impact & Blast Radius (BFS)](#6--change-impact--blast-radius-bfs)
  - [7. AI Insights & Test Suggestions](#7--ai-insights--test-suggestions)
- [Project Architecture](#-project-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [License](#-license)

---

## 🌟 Key Highlights

- **Zero-Server Ingestion**: Upload any project ZIP archive; CodeArchi decompresses and parses your codebase in-memory in the browser.
- **Drag-to-Pan Canvas**: Smooth click-and-drag navigation across large architectural trees with touch and trackpad support.
- **Hardware-Level Circuit Simulation**: Interactive PCB view with microchip IC packages, integrated DIP switches, and animated electrical wire traces.
- **Realistic 3D Laptop Studio**: Scroll-driven lid opening physics, Web Audio API mechanical key clicks, CRT monitor power-down, and a virtual trackpad pointer.
- **Deterministic Blast Radius**: Graph traversal (BFS) that traces direct and indirect dependency chains when modifying files.
- **Evidence-Citing AI Insights**: High-confidence explanations with verifiable code lines, unknown runtime risk warnings, and automated unit test proposals.

---

## 🚀 Feature Showcase

### 1. 🌲 Hierarchical Architecture Tree

Maps your project directories into a structured subsystem tree with metrics and inspection:

- **Drag-to-Pan Canvas**: Click and drag anywhere on the canvas background to pan horizontally and vertically with an active grab cursor.
- **Zoom & Auto-Fit**: Zoom in (`+`), Zoom out (`−`), or click `Fit` to auto-center the diagram.
- **Subsystem Cards**: Displays file counts, line counts, internal links, size, and purple donut density gauges.
- **Inline Display Rules Bar**: Configure rules smoothly without overlapping cards:
  - `Highlight Deps`: Lights up dependent modules.
  - `Folders Only`: Hides file lists to focus on high-level architecture.
  - `Metric Cells`: Toggles file and line stat grids.
  - `Donut Gauges`: Toggles circular percentage gauges.
  - `Code Inspector`: Opens a docked syntax code viewer below the tree.
- **Accidental Click Protection**: Smoothly distinguishes mouse drags from card selection clicks.

---

### 2. 🔌 Interactive Circuit Board (2D & 3D)

Represents project files and dependencies as a printed circuit board (PCB):

- **Dual View Modes**: Switch seamlessly between **3D Isometric Perspective** and **2D Top-Down View**.
- **Silicon IC Microchips**: Each file is packaged into a dark IC chip with pin leads, an indicator lamp, and an **integrated ON/OFF rocker switch**.
- **Interactive Signal Traces**: Flip any microchip switch to pulse electrical signal traces:
  - 🟠 **Orange Pulse**: Modules imported by the selected file.
  - 🟢 **Green Pulse**: Modules that import the selected file.
- **Clean Typography**: Unsquashed, legible labels displaying up to 20-character file and folder names without premature ellipsis truncation.

---

### 3. 💻 Interactive 3D Laptop Studio

A 3D workstation built with pure CSS 3D transforms (`preserve-3d`):

- **Scroll-Driven Physics**: Smoothly opens the laptop lid as you scroll down the page.
- **Synthesized Mechanical Audio**: Real-time tactile switch audio synthesized via the browser-native **Web Audio API** (`OscillatorNode` + `GainNode`), requiring no external MP3 assets.
- **CRT Power Button (`⏻`)**: Located on the top-right of the keyboard; powers off the screen with a CRT collapse animation and dims system LEDs.
- **Window Controls**:
  - 🔴 **Red (Close / Sleep)**: Closes the laptop lid and scrolls to the top.
  - 🟡 **Yellow (Minimize)**: Minimizes to the System Overview LCD.
  - 🟢 **Green (Maximize)**: Expands the current section into a dedicated full-page view.
- **Virtual Trackpad**: Move your cursor over the laptop trackpad to control a glowing on-screen mouse pointer that interacts with buttons and microchips.

---

### 4. 📁 Codebase Explorer & ZIP Ingestion

- **Drag & Drop Archive**: Drop any ZIP archive of your project directly onto the page.
- **Multi-Language Support**: Automatically parses imports across JavaScript, TypeScript, Python, Java, Go, Rust, PHP, Ruby, and configuration files.
- **Dual Presentation Modes**:
  - **Hierarchical Tree Chart**: Subsystem org-chart with density gauges and metrics.
  - **Classic Split List**: Side-by-side folder directory tree and syntax-highlighted code editor.

---

### 5. 🔍 Failure & Stack Trace Analysis

- **Stack Trace Parser**: Paste any terminal runtime error or exception log to automatically map error frames back to source files.
- **Built-in Diagnostic Presets**:
  - `TypeError`: Analyzes undefined property reads.
  - `JWT expired`: Explains authentication token expirations.
  - `DB connection refused`: Diagnoses database pool and network connection failures.
- **Step-by-Step Resolution Guide**: Identifies the primary root-cause file and suggests immediate diagnostic steps.

---

### 6. 💥 Change Impact & Blast Radius (BFS)

- **Reverse Dependency Propagation**: Uses Breadth-First Search (BFS) over the dependency graph to determine all callers affected by a change.
- **Animated Propagation Waves**: Staggered signal delays (`--d`) visually demonstrate how failures ripple through modules.
- **Retest Recommendations**: Categorizes direct vs. indirect impacts and ranks which files to retest first.

---

### 7. 🧠 AI Insights & Test Suggestions

- **Root Cause Hypotheses**: Clear, developer-focused breakdown of architectural bottlenecks.
- **10-Bar LED Confidence Meter**: Displays verifiable confidence scores based on static analysis.
- **Cited Code Evidence**: Highlights the exact line numbers and code snippets supporting the analysis.
- **Transparency Warnings**: Outlines runtime unknowns and environment assumptions.
- **Automated Test Generation**: Generates targeted unit and integration test code snippets.

---

## 📂 Project Architecture

```
CodeArchi/
├── frontend/
│   ├── index.html                   // Cyberpunk shell with Chakra Petch & IBM Plex fonts
│   ├── package.json                 // React 19, Vite, build scripts
│   ├── vite.config.js               // Vite build setup
│   └── src/
│       ├── main.jsx                 // Application bootstrap
│       ├── App.jsx                  // Route coordinator & state manager
│       ├── index.css                // Dark cyber-hardware design system
│       │
│       ├── context/
│       │   └── projectContext.js    // Active project context (Sample or Uploaded ZIP)
│       │
│       ├── data/
│       │   ├── codebaseData.js      // Mock files, PCB coordinates & BFS impact logic
│       │   ├── failurePresets.js    // Stack trace presets & diagnostic definitions
│       │   ├── projectModel.js      // Normalized project model & circuit coordinate layout
│       │   └── projectInsights.js   // Automated insight generator
│       │
│       ├── utils/
│       │   ├── soundEffects.js      // Web Audio API keyboard & power synthesizer
│       │   ├── zipReader.js         // Client-side ZIP central-directory decompressor
│       │   └── projectAnalyzer.js   // AST & import parser for multi-language projects
│       │
│       └── components/
│           ├── Header/              // Fixed top navigation bar
│           ├── Hero/                // Hero showcase unit
│           ├── Common/
│           │   ├── CircuitBoard.jsx // 2D/3D PCB with silicon microchip switches
│           │   └── ProjectChip.jsx  // Active project status indicator
│           ├── Explorer/
│           │   ├── CodeExplorer.jsx // Laptop screen explorer component
│           │   ├── OrgTreeView.jsx  // Subsystem tree with drag-to-pan & zoom
│           │   ├── FileTree.jsx     // Classic directory tree
│           │   ├── CodeViewer.jsx   // Syntax-highlighted code editor
│           │   ├── UploadPanel.jsx  // ZIP drag & drop uploader
│           │   └── ProjectSummary.jsx // Project overview & architecture summary
│           ├── Dependency/
│           │   ├── DependencyIntelligence.jsx // Dependency circuit board view
│           │   └── DependencyTree.jsx         // Alternate tree view
│           ├── FailureAnalysis/     // Log parser & diagnostic report
│           ├── ImpactAnalysis/      // BFS blast radius visualizer
│           ├── AiInsights/          // Evidence-backed insight cards
│           └── Laptop/
│               ├── LaptopScene.jsx  // 3D CSS perspective & scroll physics
│               ├── LaptopDeck.jsx   // Mechanical keyboard & trackpad
│               ├── Trackpad.jsx     // Mouse-tracking virtual pointer
│               └── LaptopScreen.jsx // Window header bar & slide deck
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) |
| **Build Tool** | [Vite 8](https://vite.dev/) |
| **Audio Engine** | Native [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (Synthesizer) |
| **Typography** | [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) (Headings) & [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) (Body) |
| **Styling** | Vanilla CSS3 (3D Transforms, Glassmorphism, CSS Custom Properties) |
| **Archive Parsing** | Client-side zero-dependency streaming ZIP reader |

---

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or newer recommended)
- `npm` or `yarn`

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kaku-coder/CodeArchi.git
   cd CodeArchi/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local dev server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   ```
   http://localhost:5173/
   ```

### Production Build

To build an optimized production bundle:
```bash
npm run build
```

To preview the production bundle locally:
```bash
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|---|
| `1` | Jump to **Codebase Explorer** |
| `2` | Jump to **Dependency Intelligence** |
| `3` | Jump to **Failure Analysis** |
| `4` | Jump to **Change Impact Analysis** |
| `5` | Jump to **AI Insights** |
| `←` | Previous slide |
| `→` / `Enter` | Next slide |
| `Esc` | Close laptop lid & smooth scroll to top |
| `⏻` (Power Key) | Toggle **Power Shutdown** / **Boot Up** |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
