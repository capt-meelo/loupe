/**
 * Builds an ELF core dump from captured memory regions.
 *
 * A raw concatenation of bytes tells a tool nothing about where each chunk
 * lived. An ELF core carries one PT_LOAD program header per region — virtual
 * address, size and permissions — so gdb, LLDB, radare2 and Ghidra can map the
 * dump back to the process's address space and browse it directly.
 *
 * We also emit an NT_FILE note, which is what makes tools label regions with
 * the library they came from (libart.so, libxul.so, …) instead of raw numbers.
 */

const ET_CORE = 4;
const PT_LOAD = 1;
const PT_NOTE = 4;
const PF_X = 1, PF_W = 2, PF_R = 4;
const NT_FILE = 0x46494c45;
const PAGE = 4096;

/** e_machine for the ABI reported by the device. */
export function machineFor(abi = '') {
  const a = abi.toLowerCase();
  if (a.includes('arm64')) return { machine: 183, bits: 64 };  // EM_AARCH64
  if (a.includes('x86_64')) return { machine: 62, bits: 64 };  // EM_X86_64
  if (a.includes('x86')) return { machine: 3, bits: 32 };      // EM_386
  if (a.includes('arm')) return { machine: 40, bits: 32 };     // EM_ARM
  return { machine: 183, bits: 64 };                            // sensible default
}

const flagsOf = (perms = '') =>
  (perms[0] === 'r' ? PF_R : 0) | (perms[1] === 'w' ? PF_W : 0) | (perms[2] === 'x' ? PF_X : 0);

const align4 = (n) => (n + 3) & ~3;

/** Serialises the NT_FILE note payload (region → backing file map). */
function buildNtFileDesc(regions, bits) {
  const named = regions.filter((r) => r.name && r.name.startsWith('/'));
  const wordSize = bits === 64 ? 8 : 4;
  const names = named.map((r) => new TextEncoder().encode(r.name + '\0'));
  const namesLen = names.reduce((n, b) => n + b.length, 0);
  const size = wordSize * 2 + named.length * wordSize * 3 + namesLen;

  const buf = new ArrayBuffer(size);
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  let o = 0;
  const word = (v) => {
    if (bits === 64) { dv.setBigUint64(o, BigInt(v), true); o += 8; }
    else { dv.setUint32(o, Number(v) >>> 0, true); o += 4; }
  };

  word(named.length);
  word(PAGE);
  for (const r of named) { word(r.vaddr); word(r.vaddr + r.memsz); word(0); }
  for (const b of names) { u8.set(b, o); o += b.length; }
  return u8;
}

/** Wraps a note payload in the ELF note header (name "CORE"). */
function buildNote(type, desc) {
  const name = new TextEncoder().encode('CORE\0');
  const total = 12 + align4(name.length) + align4(desc.length);
  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  dv.setUint32(0, name.length, true);
  dv.setUint32(4, desc.length, true);
  dv.setUint32(8, type, true);
  u8.set(name, 12);
  u8.set(desc, 12 + align4(name.length));
  return u8;
}

/**
 * @param regions [{ vaddr, memsz, filesz, dataOffset, perms, name }]
 *        `dataOffset` is the byte offset of this region inside `data`.
 * @param data    concatenated region bytes, in the same order.
 */
export function buildCore({ regions, data, machine = 183, bits = 64 }) {
  const is64 = bits === 64;
  const ehSize = is64 ? 64 : 52;
  const phSize = is64 ? 56 : 32;

  const note = buildNote(NT_FILE, buildNtFileDesc(regions, bits));
  const phnum = regions.length + 1;            // + PT_NOTE
  const headerBytes = ehSize + phnum * phSize;
  const noteOffset = headerBytes;
  const dataOffset = noteOffset + align4(note.length);

  const out = new Uint8Array(dataOffset + data.length);
  const dv = new DataView(out.buffer);
  let o = 0;

  const u8 = (v) => { dv.setUint8(o, v); o += 1; };
  const u16 = (v) => { dv.setUint16(o, v, true); o += 2; };
  const u32 = (v) => { dv.setUint32(o, v >>> 0, true); o += 4; };
  const addr = (v) => {
    if (is64) { dv.setBigUint64(o, BigInt(v), true); o += 8; }
    else { dv.setUint32(o, Number(v) >>> 0, true); o += 4; }
  };

  // ---- ELF header ----
  u8(0x7f); u8(0x45); u8(0x4c); u8(0x46);   // \x7fELF
  u8(is64 ? 2 : 1);                          // EI_CLASS
  u8(1);                                     // EI_DATA = little endian
  u8(1);                                     // EI_VERSION
  u8(0);                                     // EI_OSABI = SYSV
  for (let i = 0; i < 8; i++) u8(0);         // EI_ABIVERSION + padding
  u16(ET_CORE);
  u16(machine);
  u32(1);                                    // e_version
  addr(0);                                   // e_entry
  addr(ehSize);                              // e_phoff
  addr(0);                                   // e_shoff
  u32(0);                                    // e_flags
  u16(ehSize);
  u16(phSize);
  u16(phnum);
  u16(0); u16(0); u16(0);                    // no sections

  // ---- PT_NOTE ----
  if (is64) {
    u32(PT_NOTE); u32(0);
    addr(noteOffset); addr(0); addr(0);
    addr(note.length); addr(0); addr(4);
  } else {
    u32(PT_NOTE); u32(noteOffset); u32(0); u32(0);
    u32(note.length); u32(0); u32(0); u32(4);
  }

  // ---- one PT_LOAD per region ----
  for (const r of regions) {
    const off = dataOffset + r.dataOffset;
    if (is64) {
      u32(PT_LOAD); u32(flagsOf(r.perms));
      addr(off); addr(r.vaddr); addr(0);
      addr(r.filesz); addr(r.memsz); addr(PAGE);
    } else {
      u32(PT_LOAD); u32(off); u32(r.vaddr); u32(0);
      u32(r.filesz); u32(r.memsz); u32(flagsOf(r.perms)); u32(PAGE);
    }
  }

  out.set(note, noteOffset);
  out.set(data, dataOffset);
  return out;
}
