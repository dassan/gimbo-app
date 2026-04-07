# Design System Specification: The Fluid Ledger

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Concierge"**
Most financial applications feel like spreadsheets—rigid, boxed-in, and anxiety-inducing. This design system rejects the "grid-of-boxes" mentality in favor of an editorial, fluid experience. We treat financial data with the same reverence as a high-end fashion lookbook or an architectural digest. 

By leveraging intentional asymmetry, expansive white space, and **Tonal Layering**, we create a sense of "calm authority." We move away from the "app-like" density of traditional fintech and toward a sophisticated PWA that feels like a premium, personalized service.

---

## 2. Colors: Tonal Depth & Meaning
The palette is rooted in a "Pure Neutral" foundation, allowing our vibrant semantic colors to communicate status without overwhelming the user.

### Semantic Accents
*   **Primary (`#006E2F` / `#22C55E`):** Used for "Growth" and "Inflow." It is the heartbeat of the system.
*   **Tertiary (`#B91A24` / `#FF8A83`):** Used for "Outflow" and "Alerts." Use with surgical precision to avoid "danger" fatigue.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
*   Boundaries must be defined by background color shifts (e.g., a `surface-container-low` card resting on a `surface` background).
*   Structure is created through **proximity** and **value contrast**, not lines. This eliminates visual noise and keeps the interface "frictionless."

### Glass & Gradient Soul
To prevent the UI from feeling "flat" or "bootstrap," apply these signature treatments:
*   **Hero Gradients:** Use a subtle linear transition from `primary` to `primary_container` for high-impact CTA areas.
*   **Glassmorphism:** For floating navigation bars or modal overlays, use `surface` at 80% opacity with a `24px` backdrop-blur. This tethers the element to the content beneath it.

---

## 3. Typography: Editorial Clarity
We utilize **Inter** for its mathematical precision and neutral character. In a financial context, legibility of figures is the highest priority.

*   **Display (L/M/S):** Large, airy, and bold. Used for total net worth or primary balances. These should feel like "headlines" in a magazine.
*   **Headline & Title:** Used to categorize data. Use `headline-sm` for card titles to give them an authoritative presence.
*   **Body & Labels:** High-contrast `on_surface` (`#191C1D`) for maximum readability. Labels should use `label-md` in all-caps with `0.05rem` letter spacing to denote "metadata" status.

---

## 4. Elevation & Depth: Tonal Layering
We move beyond the 2014-era drop shadow. Hierarchy is achieved through the physical stacking of surfaces.

### The Layering Principle
*   **Level 0 (Foundation):** `surface` (`#F8F9FA`).
*   **Level 1 (Sections):** `surface_container_low` (`#F3F4F5`).
*   **Level 2 (Cards/Actions):** `surface_container_lowest` (`#FFFFFF`).
*   *Note:* By placing a pure white card on a light gray section, you create "lift" naturally.

### Ambient Shadows
When a "Floating" state is required (e.g., an Active FAB or a Modal):
*   **Shadow:** `0px 20px 40px rgba(25, 28, 29, 0.06)`.
*   The shadow is ultra-diffused and tinted with the `on_surface` color to mimic natural light refraction through glass.

### The "Ghost Border" Fallback
If contrast testing fails for accessibility, use a **Ghost Border**: `outline_variant` at **15% opacity**. It should be felt, not seen.

---

## 5. Components: The Building Blocks

### Buttons
*   **Primary:** High-gloss. Gradient background (`primary` to `primary_container`) with `xl` (1.5rem) corner radius.
*   **Secondary:** `surface_container_high` background with `on_surface` text. No border.
*   **States:** On hover, increase the surface brightness by 5%. On press, scale the component to 0.98.

### Data Cards
*   **Constraint:** Never use a divider line between transactions.
*   **Separation:** Use `1.5rem` of vertical white space or a subtle background toggle between `surface_container_low` and `surface_container_highest`.
*   **Edge:** Use `lg` (1rem) to `xl` (1.5rem) corner radius to reinforce the "Soft Minimalism" persona.

### Input Fields
*   **Style:** Minimalist "Underline" or "Filled" style using `surface_container_high`. 
*   **Focus:** Instead of a heavy border, use a `2px` `primary` glow or increase the background brightness.

### The "Pulse" Chip
For active budgets or live tracking, use a chip with a `surface_container` background and a small, animated 4px dot of `primary` or `tertiary` to signify "Live" data.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts for dashboards (e.g., a wide 2/3 column for main charts and a narrow 1/3 column for recent activity).
*   **Do** embrace negative space. If a screen feels "empty," it's likely working.
*   **Do** use `body-lg` for financial numbers to ensure they are the most readable element on the page.

### Don't
*   **Don't** use 100% black (`#000000`). Use `on_surface` for text to keep the look "premium charcoal."
*   **Don't** use "hard" corners. Nothing in this system should be less than `0.5rem` (sm) radius.
*   **Don't** use "Standard" icons. Select a thin-stroke (1.5pt) icon set that matches Inter's geometric weight.
