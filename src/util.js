export function validateMutationName(name) {
  return /^[A-Z_]+$/.test(name)
}
