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
