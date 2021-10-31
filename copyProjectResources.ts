const fse = require("fs-extra");

if (process.argv.length >= 3) {
  const projectRoot = __dirname;
  const engineResourcesFolder = `${projectRoot}/res-engine`;
  console.log(process.argv);
  
  fse.copy(engineResourcesFolder, `${process.argv[2]}/engine`);
} else {
  console.error("USAGE: [path-to-exe] [project root]")
}

