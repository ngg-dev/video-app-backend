// ДОПУЩЕНИЕ планировщика: модели по умолчанию выбраны без указания пользователя.
export const runwareTextModels = {
  gemma4_31b: 'google:gemma@4-31b',
} as const;

export const runwareImageModels = {
  flux2Dev: 'runware:400@1',
} as const;

export const runwareVideoModels = {
  seedance20: 'bytedance:seedance@2.0',
} as const;

export const RUNWARE_TRANSPORT = 'rest' as const;

export const RUNWARE_DEFAULT_IMAGE_SIZE = {
  width: 1024,
  height: 1024,
} as const;
