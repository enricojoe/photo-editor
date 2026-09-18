export interface ColorAdjustValues {
  brightness: number
  contrast: number
  saturation: number
}

export const DEFAULT_COLOR_ADJUST: ColorAdjustValues = {
  brightness: 0,
  contrast: 0,
  saturation: 100,
}

function centeredToPercent(value: number): number {
  return value + 100
}

export function buildCssFilter({ brightness, contrast, saturation }: ColorAdjustValues): string {
  return `brightness(${centeredToPercent(brightness)}%) contrast(${centeredToPercent(contrast)}%) saturate(${saturation}%)`
}

export interface ColorAdjustPreset {
  label: string
  values: ColorAdjustValues
}

// Approximate, tunable starting values — adjust to taste.
export const COLOR_ADJUST_PRESETS: ColorAdjustPreset[] = [
  { label: 'Normal', values: { brightness: 0, contrast: 0, saturation: 100 } },
  { label: 'Warm', values: { brightness: 8, contrast: 5, saturation: 130 } },
  { label: 'Cool', values: { brightness: 0, contrast: 10, saturation: 80 } },
  { label: 'Night', values: { brightness: -35, contrast: 15, saturation: 60 } },
  { label: 'Vintage', values: { brightness: -5, contrast: -15, saturation: 55 } },
  { label: 'B&W', values: { brightness: 0, contrast: 10, saturation: 0 } },
]
