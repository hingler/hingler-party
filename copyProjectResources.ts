import fse = require("fs-extra");

if (process.argv.length >= 2) {
  const projectRoot = __dirname;
  const engineResourcesFolder = `${projectRoot}/res-engine`;
  
  fse.copy(engineResourcesFolder, `${process.argv[1]}/engine`);
} else {
  console.error("USAGE: [path-to-exe] [project root]")
}

