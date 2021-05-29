import { ShaderFileLoader } from "./ShaderFileLoader";

export class ShaderFileLoaderWeb implements ShaderFileLoader {
  constructor() {}

  async open(path: string) : Promise<string> {
    let resp = await fetch(path);
    if (resp.status < 200 || resp.status >= 400) {
      throw Error("Request for web file failed");
    }

    return await resp.text();
  }
}