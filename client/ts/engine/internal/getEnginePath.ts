export function getEnginePath(relPath: string) {
  // accepts paths specified from root dir
  // puts together a path which starts from window
  return `${window.location.origin}${relPath}`;
}