# LuminaField - Electrostatic Sandbox

LuminaField is an interactive, browser-based physics sandbox for visualizing electric fields and potentials in real-time.

> **Suggested GitHub Repo Description:**
> ⚡ An interactive, high-performance HTML5 Canvas physics sandbox for visualizing electric fields, potentials, field lines (via RK4 tracing), and equipotential contours (via Marching Squares) with real-time charge kinematics.

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
    $$V(P) = \sum_{i} \frac{k \cdot q_i}{r_i}$$
    where $k$ is the Coulomb constant (scaled to screen pixels), $q_i$ is the charge magnitude, and $r_i$ is the distance to charge $i$.
*   **Electric Field Vector ($\vec{E}$):** Evaluated by taking the gradient of the potential, which resolves to:
    $$\vec{E}(P) = \sum_{i} \frac{k \cdot q_i}{r_i^2} \hat{r}_i$$
    where $\hat{r}_i$ is the unit vector pointing from charge $i$ to point $P$.

---

### 2. Runge-Kutta 4th Order (RK4) for Field Lines
To trace the "Silk Threads" (field lines) smoothly without accumulation errors:
*   Instead of simple Euler integration (which spirals out or diverges near singularities), LuminaField uses **Runge-Kutta 4th Order (RK4)** integration:
    $$\vec{k}_1 = f(x_n)$$
    $$\vec{k}_2 = f(x_n + \frac{h}{2}\vec{k}_1)$$
    $$\vec{k}_3 = f(x_n + \frac{h}{2}\vec{k}_2)$$
    $$\vec{k}_4 = f(x_n + h\vec{k}_3)$$
    $$x_{n+1} = x_n + \frac{h}{6}(\vec{k}_1 + 2\vec{k}_2 + 2\vec{k}_3 + \vec{k}_4)$$
    where $f(x)$ is the normalized electric field direction at location $x$, and $h$ is the integration step size.
*   Tracing stops dynamically when the path exits the screen bounds or hits the boundary radius of a charge (avoiding division by zero).

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
*   **Coulomb Forces**: Charges accelerate according to $\vec{F}_i = q_i \sum_{j \ne i} \vec{E}_j$.
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

