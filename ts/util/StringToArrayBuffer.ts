const enc = new TextEncoder();
const dec = new TextDecoder("utf-8");

export function StringToArrayBuffer(s: string) {
  let buf = new ArrayBuffer(s.length * 2);
  let view = new DataView(buf);
  return enc.encode(s);
}

export function ArrayBufferToString(arr: ArrayBuffer) {
  let dec = new TextDecoder("utf-8");
  return dec.decode(arr);
}