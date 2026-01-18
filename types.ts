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
  interpreted?: {
    opcodeInfo?: {
      name: string;
      description: string;
    };
    parsedParam?: {
      type?: string;
      file?: string;
      args?: string[];
      condition?: string;
      action?: string;
      targetFile?: string;
      targetScene?: number;
      value?: number;
      opcode?: string;
    };
  };
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

export interface VNDMetadata {
  version?: string;
  engine?: string;
  publisher?: string;
  resolution?: {
    width: number;
    height: number;
    colorDepth: number;
  };
  indexId?: number;
}

export interface ParseResult {
  metadata?: VNDMetadata;
  scenes: ParsedScene[];
  logs: string[];
}