# Fonts

The page uses its own copies of these fonts, so it loads nothing from other sites.

| File | Font | Used for | Licence |
|---|---|---|---|
| `bigshouldersstencil.woff` | Big Shoulders Stencil 2.001 (Patric King, XXIX), variable weight | Title, module names, the big Z readout | SIL OFL 1.1 |
| `b612-regular.woff`, `b612-bold.woff`, `b612-italic.woff` | B612 1.008 (Airbus, Intactile Design, Nicolas Chauveau) | Labels, buttons, text, and every number: readouts, tables, chart axes (its digits are all one width, so columns line up) | SIL OFL 1.1 |
| `b612mono-regular.woff`, `b612mono-bold.woff` | B612 Mono 1.008 (same designers) | Module numbers and step numbers | SIL OFL 1.1 |

B612 was designed for Airbus cockpit displays, which is why it stays readable at small sizes. Big Shoulders Stencil echoes the stencilled lettering on oilfield equipment.

The licence texts are in [licenses/](licenses/). The files come from the Google Fonts repository (`github.com/google/fonts`) and were repackaged from TTF to WOFF with fontTools. WOFF only compresses the font tables, so the glyphs, metrics and names are unchanged; nothing was subset or edited.
