// 真机成长旅行验收；与本地保持同一份剧情、图鉴、新家结局及出生优先级断言。
process.env.PET_DEVICE = '1';
await import('./verify_story.mjs');
