import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Infrastructure Layer Architecture', () => {
  const srcPath = join(__dirname, '..', '..');
  const infrastructurePath = join(srcPath, 'infrastructure');

  describe('Test 3: Old directories do not exist', () => {
    it('old ai-providers, storage, and database directories should not exist at src root', () => {
      // Arrange
      const oldPaths = [
        join(srcPath, 'ai-providers'),
        join(srcPath, 'storage'),
        join(srcPath, 'database'),
      ];

      // Act & Assert
      oldPaths.forEach((path) => {
        expect(existsSync(path)).toBe(false);
      });
    });
  });

  describe('Test 4: No TS files reference old paths', () => {
    it('no .ts files should reference old paths (src/ai-providers, src/storage, src/database)', () => {
      // Arrange
      const oldPathRegex =
        /['"](src\/|\.{1,2}\/(\.\.\/)*)?(ai-providers|storage|database)\//;
      const violatingFiles: string[] = [];

      // Helper function to recursively find all .ts files
      const findTsFiles = (dir: string): string[] => {
        const files: string[] = [];
        const entries = readdirSync(dir);

        entries.forEach((entry) => {
          const fullPath = join(dir, entry);
          // Skip infrastructure layer test file itself and all spec files
          if (
            fullPath.includes('infrastructure-layer.spec.ts') ||
            entry.endsWith('.spec.ts')
          ) {
            return;
          }
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(...findTsFiles(fullPath));
          } else if (entry.endsWith('.ts')) {
            files.push(fullPath);
          }
        });

        return files;
      };

      const allTsFiles = findTsFiles(srcPath);

      // Act
      allTsFiles.forEach((filePath) => {
        const content = readFileSync(filePath, 'utf-8');
        if (oldPathRegex.test(content)) {
          violatingFiles.push(filePath);
        }
      });

      // Assert
      expect(violatingFiles).toEqual([]);
    });
  });

  describe('Test 5: Consumers outside infrastructure do not import infrastructure directly', () => {
    it('non-infrastructure modules should not import src/infrastructure/... directly', () => {
      // Arrange
      const oldPathRegex = /['"](src\/infrastructure\/|infrastructure\/)/;
      const violatingFiles: string[] = [];

      // Helper function to find all .ts files outside infrastructure
      const findTsFilesOutsideInfra = (dir: string): string[] => {
        const files: string[] = [];
        const entries = readdirSync(dir);

        entries.forEach((entry) => {
          // Skip infrastructure directory entirely
          if (entry === 'infrastructure') {
            return;
          }

          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(...findTsFilesOutsideInfra(fullPath));
          } else if (entry.endsWith('.ts')) {
            files.push(fullPath);
          }
        });

        return files;
      };

      const allTsFiles = findTsFilesOutsideInfra(srcPath);

      // Act
      allTsFiles.forEach((filePath) => {
        const content = readFileSync(filePath, 'utf-8');
        if (
          oldPathRegex.test(content) &&
          !content.includes('@ai-providers') &&
          !content.includes('@storage') &&
          !content.includes('@database')
        ) {
          violatingFiles.push(filePath);
        }
      });

      // Assert
      expect(violatingFiles).toEqual([]);
    });
  });

  describe('Test 6: Infrastructure does not depend on domain', () => {
    it('infrastructure files should not import from domain modules', () => {
      // Arrange
      const violatingFiles: string[] = [];
      const domainModules = [
        'character-gallery',
        'video-pipe',
        'create-video',
        'scenario-plan',
        'media',
      ];
      const domainRegex = new RegExp(
        `['"](src|\\.)/(${domainModules.join('|')})/`,
      );

      // Helper function to find all .ts files in infrastructure
      const findTsFilesInInfra = (dir: string): string[] => {
        const files: string[] = [];
        const entries = readdirSync(dir);

        entries.forEach((entry) => {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(...findTsFilesInInfra(fullPath));
          } else if (entry.endsWith('.ts')) {
            files.push(fullPath);
          }
        });

        return files;
      };

      const allTsFiles = findTsFilesInInfra(infrastructurePath);

      // Act
      allTsFiles.forEach((filePath) => {
        const content = readFileSync(filePath, 'utf-8');
        const specifierMatches = content.match(/from ['"]([^'"]+)['"]/g);
        const specifier = specifierMatches || [];

        specifier.forEach((imp: string) => {
          const path = imp.replace(/from ['"]|['"]$/g, '');
          // Check if it's a domain module reference
          if (domainRegex.test(path)) {
            violatingFiles.push(`${filePath}: ${imp}`);
          }
        });
      });

      // Assert
      expect(violatingFiles).toEqual([]);
    });
  });

  describe('Test 7: Specs location and naming', () => {
    it('spec files should only exist in __tests__ directories', () => {
      // Arrange
      const specFilesOutsideTests: string[] = [];

      const findSpecFiles = (dir: string): string[] => {
        const files: string[] = [];
        const entries = readdirSync(dir);

        entries.forEach((entry) => {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(...findSpecFiles(fullPath));
          } else if (entry.endsWith('.spec.ts')) {
            files.push(fullPath);
          }
        });

        return files;
      };

      // Act
      const allSpecFiles = findSpecFiles(infrastructurePath);
      allSpecFiles.forEach((filePath) => {
        // Check if spec file is NOT in a __tests__ directory
        if (!filePath.includes('__tests__')) {
          specFilesOutsideTests.push(filePath);
        }
      });

      // Assert
      expect(specFilesOutsideTests).toEqual([]);
    });

    it('__tests__ directories should only contain spec files', () => {
      // Arrange
      const findNonSpecFilesInTests = (dir: string): string[] => {
        const files: string[] = [];
        const entries = readdirSync(dir);

        entries.forEach((entry) => {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && entry === '__tests__') {
            // This is a __tests__ directory
            const testEntries = readdirSync(fullPath);
            testEntries.forEach((testEntry) => {
              const testPath = join(fullPath, testEntry);
              const testStat = statSync(testPath);
              if (testStat.isFile() && !testEntry.endsWith('.spec.ts')) {
                files.push(testPath);
              }
            });
          } else if (stat.isDirectory()) {
            files.push(...findNonSpecFilesInTests(fullPath));
          }
        });

        return files;
      };

      // Act
      const nonSpecFiles = findNonSpecFilesInTests(infrastructurePath);

      // Assert
      expect(nonSpecFiles).toEqual([]);
    });
  });

  describe('Test 8: Migrated modules structure', () => {
    it('all expected migrated files should exist at their new locations', () => {
      // Arrange
      const expectedFiles = [
        'ai-providers/deepseek/deepseek.module.ts',
        'ai-providers/deepseek/controllers/deepseek.controller.ts',
        'ai-providers/deepseek/services/deepseek.service.ts',
        'ai-providers/deepseek/dto/deepseek.dto.ts',
        'ai-providers/deepseek/types/deepseek.types.ts',
        'ai-providers/deepseek/__tests__/deepseek.service.spec.ts',
        'ai-providers/xai/xai.module.ts',
        'ai-providers/xai/controllers/xai-text.controller.ts',
        'ai-providers/xai/controllers/xai-image.controller.ts',
        'ai-providers/xai/services/xai.service.ts',
        'ai-providers/xai/dto/xai-text.dto.ts',
        'ai-providers/xai/dto/xai-image.dto.ts',
        'ai-providers/xai/types/xai.types.ts',
        'ai-providers/xai/utils/xai-request-builders.util.ts',
        'ai-providers/xai/__tests__/xai.service.spec.ts',
        'ai-providers/xai/__tests__/xai-request-builders.util.spec.ts',
        'ai-providers/runware/runware.module.ts',
        'ai-providers/runware/controllers/runware-text.controller.ts',
        'ai-providers/runware/controllers/runware-image.controller.ts',
        'ai-providers/runware/controllers/runware-video.controller.ts',
        'ai-providers/runware/services/runware.service.ts',
        'ai-providers/runware/dto/runware-text.dto.ts',
        'ai-providers/runware/dto/runware-image.dto.ts',
        'ai-providers/runware/dto/runware-video.dto.ts',
        'ai-providers/runware/types/runware.types.ts',
        'ai-providers/runware/utils/runware-client.factory.ts',
        'ai-providers/runware/utils/runware-request-builders.util.ts',
        'ai-providers/runware/utils/runware-response.util.ts',
        'ai-providers/runware/__tests__/runware.service.spec.ts',
        'ai-providers/runware/__tests__/runware-controllers.spec.ts',
        'ai-providers/runware/__tests__/runware-request-builders.util.spec.ts',
        'ai-providers/runware/__tests__/runware-response.util.spec.ts',
        'storage/storage.module.ts',
        'storage/controllers/storage.controller.ts',
        'storage/services/storage.service.ts',
        'storage/dto/upload-response.dto.ts',
        'storage/types/storage.types.ts',
        'storage/constants/storage.constants.ts',
        'storage/utils/s3-client.ts',
        'storage/__tests__/storage.service.spec.ts',
        'database/redis/redis.module.ts',
        'database/redis/services/redis.service.ts',
      ];

      const missingFiles: string[] = [];

      // Act
      expectedFiles.forEach((file) => {
        const fullPath = join(infrastructurePath, file);
        if (!existsSync(fullPath)) {
          missingFiles.push(file);
        }
      });

      // Assert
      expect(missingFiles).toEqual([]);
    });
  });

  describe('Test 9: Jest aliases resolve correctly', () => {
    it('jest aliases should resolve to same modules as src/... paths', () => {
      // Arrange
      const modulePairs = [
        {
          alias: '@storage/services/storage.service',
          srcPath: 'src/infrastructure/storage/services/storage.service',
        },
        {
          alias: '@ai-providers/deepseek/services/deepseek.service',
          srcPath:
            'src/infrastructure/ai-providers/deepseek/services/deepseek.service',
        },
        {
          alias: '@ai-providers/xai/services/xai.service',
          srcPath: 'src/infrastructure/ai-providers/xai/services/xai.service',
        },
        {
          alias: '@ai-providers/runware/services/runware.service',
          srcPath:
            'src/infrastructure/ai-providers/runware/services/runware.service',
        },
        {
          alias: '@database/redis/services/redis.service',
          srcPath: 'src/infrastructure/database/redis/services/redis.service',
        },
      ];

      // Act & Assert
      modulePairs.forEach(({ alias, srcPath }) => {
        const aliasPath = require.resolve(alias);
        const srcFullPath = require.resolve(srcPath);
        expect(aliasPath).toBe(srcFullPath);
      });
    });
  });

  describe('Test 10: Aliases declared consistently', () => {
    it('tsconfig.json and package.json should declare infrastructure aliases consistently', () => {
      // Arrange
      const tsconfigPath = join(srcPath, '..', 'tsconfig.json');
      const packageJsonPath = join(srcPath, '..', 'package.json');

      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8')) as {
        compilerOptions: { paths?: Record<string, string[]> };
      };
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, 'utf-8'),
      ) as { jest?: { moduleNameMapper?: Record<string, string> } };

      const paths = tsconfig.compilerOptions.paths || {};
      const moduleMapper = packageJson.jest?.moduleNameMapper || {};

      // Act & Assert
      // Check tsconfig has all required paths
      expect(paths).toHaveProperty('@infrastructure/*');
      expect(paths).toHaveProperty('@ai-providers/*');
      expect(paths).toHaveProperty('@storage/*');
      expect(paths).toHaveProperty('@database/*');
      expect(paths).toHaveProperty('src/*');

      // Check values point to correct directories
      expect(paths['@infrastructure/*']).toEqual(['src/infrastructure/*']);
      expect(paths['@ai-providers/*']).toEqual([
        'src/infrastructure/ai-providers/*',
      ]);
      expect(paths['@storage/*']).toEqual(['src/infrastructure/storage/*']);
      expect(paths['@database/*']).toEqual(['src/infrastructure/database/*']);

      // Check jest moduleNameMapper has corresponding entries
      expect(moduleMapper['^@infrastructure/(.*)$']).toBeDefined();
      expect(moduleMapper['^@ai-providers/(.*)$']).toBeDefined();
      expect(moduleMapper['^@storage/(.*)$']).toBeDefined();
      expect(moduleMapper['^@database/(.*)$']).toBeDefined();
      expect(moduleMapper['^src/(.*)$']).toBeDefined();

      // Verify jest paths map to infrastructure structure
      expect(moduleMapper['^@infrastructure/(.*)$']).toMatch(
        /infrastructure\/\$1/,
      );
      expect(moduleMapper['^@ai-providers/(.*)$']).toMatch(
        /infrastructure\/ai-providers\/\$1/,
      );
      expect(moduleMapper['^@storage/(.*)$']).toMatch(
        /infrastructure\/storage\/\$1/,
      );
      expect(moduleMapper['^@database/(.*)$']).toMatch(
        /infrastructure\/database\/\$1/,
      );
    });
  });
});
