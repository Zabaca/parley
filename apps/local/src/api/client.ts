import { initClient } from "@ts-rest/core";
import { contract } from "@parley/shared/contract";

export const api = initClient(contract, {
  baseUrl: process.env.PLATFORM_URL ?? "http://localhost:3000",
  baseHeaders: {},
});
