import { Env } from "./model";

export function createDotenv(envs: Env[]) {
  return envs.map((env) => `${env.name}="${env.value}"`).join("\n");
}
