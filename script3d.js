let blocks = [];
let glassBlocks = [];
let baseTL = null;
let baseTR = null;
let baseBL = null;
let baseBR = null;
let glassTL = null;
let glassTR = null;
let glassBL = null;
let glassBR = null;
let currentSource = null;

// Load blocks and glass from JSON files
async function loadBlocks() {
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('blocks.json'),
      fetch('glass.json')
    ]);
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
    // Initialize glass sources to "none"
    glassTL = glassTR = glassBL = glassBR = glassBlocks.find(b => b.name === 'none');
    document.getElementById('glassTL-label').textContent = 'None';
    document.getElementById('glassTR-label').textContent = 'None';
    document.getElementById('glassBL-label').textContent = 'None';
    document.getElementById('glassBR-label').textContent = 'None';
    showBlocks();
  } catch (error) {
    console.error('Error loading blocks or glass:', error);
  }
}

function openModal(source) {
  currentSource = source;
  document.getElementById('modal').classList.remove('hidden');
  if (source.startsWith('glass')) {
    showGlassBlocks();
  } else {
    showBlocks();
  }
}

function showBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  const glassContent = document.getElementById('glass-content');
  blocksContent.classList.remove('hidden');
  glassContent.classList.add('hidden');
  document.getElementById('color-content').classList.add('hidden');
  document.getElementById('tab-blocks').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-blocks').classList.remove('bg-gray-300', 'text-black');
  document.getElementById('tab-glass').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-glass').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-color').classList.remove('bg-blue-600', 'text-white');

  blocksContent.innerHTML = '';
  blocks.forEach(block => {
    const div = document.createElement('div');
    div.className = 'block-option';
    div.innerHTML = `<img src="${block.path}" alt="${block.name}" title="${block.name}" />`;
    div.onclick = () => selectBlock(block);
    blocksContent.appendChild(div);
  });
}

function showGlassBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  const glassContent = document.getElementById('glass-content');
  blocksContent.classList.add('hidden');
  glassContent.classList.remove('hidden');
  document.getElementById('color-content').classList.add('hidden');
  document.getElementById('tab-blocks').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-glass').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-glass').classList.remove('bg-gray-300', 'text-black');
  document.getElementById('tab-color').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-color').classList.remove('bg-blue-600', 'text-white');

  glassContent.innerHTML = '';
  glassBlocks.forEach(block => {
    const div = document.createElement('div');
    div.className = 'block-option';
    div.innerHTML = block.name === 'none' ? `<span>${block.name}</span>` : `<img src="${block.path}" alt="${block.name}" title="${block.name}" />`;
    div.onclick = () => selectGlassBlock(block);
    glassContent.appendChild(div);
  });
}

function showColorPicker() {
  document.getElementById('blocks-content').classList.add('hidden');
  document.getElementById('glass-content').classList.add('hidden');
  document.getElementById('color-content').classList.remove('hidden');
  document.getElementById('tab-blocks').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-glass').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-glass').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.remove('bg-gray-300', 'text-black');
}

