/** Opt-in development diagnostics. Enable with `globalThis.__RDN_EFFECT_DEBUG__ = true`. */
export const isEffectDebugEnabled = (): boolean => (globalThis as typeof globalThis & { __RDN_EFFECT_DEBUG__?: boolean }).__RDN_EFFECT_DEBUG__ === true;

export const logEffectDebug = (message: string, details: unknown): void => {
  if (isEffectDebugEnabled()) console.info(`[RDN Effect Debug] ${message}`, details);
};
