# MBCB Formulas and Constants Documentation

This document lists all formulas and constant values used in the MBCB section calculations (W-Beam, Thrie Beam, Double W-Beam, Post, and Spacer).

---

## 📐 CONSTANT VALUES

### Universal Constants
- **Density of Steel**: `0.0000079 kg per cubic mm` (used for all parts)

### W-Beam Constants
- **Width**: `80 mm` (reference only, not used in calculations)
- **Height**: `310 mm` (reference only, not used in calculations)
- **Nominal Width**: `480 mm`
- **Length**: `4318 mm` (fixed, not user input)

### Thrie Beam Constants
- **Width**: `80 mm` (reference only, not used in calculations)
- **Height**: `502 mm` (reference only, not used in calculations)
- **Nominal Width**: `750 mm`
- **Length**: `4318 mm` (fixed, not user input)

### Post Constants
- **Width**: `150 mm` (reference only, not used in calculations)
- **Height**: `75 mm` (reference only, not used in calculations)
- **Nominal Width**: `278 mm`
- **Length**: User input (1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000 mm)

### Spacer Constants
- **Width**: `150 mm` (reference only, not used in calculations)
- **Height**: `75 mm` (reference only, not used in calculations)
- **Nominal Width**: `278 mm` (same as Post)
- **Length**: User input (330, 360 mm)

---

## 🔢 USER INPUT OPTIONS

### W-Beam & Thrie Beam
- **Thickness (mm)**: 2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55, 2.6, 2.65, 2.7, 2.75, 2.8, 2.85, 2.9, 2.95, 3.0
- **Coating GSM (g/sq.m)**: 350, 400, 450, 500, 550

### Post
- **Thickness (mm)**: 4.0, 4.05, 4.1, 4.15, 4.2, 4.25, 4.3, 4.35, 4.4, 4.45, 4.5, 4.55, 4.6, 4.65, 4.7, 4.75, 4.8, 4.85, 4.9, 4.95, 5.0
- **Length (mm)**: 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000
- **Coating GSM (g/sq.m)**: 350, 400, 450, 500, 550

### Spacer
- **Thickness (mm)**: 4.0, 4.05, 4.1, 4.15, 4.2, 4.25, 4.3, 4.35, 4.4, 4.45, 4.5, 4.55, 4.6, 4.65, 4.7, 4.75, 4.8, 4.85, 4.9, 4.95, 5.0
- **Length (mm)**: 330, 360
- **Coating GSM (g/sq.m)**: 350, 400, 450, 500, 550

---

## 📊 FORMULAS

### Common Formula Structure (All Parts)

All parts use the same formula structure with different constants:

#### 1. Black Material Weight Calculation

```
Volume (mm³) = Thickness (mm) × Nominal Width (mm) × Length (mm)

Black Material Weight (kg) = Volume (mm³) × Density of Steel (kg/mm³)
```

**Where:**
- **Density of Steel** = `0.0000079 kg per cubic mm`
- **Nominal Width** = Part-specific constant (480 mm for W-Beam/Thrie, 278 mm for Post/Spacer)
- **Length** = Fixed 4318 mm for W-Beam/Thrie, user input for Post/Spacer

#### 2. Zinc Weight Calculation

```
Surface Area (mm²) = 2 × (
    Thickness (mm) × Nominal Width (mm) +
    Nominal Width (mm) × Length (mm) +
    Length (mm) × Thickness (mm)
)

Surface Area (m²) = Surface Area (mm²) / 1,000,000

Zinc Weight (kg) = (Surface Area (m²) × Coating GSM) / 1000
```

#### 3. Total Weight Calculation

```
Total Weight (kg) = Black Material Weight (kg) + Zinc Weight (kg)
```

---

## 🔍 DETAILED FORMULAS BY PART

### W-Beam Formula

**Inputs:**
- `thicknessMm` (user input: 2.0 to 3.0 mm)
- `coatingGsm` (user input: 350, 400, 450, 500, or 550)

**Constants:**
- `nominalWidth = 480 mm`
- `length = 4318 mm` (fixed)
- `densityOfSteel = 0.0000079 kg/mm³`

**Calculations:**
```
volumeMm3 = thicknessMm × 480 × 4318
blackMaterialWeightKg = volumeMm3 × 0.0000079

surfaceAreaMm2 = 2 × (thicknessMm × 480 + 480 × 4318 + 4318 × thicknessMm)
surfaceAreaM2 = surfaceAreaMm2 / 1,000,000
zincWeightKg = (surfaceAreaM2 × coatingGsm) / 1000

totalWBeamWeightKg = blackMaterialWeightKg + zincWeightKg
```

---

### Thrie Beam Formula

