export interface FactoredLoadMassInput {
  readonly loadMassKg: number;
  readonly guidedLoadSafetyFactor: number;
}

/**
 * The only engineering calculation this package performs before MGP graph
 * selection: turn entered mass into the graph demand mass.
 */
export function resolveFactoredLoadMassKg({
  loadMassKg,
  guidedLoadSafetyFactor,
}: FactoredLoadMassInput): number {
  return loadMassKg * guidedLoadSafetyFactor;
}
