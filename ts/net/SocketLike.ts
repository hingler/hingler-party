import * as ws from "ws";

export enum ReadyState {
  CLOSED,
  CLOSING,
  CONNECTING,
  OPEN
};

/**
 * Simple wrapper for sockets (for now)
 */
export interface SocketLike {
  readyState: ReadyState;

  addEventListener(type: 'message', callback: (event: {
    data: any;
  }) => void) : void;

  removeEventListener(type: 'message', callback: (event: {
    data: any;
  }) => void) : void;

  addEventListener(type: 'close', callback: (event: {
    code: number,
    reason: string,
    wasClean: boolean
  }) => void) : void;

  removeEventListener(type: 'close', callback: (event: {
    code: number,
    reason: string,
    wasClean: boolean
  }) => void) : void;

  addEventListener(type: 'error', callback: (event: {
    error: any,
    message: any
  }) => void) : void;

  removeEventListener(type: 'error', callback: (event: {
    error: any,
    message: any
  }) => void) : void;

  addEventListener(type: 'open', callback: (event: {}) => void) : void;
  removeEventListener(type: 'open', callback: (event: {}) => void) : void;

  // generic event listener
  addEventListener(type: string, callback: (...args: any) => void) : void;

  send(data: string | ArrayBufferLike) : void;
  close(code?: number, reason?: string): void;
}