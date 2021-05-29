import { expect } from "chai";
import * as express from "express";
import * as WebSocket from "ws";
import { Socket } from "net";
import { ServerSocket } from "../server/ts/net/ServerSocket";
import { PingSocket } from "../ts/net/PingSocket";
import { ReadyState } from "../ts/net/SocketLike";
import { ArrayBufferToString, StringToArrayBuffer } from "../ts/util/StringToArrayBuffer";


let conn: Promise<PingSocket>;
let resolve: (value: PingSocket | PromiseLike<PingSocket>) => void;
let reject: (value: PingSocket | PromiseLike<PingSocket>) => void;

const app = express();
const port = process.env.PORT || 8080;

const wss = new WebSocket.Server({ noServer: true });
wss.on("connection", (socket, req) => {

  // resolves conn once the connection is opened
  resolve(new PingSocket(new ServerSocket(socket)));
});

function setUp() {
  conn = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
}

const server = app.listen(port, () => {})

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, (socket as Socket), head, (websock) => {
    wss.emit("connection", websock, request);
  });
});

describe("PingSocket", function() {
  it("Should calculate ping properly", async () => {
    setUp();
    let test = new PingSocket(new ServerSocket(new WebSocket("ws://localhost:" + port)));
    test.on("error", (e: Event) => {
      throw "Socket did not connect :(";
    });
    
    let c = await conn;
    test.on("open", (e: Event) => {
      test.send(new ArrayBuffer(8));
    });

    c.send(new ArrayBuffer(8));

    let g: NodeJS.Timeout;
    let pingres: (value: string | PromiseLike<string>) => void;
    
    let prom = new Promise((res, rej) => {
      g = setTimeout(() => {
        rej("expected promise to resolve :(");
      }, 1000);

      pingres = res;
    });

    test.addEventListener('ping', () => {
      pingres("OK");
    });

    await prom;
    clearTimeout(g);
    expect(test.getPing()).to.not.be.NaN;
  });

  it("Should handle closure properly", async function() {
    setUp();
    let test = new PingSocket(new ServerSocket(new WebSocket("ws://localhost:" + port)));
    test.on("error", (e: Event) => {
      throw "Socket did not connect :(";
    });

    let c = await conn;
    test.on("open", (e: Event) => {
      test.close();
      expect(test.readyState === ReadyState.CLOSING || test.readyState === ReadyState.CLOSED).to.be.true;
    });




    await new Promise<void>((res, rej) => {
      setTimeout(() => { res() }, 100);
    });

    expect(c.readyState === ReadyState.CLOSING || c.readyState === ReadyState.CLOSED).to.be.true;
  });

  it("Should not alter the content of the message itself", async function() {
    setUp();
    let test = new PingSocket(new ServerSocket(new WebSocket("ws://localhost:" + port)));
    test.on("error", (e: Event) => {
      throw "Socket did not connect :(";
    });

    let msg = "testmessageB)";
    let buf = StringToArrayBuffer(msg);

    let c = await conn;
    c.send(buf)
    await new Promise<void>((res, rej) => {
      test.on("message", (e: MessageEvent) => {
        let result = e.data as ArrayBuffer;
        expect(ArrayBufferToString(result)).to.equal(msg);
        res();
      });
    })
  });

  after(function() {
    server.close();
    wss.close();
  });
});
