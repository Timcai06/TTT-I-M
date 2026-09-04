export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    const shouldTryTs =
      error?.code === 'ERR_MODULE_NOT_FOUND' &&
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.[cm]?[jt]sx?$/.test(specifier)

    const isAuthoredTypeScript = context.parentURL?.includes('/packages/content/src/')
      || context.parentURL?.includes('/apps/studio/')

    if (!shouldTryTs || !isAuthoredTypeScript) {
      throw error
    }

    return nextResolve(`${specifier}.ts`, context)
  }
}