function selectBlock(block) {
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = block.path;
  img.classList.remove('hidden');
  label.textContent = block.name;
  if (currentSource === 'baseTL') baseTL = block;
  else if (currentSource === 'baseTR') baseTR = block;
  else if (currentSource === 'baseBL') baseBL = block;
  else if (currentSource === 'baseBR') baseBR = block;
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function selectGlassBlock(block) {
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = block.path || '';
  img.classList[block.path ? 'remove' : 'add']('hidden');
  label.textContent = block.name;
  if (currentSource === 'glassTL') glassTL = block;
  else if (currentSource === 'glassTR') glassTR = block;
  else if (currentSource === 'glassBL') glassBL = block;
  else if (currentSource === 'glassBR') glassBR = block;
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function selectColor() {
  const color = document.getElementById('color-picker').value;
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = '';
  img.classList.add('hidden');
  label.textContent = `Color: ${color}`;
  const colorObj = { 
    name: color, 
    color: hexToRgb(color), 
    path: null, 
    view: 'both', 
    alpha: currentSource.startsWith('glass') ? 0.5 : 1.0 
  };
  if (currentSource === 'baseTL') baseTL = colorObj;
  else if (currentSource === 'baseTR') baseTR = colorObj;
  else if (currentSource === 'baseBL') baseBL = colorObj;
  else if (currentSource === 'baseBR') baseBR = colorObj;
  else if (currentSource === 'glassTL') glassTL = colorObj;
  else if (currentSource === 'glassTR') glassTR = colorObj;
  else if (currentSource === 'glassBL') glassBL = colorObj;
  else glassBR = colorObj;
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function hexToRGB(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function blendColors(baseColor, glassBlock) {
  if (!glassBlock || glassBlock.name === 'none') return baseColor;
  const alpha = glassBlock.alpha || 0.5;
  const r = Math.round((1 - alpha) * baseColor.r + alpha * glassBlock.color.r);
  const g = Math.round((1 - alpha) * baseColor.g + alpha * glassBlock.color.g);
  const b = Math.round((1 - alpha) * baseColor.b + alpha * glassBlock.color.b);
  return { r, g, b };
}

function updateGradient() {
  if (!baseTL || !baseTR || !baseBL || !baseBR || !glassTL || !glassTR || !glassBL || !glassBR) return;
  const size = parseInt(document.getElementById('size').value) || 16;
  const fillMode = document.getElementById('fill-mode').value;
  const viewMode = document.getElementById('view-mode').value;
  const gradient = document.getElementById('gradient');
  gradient.innerHTML = '';

  const gridSize = 512;
  const blockSize = gridSize / size;
  gradient.style.gridTemplateColumns = `repeat(${size}, ${blockSize}px)`;
  gradient.style.gridTemplateRows = `repeat(${size}, ${blockSize}px)`;
  gradient.style.width = `${gridSize}px`;
  gradient.style.height = `${gridSize}px`;

  // Compute combined colors for each corner
  const tlColor = blendColors(baseTL.color, glassTL);
  const trColor = blendColors(baseTR.color, glassTR);
  const blColor = blendColors(baseBL.color, glassBL);
  const brColor = blendColors(baseBR.color, glassBR);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const u = j / (size - 1);
      const v = i / (size - 1);

      // Bilinear interpolation of combined colors
      const r = Math.round(
        (1 - u) * (1 - v) * tlColor.r +
        u * (1 - v) * trColor.r +
        (1 - u) * v * blColor.r +
        u * v * brColor.r
      );
      const g = Math.round(
        (1 - u) * (1 - v) * tlColor.g +
        u * (1 - v) * trColor.g +
        (1 - u) * v * blColor.g +
        u * v * brColor.g
      );
      const b = Math.round(
        (1 - u) * (1 - v) * tlColor.b +
        u * (1 - v) * trColor.b +
        (1 - u) * v * blColor.b +
        u * v * brColor.b
      );

      const finalColor = { r, g, b };
      const div = document.createElement('div');
      div.className = 'gradient-square';
      div.style.width = `${blockSize}px`;
      div.style.height = `${blockSize}px`;
      div.style.position = 'relative';

      if (fillMode === 'exact') {
        div.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        div.innerHTML = `<span class="tooltip">Color: rgb(${r}, ${g}, ${b})</span>`;
      } else {
        const { base, glass } = findNearestBlockPair(finalColor, viewMode);
        const baseImg = `<img src="${base.path}" alt="${base.name}" class="base-img" />`;
        const glassImg = glass.name !== 'none' ? `<img src="${glass.path}" alt="${glass.name}" class="glass-img" />` : '';
        const tooltip = glass.name === 'none' ? `Base: ${base.name}` : `Base: ${base.name}, Glass: ${glass.name}`;
        div.innerHTML = `${baseImg}${glassImg}<span class="tooltip">${tooltip}</span>`;
        div.dataset.baseBlock = base.name;
        div.dataset.glassBlock = glass.name;
      }
      gradient.appendChild(div);
    }
  }
}

function findNearestBlockPair(targetColor, viewMode) {
  let minDistance = Infinity;
  let bestBase = blocks[0];
  let bestGlass = glassBlocks.find(b => b.name === 'none');
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return { base: blocks[0], glass: bestGlass };

  filteredBlocks.forEach(base => {
    // Try with no glass
    let distance = 
      Math.pow(base.color.r - targetColor.r, 2) +
      Math.pow(base.color.g - targetColor.g, 2) +
      Math.pow(base.color.b - targetColor.b, 2);
    if (distance < minDistance) {
      minDistance = distance;
      bestBase = base;
      bestGlass = filteredGlass.find(b => b.name === 'none');
    }

    // Try with each glass block
    filteredGlass.forEach(glass => {
      if (glass.name === 'none') return;
      const blendedColor = blendColors(base.color, glass);
      distance = 
        Math.pow(blendedColor.r - targetColor.r, 2) +
        Math.pow(blendedColor.g - targetColor.g, 2) +
        Math.pow(blendedColor.b - targetColor.b, 2);
      if (distance < minDistance) {
        minDistance = distance;
        bestBase = base;
        bestGlass = glass;
      }
    });
  });

  return { base: bestBase, glass: bestGlass };
}

function getClosestMinecraftBlockId(r, g, b) {
  const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (r > g && r > b) {
    return brightness > 0.5 ? 35 : 159; // Wool or Terracotta (red-dominated)
  } else if (g > r && g > b) {
    return brightness > 0.5 ? 35 : 159; // Wool or Terracotta (green-dominated)
  } else if (b > r && b > g) {
    return brightness > 0.5 ? 35 : 159; // Wool or Terracotta (blue-dominated)
  } else {
    if (brightness > 0.8) return 35; // White wool
    else if (brightness > 0.6) return 35; // Light gray wool
    else if (brightness > 0.4) return 35; // Gray wool
    else if (brightness > 0.2) return 35; // Black wool
    else return 49; // Obsidian
  }
}

function exportSchematic() {
  const size = parseInt(document.getElementById('size').value) || 16;
  const gradient = document.getElementById('gradient');
  const fillMode = document.getElementById('fill-mode').value;
  const squares = gradient.querySelectorAll('.gradient-square');
  
  if (!squares.length) {
    alert('No gradient data to export!');
    return;
  }

  const voxelPositions = [];
  squares.forEach((square, index) => {
    const x = index % size;
    const z = Math.floor(index / size);
    if (fillMode === 'exact') {
      const colorMatch = square.style.backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (colorMatch) {
        const [, r, g, b] = colorMatch;
        voxelPositions.push({ x, y: 0, z, blockId: getClosestMinecraftBlockId(parseInt(r), parseInt(g), parseInt(b)) });
      }
    } else {
      const baseBlock = square.dataset.baseBlock;
      const glassBlock = square.dataset.glassBlock;
      if (baseBlock) {
        const base = blocks.find(b => b.name === baseBlock);
        if (base) {
          voxelPositions.push({ x, y: 0, z, blockId: getClosestMinecraftBlockId(base.color.r, base.color.g, base.color.b) });
        }
        if (glassBlock && glassBlock !== 'none') {
          const glass = glassBlocks.find(g => g.name === glassBlock);
          if (glass) {
            voxelPositions.push({ x, y: 1, z, blockId: getClosestMinecraftBlockId(glass.color.r, glass.color.g, glass.color.b) });
          }
        }
      }
    }
  });

  const voxelData = {
    voxelPositions,
    voxelSize: 1,
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: size - 1, y: 1, z: size - 1 }
    }
  };

  try {
    const generator = new SchematicGenerator(voxelData, 35); // Default blockId 35 (wool) for simplicity
    const { blob, filename, dimensions, blockCount } = generator.generateSchematic();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Schematic exported:', { filename, dimensions, blockCount });
  } catch (err) {
    console.error('Export error:', err);
    alert('Error exporting schematic: ' + err.message);
  }
}

