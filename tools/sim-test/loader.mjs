// Node ESM loader hook: resolves the bare `simulations/...` specifier scene
// files use (the same one the real engine's import map resolves) to this
// kit's vendored copy, so a scene file runs unmodified under plain Node.
// Also resolves the root-absolute `/vendor/...` specifiers SimGeo.js dynamic-
// imports (e.g. `import('/vendor/d3.js')`, matching how the real engine app
// and preview-harness.html both serve `/vendor/` from their own root) to this
// kit's own `simulations-kit/vendor/` copy - Node has no HTTP root for a bare
// `/vendor/d3.js` to resolve against otherwise.
const BASE = new URL('../../simulations-kit/src/simulations/', import.meta.url);
const VENDOR_BASE = new URL('../../simulations-kit/vendor/', import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('simulations/')) {
    return next(new URL(specifier.slice('simulations/'.length), BASE).href, context);
  }
  if (specifier.startsWith('/vendor/')) {
    return next(new URL(specifier.slice('/vendor/'.length), VENDOR_BASE).href, context);
  }
  return next(specifier, context);
}
