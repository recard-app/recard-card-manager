# CardManager Styling Guide

## Overview

The CardManager uses a hybrid approach combining **CSS Custom Properties (CSS Variables)** and **SCSS Variables** to provide both runtime flexibility and compile-time functionality.

## Architecture

### CSS Custom Properties (Runtime Variables)

Defined in `globals.scss` at the `:root` level. These are available:
- In JavaScript via `getComputedStyle()`
- Can be overridden dynamically
- Work across all browsers
- Cannot be used with SCSS functions like `darken()` or `rgba()`

```css
:root {
  --color-primary-blue: #1a73e8;
  --spacing-md: 16px;
  --border-radius-md: 8px;
}
```

### SCSS Variables (Compile-Time)

Defined in `variables.scss`. These reference CSS custom properties using `var()`:

```scss
$primary-blue: var(--color-primary-blue);
$spacing-md: var(--spacing-md);
```

### Raw SCSS Variables (For Functions)

Also in `variables.scss`. These are actual hex/numeric values that SCSS can manipulate:

```scss
$raw-primary-blue: #1a73e8;
$raw-error-red: #ea4335;
```

---

## Usage Guide

### ✅ Normal Usage (Use SCSS Variables)

For most styling, use the SCSS variables that reference CSS custom properties:

```scss
.my-component {
  color: $primary-blue;           // ✅ Works
  padding: $spacing-md;           // ✅ Works
  border-radius: $border-radius-md; // ✅ Works
}
```

### ✅ SCSS Functions (Use Raw Variables)

When using SCSS functions like `color.adjust()`, `color.scale()`, or `rgba()`, you **must** use raw variables:

```scss
@use 'sass:color';  // Required for color functions

.button {
  background-color: $primary-blue;  // ✅ Normal usage

  &:hover {
    // ❌ WRONG: color.adjust($primary-blue, $lightness: -10%)
    // ✅ CORRECT:
    background-color: color.adjust($raw-primary-blue, $lightness: -10%);
  }
}

.overlay {
  // ❌ WRONG: rgba($neutral-black, 0.5)
  // ✅ CORRECT:
  background-color: rgba(0, 0, 0, 0.5);
  // OR use raw variable:
  background-color: rgba($raw-neutral-gray-800, 0.5);
}
```

### ✅ Accessing in JavaScript

CSS custom properties can be accessed and modified in JavaScript:

```typescript
// Read value
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary-blue');

// Set value (e.g., for theming)
document.documentElement.style.setProperty('--color-primary-blue', '#ff0000');
```

---

## Available Variables

### Colors

| CSS Variable | SCSS Variable | Raw SCSS Variable | Value |
|--------------|---------------|-------------------|-------|
| `--color-primary-blue` | `$primary-blue` | `$raw-primary-blue` | `#1a73e8` |
| `--color-primary-blue-hover` | `$primary-blue-hover` | `$raw-primary-blue-hover` | `#1557b0` |
| `--color-success-green` | `$success-green` | `$raw-success-green` | `#34a853` |
| `--color-warning-yellow` | `$warning-yellow` | `$raw-warning-yellow` | `#fbbc04` |
| `--color-error-red` | `$error-red` | `$raw-error-red` | `#ea4335` |
| `--color-neutral-white` | `$neutral-white` | - | `#ffffff` |
| `--color-neutral-gray-100` | `$neutral-gray-100` | `$raw-neutral-gray-100` | `#f5f5f5` |
| `--color-neutral-gray-200` | `$neutral-gray-200` | `$raw-neutral-gray-200` | `#e0e0e0` |
| `--color-neutral-gray-300` | `$neutral-gray-300` | `$raw-neutral-gray-300` | `#cccccc` |
| `--color-neutral-gray-600` | `$neutral-gray-600` | `$raw-neutral-gray-600` | `#757575` |
| `--color-neutral-gray-800` | `$neutral-gray-800` | `$raw-neutral-gray-800` | `#424242` |
| `--color-neutral-black` | `$neutral-black` | - | `#000000` |

### Spacing

| CSS Variable | SCSS Variable | Value |
|--------------|---------------|-------|
| `--spacing-xs` | `$spacing-xs` | `4px` |
| `--spacing-sm` | `$spacing-sm` | `8px` |
| `--spacing-md` | `$spacing-md` | `16px` |
| `--spacing-lg` | `$spacing-lg` | `24px` |
| `--spacing-xl` | `$spacing-xl` | `32px` |

### Typography

| CSS Variable | SCSS Variable | Value |
|--------------|---------------|-------|
| `--font-family-base` | `$font-family-base` | `-apple-system, ...` |
| `--font-size-xs` | `$font-size-xs` | `12px` |
| `--font-size-sm` | `$font-size-sm` | `14px` |
| `--font-size-base` | `$font-size-base` | `16px` |
| `--font-size-lg` | `$font-size-lg` | `18px` |
| `--font-size-xl` | `$font-size-xl` | `24px` |

