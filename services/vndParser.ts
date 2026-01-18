import { ParseResult, ParsedScene, SceneFile, InitScript, SceneConfig, Hotspot, HotspotCommand } from '../types';

export class VNDSequentialParser {
  private data: DataView;
  private uint8Data: Uint8Array;
  private offset: number = 0;
  private logs: string[] = [];
  private textDecoder: TextDecoder;

  constructor(buffer: ArrayBuffer) {
    this.data = new DataView(buffer);
    this.uint8Data = new Uint8Array(buffer);
    this.textDecoder = new TextDecoder('windows-1252'); // Close equivalent to latin-1
  }

  private log(message: string) {
    this.logs.push(message);
    console.log(message);
  }

  private sanitizeString(str: string): string {
    // Remove control characters and extended weirdness if needed, keep basic printable
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '.');
  }

  private readU8(): number {
    if (this.offset + 1 > this.data.byteLength) {
      throw new Error(`Cannot read u8 at offset 0x${this.offset.toString(16).toUpperCase()}`);
    }
    const val = this.data.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  private readU32(): number {
    if (this.offset + 4 > this.data.byteLength) {
      throw new Error(`Cannot read u32 at offset 0x${this.offset.toString(16).toUpperCase()}`);
    }
    const val = this.data.getUint32(this.offset, true); // little-endian
    this.offset += 4;
    return val;
  }

  private readI32(): number {
    if (this.offset + 4 > this.data.byteLength) {
      throw new Error(`Cannot read i32 at offset 0x${this.offset.toString(16).toUpperCase()}`);
    }
    const val = this.data.getInt32(this.offset, true); // little-endian
    this.offset += 4;
    return val;
  }

  private readPascalString(): string {
    const startOffset = this.offset;
    const length = this.readU32();

    if (length === 0) {
      return "";
    }

    if (length > 5000) {
       throw new Error(`String length sanity check failed: ${length} at 0x${startOffset.toString(16).toUpperCase()}`);
    }

    if (this.offset + length > this.data.byteLength) {
      throw new Error(`Cannot read string of length ${length} at offset 0x${startOffset.toString(16).toUpperCase()}`);
    }

    const stringBytes = this.uint8Data.slice(this.offset, this.offset + length);
    this.offset += length;

    try {
      const decoded = this.textDecoder.decode(stringBytes);
      return this.sanitizeString(decoded);
    } catch (e) {
      return "[Decoding Error]";
    }
  }

  private readFilename(): string {
    const startOffset = this.offset;
    const length = this.readU32();

    if (length === 0) {
      return "";
    }

    // Quirk Fix: Scene 2 Alignment Issue.
    if (length === 1) {
        if (this.offset < this.data.byteLength) {
            const byte = this.readU8(); 
            if (byte === 0) {
                this.log(`    ℹ️ Quirk: Filename length 1 with value 0x00 at 0x${startOffset.toString(16).toUpperCase()}. Backtracking.`);
                this.offset -= 1; // Backtrack! The 0x00 belongs to the next param.
                return ""; 
            } else {
                return this.textDecoder.decode(new Uint8Array([byte]));
            }
        }
    }

    if (length > 5000) {
       throw new Error(`Filename length sanity check failed: ${length} at 0x${startOffset.toString(16).toUpperCase()}`);
    }

    if (this.offset + length > this.data.byteLength) {
      throw new Error(`Cannot read filename of length ${length} at offset 0x${startOffset.toString(16).toUpperCase()}`);
    }

    const stringBytes = this.uint8Data.slice(this.offset, this.offset + length);
    this.offset += length;

    try {
      const decoded = this.textDecoder.decode(stringBytes);
      return this.sanitizeString(decoded);
    } catch (e) {
      return "[Decoding Error]";
    }
  }

  private findSequence(sequence: Uint8Array, startOffset: number = 0): number {
    for (let i = startOffset; i < this.uint8Data.length - sequence.length; i++) {
      let match = true;
      for (let j = 0; j < sequence.length; j++) {
        if (this.uint8Data[i + j] !== sequence[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }

  private skipHeader() {
    const vnfileSig = new TextEncoder().encode('VNFILE');
    const vnfilePos = this.findSequence(vnfileSig);

    if (vnfilePos === -1) {
      this.log("⚠️ Signature VNFILE non trouvée");
      return;
    }

    this.log(`✓ Signature VNFILE @ 0x${vnfilePos.toString(16).toUpperCase().padStart(8, '0')}`);

    const musicWavSig = new TextEncoder().encode('music.wav');
    const musicPos = this.findSequence(musicWavSig);

    if (musicPos !== -1) {
      const potentialLengthPos = musicPos - 4;
      if (potentialLengthPos >= 0) {
        const length = this.data.getUint32(potentialLengthPos, true);
        if (length === 9) { 
          // Structure: [Separator 1b] [Slot 1 (8b)] [Slot 2 (Len+String+Param)]
          // We are at Slot 2 Len.
          // Backtrack 8 bytes (Slot 1) + 1 byte (Separator) = 9 bytes.
          const sceneStart = potentialLengthPos - 9;
          this.log(`✓ Début estimé des scènes @ 0x${sceneStart.toString(16).toUpperCase().padStart(8, '0')}`);
          this.offset = sceneStart;
          return;
        }
      }
    }

    this.offset = vnfilePos + 300;
    this.log(`⚠️ Utilise fallback @ 0x${this.offset.toString(16).toUpperCase().padStart(8, '0')}`);
  }

  // Heuristic to check if a buffer looks like a valid filename string
  private isValidFilenameBytes(bytes: Uint8Array): boolean {
      for (let i = 0; i < bytes.length; i++) {
          const b = bytes[i];
          if (b < 32 && b !== 0) return false; 
      }
      return true;
  }

  private getValidFileCountInScene(offset: number): number {
    if (offset + 1 > this.data.byteLength) return -1;
    if (this.data.getUint8(offset) !== 0) return -1;

    let currentOffset = offset + 1; // Start of Slot 1 Length
    let validFileCount = 0;
    let hasExtensionCount = 0;

    for (let i = 0; i < 8; i++) {
        if (currentOffset + 4 > this.data.byteLength) return -1;
        const len = this.data.getUint32(currentOffset, true);
        currentOffset += 4; 

        if (len > 5000) return -1; 

        if (len === 1) {
             if (currentOffset + 1 > this.data.byteLength) return -1;
             const byte = this.data.getUint8(currentOffset);
             if (byte === 0) {
                 currentOffset -= 0; 
             } else {
                 currentOffset += 1; 
                 validFileCount++;
             }
        } else if (len > 0) {
             if (currentOffset + len > this.data.byteLength) return -1;
             const start = currentOffset;
             const end = Math.min(start + len, this.data.byteLength);
             const nameBytes = this.uint8Data.slice(start, end);
             const nameStr = this.textDecoder.decode(nameBytes);
             
             if (nameStr.includes(" = ") || nameStr.includes(" then ") || nameStr.startsWith("if ") || nameStr.includes("addbmp ") || nameStr.includes("playwav ") || nameStr.includes("<") || nameStr.includes(">")) {
                 return -1;
             }

             const lowerName = nameStr.toLowerCase();
             if (lowerName.match(/\.(bmp|wav|avi|dll|vnp|htm|exe|ico|cur)$/)) {
                 hasExtensionCount++;
             }

             if (!this.isValidFilenameBytes(nameBytes)) {
                 if (i === 0) return -1;
                 else break;
             }

             if (len === 5 && nameStr === "Empty") {
             }
             else if (i === 0) {
                 if (lowerName.endsWith('.vnp') || lowerName.includes('.vnp ')) return -1;
             }

             currentOffset += len;
             validFileCount++;
        }
        
        if (currentOffset + 4 > this.data.byteLength) return -1;
        const param = this.data.getUint32(currentOffset, true);
        if (param > 1000000) return -1; 

        currentOffset += 4; 
    }

    if (validFileCount === 0) return -1;
    if (hasExtensionCount === 0) return -1;

    return validFileCount;
  }

  private parseSceneFiles(sceneNum: number): SceneFile[] {
    const files: SceneFile[] = [];
    const configSig = [0xDB, 0xFF, 0xFF, 0xFF];

    for (let slot = 1; slot <= 8; slot++) {
      if (this.offset + 4 > this.data.byteLength) break;

      const len = this.data.getUint32(this.offset, true);
      
      if (len > 5000) {
          this.log(`    ℹ️ Slot ${slot}: Length ${len} too large. Stopping file parsing.`);
          break;
      }

      // Structure Guard
      const searchEnd = Math.min(this.offset + 4 + len + 8, this.data.byteLength); 
      let foundSig = false;
      for (let i = this.offset; i < searchEnd - 3; i++) {
          if (this.uint8Data[i] === configSig[0] &&
              this.uint8Data[i+1] === configSig[1] &&
              this.uint8Data[i+2] === configSig[2] &&
              this.uint8Data[i+3] === configSig[3]) {
              foundSig = true;
              break;
          }
      }

      if (foundSig) {
          this.log(`    ℹ️ Slot ${slot}: Config signature detected ahead. Stopping file parsing.`);
          break;
      }

      if (len > 0) {
          const nameBytes = this.uint8Data.slice(this.offset + 4, this.offset + 4 + len);
          if (!this.isValidFilenameBytes(nameBytes)) {
              this.log(`    ℹ️ Slot ${slot}: Filename contains binary control characters. Assuming end of files.`);
              break;
          }
          if (len === 5) {
              const name = this.textDecoder.decode(nameBytes);
              if (name === "Empty") {
                  // Consumed below
              }
          }
      }

      const fileOffset = this.offset;
      const filename = this.readFilename();
      const param = this.readU32();

      if (filename !== "Empty" && filename !== "") {
          files.push({ slot, filename, param, offset: fileOffset });
          let label = `Slot ${slot}`;
          if (slot === 1) label = "Titre";
          else label = `Fichier ${slot - 1}`;
          this.log(`    ${label} @ 0x${fileOffset.toString(16).toUpperCase().padStart(8, '0')}: '${filename}' (param=${param})`);
      } else if (filename === "Empty") {
          files.push({ slot, filename: "", param, offset: fileOffset }); 
      }
    }
    return files;
  }

  // Heuristic: Check if the current offset looks like the beginning of a Hotspot Block
  // Pattern: ObjCount (small int) -> CmdCount (small int) -> CmdID (Known ID like 39, 38, 9, 24)
  private looksLikeHotspotStart(offset: number): boolean {
      if (offset + 20 > this.data.byteLength) return false;

      const objCount = this.data.getUint32(offset, true);
      // Reasonable object count: 1 to 500. 0 is ambiguous (could be NOP).
      if (objCount === 0 || objCount > 500) return false;

      const cmdCount = this.data.getUint32(offset + 4, true);
      // Reasonable command count per object
      if (cmdCount === 0 || cmdCount > 200) return false;

      const firstCmdId = this.data.getUint32(offset + 8, true);
      
      // V5.5 Fix: Check parameter length of the first command to avoid false positives (e.g. Sc 33 misalign)
      // Structure: ID(4) + Subtype(4) + ParamLen(4)
      const firstParamLen = this.data.getUint32(offset + 16, true);
      if (firstParamLen > 5000) return false;

      // Known VND Command IDs commonly found first in a hotspot
      // 39: Set Font, 38: Text Zone, 24: Image, 9: Play AVI, 6: Link?, 7: Jump?
      // 36: ? seen in dump. 
      // V5.5: Added 1 (Media/Sound) as it appears in Sc 33
      const commonIds = [39, 38, 24, 9, 6, 7, 36, 11, 21, 27, 1];
      
      if (commonIds.includes(firstCmdId)) {
          return true;
      }

      // V5.3 Fix: ID 0 (Display) is valid if Subtype is known (e.g. 39=Font, 38=Text, 24=Image)
      if (firstCmdId === 0) {
          const firstCmdSubtype = this.data.getUint32(offset + 12, true);
          if ([39, 38, 24].includes(firstCmdSubtype)) return true;
      }

      return false;
  }

  private parseInitScript(): InitScript {
    const configSig = new Uint8Array([0xDB, 0xFF, 0xFF, 0xFF]);
    const nextConfigPos = this.findSequence(configSig, this.offset);

    const scanLimit = Math.min(this.data.byteLength, this.offset + 50000);
    let nextSceneStart = -1;

    for (let i = this.offset; i < scanLimit; i++) {
        if (this.uint8Data[i] === 0) {
             if (this.getValidFileCountInScene(i) > 0) {
                 nextSceneStart = i;
                 break;
             }
        }
    }

    let scriptEndOffset = nextConfigPos;
    let isGapParsing = false;

    if (nextSceneStart !== -1) {
        if (nextConfigPos === -1 || nextSceneStart < nextConfigPos) {
            scriptEndOffset = nextSceneStart;
            isGapParsing = true;
        }
    } else if (nextConfigPos === -1) {
        scriptEndOffset = this.data.byteLength;
        isGapParsing = true;
    }

    if (!isGapParsing && nextConfigPos === -1) {
       return { flag: 0, count: 0, commands: [] };
    }

    const end = scriptEndOffset;
    const commands: any[] = [];
    let stoppedForHotspots = false;

    while (this.offset < end) {
        // V5.1: CRITICAL CHECK - Are we actually looking at a Hotspot Block without a config signature?
        if (this.looksLikeHotspotStart(this.offset)) {
            this.log(`    ℹ️ Detected Hotspot structure at 0x${this.offset.toString(16).toUpperCase()} inside script area. Stopping script parsing.`);
            stoppedForHotspots = true;
            break; // Stop parsing script, let parseHotspots handle it.
        }

        if (this.offset + 4 > end) break;

        const cmdStart = this.offset;
        try {
            const id = this.readU32();
            
            // V5.4 Fix: ID 30 is likely ghost data/coordinates (e.g. 30, 15...) left in the gap.
            // Also filter extremely large IDs which denote garbage/padding.
            if (id === 30 || id > 5000) {
                this.log(`    ℹ️ Suspicious Command ID ${id} in Init Script. Stopping to avoid garbage data.`);
                this.offset = cmdStart; // Rewind to start of garbage
                break; // Stop script parsing here
            }

            if (id === 0) {
                commands.push({ id, param: "NOP" });
            }
            else if (id === 1) {
                // ID 1 (Int Param) - dangerous if misidentified, but necessary for real scripts
                if (this.offset + 4 > end) break;
                const val = this.readU32();
                commands.push({ id, param: `Val: ${val}` });
            }
            else if (id === 2) {
                if (this.offset + 28 > end) {
                    this.log(`    ⚠️ Not enough data for ID 2 binary block`);
                    break;
                }
                const ints = [];
                for(let k=0; k<7; k++) ints.push(this.readU32());
                commands.push({ id, param: `Zone Def: [${ints.join(', ')}]` });
            } 
            else {
                // Peek length to see if we overshoot 'end' (signature)
                if (this.offset + 4 <= end) {
                    const len = this.data.getUint32(this.offset, true);
                    if (this.offset + 4 + len > end) {
                         this.log(`    ℹ️ Command string length ${len} overshoots script area. Stopping.`);
                         this.offset = cmdStart;
                         break;
                    }
                }

                const text = this.readPascalString();
                const param = this.readU32();
                commands.push({ id, param: `${text} (P:${param})` });
            }

        } catch (e) {
            this.log(`    ⚠️ Script parsing error at 0x${cmdStart.toString(16).toUpperCase()}. Stopping script.`);
            this.offset = cmdStart; 
            break;
        }
    }

    // V5.2 FIX: Only force alignment if we did NOT break early for Hotspots.
    // If we finished the loop because we hit 'end' (the config signature), 
    // we MUST align to exactly 'end' to recover from any garbage parsing overshoot.
    if (!stoppedForHotspots && scriptEndOffset !== -1) {
        this.offset = scriptEndOffset;
    }
    
    return { flag: 0, count: commands.length, commands };
  }

  private isValidHotspotStruct(startOffset: number): boolean {
    if (startOffset + 8 > this.data.byteLength) return false;
    const count = this.data.getUint32(startOffset, true);
    if (count === 0) return true; 
    if (count > 2000) return false;
    const cmdCount = this.data.getUint32(startOffset + 4, true);
    if (cmdCount > 200) return false;
    return true;
  }

  private parseConfig(): SceneConfig {
    if (this.offset + 20 > this.data.byteLength) { 
        this.log("ℹ️ Skipping Config: End of file reached.");
        return { flag: 0, ints: [] };
    }

    // If we are at a "Next Scene" boundary, assume no config
    if (this.data.getUint8(this.offset) === 0) {
         if (this.getValidFileCountInScene(this.offset) > 0) {
             this.log(`    ℹ️ Config signature missing. Next scene detected directly.`);
             return { flag: 0, ints: [] };
         }
    }

    // Check signature without consuming
    const potentialFlag = this.data.getUint32(this.offset, true);
    if (potentialFlag !== 0xFFFFFFDB) {
         // V5.1: If it's not a signature, check if it's the start of Hotspots (ObjCount)
         if (this.looksLikeHotspotStart(this.offset)) {
             this.log(`    ℹ️ Config signature missing, but Hotspots detected. Scene sans config.`);
             return { flag: 0, ints: [] };
         }

         this.log(`    ℹ️ Config missing (Flag 0x${potentialFlag.toString(16).toUpperCase()} != 0xFFFFFFDB).`);
         return { flag: 0, ints: [] };
    }

    const flag = this.readU32(); // 0xFFFFFFDB
    const ints: number[] = [];
    
    for (let i = 0; i < 4; i++) {
      ints.push(this.readU32());
    }

    // Adaptive Config Length
    if (this.isValidHotspotStruct(this.offset + 4)) {
        ints.push(this.readU32()); 
    } 
    else if (this.isValidHotspotStruct(this.offset + 2)) {
        this.offset += 2;
    }
    else if (this.isValidHotspotStruct(this.offset)) {
        // Offset correct
    }
    else {
        if (this.offset + 4 <= this.data.byteLength) {
             ints.push(this.readU32());
        }
    }

    return { flag, ints };
  }

  private parseHotspots(sceneNum: number): Hotspot[] {
    if (this.offset + 4 > this.data.byteLength) {
        this.log("ℹ️ Skipping Hotspots: End of file reached.");
        return [];
    }

    // Check if we accidentally hit next scene
    if (this.getValidFileCountInScene(this.offset) > 0) {
        this.log("    ℹ️ Skipping Hotspots: Next scene detected immediately.");
        return [];
    }

    const objCount = this.readU32();
    this.log(`\n  [HOTSPOTS] (${objCount} items)`);

    if (objCount > 1000) {
        this.log(`⚠️ Suspicious hotspot count: ${objCount}. Ignoring hotspots.`);
        return [];
    }

    const hotspots: Hotspot[] = [];

    for (let objIdx = 0; objIdx < objCount; objIdx++) {
      if (this.offset + 4 > this.data.byteLength) break;

      const cmdCount = this.readU32();
      const commands: HotspotCommand[] = [];
      for (let cmdIdx = 0; cmdIdx < cmdCount; cmdIdx++) {
        if (this.offset + 8 > this.data.byteLength) break;
        const cmdId = this.readU32();
        const cmdSubtype = this.readU32(); // Often 0, sometimes 1
        const cmdParam = this.readPascalString();
        commands.push({ id: cmdId, subtype: cmdSubtype, param: cmdParam });
      }

      if (this.offset + 8 > this.data.byteLength) break;
      const cursorId = this.readU32();
      const pointCount = this.readU32();
      const points = [];
      for (let pIdx = 0; pIdx < pointCount; pIdx++) {
        if (this.offset + 8 > this.data.byteLength) break;
        const x = this.readI32();
        const y = this.readI32();
        points.push({ x, y });
      }
      
      let extraFlag = 0;
      if (this.offset + 4 <= this.data.byteLength) {
        extraFlag = this.readU32();
      }

      hotspots.push({
        index: objIdx,
        commands,
        geometry: { cursorId, pointCount, points, extraFlag }
      });
    }
    return hotspots;
  }

  public parse(maxScenes: number = 5): ParseResult {
    const scenes: ParsedScene[] = [];
    this.logs = []; 

    this.log("=".repeat(80));
    this.log(`VND SEQUENTIAL PARSER - V5.5 (Hotspot Align Fix)`);
    this.log("=".repeat(80));

    try {
      this.skipHeader();

      let sceneNum = 1;
      while (sceneNum <= maxScenes) {
        if (this.offset >= this.data.byteLength) {
            this.log("\n⚠️ EOF atteint naturellement");
            break;
        }

        // --- DEEP SMART SEEK with GREEDY LOOKAHEAD ---
        let seekCount = 0;
        const maxSeek = 20000; 
        let foundStart = false;
        let bestOffset = -1;
        let bestFileCount = -1;

        while (seekCount < maxSeek && this.offset < this.data.byteLength) {
            const count = this.getValidFileCountInScene(this.offset);
            
            if (count > 0) {
                // Found a potential start.
                bestOffset = this.offset;
                bestFileCount = count;
                
                // Greedy Optimization
                let shift = 8;
                let lookAheadLimit = 32; 
                
                while (shift <= lookAheadLimit) {
                    const nextOffset = this.offset + shift;
                    const nextCount = this.getValidFileCountInScene(nextOffset);
                    if (nextCount > bestFileCount) {
                        this.log(`    ℹ️ Optimization: Shifted start by ${shift} bytes. Files: ${bestFileCount} -> ${nextCount}`);
                        bestOffset = nextOffset;
                        bestFileCount = nextCount;
                    }
                    shift += 8;
                }
                
                this.offset = bestOffset;
                foundStart = true;
                break;
            }
            this.offset++;
            seekCount++;
        }

        if (!foundStart) {
            this.log(`\n❌ Impossible de trouver un début de scène valide après ${seekCount} octets.`);
            break;
        }

        const sep = this.readU8(); 
        const sceneOffset = this.offset; 
        this.log(`\n${'═'.repeat(80)}`);
        this.log(`SCÈNE #${sceneNum} @ 0x${(sceneOffset - 1).toString(16).toUpperCase().padStart(8, '0')}`);
        this.log(`${'═'.repeat(80)}`);

        try {
          const files = this.parseSceneFiles(sceneNum);
          
          // parseInitScript will now auto-detect if it hits Hotspots early (e.g. Sc 24)
          const initScript = this.parseInitScript(); 
          
          // parseConfig will handle missing flag gracefully
          const config = this.parseConfig();
          
          // parseHotspots will read the hotspots that parseInitScript preserved
          const hotspots = this.parseHotspots(sceneNum);

          scenes.push({
            id: sceneNum,
            offset: sceneOffset,
            files,
            initScript,
            config,
            hotspots
          });

          sceneNum++;
        } catch (e: any) {
          this.log(`\n❌ Erreur parsing scène ${sceneNum}: ${e.message}`);
          console.error(e);
          break;
        }
      }

      this.log(`\n${'='.repeat(80)}`);
      this.log(`Parsé ${sceneNum - 1} scènes`);
      this.log("=".repeat(80));

    } catch (e: any) {
      this.log(`CRITICAL ERROR: ${e.message}`);
    }

    return { scenes, logs: this.logs };
  }
}