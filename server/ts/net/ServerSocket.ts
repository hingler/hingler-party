import { ReadyState, SocketLike } from "../../../ts/net/SocketLike";
import * as ws from "ws";
import { SafeEventEmitter } from "../../../ts/util/SafeEventEmitter";

export class ServerSocket extends SafeEventEmitter implements SocketLike {
  socket: ws;

  constructor(socket: ws) {
    super();
    this.socket = socket;
    this.socket.addEventListener("open", this.open_.bind(this));
    this.socket.addEventListener("close", this.close_.bind(this));
    this.socket.addEventListener("message", this.message_.bind(this));
    this.socket.addEventListener("error", this.error_.bind(this));
  }

  get readyState() : ReadyState {
    switch (this.socket.readyState) {
      case this.socket.CLOSED:
        return ReadyState.CLOSED;
      case this.socket.CLOSING:
        return ReadyState.CLOSING;
      case this.socket.CONNECTING:
        return ReadyState.CONNECTING;
      case this.socket.OPEN:
        return ReadyState.OPEN;
    }
  }

  addEventListener(type: string, callback: (event: any) => void) {
    this.on(type, callback);
  }

  removeEventListener(type: string, callback: (event: any) => void) {
    this.remove(type, callback);
  }

  send(data: string | ArrayBuffer) {
    this.socket.send(data);
  }

  close(code?: number, reason?: string) {
    this.socket.close(code, reason);
  }

  private open_(e: any) {
    this.emit("open", e);
  }

  private close_(e: any) {
    this.emit("close", e);
  }

  private message_(e: {data: ws.Data}) {
    this.emit("message", e);
  }

  private error_(e: any) {
    this.emit("error", e);
  }
}