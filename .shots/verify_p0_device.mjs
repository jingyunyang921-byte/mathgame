// 真机宠物与结算验收已升级为成长旅行规则；验证前备份、结束后恢复原设备存档。
process.env.PET_DEVICE = '1';
await import('./verify_pet.mjs');
const petFailed = process.exitCode;
await import('./verify_chest.mjs');
if (petFailed) process.exitCode = petFailed;
