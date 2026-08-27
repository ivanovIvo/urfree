import { rm } from "node:fs/promises";
import { join } from "node:path";

try {
  await rm(join(process.cwd(), ".urfree-dev-data.json"));
  console.log("Local URFree test data was reset.");
} catch (error) {
  if (error.code === "ENOENT") {
    console.log("There is no local URFree test data to reset.");
  } else {
    throw error;
  }
}
