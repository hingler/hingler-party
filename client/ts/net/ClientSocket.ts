import { ReadyState, SocketLike } from "../../../ts/net/SocketLike";
import { SafeEventEmitter } from "../../../ts/util/SafeEventEmitter";

export class ClientSocket extends SafeEventEmitter implements SocketLike {
  socket: WebSocket;
  closeEvent: (e: Event) => void;
  reconnect: boolean;
  url: string;

  // TODO: PingSocket wrapper obscures disconnect/reconnect events.
  constructor(url: string) {
    super();
    this.socket = new WebSocket(url);
    this.url = url;
    this.closeEvent = this.close_.bind(this);

    // set up our event listeners
    this.socket.addEventListener("error", this.error_.bind(this));
    this.socket.addEventListener("open", this.open_.bind(this));
    this.socket.addEventListener("message", this.message_.bind(this));
    this.socket.addEventListener("close", this.close_.bind(this));
  }

  addEventListener(type: string, callback: (event: any) => void) {
    this.on(type, callback);
  }

  removeEventListener(type: string, callback: (event: any) => void) {
    this.remove(type, callback);
  }

  /**
   * Determines whether or not this socket should attempt to reconnect automatically on disconnect.
   * 
   * Defaults to true.
   * @param rc - true if the socket should attempt to reconnect, false otherwise.
   */
  setReconnect(rc: boolean) {
    this.reconnect = rc;
  }

  send(data: string | ArrayBufferLike) {
    this.socket.send(data);
  }

  close() {
    this.reconnect = false;
    this.socket.close();
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

  private open_(e: Event) {
    this.emit("open", e);
  }

  private close_(e: Event) {
    if (this.reconnect) {
      this.emit("disconnect", e);
      this.reconnect_();
    } else {
      this.emit("close", e);
    }
  }

  private message_(e: Event) {
    this.emit("message", e);
  }

  private error_(e: Event) {
    console.error("Something horrible happened");
    console.error(e);
    this.emit("error", e);
  }

  private reconnect_() {
    this.socket = new WebSocket(this.url);

    let errHandler = (e: Event) => {
      // TODO: reconnect method should work a bit better.
      console.error("Failed to reconnect!");
      console.error(e);
      this.emit("error", e);
    }

    this.socket.addEventListener("error", errHandler);

    this.socket.addEventListener("open", (eo: Event) => {
      console.log("reconnected!");
      this.emit("reconnect", eo);
      this.socket.removeEventListener("error", errHandler);
      this.socket.addEventListener("error", this.error_.bind(this));
      this.socket.addEventListener("message", this.message_.bind(this));
      this.socket.addEventListener("close", this.close_.bind(this));
    });
  }
}