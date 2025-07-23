export class SchematicGenerator {
    constructor(voxelData, blockType) {
        this.voxelData = voxelData;
        this.blockType = blockType;
    }

    generateSchem() {
        if (!this.voxelData || !this.voxelData.voxelPositions || !this.voxelData.voxelSize || !this.voxelData.boundingBox) {
            console.warn('Invalid voxel data for schematic generation.');
            throw new Error('Données voxel invalides pour la génération du schematic.');
        }

        try {
            const nbt = window.nbt;
            if (!nbt) {
                console.error('prismarine-nbt library not found.');
                throw new Error('Bibliothèque prismarine-nbt introuvable. Vérifiez que le script est chargé.');
            }

            const { voxelPositions, voxelSize, boundingBox } = this.voxelData;
            const resX = Math.ceil(boundingBox.size.x / voxelSize) || 1;
            const resY = Math.ceil(boundingBox.size.y / voxelSize) || 1;
            const resZ = Math.ceil(boundingBox.size.z / voxelSize) || 1;

            console.log('Schematic dimensions:', { width: resX, height: resY, length: resZ });

            // Create palette
            const palette = {
                'minecraft:air': 0,
                [this.blockType]: 1
            };

            // Create 3D grid
            const grid = new Array(resX);
            for (let x = 0; x < resX; x++) {
                grid[x] = new Array(resY);
                for (let y = 0; y < resY; y++) {
                    grid[x][y] = new Array(resZ).fill(0); // 0 for air
                }
            }

            // Fill voxel positions
            voxelPositions.forEach(({ x, y, z }) => {
                if (x >= 0 && x < resX && y >= 0 && y < resY && z >= 0 && z < resZ) {
                    grid[x][y][z] = 1; // 1 for block
                }
            });

            // Convert to YZX order for Sponge format
            const blockData = new Uint8Array(resX * resY * resZ);
            let index = 0;
            for (let y = 0; y < resY; y++) {
                for (let z = 0; z < resZ; z++) {
                    for (let x = 0; x < resX; x++) {
                        blockData[index++] = grid[x][y][z];
                    }
                }
            }

            // Create NBT structure
            const nbtData = {
                Schematic: {
                    schematic: {
                        Version: nbt.int(3),
                        DataVersion: nbt.int(4189), // Minecraft 1.21
                        Width: nbt.short(resX),
                        Height: nbt.short(resY),
                        Length: nbt.short(resZ),
                        Offset: nbt.intArray([0, 0, 0]),
                        Blocks: {
                            Palette: {},
                            Data: nbt.byteArray(Array.from(blockData))
                        },
                        Metadata: {
                            WorldEdit: {
                                Platforms: {
                                    'intellectualsites:bukkit': {
                                        'AA Name': nbt.string('Bukkit-Official'),
                                        'AA Version': nbt.string('2.12.3')
                                    }
                                },
                                'Editing Platform': nbt.string('intellectualsites:bukkit'),
                                Version: nbt.string('2.12.3'),
                                Origin: nbt.intArray([0, 0, 0])
                            },
                            Date: nbt.long([0, Math.floor(Date.now() / 1000)])
                        }
                    }
                }
            };

            // Add palette entries
            for (const [blockName, index] of Object.entries(palette)) {
                nbtData.Schematic.schematic.Blocks.Palette[blockName] = nbt.int(index);
            }

            // Serialize to NBT
            const nbtBuffer = nbt.write(nbtData, 'big');
            if (!nbtBuffer || nbtBuffer.length === 0) {
                console.error('NBT serialization failed: Empty buffer');
                throw new Error('Échec de la sérialisation NBT : Buffer vide');
            }

            // Compress with GZIP
            if (typeof pako === 'undefined') {
                console.error('Pako library not found.');
                throw new Error('Bibliothèque Pako introuvable.');
            }
            const compressedBuffer = pako.gzip(nbtBuffer);
            if (!compressedBuffer || compressedBuffer.length === 0) {
                console.error('GZIP compression failed: Empty buffer');
                throw new Error('Échec de la compression GZIP : Buffer vide');
            }

            // Return Blob for download
            const blob = new Blob([compressedBuffer], { type: 'application/octet-stream' });
            return { blob, filename: 'voxel_model.schem', dimensions: { width: resX, height: resY, length: resZ }, blockCount: voxelPositions.length, blockType: this.blockType };

        } catch (err) {
            console.error('Erreur lors de la génération du schematic :', err);
            throw err;
        }
    }

    // Fallback manual serialization
    generateSchemManual() {
        if (!this.voxelData || !this.voxelData.voxelPositions || !this.voxelData.voxelSize || !this.voxelData.boundingBox) {
            console.warn('Invalid voxel data for schematic generation.');
            throw new Error('Données voxel invalides pour la génération du schematic.');
        }

        try {
            const { voxelPositions, voxelSize, boundingBox } = this.voxelData;
            const resX = Math.ceil(boundingBox.size.x / voxelSize) || 1;
            const resY = Math.ceil(boundingBox.size.y / voxelSize) || 1;
            const resZ = Math.ceil(boundingBox.size.z / voxelSize) || 1;

            console.log('Schematic dimensions (manual):', { width: resX, height: resY, length: resZ });

            // Create palette
            const palette = {
                'minecraft:air': 0,
                [this.blockType]: 1
            };

            // Create 3D grid
            const grid = new Array(resX);
            for (let x = 0; x < resX; x++) {
                grid[x] = new Array(resY);
                for (let y = 0; y < resY; y++) {
                    grid[x][y] = new Array(resZ).fill(0); // 0 for air
                }
            }

            // Fill voxel positions
            voxelPositions.forEach(({ x, y, z }) => {
                if (x >= 0 && x < resX && y >= 0 && y < resY && z >= 0 && z < resZ) {
                    grid[x][y][z] = 1; // 1 for block
                }
            });

            // Convert to YZX order
            const blockData = new Uint8Array(resX * resY * resZ);
            let index = 0;
            for (let y = 0; y < resY; y++) {
                for (let z = 0; z < resZ; z++) {
                    for (let x = 0; x < resX; x++) {
                        blockData[index++] = grid[x][y][z];
                    }
                }
            }

            // Create NBT structure
            const nbtData = {
                type: 'compound',
                name: 'Schematic',
                value: {
                    schematic: {
                        type: 'compound',
                        value: {
                            Version: { type: 'int', value: 3 },
                            DataVersion: { type: 'int', value: 4189 },
                            Width: { type: 'short', value: resX },
                            Height: { type: 'short', value: resY },
                            Length: { type: 'short', value: resZ },
                            Offset: { type: 'intArray', value: new Int32Array([0, 0, 0]) },
                            Blocks: {
                                type: 'compound',
                                value: {
                                    Palette: { type: 'compound', value: {} },
                                    Data: { type: 'byteArray', value: blockData }
                                }
                            },
                            Metadata: {
                                type: 'compound',
                                value: {
                                    WorldEdit: {
                                        type: 'compound',
                                        value: {
                                            Platforms: {
                                                type: 'compound',
                                                value: {
                                                    'intellectualsites:bukkit': {
                                                        type: 'compound',
                                                        value: {
                                                            'AA Name': { type: 'string', value: 'Bukkit-Official' },
                                                            'AA Version': { type: 'string', value: '2.12.3' }
                                                        }
                                                    }
                                                }
                                            },
                                            'Editing Platform': { type: 'string', value: 'intellectualsites:bukkit' },
                                            Version: { type: 'string', value: '2.12.3' },
                                            Origin: { type: 'intArray', value: new Int32Array([0, 0, 0]) }
                                        }
                                    },
                                    Date: { type: 'long', value: BigInt(Math.floor(Date.now() / 1000)) }
                                }
                            }
                        }
                    }
                }
            };

            // Add palette entries
            for (const [blockName, index] of Object.entries(palette)) {
                nbtData.value.schematic.value.Blocks.value.Palette.value[blockName] = { type: 'int', value: index };
            }

            // Serialize to NBT
            const nbtBuffer = this.writeNBT(nbtData);
            if (!nbtBuffer || nbtBuffer.length === 0) {
                console.error('NBT serialization failed: Empty buffer');
                throw new Error('Échec de la sérialisation NBT : Buffer vide');
            }

            // Compress with GZIP
            if (typeof pako === 'undefined') {
                console.error('Pako library not found.');
                throw new Error('Bibliothèque Pako introuvable.');
            }
            const compressedBuffer = pako.gzip(nbtBuffer);
            if (!compressedBuffer || compressedBuffer.length === 0) {
                console.error('GZIP compression failed: Empty buffer');
                throw new Error('Échec de la compression GZIP : Buffer vide');
            }

            // Return Blob for download
            const blob = new Blob([compressedBuffer], { type: 'application/octet-stream' });
            return { blob, filename: 'voxel_model.schem', dimensions: { width: resX, height: resY, length: resZ }, blockCount: voxelPositions.length, blockType: this.blockType };

        } catch (err) {
            console.error('Erreur lors de la génération manuelle du schematic :', err);
            throw err;
        }
    }

    // Manual NBT serialization methods
    writeNBT(data) {
        const buffer = [];
        buffer.push(0x0A); // TAG_Compound
        this.writeString(data.name || 'Schematic', buffer);
        this.writeCompoundContent(data.value, buffer);
        return new Uint8Array(buffer);
    }

    writeCompoundContent(compound, buffer) {
        for (const [key, tag] of Object.entries(compound)) {
            this.writeNBTTag(tag, key, buffer);
        }
        buffer.push(0x00); // TAG_End
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
            case 'long':
                this.writeInt64(tag.value, buffer);
                break;
            case 'byteArray':
                this.writeInt32(tag.value.length, buffer);
                for (let i = 0; i < tag.value.length; i++) {
                    buffer.push(tag.value[i] & 0xFF);
                }
                break;
            case 'intArray':
                this.writeInt32(tag.value.length, buffer);
                for (let i = 0; i < tag.value.length; i++) {
                    this.writeInt32(tag.value[i], buffer);
                }
                break;
            case 'string':
                this.writeString(tag.value, buffer);
                break;
        }
    }

    writeInt64(value, buffer) {
        const bigValue = BigInt(value);
        buffer.push(
            Number((bigValue >> 56n) & 0xFFn),
            Number((bigValue >> 48n) & 0xFFn),
            Number((bigValue >> 40n) & 0xFFn),
            Number((bigValue >> 32n) & 0xFFn),
            Number((bigValue >> 24n) & 0xFFn),
            Number((bigValue >> 16n) & 0xFFn),
            Number((bigValue >> 8n) & 0xFFn),
            Number(bigValue & 0xFFn)
        );
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
        this.writeInt16(bytes.length, buffer);
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
}