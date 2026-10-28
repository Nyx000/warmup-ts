import { beforeEach, mock } from "bun:test";
import * as pointScript from "./fake-point-script";

mock.module("cs_script/point_script", () => pointScript);

beforeEach(() => pointScript.engine.reset());
