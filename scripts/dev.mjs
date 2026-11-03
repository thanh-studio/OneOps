// import { spawn, spawnSync } from "node:child_process";
// import path from "node:path";
// import { fileURLToPath } from "node:url";
// import { existsSync, readFileSync } from "node:fs";
// import { parseEnv } from "node:util";
// const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// process.chdir(root);
// // API owns its environment; web only knows API_ORIGIN, never DATABASE_URL.
// if (existsSync("apps/api/.env")) {
//   for (const [name, value] of Object.entries(
//     parseEnv(readFileSync("apps/api/.env", "utf8")),
//   ))
//     process.env[name] ??= value;
// }
// const production = process.argv.includes("--production");
// if (!production) {
//   const result = spawnSync("npm", ["run", "prepare:dev"], { stdio: "inherit" });
//   if (result.status !== 0) process.exit(result.status || 1);
// }
// const children = [];
// let stopping = false;
// function stop(code = 0) {
//   if (stopping) return;
//   stopping = true;
//   for (const child of children) {
//     try {
//       if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
//       else child.kill("SIGTERM");
//     } catch (error) {
//       if (error.code !== "ESRCH") throw error;
//     }
//   }
//   process.exitCode = code;
// }
// for (const [workspace, port] of [
//   ["@oneops/api", process.env.API_PORT || "4000"],
//   ["@oneops/web", process.env.WEB_PORT || "3002"],
// ]) {
//   const args = [
//     "run",
//     production ? "start" : "dev",
//     "-w",
//     workspace,
//     ...(workspace === "@oneops/web" ? ["--", "--port", port] : []),
//   ];
//   const childEnv = {
//     ...process.env,
//     PORT: port,
//     API_ORIGIN:
//       process.env.API_ORIGIN ||
//       `http://127.0.0.1:${process.env.API_PORT || 4000}`,
//   };
//   if (workspace === "@oneops/web") delete childEnv.DATABASE_URL;
//   const child = spawn("npm", args, {
//     detached: process.platform !== "win32",
//     stdio: "inherit",
//     env: childEnv,
//   });
//   children.push(child);
//   child.on("exit", (code) => {
//     if (!stopping) stop(code || 1);
//   });
// }
// process.on("SIGINT", () => stop());
// process.on("SIGTERM", () => stop());
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

process.chdir(root);

// Load environment variables from API
if (existsSync("apps/api/.env")) {
  const env = parseEnv(
    readFileSync("apps/api/.env", "utf8"),
  );

  for (const [name, value] of Object.entries(env)) {
    process.env[name] ??= value;
  }
}

// Prepare development environment
const prepare = spawnSync(
  "npm",
  ["run", "prepare:dev"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (prepare.status !== 0) {
  process.exit(prepare.status || 1);
}

// Start API and Web
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;

  stopping = true;

  for (const child of children) {
    try {
      if (process.platform !== "win32") {
        process.kill(-child.pid, "SIGTERM");
      } else {
        child.kill("SIGTERM");
      }
    } catch (error) {
      if (error.code !== "ESRCH") {
        console.error(error);
      }
    }
  }

  process.exitCode = code;
}

const services = [
  {
    workspace: "@oneops/api",
    port: process.env.API_PORT || "4000",
  },
  {
    workspace: "@oneops/web",
    port: process.env.WEB_PORT || "3002",
  },
];

for (const { workspace, port } of services) {
  const args = [
    "run",
    "dev",
    "-w",
    workspace,
    ...(workspace === "@oneops/web"
      ? ["--", "--port", port]
      : []),
  ];

  const childEnv = {
    ...process.env,
    PORT: port,
    API_ORIGIN:
      process.env.API_ORIGIN ||
      `http://127.0.0.1:${process.env.API_PORT || 4000}`,
  };

  // Web must not access DATABASE_URL
  if (workspace === "@oneops/web") {
    delete childEnv.DATABASE_URL;
  }

  const child = spawn("npm", args, {
    detached: process.platform !== "win32",
    stdio: "inherit",
    env: childEnv,
    shell: process.platform === "win32",
  });

  children.push(child);

  child.on("error", (error) => {
    console.error(`Failed to start ${workspace}:`, error);
    stop(1);
  });

  child.on("exit", (code) => {
    if (!stopping) {
      stop(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());