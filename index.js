const fs = require('fs')

const dump = fs.readFileSync('stage-1-decoded.bin') // 8mb
const internalFlash = dump.slice(0, 0x3FFFFC) // first 4mb
const externalFlash = dump.slice(0x400000, 0x7FFFFB) // last 4 8mb
const pmu0 = internalFlash.slice(0, 0x1FFFFF) // first 2mb 0x80000000 - 0x801FFFFE
const pmu1 = internalFlash.slice(0x200000, 0x3FFFFC) // last 2mb 0x80800000 - 0x809FFFFE
const pmu0BaseAddress = 0x80000000
const pmu1BaseAddress = 0x80800000
const externalFlashBaseAddress = 0x84000000

const BLOCK_IDENTIFIERS = {
  0x10: 'Startup block',
  0x20: 'Tuning protection',
  0x30: 'Customer block',
  0x40: 'Application software #0',
  0x50: 'Application software #1',
  0x60: 'Dataset #0',
  0x90: 'Customer tuning protection',
  0xA0: 'Application software #2',
  0xC0: 'Absolute constants #0'
}

const calculateFlatAddress = (name, address) => {
  if (name === 'pmu0') {
    return address - pmu0BaseAddress
  } else if (name === 'pmu1') {
    return address - pmu1BaseAddress
  } else if (name === 'externalFlash') {
    return address - externalFlashBaseAddress
  }
}

const readTable = (pmuName, pointer, size) => {
  const memory = pmuName === 'pmu0' ? pmu0 : (pmuName === 'externalFlash' ? externalFlash : pmu1)
  const flatAddress = calculateFlatAddress(pmuName, pointer)
  const table = []
  for (let i = 0; i < size; ++i) {
    table.push(memory.readUInt32LE(flatAddress + (i * 4)).toString(16))
  }
  return table
}

const readBlock = (pmuName, blockStart) => {
  const memory = pmuName === 'pmu0' ? pmu0 : (pmuName === 'externalFlash' ? externalFlash : pmu1)
  const flatAddress = calculateFlatAddress(pmuName, blockStart)
  const blockIdentifier = memory.readUInt32LE(flatAddress)
  const size = memory.readUInt32LE(flatAddress + 4)
  const nextSector = memory.readUInt32LE(flatAddress + 8)
  const blockEnd = memory.readUInt32LE(flatAddress + 12)
  const table1Pointer = memory.readUInt32LE(flatAddress + 16)
  const table2Pointer = memory.readUInt32LE(flatAddress + 20)
  const table1Size = memory[flatAddress + 24]
  const table2Size = memory[flatAddress + 25]
  const identifierLength = 18 // hardcoded string length?
  const identifier = memory.slice(flatAddress + 26, flatAddress + 26 + identifierLength)
  const numberOfChecksumStructures = memory.readUInt32LE(flatAddress + 26 + identifierLength)
  const dump = memory.slice(flatAddress, flatAddress + size)
  fs.writeFileSync(`${blockIdentifier.toString(16)}.bin`, dump)
  return {
    blockStart,
    flatAddress,
    blockIdentifier,
    size,
    nextSector,
    blockEnd,
    table1Pointer,
    table2Pointer,
    table1Size,
    table2Size,
    identifier,
    numberOfChecksumStructures,
    checksumStructures: [], // TODO
    table1: readTable(pmuName, table1Pointer, table1Size),
    table2: readTable(pmuName, table2Pointer, table2Size)
  }
}

const debugBlock = (block) => {
  return {
    blockStart: block.blockStart.toString(16),
    flatAddress: block.flatAddress.toString(16),
    blockIdentifier: block.blockIdentifier.toString(16),
    size: block.size.toString(16),
    nextSector: block.nextSector.toString(16),
    blockEnd: block.blockEnd.toString(16),
    table1Pointer: block.table1Pointer.toString(16),
    table2Pointer: block.table2Pointer.toString(16),
    table1Size: block.table1Size.toString(16),
    table2Size: block.table2Size.toString(16),
    table1: block.table1,
    table2: block.table2,
    identifier: block.identifier.toString(),
    numberOfChecksumStructures: block.numberOfChecksumStructures.toString(16)
  }
}

const run = () => {
  const alternativeBootLoaderStart = pmu0BaseAddress + 0x18000
  // pmu0 blocks
  console.log(`Reading block 1 at ${alternativeBootLoaderStart.toString(16)}`)
  const block = readBlock('pmu0', alternativeBootLoaderStart)
  console.log(debugBlock(block))

  console.log(`Reading block 2 at ${block.nextSector.toString(16)}`)
  const block2 = readBlock('pmu0', block.nextSector)
  console.log(debugBlock(block2))

  console.log(`Reading block 3 at ${block2.nextSector.toString(16)}`)
  const block3 = readBlock('pmu0', block2.nextSector)
  console.log(debugBlock(block3))

  console.log(`Reading block 4 at ${block3.nextSector.toString(16)}`)
  const block4 = readBlock('pmu0', block3.nextSector)
  console.log(debugBlock(block4))

  console.log(`Reading block 5 at ${block4.nextSector.toString(16)}`)
  const block5 = readBlock('pmu0', block4.nextSector)
  console.log(debugBlock(block5))

  // pmu1
  console.log(`Reading block 6 at ${block5.nextSector.toString(16)}`)
  const block6 = readBlock('pmu1', block5.nextSector)
  console.log(debugBlock(block6))

  // external flash
  console.log(`Reading block 7 at ${block6.nextSector.toString(16)}`)
  const block7 = readBlock('externalFlash', block6.nextSector)
  console.log(debugBlock(block7))

  console.log(`Reading block 8 at ${block7.nextSector.toString(16)}`)
  const block8 = readBlock('externalFlash', block7.nextSector)
  console.log(debugBlock(block8))
}

run()
