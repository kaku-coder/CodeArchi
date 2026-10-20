# ⚡ CodeArchi — Codebase Intelligence & Failure Analysis Studio

![React](https://img.shields.io/badge/React-19.3-61dafb?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=for-the-badge&logo=vite&logoColor=white)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Synthesizer-ff9a4a?style=for-the-badge)
![CSS3 3D](https://img.shields.io/badge/CSS3_3D-Perspective-8fb8a8?style=for-the-badge)

**CodeArchi** is an interactive, cyberpunk-terminal themed developer intelligence platform built with React 19 and Vite. It maps source code architecture, traces runtime stack errors back to the source files, calculates change impact blast radiuses, and generates transparent AI insights with code evidence citations.

The application features a fully interactive **3D Laptop Studio** with scroll-driven opening physics, mechanical keyboard sound effects, an operating system window bar, and dedicated full-page high-resolution views.

---

## 🚀 Key Features

### 1. 💻 Interactive 3D Laptop Studio
- **Scroll-Driven 3D Opening**: Smoothly unfolds the laptop lid in 3D perspective (`preserve-3d`) as the user scrolls down the page.
- **Upright Eye-Level Alignment**: Balanced camera angles ensure text and graphs inside the screen remain upright, crisp, and comfortable to read.
- **Mechanical Keyboard Audio**: Real-time tactile switch click sounds synthesized via the browser-native **Web Audio API** (zero external MP3 files needed).
- **Dedicated Power / Shutdown Button (`⏻`)**:
  - Located on the top-right of the keyboard grid.
  - Clicking `⏻` triggers a CRT power-down animation, powers off the screen, and dims the chassis LED.
  - Clicking `⏻` again plays a boot chime and restores the system.
- **Window Control Dots**:
  - 🔴 **Red (Close / Sleep)**: Closes the laptop lid and smoothly scrolls to top.
  - 🟡 **Yellow (Minimize)**: Minimizes the active module back to the System Overview (Boot LCD).
  - 🟢 **Green (Maximize)**: Expands the current module into the dedicated full-page React view.
- **Interactive Trackpad**: Move your mouse across the laptop trackpad to drive an on-screen glowing virtual pointer that can click buttons and toggle IC chips.

---

### 2. 📁 Codebase Explorer
- **Directory Tree**: Browse folders and source files with language badges (`TSX · supported`, `TypeScript`, `Not analyzed`).
- **Syntax Code Viewer**: Inspect code lines with custom line numbering, formatted syntax blocks, and instant `Imports` / `Imported by` reference tags.

---

### 3. ⚡ Dependency Intelligence
- **Isometric SVG PCB Circuit Board**: Renders files as IC chips mounted on a printed circuit board with grounding planes and animated signal traces.
- **Interactive IC Switches**: Flip file switches to light up connected dependencies with animated pulsing neon wires:
  - 🟠 **Orange wires**: Files imported by the selected module.
  - 🟢 **Green wires**: Files that import the selected module.
- **Real-Time Readout**: Summarizes active relationships with glowing chip tags.

---

### 4. 🔍 Failure Analysis
- **Trace & Log Parser**: Paste any stack trace or error log to instantly identify relevant files, line numbers, and causes.
- **Built-in Presets**:
  - `TypeError`: Handles undefined property reads (`total` in `format.ts`).
  - `JWT expired`: Explains expired session tokens in `token.ts` and `session.ts`.
  - `DB refused`: Diagnoses database connection errors on port `5432` in `client.ts`.
- **Diagnostic Guide**: Outlines ranked relevant source files, potential root causes, and step-by-step investigation procedures.

---

### 5. 💥 Change Impact Analysis
- **BFS Blast Radius Visualizer**: Computes a Breadth-First Search over all reverse importers to trace which modules will be affected by a proposed edit.
- **Staggered Signal Delay**: Visualizes blast propagation with animated wire delays (`--d`).
- **Impact Summary**: Categorizes direct vs. indirect dependencies and suggests files to retest first.

---

### 6. 🧠 AI Insights & Test Suggestions
- **Root Cause Explanation**: Clear, human-readable breakdown of underlying failures.
- **10-Bar LED Confidence Meter**: Visual confidence score calculated from observable evidence.
- **Cited Code Evidence**: Highlights exact lines of code behind each hypothesis.
- **Uncertainty Warning**: Transparently declares unknown runtime factors ("What we cannot see").
- **Targeted Test Suites**: Proposes concrete automated unit and integration tests.

---

### 7. 📌 Fixed Top Navigation Bar
- Pinned to the top of the viewport (`position: fixed`) with a glassmorphism blur backdrop.
- Allows instant switching between **Home (3D Studio)** and dedicated **Full-Page Views** for Explorer, Dependencies, Failures, Impact, and AI Insights.
- Never scrolls away or obstructs content.

---

## 📂 Project Structure

```
frontend/
├── index.html                                 // HTML template with Google Fonts (Chakra Petch & IBM Plex Sans)
├── package.json                               // Project dependencies & scripts
├── vite.config.js                             // Vite configuration
└── src/
    ├── main.jsx                               // React DOM mounting point
    ├── App.jsx                                // Master application layout & state coordinator
    ├── index.css                              // Complete dark cyber-hardware stylesheet & 3D tokens
    ├── App.css                                // App-level reset styles
    │
    ├── data/
    │   ├── codebaseData.js                    // Mock files, imports graph, PCB coordinates & BFS impact logic
    │   └── failurePresets.js                  // Error trace presets, regex patterns & diagnostic data
    │
    ├── utils/
    │   └── soundEffects.js                    // Web Audio API synthesizer for tactile switch clicks & power tones
    │
    └── components/
        ├── Header/
        │   └── Header.jsx                     // Fixed top navbar with active route pills & pulsing LED
        ├── Hero/
        │   └── Hero.jsx                       // Hero showcase unit with glowing LCD brand cells
        ├── Common/
        │   └── CircuitBoard.jsx               // Reusable isometric SVG PCB with interactive IC toggle switches
        ├── Explorer/
        │   ├── CodeExplorer.jsx               // Codebase explorer layout container
        │   ├── FileTree.jsx                   // Folder directory tree
        │   └── CodeViewer.jsx                 // Code preview, line numbers & imports tags
        ├── Dependency/
        │   ├── DependencyIntelligence.jsx     // Dependency graph section container
        │   └── DependencyReadout.jsx          // Active module import/caller chips
        ├── FailureAnalysis/
        │   ├── FailureAnalysis.jsx            // Failure analyzer section container
        │   ├── PresetSelector.jsx             // Preset selector buttons (TypeError, JWT, DB)
        │   └── AnalysisResult.jsx             // Ranked files, causes & investigation steps
        ├── ImpactAnalysis/
        │   ├── ImpactAnalysis.jsx             // Change impact section container
        │   └── ImpactReadout.jsx              // Blast radius counter, direct vs indirect chips & retest guide
        ├── AiInsights/
        │   └── AiInsights.jsx                 // AI insights, 10-bar LED confidence meter & test suggestions
        ├── Laptop/
        │   ├── LaptopScene.jsx                // 3D scene physics, scroll math & camera perspective
        │   ├── LaptopDeck.jsx                 // Keyboard grid with power key & trackpad
        │   ├── Trackpad.jsx                   // Interactive virtual mouse driver
        │   └── LaptopScreen.jsx               // OS window bar, slide deck & shutdown screen
        └── Footer/
            └── Footer.jsx                     // Bottom status bar
```

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **Audio**: Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)
- **Typography**: Google Fonts — [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) (Display) & [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) (Body)
- **Styling**: Vanilla CSS3 (Custom Properties, 3D Transforms, Isometric Matrix SVG, CSS Keyframe Animations)

---

## ⚡ Getting Started

### Prerequisites
- Node.js (version 18+ recommended)
- npm or yarn

### Installation
1. Clone or open the project folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173/
   ```

### Production Build
To create an optimized production bundle:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|---|
| `1` | Jump to **Codebase Explorer** slide |
| `2` | Jump to **Dependency Intelligence** slide |
| `3` | Jump to **Failure Analysis** slide |
| `4` | Jump to **Change Impact Analysis** slide |
| `5` | Jump to **AI Insights** slide |
| `←` | Previous slide |
| `→` / `Enter` | Next slide |
| `Esc` | Close laptop lid & scroll to top |
| `⏻` (Power Key) | Toggle **Power Shutdown** / **Boot Up** |

---

## 🎮 Interactive Controls Guide

- **Scroll Down**: Smoothly opens the 3D laptop and cycles through feature slides.
- **Navbar Buttons**: Click any tab (**Home**, **Explorer**, **Dependencies**, **Failures**, **Impact**, **AI Insights**) to jump directly to dedicated full-page views.
- **Window Dots**:
  - Hover over the dots on the laptop window bar to see Mac-style symbols (`×`, `−`, `⤢`).
  - Click 🔴 **Red** to close the laptop.
  - Click 🟡 **Yellow** to minimize to the System Overview.
  - Click 🟢 **Green** to maximize into full-page view.
- **Power Button (`⏻`)**: Located on the top-right of the keyboard. Turns off the screen and shuts down the system. Click again to boot up.
- **Trackpad**: Move cursor over the laptop trackpad to control the virtual screen pointer. Click to interact with on-screen elements.
- **IC Switches**: Click any microchip on the circuit board to toggle dependencies or calculate change blast radius.

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