### Border Radius

| CSS Variable | SCSS Variable | Value |
|--------------|---------------|-------|
| `--border-radius-sm` | `$border-radius-sm` | `4px` |
| `--border-radius-md` | `$border-radius-md` | `8px` |
| `--border-radius-lg` | `$border-radius-lg` | `12px` |

### Shadows

| CSS Variable | SCSS Variable | Value |
|--------------|---------------|-------|
| `--shadow-sm` | `$shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` |
| `--shadow-md` | `$shadow-md` | `0 4px 6px rgba(0, 0, 0, 0.1)` |
| `--shadow-lg` | `$shadow-lg` | `0 10px 15px rgba(0, 0, 0, 0.1)` |

---

## File Structure

```
src/styling/
├── variables.scss  # SCSS variables (reference CSS custom properties)
├── mixins.scss     # Reusable SCSS mixins
├── globals.scss    # Global styles + CSS custom property definitions
└── README.md       # This file
```

---

## Import Pattern

Every component SCSS file should import variables and mixins:

```scss
@use '@/styling/variables' as *;
@use '@/styling/mixins' as *;

.my-component {
  // Your styles here
}
```

The `globals.scss` file is imported once in `main.tsx` and applies to the entire app.

---

## Common Patterns

### Focus States

```scss
.input {
  border: 1px solid $neutral-gray-300;

  &:focus {
    border-color: $primary-blue;
    box-shadow: 0 0 0 3px rgba($raw-primary-blue, 0.1);  // Use raw for rgba()
  }
}
```

### Hover States with Darkening

```scss
@use 'sass:color';

.button {
  background-color: $primary-blue;

  &:hover {
    background-color: color.adjust($raw-primary-blue, $lightness: -10%);  // Use raw for color.adjust()
  }
}
```

### Semi-Transparent Backgrounds

```scss
.overlay {
  background-color: rgba(0, 0, 0, 0.5);  // Direct hex for rgba()
  // OR
  background-color: rgba($raw-neutral-gray-800, 0.8);  // Use raw variable
}
```

---

## Theming (Future Enhancement)

CSS custom properties enable runtime theming:

```typescript
// Switch to dark theme
document.documentElement.style.setProperty('--color-neutral-gray-100', '#1a1a1a');
document.documentElement.style.setProperty('--color-neutral-gray-800', '#ffffff');

// Or use CSS classes
document.documentElement.classList.add('theme-dark');
```

```scss
// In globals.scss
:root.theme-dark {
  --color-neutral-gray-100: #1a1a1a;
  --color-neutral-gray-800: #ffffff;
  --color-neutral-white: #000000;
  --color-neutral-black: #ffffff;
}
```

---

## Troubleshooting

### Error: "color.adjust() argument must be a color"

**Problem**: Using CSS variable with SCSS function
```scss
// ❌ WRONG
background-color: color.adjust($primary-blue, $lightness: -10%);
```

**Solution**: Use raw SCSS variable
```scss
@use 'sass:color';

// ✅ CORRECT
background-color: color.adjust($raw-primary-blue, $lightness: -10%);
```

### Error: "rgba() argument must be a color"

**Problem**: Using CSS variable with rgba()
```scss
// ❌ WRONG
background-color: rgba($error-red, 0.5);
```

**Solution**: Use raw SCSS variable or direct hex
```scss
// ✅ CORRECT
background-color: rgba($raw-error-red, 0.5);
// OR
background-color: rgba(234, 67, 53, 0.5);
```

---

## Why This Approach?

### Benefits:

1. **Runtime Flexibility**: CSS custom properties can be changed dynamically (theming, user preferences)
2. **Compile-Time Power**: Modern SCSS color functions (color.adjust, color.scale) work with raw variables
3. **Type Safety**: SCSS variables provide better IDE autocomplete and validation
4. **Performance**: CSS custom properties have no runtime overhead
5. **Maintainability**: Single source of truth for design tokens

### Trade-offs:

- Slightly more complex (two types of variables)
- Need to remember when to use raw variables
- Can't use SCSS functions directly on CSS custom properties

---

## Best Practices

1. ✅ **Always use SCSS variables** (e.g., `$primary-blue`) for normal styling
2. ✅ **Use raw variables** (e.g., `$raw-primary-blue`) only with SCSS color functions
3. ✅ **Import `sass:color`** when using color.adjust() or color.scale()
4. ✅ **Import styling files** in every component SCSS file
5. ✅ **Don't hardcode values** - use variables for consistency
6. ❌ **Don't modify CSS custom properties** in component SCSS files (only in globals.scss)
7. ❌ **Don't create new color values** without adding to variables.scss
8. ❌ **Don't use deprecated functions** like darken() or lighten() - use color.adjust() instead

---

## Questions?

See the [TECHNICAL_IMPLEMENTATION.md](../../implementation_specs/TECHNICAL_IMPLEMENTATION.md) for more details on the overall architecture.
