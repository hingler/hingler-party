export function getEnginePath(relPath: string) {
  // accepts paths specified from root dir
  // puts together a path which starts from window
  let prefix = window.location.href;
  // trailing slash is sometimes missing
  if (prefix.charAt(prefix.length - 1) !== '/') {
    prefix = prefix + '/';
  }
  return `${prefix}../`;
}