class SchematicGenerator {
  constructor(voxelData, blockId) {
    this.voxelData = voxelData;
    this.blockId = blockId;
    this.voxelPositions = voxelData.voxelPositions;
    this.voxelSize = voxelData.voxelSize;
    this.boundingBox = voxelData.boundingBox;
  }

  generateSchematic() {
    const minX = Math.min(...this.voxelPositions.map(p => p.x));
    const maxX = Math.max(...this.voxelPositions.map(p => p.x));
    const minY = Math.min(...this.voxelPositions.map(p => p.y));
    const maxY = Math.max(...this.voxelPositions.map(p => p.y));
    const minZ = Math.min(...this.voxelPositions.map(p => p.z));
    const maxZ = Math.max(...this.voxelPositions.map(p => p.z));

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const length = maxZ - minZ + 1;

    const volume = width * height * length;
    const blocks = new Uint8Array(volume).fill(0);
    const data = new Uint8Array(volume).fill(0);

    for (const pos of this.voxelPositions) {
      const x = pos.x - minX;
      const y = pos.y - minY;
      const z = pos.z - minZ;
      const index = x + z * width + y * width * length;
      blocks[index] = pos.blockId || this.blockId;
    }

    const nbtData = {
      name: 'Schematic',
      value: {
        Width: { type: 'short', value: width },
        Height: { type: 'short', value: height },
        Length: { type: 'short', value: length },
        Materials: { type: 'string', value: 'Alpha' },
        Blocks: { type: 'byteArray', value: blocks },
        Data: { type: 'byteArray', value: data },
        WEOffsetX: { type: 'int', value: 0 },
        WEOffsetY: { type: 'int', value: 0 },
        WEOffsetZ: { type: 'int', value: 0 }
      }
    };

    const nbtBuffer = this.writeNBT(nbtData);
    const compressed = this.gzipCompress(nbtBuffer);

    return {
      blob: new Blob([compressed], { type: 'application/octet-stream' }),
      filename: 'gradient.schematic',
      dimensions: { width, height, length },
      blockCount: this.voxelPositions.length
    };
  }

