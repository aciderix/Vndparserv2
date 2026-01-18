export interface SceneFile {
  slot: number;
  filename: string;
  param: number;
  offset: number;
}

export interface InitCommand {
  id: number;
  param: string;
}

export interface InitScript {
  flag: number;
  count: number;
  commands: InitCommand[];
}

export interface SceneConfig {
  flag: number;
  ints: number[];
}

export interface HotspotCommand {
  id: number;
  subtype: number;
  param: string;
}

export interface HotspotGeometry {
  cursorId: number;
  pointCount: number;
  points: { x: number; y: number }[];
  extraFlag: number;
}

export interface Hotspot {
  index: number;
  commands: HotspotCommand[];
  geometry: HotspotGeometry;
}

export interface ParsedScene {
  id: number;
  offset: number;
  files: SceneFile[];
  initScript: InitScript;
  config: SceneConfig;
  hotspots: Hotspot[];
}

export interface ParseResult {
  scenes: ParsedScene[];
  logs: string[];
}