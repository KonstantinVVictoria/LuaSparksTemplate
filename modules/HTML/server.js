const express = require("express");
const path = require("path");
var http = require("http");
const app = express();
const { exec } = require("child_process");
const reload = require("reload");
const server = http.createServer(app);
const fs = require("fs");

let api_methods = [
  "post",
  "get",
  "head",
  "put",
  "delete",
  "connect",
  "options",
  "trace",
  "patch",
];

async function initialize() {
  app.use(express.static("public"));
  app.use(express.static(path.join(__dirname, "../../website/public/")));
  app.use(express.static(path.join(__dirname, "../../website/images/")));
  let api_routes = {};
  let pages = {};
  for (const method of api_methods) {
    try {
      const files = fs.readdirSync("./api/" + method + "/");
      api_routes[method] = {};
      for (file of files) {
        const func = require("../../api/" + method + "/" + file);
        const api_name = file.replace(".js", "");
        console.log(`added api ${method}/${api_name}`);
        api_routes[method][api_name] = func;
      }
    } catch (error) {}
  }

  const files = fs.readdirSync("./website/");
  for (file of files) {
    if (file.search(".html") > -1 && file.search("index") === -1) {
      const route = file.replace(".html", "");
      console.log("added route /" + route);
      const file_path = "./" + file;
      app.get("/" + route, (req, res) => {
        res.sendFile(file_path, { root: "./website" });
      });
    }
  }

  console.log("Building...");

  await new Promise((res) =>
    exec("lua build.lua", (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);

      res();
    })
  );

  for (const [method, api_list] of Object.entries(api_routes)) {
    for (const [route, api] of Object.entries(api_list)) {
      app[method]("/api/" + route, (req, res) => api(req, res));
    }
  }
  app.get("/", (req, res) => {
    res.sendFile("./index.html", { root: "./website" });
  });

  if ((process.env.NODE_ENV || "").trim() == "dev") {
    app.set("port", process.env.PORT || 3000);
    reload(app)
      .then(function (reloadReturned) {
        server.listen(app.get("port"), function () {
          console.log("Web server listening on port " + app.get("port"));
        });
      })
      .catch(function (err) {
        console.error(
          "Reload could not start, could not start server/sample app",
          err
        );
      });
  } else if ((process.env.NODE_ENV || "").trim() == "prod") {
    app.listen(3000, () => console.log("Server listening at port 3000"));
  }
}

initialize();
