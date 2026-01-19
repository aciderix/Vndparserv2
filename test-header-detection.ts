/**
 * Test script to detect correct end of VND header
 * WITHOUT modifying the actual parser
 */

import * as fs from 'fs';

interface HeaderInfo {
  versionOffset: number;
  engineOffset: number;
  indexIdOffset: number;
  indexId: number;
  variablesStart: number;
  variablesEnd: number;
  sceneStart: number;
  variables: Array<{name: string, value: number, offset: number}>;
}

class HeaderDetector {
  private data: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.data = new DataView(buffer);
  }

  private readU32(): number {
    const value = this.data.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  private readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.data.buffer, this.offset, length);
    this.offset += length;
    return bytes;
  }

  private readPascalString(): string {
    const length = this.readU32();
    if (length === 0 || length > 500) {
      this.offset -= 4; // Rewind
      return '';
    }
    const bytes = this.readBytes(length);
    const decoder = new TextDecoder('windows-1252');
    return decoder.decode(bytes);
  }

  private skipPadding(): void {
    // Skip 0x00 padding bytes
    while (this.offset < this.data.byteLength && this.data.getUint8(this.offset) === 0x00) {
      this.offset++;
    }
  }

  private alignTo4(): void {
    // Align offset to 4-byte boundary
    const remainder = this.offset % 4;
    if (remainder !== 0) {
      this.offset += (4 - remainder);
    }
  }

  public detect(): HeaderInfo {
    const info: HeaderInfo = {
      versionOffset: 0,
      engineOffset: 0,
      indexIdOffset: 0,
      indexId: 0,
      variablesStart: 0,
      variablesEnd: 0,
      sceneStart: 0,
      variables: []
    };

    // 1. Find VNFILE signature
    let found = false;
    for (let i = 0; i < 100; i++) {
      if (this.data.getUint8(i) === 0x56 && // V
          this.data.getUint8(i+1) === 0x4E && // N
          this.data.getUint8(i+2) === 0x46 && // F
          this.data.getUint8(i+3) === 0x49 && // I
          this.data.getUint8(i+4) === 0x4C && // L
          this.data.getUint8(i+5) === 0x45) { // E
        this.offset = i + 6;
        found = true;
        console.log(`✓ VNFILE found at 0x${i.toString(16).padStart(8, '0')}`);
        break;
      }
    }

    if (!found) {
      console.log('✗ VNFILE signature not found');
      return info;
    }

    // 2. Read version
    info.versionOffset = this.offset;
    const version = this.readPascalString();
    console.log(`  Version: "${version}" @ 0x${info.versionOffset.toString(16)}`);

    // 3. Read engine
    info.engineOffset = this.offset;
    const engine = this.readPascalString();
    console.log(`  Engine: "${engine}" @ 0x${info.engineOffset.toString(16)}`);

    // 4. Read publisher
    const publisher = this.readPascalString();
    console.log(`  Publisher: "${publisher}"`);

    // 5. Skip to INDEX_ID (known offset 0x5A)
    this.offset = 0x5A;
    info.indexIdOffset = 0x5A;
    info.indexId = this.readU32();
    console.log(`  INDEX_ID: ${info.indexId} @ 0x${info.indexIdOffset.toString(16)}`);

    // 6. Skip publisher serial and resolution data
    // These are at known offsets: serial (0x38), resolution (0x4E-0x5A)
    // After INDEX_ID (0x5A), we have some metadata then path then variables

    // Find .dll path which marks transition to variables section
    this.offset = 0x5E; // Just after INDEX_ID
    let pathFound = false;

    // Skip forward to find the .dll path
    for (let i = this.offset; i < 0x200 && i < this.data.byteLength - 50; i += 4) {
      this.offset = i;
      const testLength = this.data.getUint32(this.offset, true);
      if (testLength > 5 && testLength < 100) {
        this.offset += 4;
        const bytes = new Uint8Array(this.data.buffer, this.offset, Math.min(testLength, 50));
        const decoder = new TextDecoder('windows-1252');
        const str = decoder.decode(bytes);
        if (str.includes('.dll')) {
          console.log(`  Path: "${str}" @ 0x${(i).toString(16)}`);
          this.offset = i + 4 + testLength;
          // NO alignTo4() here! Variables start immediately after path
          pathFound = true;
          break;
        }
      }
    }

    // 7. Parse variables
    // Variables start right after the .dll path (no count field!)
    info.variablesStart = this.offset;
    console.log(`\n📦 Parsing variables from 0x${info.variablesStart.toString(16)}...`);

    let varCount = 0;
    while (this.offset < this.data.byteLength && varCount < 200) {
      const varOffset = this.offset;

      // Check if we hit padding/end marker
      const peekValue = this.data.getUint32(this.offset, true);
      if (varCount < 5) {
        console.log(`  DEBUG: offset=0x${this.offset.toString(16)}, peek_value=0x${peekValue.toString(16)}`);
      }

      if (peekValue === 0 || this.offset + 8 >= this.data.byteLength) {
        info.variablesEnd = varOffset;
        console.log(`\n✓ Found end of variables (padding/eof) at 0x${varOffset.toString(16)} (parsed ${varCount} vars)`);
        break;
      }

      const value = this.readU32();
      const nameLength = this.readU32();

      // Check if this looks like end of variables
      if (nameLength === 0 || nameLength > 100) {
        this.offset = varOffset; // Rewind
        info.variablesEnd = varOffset;
        console.log(`\n✓ Found end of variables at 0x${varOffset.toString(16)} (parsed ${varCount} vars)`);
        break;
      }

      // Read name bytes
      if (this.offset + nameLength > this.data.byteLength) {
        this.offset = varOffset;
        info.variablesEnd = varOffset;
        console.log(`\n✓ Variable name would overflow file at 0x${varOffset.toString(16)} (parsed ${varCount} vars)`);
        break;
      }

      const nameBytes = this.readBytes(nameLength);
      const decoder = new TextDecoder('windows-1252');
      const name = decoder.decode(nameBytes);

      // Check if name contains only valid characters (alphanumeric + underscore)
      const validNamePattern = /^[A-Za-z0-9_]+$/;
      if (!validNamePattern.test(name)) {
        this.offset = varOffset; // Rewind
        info.variablesEnd = varOffset;
        console.log(`\n✓ Invalid variable name "${name}" detected at 0x${varOffset.toString(16)} (parsed ${varCount} vars)`);
        break;
      }

      info.variables.push({ name, value, offset: varOffset });
      if (varCount < 10 || varCount % 10 === 0) {
        console.log(`  [${varCount}] ${name} = ${value} @ 0x${varOffset.toString(16)}`);
      } else if (varCount === 10) {
        console.log(`  ... (showing every 10th variable) ...`);
      }

      // Variables must be aligned to 4-byte boundaries
      // Structure: [value u32] [length u32] [name bytes] [padding] [terminator u32 = 0]
      // Align name end to 4-byte boundary
      this.alignTo4();

      // Read terminator (should always be 0x00000000)
      const terminator = this.readU32();
      if (varCount < 5 && terminator !== 0) {
        console.log(`  WARNING: Terminator = 0x${terminator.toString(16)} (expected 0)`);
      }

      varCount++;
    }

    // 8. Skip padding after variables
    console.log(`\n🔍 Skipping padding after variables...`);
    const beforePadding = this.offset;
    this.skipPadding();
    const paddingBytes = this.offset - beforePadding;
    console.log(`  Skipped ${paddingBytes} bytes of padding (0x${beforePadding.toString(16)} -> 0x${this.offset.toString(16)})`);

    // 9. Find first valid scene by looking for command patterns
    console.log(`\n🎯 Searching for scene start...`);

    let sceneFound = false;
    const searchLimit = Math.min(this.offset + 0x500, this.data.byteLength);

    for (let i = this.offset; i < searchLimit; i += 4) {
      this.offset = i;

      // Try to read what looks like a command
      const id = this.readU32();
      const subtype = this.readU32();
      const paramLengthOffset = this.offset;
      const paramLength = this.readU32();

      // Validate: ID should be small, paramLength reasonable
      if (id < 100 && paramLength > 5 && paramLength < 500) {
        const paramBytes = this.readBytes(paramLength);
        const decoder = new TextDecoder('windows-1252');
        const param = decoder.decode(paramBytes);

        // Check if param looks like valid VND command
        if (param.includes('toolbar') ||
            param.includes('bmp') ||
            param.includes('then') ||
            param.includes('addbmp') ||
            param.includes('Comic sans')) {
          info.sceneStart = i;
          sceneFound = true;
          console.log(`✓ Scene start detected at 0x${i.toString(16)}`);
          console.log(`  First command: ID=${id}, subtype=${subtype}, param="${param.substring(0, 50)}..."`);
          break;
        }
      }

      this.offset = i; // Reset for next iteration
    }

    if (!sceneFound) {
      console.log(`✗ No valid scene start found in search range`);
      info.sceneStart = this.offset;
    }

    return info;
  }
}

// Test all VND files
const files = ['couleurs1.vnd', 'barre.vnd', 'start.vnd'];

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  VND HEADER DETECTION TEST');
console.log('═══════════════════════════════════════════════════════════════════\n');

for (const filename of files) {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📄 Testing: ${filename}`);
    console.log('='.repeat(70));

    const fileBuffer = fs.readFileSync(filename);
    const detector = new HeaderDetector(fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength));

    const info = detector.detect();

    console.log('\n📊 SUMMARY:');
    console.log(`  Variables: ${info.variables.length} found`);
    console.log(`  Variables range: 0x${info.variablesStart.toString(16)} - 0x${info.variablesEnd.toString(16)}`);
    console.log(`  Scene start: 0x${info.sceneStart.toString(16)}`);
    console.log(`  INDEX_ID: ${info.indexId}`);

  } catch (error) {
    console.log(`✗ Error testing ${filename}: ${error}`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log('Test complete!');
console.log('═'.repeat(70));
