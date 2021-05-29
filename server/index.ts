import * as express from "express";

const app = express();
const port = process.env.PORT || 8080;

let args = process.argv;

let hostedDir = "client";
if (args[2]) {
  hostedDir = args[2];
}

express.static.mime.define({
  'text/javascript': ['js'],
  'text/plain': ['glsl', 'frag', 'vert']
});

console.log("dingus");


app.get("/", (req, res) => {
  res.send("ok");
})

app.use(express.static(hostedDir));


const server = app.listen(port, () => {
  console.log("death grips is online");
});