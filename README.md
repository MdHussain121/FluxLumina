# LuminaField - Electrostatic Sandbox

LuminaField is a **physics simulation project** designed to visualize and interact with electrostatic fields, potentials, and charge dynamics in real-time. It provides an intuitive, visual medium to explore electromagnetic theory, numerical integration, and grid-based contouring.

> **Suggested GitHub Repo Description:**
> ⚡ A physics simulation project and interactive HTML5 Canvas sandbox for visualizing electric fields, potentials, field lines (via RK4 tracing), and equipotential contours (via Marching Squares) with real-time charge kinematics.

---

## 🔬 Interactive Experiments
LuminaField comes pre-loaded with several physical setups:
*   **Electric Dipole**: Equal and opposite charges demonstrating simple electrostatic pairing.
*   **Quadrupole**: Four charges in alternating configuration producing complex quadrupolar decay.
*   **Parallel Plate Capacitor**: Dual plates of uniform positive and negative charge densities simulating uniform fields.
*   **Faraday Ring**: A ring of positive charges demonstrating field cancellation in the center.
*   **Crystal Lattice**: A grid of alternating charges demonstrating electrostatic binding/crystallography.
*   **Orbit**: A heavy central charge with lighter orbiting charges illustrating planetary electrostatic orbits.
*   **Scattering (Rutherford-like)**: Positive charges fired at a massive positive nucleus showing trajectory deflection.

---

## 🧮 Physics & Core Algorithms

### 1. Electrostatics & Superposition Principle
The simulation uses Coulomb's law and the superposition principle to calculate electrostatic forces at any point:
*   **Electric Potential ($V$):** Evaluated at a coordinate $P$ by summing the scalar potentials from all charges:
    $$V(P) = \sum_{i} \frac{k_e \cdot q_i}{r_i}$$
    where $k_e$ is the Coulomb constant (scaled to screen pixels), $q_i$ is the charge magnitude, and $r_i$ is the distance to charge $i$.
*   **Electric Field Vector ($\vec{E}$):** Evaluated by taking the gradient of the potential, which resolves to:
    $$\vec{E}(P) = \sum_{i} \frac{k_e \cdot q_i}{r_i^2} \hat{r}_i$$
    where $\hat{r}_i$ is the unit vector pointing from charge $i$ to point $P$.

---

### 2. Runge-Kutta 4th Order (RK4) for Field Lines
To trace the field lines ("Silk Threads") smoothly without accumulating numerical integration errors:
*   Instead of simple Euler integration (which diverges quickly near charges), LuminaField uses the **Runge-Kutta 4th Order (RK4)** integration method to calculate the field line path:
    $$
    \begin{aligned}
    \vec{k}_1 &= \vec{f}(\vec{x}_n) \\
    \vec{k}_2 &= \vec{f}\left(\vec{x}_n + \frac{h}{2}\vec{k}_1\right) \\
    \vec{k}_3 &= \vec{f}\left(\vec{x}_n + \frac{h}{2}\vec{k}_2\right) \\
    \vec{k}_4 &= \vec{f}(\vec{x}_n + h\vec{k}_3) \\
    \vec{x}_{n+1} &= \vec{x}_n + \frac{h}{6}(\vec{k}_1 + 2\vec{k}_2 + 2\vec{k}_3 + \vec{k}_4)
    \end{aligned}
    $$
    where $\vec{f}(\vec{x})$ is the normalized electric field vector direction at location $\vec{x}$, and $h$ is the integration step size.
*   Tracing stops dynamically when the path exits the screen bounds or enters the boundary radius of a charge (avoiding division-by-zero singularities).

---

### 3. Marching Squares for Equipotential Contours
To render continuous voltage lines (contours where $V = \text{const}$):
*   **Grid Sampling**: The viewport potential is mapped to a grid.
*   **Binary Threshold States**: Each cell corner is categorized as active (potential $\ge$ threshold) or inactive ($<$ threshold), forming a 4-bit state index ($0$ to $15$).
*   **Saddle Point Resolution**: For ambiguous states ($5$ and $10$), the average center value of the cell is evaluated to determine contour connectivity.
*   **Linear Interpolation**: Line endpoints on cell edges are calculated using linear interpolation of the boundary potentials to draw mathematically precise curves:
    $$t_{interp} = \frac{V_{target} - V_1}{V_2 - V_1}$$

---

### 4. Kinematics & Collision Dynamics
When kinematics are enabled, charges move dynamically based on the electrostatic forces they exert on one another:
*   **Coulomb Forces**: Charges accelerate according to the electrostatic force vector:
    $$\vec{F}_i = q_i \sum_{j \ne i} \vec{E}_j$$
*   **Singularity Softening**: A softening factor $r_0^2$ is added to the distance calculation to prevent infinite forces (singularities) during close encounters:
    $$F \propto \frac{q_1 q_2}{r^2 + r_0^2}$$
*   **Elastic Overlaps & Damping**: Near-contact interactions ($r < r_{collision}$) trigger boundary restoration forces and velocity damping (friction) to simulate inelastic collisions or charge sticking.

---

## 🛠️ Tech Stack
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Rendering**: HTML5 Canvas (dual-layer foreground/background layout for performance optimization)

---

## 🚀 Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
