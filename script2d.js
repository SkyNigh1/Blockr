let blocks = [];
let sourceTL = null;
let sourceTR = null;
let sourceBL = null;
let sourceBR = null;
let currentSource = null;

// Load blocks from JSON file
async function loadBlocks() {
  try {
    const response = await fetch('blocks.json');
    blocks = await response.json();
    showBlocks();
  } catch (error) {
    console.error('Error loading blocks:', error);
  }
}

function openModal(source) {
  currentSource = source;
  document.getElementById('modal').classList.remove('hidden');
  showBlocks();
}

function showBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  blocksContent.classList.remove('hidden');
  document.getElementById('color-content').classList.add('hidden');
  document.getElementById('tab-blocks').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-blocks').classList.remove('bg-gray-300', 'text-black');
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

function showColorPicker() {
  document.getElementById('blocks-content').classList.add('hidden');
  document.getElementById('color-content').classList.remove('hidden');
  document.getElementById('tab-blocks').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks').classList.remove('bg-blue-600', 'text-white');
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
  if (currentSource === 'sourceTL') sourceTL = block;
  else if (currentSource === 'sourceTR') sourceTR = block;
  else if (currentSource === 'sourceBL') sourceBL = block;
  else sourceBR = block;
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
  const colorObj = { name: color, color: hexToRgb(color), path: null, view: 'both' };
  if (currentSource === 'sourceTL') sourceTL = colorObj;
  else if (currentSource === 'sourceTR') sourceTR = colorObj;
  else if (currentSource === 'sourceBL') sourceBL = colorObj;
  else sourceBR = colorObj;
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function updateGradient() {
  if (!sourceTL || !sourceTR || !sourceBL || !sourceBR) return;
  const size = parseInt(document.getElementById('size').value) || 16;
  const fillMode = document.getElementById('fill-mode').value;
  const viewMode = document.getElementById('view-mode').value;
  const gradient = document.getElementById('gradient');
  gradient.innerHTML = '';

  // Set grid layout with dynamic block size
  const gridSize = 512; // Fixed grid size in pixels
  const blockSize = gridSize / size; // Dynamic block size
  gradient.style.display = 'grid';
  gradient.style.gridTemplateColumns = `repeat(${size}, ${blockSize}px)`;
  gradient.style.gridTemplateRows = `repeat(${size}, ${blockSize}px)`;
  gradient.style.width = `${gridSize}px`;
  gradient.style.height = `${gridSize}px`;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const u = j / (size - 1); // Horizontal interpolation factor
      const v = i / (size - 1); // Vertical interpolation factor

      // Bilinear interpolation for color
      const r = Math.round(
        (1 - u) * (1 - v) * sourceTL.color.r +
        u * (1 - v) * sourceTR.color.r +
        (1 - u) * v * sourceBL.color.r +
        u * v * sourceBR.color.r
      );
      const g = Math.round(
        (1 - u) * (1 - v) * sourceTL.color.g +
        u * (1 - v) * sourceTR.color.g +
        (1 - u) * v * sourceBL.color.g +
        u * v * sourceBR.color.g
      );
      const b = Math.round(
        (1 - u) * (1 - v) * sourceTL.color.b +
        u * (1 - v) * sourceTR.color.b +
        (1 - u) * v * sourceBL.color.b +
        u * v * sourceBR.color.b
      );

      const div = document.createElement('div');
      div.className = 'gradient-square';
      div.style.width = `${blockSize}px`;
      div.style.height = `${blockSize}px`;

      if (fillMode === 'exact') {
        div.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        div.innerHTML = `<span class="tooltip">Color: rgb(${r}, ${g}, ${b})</span>`;
      } else {
        const nearestBlock = findNearestBlock({ r, g, b }, viewMode);
        div.innerHTML = `<img src="${nearestBlock.path}" alt="${nearestBlock.name}" /><span class="tooltip">${nearestBlock.name}</span>`;
      }
      gradient.appendChild(div);
    }
  }
}

function findNearestBlock(color, viewMode) {
  let minDistance = Infinity;
  let nearestBlock = blocks[0];
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return blocks[0];
  filteredBlocks.forEach(block => {
    const distance =
      Math.pow(block.color.r - color.r, 2) +
      Math.pow(block.color.g - color.g, 2) +
      Math.pow(block.color.b - color.b, 2);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBlock = block;
    }
  });
  return nearestBlock;
}

document.getElementById('tab-blocks').onclick = showBlocks;
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
  navigator.clipboard.writeText(names.join(','));
  alert('List copied!');
};
document.getElementById('surprise').onclick = () => {
  const viewMode = document.getElementById('view-mode').value;
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return;
  const randomTL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomTR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];

  sourceTL = randomTL;
  document.getElementById('sourceTL-img').src = randomTL.path;
  document.getElementById('sourceTL-img').classList.remove('hidden');
  document.getElementById('sourceTL-label').textContent = randomTL.name;

  sourceTR = randomTR;
  document.getElementById('sourceTR-img').src = randomTR.path;
  document.getElementById('sourceTR-img').classList.remove('hidden');
  document.getElementById('sourceTR-label').textContent = randomTR.name;

  sourceBL = randomBL;
  document.getElementById('sourceBL-img').src = randomBL.path;
  document.getElementById('sourceBL-img').classList.remove('hidden');
  document.getElementById('sourceBL-label').textContent = randomBL.name;

  sourceBR = randomBR;
  document.getElementById('sourceBR-img').src = randomBR.path;
  document.getElementById('sourceBR-img').classList.remove('hidden');
  document.getElementById('sourceBR-label').textContent = randomBR.name;

  updateGradient();
};

// Initialize block loading
loadBlocks();