  writeNBT(data) {
    const buffer = [];
    buffer.push(0x0A);
    this.writeString(data.name || 'Schematic', buffer);
    this.writeCompoundContent(data.value, buffer);
    return new Uint8Array(buffer);
  }

  writeCompoundContent(compound, buffer) {
    for (const [key, tag] of Object.entries(compound)) {
      this.writeNBTTag(tag, key, buffer);
    }
    buffer.push(0x00);
  }

  writeNBTTag(tag, name, buffer) {
    const tagId = this.getTagId(tag.type);
    buffer.push(tagId);
    this.writeString(name, buffer);

    switch (tag.type) {
      case 'compound':
        this.writeCompoundContent(tag.value, buffer);
        break;
      case 'int':
        this.writeInt32(tag.value, buffer);
        break;
      case 'short':
        this.writeInt16(tag.value, buffer);
        break;
      case 'byteArray':
        this.writeInt32(tag.value.length, buffer);
        for (let i = 0; i < tag.value.length; i++) {
          buffer.push(tag.value[i] & 0xFF);
        }
        break;
      case 'string':
        this.writeString(tag.value, buffer);
        break;
    }
  }

  writeInt32(value, buffer) {
    buffer.push(
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF
    );
  }

  writeInt16(value, buffer) {
    buffer.push(
      (value >> 8) & 0xFF,
      value & 0xFF
    );
  }

