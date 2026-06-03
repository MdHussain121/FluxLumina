# LuminaField - Electrostatic Sandbox

LuminaField is an interactive, browser-based physics sandbox for visualizing electric fields and potentials.

## Features
- **Real-time Simulation**: Interactive charges with kinematics and collision detection.
- **Visual Layers**:
  - **Vector Fields**: Direction and magnitude of electric field vectors.
  - **Equipotential Contours**: Marching squares algorithm for voltage mapping.
  - **Field Lines**: Runge-Kutta 4th order tracing of electric force lines.
  - **Potential Heatmap**: Radial gradients for intuitive energy visualization.
- **Experiments**: Pre-configured setups like dipoles, capacitors, and Faraday rings.
- **Probe Tool**: Inspect potential and field strength at any point on the canvas.

## Tech Stack
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Rendering**: HTML5 Canvas (dual-layer foreground/background)

## Getting Started
1. `npm install`
2. `npm run dev`
