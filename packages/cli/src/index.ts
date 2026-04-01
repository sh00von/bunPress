#!/usr/bin/env bun
import { run } from "./main.ts";

const exitCode = await run(process.argv.slice(2));
process.exit(exitCode);