**Inputs:**
- `thicknessMm` (user input: 2.0 to 3.0 mm)
- `coatingGsm` (user input: 350, 400, 450, 500, or 550)

**Constants:**
- `width = 80 mm` (reference only)
- `height = 502 mm` (reference only)
- `nominalWidth = 750 mm`
- `length = 4318 mm` (fixed)
- `densityOfSteel = 0.0000079 kg/mm³`

**Calculations:**
```
volumeMm3 = thicknessMm × 750 × 4318
blackMaterialWeightKg = volumeMm3 × 0.0000079

surfaceAreaMm2 = 2 × (thicknessMm × 750 + 750 × 4318 + 4318 × thicknessMm)
surfaceAreaM2 = surfaceAreaMm2 / 1,000,000
zincWeightKg = (surfaceAreaM2 × coatingGsm) / 1000

totalThrieBeamWeightKg = blackMaterialWeightKg + zincWeightKg
```

---

### Post Formula

**Inputs:**
- `thicknessMm` (user input: 4.0 to 5.0 mm)
- `lengthMm` (user input: 1100 to 3000 mm)
- `coatingGsm` (user input: 350, 400, 450, 500, or 550)

**Constants:**
- `nominalWidth = 278 mm`
- `densityOfSteel = 0.0000079 kg/mm³`

**Calculations:**
```
volumeMm3 = thicknessMm × 278 × lengthMm
blackMaterialWeightKg = volumeMm3 × 0.0000079

surfaceAreaMm2 = 2 × (thicknessMm × 278 + 278 × lengthMm + lengthMm × thicknessMm)
surfaceAreaM2 = surfaceAreaMm2 / 1,000,000
zincWeightKg = (surfaceAreaM2 × coatingGsm) / 1000

totalPostWeightKg = blackMaterialWeightKg + zincWeightKg
```

---

### Spacer Formula

**Inputs:**
- `thicknessMm` (user input: 4.0 to 5.0 mm)
- `lengthMm` (user input: 330 or 360 mm)
- `coatingGsm` (user input: 350, 400, 450, 500, or 550)

**Constants:**
- `nominalWidth = 278 mm` (same as Post)
- `densityOfSteel = 0.0000079 kg/mm³`

**Calculations:**
```
volumeMm3 = thicknessMm × 278 × lengthMm
blackMaterialWeightKg = volumeMm3 × 0.0000079

surfaceAreaMm2 = 2 × (thicknessMm × 278 + 278 × lengthMm + lengthMm × thicknessMm)
surfaceAreaM2 = surfaceAreaMm2 / 1,000,000
zincWeightKg = (surfaceAreaM2 × coatingGsm) / 1000

totalSpacerWeightKg = blackMaterialWeightKg + zincWeightKg
```

**Note:** Spacer uses the exact same formula as Post, just with different length options.

---

## 📝 NOTES

1. **Double W-Beam**: Uses the same W-Beam formula, just multiplied by 2 (two W-Beams per set).

2. **Fasteners**: 
   - Default mode: Fixed `2 kg` per running meter for Single W-Beam
   - Manual mode: Calculated from quantities:
     - Hex Bolt: `0.135 kg each`
     - Button Bolt: `0.145 kg each`

3. **Total Set Weight**: Calculated as:
   ```
   Total Set Weight = (W-Beam × 1) + (Post × 2) + (Spacer × 2) + Fasteners
   ```

4. **All calculations are done in millimeters (mm) and converted to kilograms (kg) for final output.**

5. **Surface area calculation uses the formula for a rectangular prism:**
   ```
   Surface Area = 2 × (length × width + width × height + height × length)
   ```
   Where:
   - `length` = part length
   - `width` = nominal width
   - `height` = thickness

---

## 📁 File Locations

- **W-Beam Calculations**: `lib/calculations/wBeamCalculations.ts`
- **Thrie Beam Calculations**: `lib/calculations/thrieBeamCalculations.ts`
- **Post Calculations**: `lib/calculations/postCalculations.ts`
- **Spacer Calculations**: `lib/calculations/spacerCalculations.ts`

---

## ✅ Summary

All MBCB calculations follow the same pattern:
1. Calculate volume using thickness × nominal width × length
2. Calculate black material weight using volume × density
3. Calculate surface area using the rectangular prism formula
4. Calculate zinc weight using surface area × coating GSM
5. Total weight = black material + zinc

The only differences between parts are:
- **Nominal width** (480 mm for W-Beam, 750 mm for Thrie Beam, 278 mm for post/spacer)
- **Length** (fixed 4318 mm for beams, user input for post/spacer)
- **Thickness range** (2.0-3.0 mm for beams, 4.0-5.0 mm for post/spacer)

