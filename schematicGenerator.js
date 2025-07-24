import { gzip } from "https://cdn.jsdelivr.net/npm/pako@2.1.0/+esm";

// Importer prismarine-nbt
import * as nbt from 'https://cdn.skypack.dev/pin/prismarine-nbt@v2.7.0-BbRkbBHdZryTVVYxUet2/mode=imports/optimized/prismarine-nbt.js';

export class SchematicGenerator {
    constructor(voxelData, blockType) {
        this.voxelData = voxelData;
        this.blockType = blockType;
    }

    async generateSchem() {
        if (!this.voxelData || !this.voxelData.voxelPositions || !this.voxelData.voxelSize || !this.voxelData.boundingBox) {
            console.warn('Invalid voxel data for schematic generation.');
            throw new Error('Données voxel invalides pour la génération du schematic.');
        }

        try {
            const { voxelPositions, voxelSize, boundingBox } = this.voxelData;
            const resX = Math.ceil(boundingBox.size.x / voxelSize) || 1;
            const resY = Math.ceil(boundingBox.size.y / voxelSize) || 1;
            const resZ = Math.ceil(boundingBox.size.z / voxelSize) || 1;

            console.log('Schematic dimensions:', { width: resX, height: resY, length: resZ });

            // Palette
            const palette = {
                'minecraft:air': 0,
                [this.blockType]: 1
            };

            // Grille 3D remplie à 0 (air)
            const grid = Array.from({ length: resX }, () =>
                Array.from({ length: resY }, () =>
                    Array(resZ).fill(0)
                )
            );

            // Remplir les blocs solides (1)
            voxelPositions.forEach(({ x, y, z }) => {
                if (x >= 0 && x < resX && y >= 0 && y < resY && z >= 0 && z < resZ) {
                    grid[x][y][z] = 1;
                }
            });

            // Ordre YZX → FAWE format
            const blockData = [];
            for (let y = 0; y < resY; y++) {
                for (let z = 0; z < resZ; z++) {
                    for (let x = 0; x < resX; x++) {
                        blockData.push(grid[x][y][z]);
                    }
                }
            }

            // Structure NBT pour .schem (format Sponge/WorldEdit)
            const nbtData = {
                type: 'compound',
                name: '',
                value: {
                    Version: { type: 'int', value: 2 },
                    DataVersion: { type: 'int', value: 2730 }, // Minecraft 1.16.5
                    Width: { type: 'short', value: resX },
                    Height: { type: 'short', value: resY },
                    Length: { type: 'short', value: resZ },
                    Offset: { type: 'intArray', value: [0, 0, 0] },
                    Palette: {
                        type: 'compound',
                        value: Object.fromEntries(
                            Object.entries(palette).map(([block, id]) => [
                                block,
                                { type: 'int', value: id }
                            ])
                        )
                    },
                    BlockData: { type: 'byteArray', value: blockData },
                    Entities: { type: 'list', value: { type: 'compound', value: [] } },
                    BlockEntities: { type: 'list', value: { type: 'compound', value: [] } }
                }
            };

            // Écrire les données NBT avec prismarine-nbt
            const nbtBuffer = await nbt.write(nbtData);

            // Compresser avec GZIP
            if (typeof pako === 'undefined') {
                throw new Error('Pako introuvable. Vérifiez l’inclusion du script.');
            }
            const compressedBuffer = gzip(nbtBuffer);
            const blob = new Blob([compressedBuffer], { type: 'application/octet-stream' });

            return {
                blob,
                filename: 'voxel_model.schem',
                dimensions: { width: resX, height: resY, length: resZ },
                blockCount: voxelPositions.length,
                blockType: this.blockType
            };

        } catch (err) {
            console.error('Erreur lors de la génération du schematic :', err);
            throw err;
        }
    }
}   