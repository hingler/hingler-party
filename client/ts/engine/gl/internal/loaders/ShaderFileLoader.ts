/**
 * Interface which loads files either locally or globally.
 */
export interface ShaderFileLoader {

  /**
   * @returns a parsed representation of the desired file.
   * @param path - path to the file.
   */
  open(path: string) : Promise<string>;
}