  writeString(str, buffer) {
    const bytes = new TextEncoder().encode(str);
    buffer.push((bytes.length >> 8) & 0xFF, bytes.length & 0xFF);
    bytes.forEach(byte => buffer.push(byte));
  }

  getTagId(type) {
    const tagIds = {
      'byte': 0x01,
      'short': 0x02,
      'int': 0x03,
      'long': 0x04,
      'float': 0x05,
      'double': 0x06,
      'byteArray': 0x07,
      'string': 0x08,
      'list': 0x09,
      'compound': 0x0A,
      'intArray': 0x0B,
      'longArray': 0x0C
    };
    return tagIds[type] || 0x00;
  }

  gzipCompress(data) {
    if (typeof pako === 'undefined') {
      throw new Error('Pako library not found');
    }
    return pako.gzip(data);
  }
}

document.getElementById('tab-blocks').onclick = showBlocks;
document.getElementById('tab-glass').onclick = showGlassBlocks;
document.getElementById('tab-color').onclick = showColorPicker;
document.getElementById('close-modal').onclick = () => {
  document.getElementById('modal').classList.add('hidden');
};
document.getElementById('use-color').onclick = selectColor;
document.getElementById('size').oninput = updateGradient;
document.getElementById('fill-mode').onchange = updateGradient;
document.getElementById('view-mode').onchange = updateGradient;
document.getElementById('copy').onclick = () => {
  const gradient = document.getElementById('gradient');
  const names = Array.from(gradient.querySelectorAll('.tooltip')).map(span => span.textContent);
  navigator.clipboard.writeText(names.join(';'));
  alert('List copied!');
};
document.getElementById('surprise').onclick = () => {
  const viewMode = document.getElementById('view-mode').value;
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0 || filteredGlass.length === 0) return;

  const randomBaseTL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseTR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseBL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseBR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomGlassTL = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassTR = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassBL = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassBR = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];

  baseTL = randomBaseTL;
  document.getElementById('baseTL-img').src = randomBaseTL.path;
  document.getElementById('baseTL-img').classList.remove('hidden');
  document.getElementById('baseTL-label').textContent = randomBaseTL.name;

  baseTR = randomBaseTR;
  document.getElementById('baseTR-img').src = randomBaseTR.path;
  document.getElementById('baseTR-img').classList.remove('hidden');
  document.getElementById('baseTR-label').textContent = randomBaseTR.name;

  baseBL = randomBaseBL;
  document.getElementById('baseBL-img').src = randomBaseBL.path;
  document.getElementById('baseBL-img').classList.remove('hidden');
  document.getElementById('baseBL-label').textContent = randomBaseBL.name;

  baseBR = randomBaseBR;
  document.getElementById('baseBR-img').src = randomBaseBR.path;
  document.getElementById('baseBR-img').classList.remove('hidden');
  document.getElementById('baseBR-label').textContent = randomBaseBR.name;

  glassTL = randomGlassTL;
  document.getElementById('glassTL-img').src = randomGlassTL.path || '';
  document.getElementById('glassTL-img').classList[randomGlassTL.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassTL-label').textContent = randomGlassTL.name;

  glassTR = randomGlassTR;
  document.getElementById('glassTR-img').src = randomGlassTR.path || '';
  document.getElementById('glassTR-img').classList[randomGlassTR.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassTR-label').textContent = randomGlassTR.name;

  glassBL = randomGlassBL;
  document.getElementById('glassBL-img').src = randomGlassBL.path || '';
  document.getElementById('glassBL-img').classList[randomGlassBL.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassBL-label').textContent = randomGlassBL.name;

  glassBR = randomGlassBR;
  document.getElementById('glassBR-img').src = randomGlassBR.path || '';
  document.getElementById('glassBR-img').classList[randomGlassBR.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassBR-label').textContent = randomGlassBR.name;

  updateGradient();
};

document.getElementById('export-schematic').onclick = exportSchematic;

// Initialize block loading
loadBlocks();