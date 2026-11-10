/* 数宝成长旅行：菜单与游戏共用同一份日期、孵化和奖励规则。 */
(function (root) {
  'use strict';
  const KEY = 'mathgamePet';
  const PHASES = [
    { at: 0, name: '暖窝里的萌蛋', text: '你好呀，以后我们一起旅行！' },
    { at: 75, name: '轻轻的回应', text: '摸一摸，萌蛋正轻轻回应你。' },
    { at: 225, name: '闪亮的新花纹', text: '蛋壳多了新花纹，记下这一刻吧。' },
    { at: 375, name: '蛋里的悄悄话', text: '嘘，听见里面轻轻的声音了吗？' },
    { at: 525, name: '认识你的声音', text: '每次打招呼，它都会开心地晃一晃。' },
    { at: 675, name: '朋友们的期待', text: '萌蛋越来越活跃，朋友们也来探望啦。' },
    { at: 825, name: '小小的裂纹', text: '壳上有细小裂纹，我们一起准备欢迎礼物。' },
    { at: 900, name: '准备好见面啦', text: '这份长久的陪伴，让数宝准备好出生啦！' }
  ];
  // 1-6 号是六位小伙伴送的礼物；7 号「悄悄话传声筒」是朋友们合送的，蛋长到第 4 阶段自动收到，不进 gifts[]。
  const GIFTS = ['', '柔软窝垫', '收纳小篮', '音符挂饰', '旅行背包', '贝壳挂饰', '欢迎小灯', '悄悄话传声筒'];
  const WHISPER = 7;
  // 每份礼物在哪个成长阶段派上用场（阶段号 = PHASES 下标）。
  const GIFT_PHASE = { 1: 1, 2: 2, 7: 3, 3: 4, 4: 5, 5: 6, 6: 7 };
  // 成长能量（点）：阶段刻度 PHASES.at 和孵化都只看能量，满 900 点；没有自然日门槛。
  // 每天最多吸收 10 点（打卡 +4、通关每次 +3），所以最快 90 天攒满；吃饱后当天不再涨，星币和宝箱照常。
  const ENERGY_MAX = 900, XP_DAILY = 10, XP_CHECKIN = 4, XP_CLEAR = 3;
  // 材料：每通关一关，小伙伴带来一份对应材料；「用上」=喂给对应礼物，萌蛋吃 3 点能量（受每天 10 点封顶），礼物也跟着长。
  // 每天最多用 3 份（USE_DAILY），多出来的先收进背包（每种最多 BAG_MAX 份）；礼物累计用上 10/30/60 份各升一档。
  const MATS = {
    1: { name: '暖草', friend: '小兔', use: '铺进窝垫' },
    2: { name: '松果', friend: '小松鼠', use: '放进小篮' },
    3: { name: '小音符', friend: '小鸟', use: '串上挂饰' },
    4: { name: '落叶', friend: '小鹿', use: '收进背包' },
    5: { name: '小贝壳', friend: '小海龟', use: '缀上挂饰' },
    6: { name: '萤火', friend: '小刺猬', use: '装进小灯' }
  };
  const TIERS = [10, 30, 60], USE_DAILY = 3, BAG_MAX = 9, USED_MAX = 999;
  const TIER_NAMES = {
    1: ['柔软窝垫', '加厚窝垫', '绣花窝垫', '云朵窝垫'],
    2: ['收纳小篮', '加盖小篮', '分格小篮', '宝贝大篮'],
    3: ['音符挂饰', '双音符挂饰', '音符串', '小风铃'],
    4: ['旅行背包', '新口袋背包', '多口袋背包', '探险大背包'],
    5: ['贝壳挂饰', '双贝壳挂饰', '贝壳风铃', '海螺号角'],
    6: ['欢迎小灯', '亮亮的小灯', '萤火灯罩', '星星灯塔']
  };
  const STORIES = [
    { id: 'gift-1', level: 1, phase: 0, title: '第一次安稳入睡', action: '一起铺好窝垫', text: '小兔把柔软窝垫送来了。我们把它铺进小窝，给旅途中的萌蛋留一个安心休息的地方。攒够 75 点成长能量，萌蛋就会躺上窝垫，轻轻回应你。', response: '萌蛋在窝垫上轻轻晃了一下，慢慢安静下来。今晚，就在这里安心睡吧。', baby: '数宝趴在熟悉的窝垫上伸了个懒腰：旅行回来，还是这里最舒服。', use: '铺在身下，陪它安心休息', memory: '小兔的窝垫，陪我们度过了安稳的夜晚。' },
    { id: 'gift-2', level: 2, phase: 0, title: '第一次带蛋出门', action: '收好出门的用品', text: '小松鼠带来一只收纳小篮。我们把水壶、小手帕和旅行用品放整齐，准备带萌蛋出门看看。攒到 225 点成长能量，蛋壳长出新花纹时，篮里的彩珠就派上用场。', response: '篮子收好啦。萌蛋轻轻晃了晃，像是在说：一起出发吧！以后的小纪念也有家了。', baby: '数宝把自己的小手帕放进篮子：出门的东西，一件也没忘。', use: '收好用品和旅行小纪念', memory: '小松鼠的小篮，收好了第一次出门的期待。' },
    { id: 'gift-3', level: 3, phase: 0, title: '约定一首歌', action: '轻轻唱一段旋律', text: '小鸟把音符挂饰挂在窝边。我们约好，每次见面都轻轻哼这一首歌，慢慢等数宝认识它。攒到 525 点成长能量，萌蛋认得你的声音了，就跟着这首歌晃一晃。', response: '音符在窝边轻轻摆动。这首小歌留下来啦，明天也这样打招呼吧。', baby: '熟悉的旋律响起，数宝跟着摆了摆身体：这首歌，我记得！', use: '用同一首小歌打招呼', memory: '小鸟的音符，记住了我们每天打招呼的歌。' },
    { id: 'gift-4', level: 4, phase: 0, title: '一起走过山路', action: '背好背包去看山', text: '小鹿送来旅行背包，带我们跟着它走到山路的观景处。我们装好水和小手帕，沿途慢慢走。攒到 675 点成长能量，朋友们都来探望的那天，背包要陪我们一起迎接。', response: '山风轻轻吹来。我们把一片落叶收进背包，带回小窝：这是一起走过山路的纪念。', baby: '数宝从背包里找到那片落叶，和小鹿一起指向远处：下次还去看山吧！', use: '带上用品，保存山路落叶', memory: '小鹿的背包，留着一起走过山路的落叶。' },
    { id: 'gift-5', level: 5, phase: 0, title: '把海风带回家', action: '一起听听贝壳', text: '小海龟送来贝壳挂饰。我们在海边停一会儿，把贝壳放在身旁，听海浪一下一下拍着沙滩。攒到 825 点成长能量，蛋壳裂开一道小缝时，贝壳会陪着它。', response: '海风把挂饰轻轻吹动。回到小窝，我们也能摸摸贝壳，想起今天的海浪声。', baby: '数宝捧着贝壳，和小海龟一起回想那片蓝蓝的海：我们还要再去做客。', use: '留住海边听潮声的回忆', memory: '小海龟的贝壳，把海边的回忆带回了家。' },
    { id: 'gift-6', level: 6, phase: 0, title: '为你留一盏灯', action: '把欢迎灯安好', text: '小刺猬带来欢迎小灯。我们把它安在小窝旁，约好等数宝准备好出生的那天，再一起点亮。攒满 900 点成长能量，欢迎灯就会亮起来。', response: '欢迎灯安好啦，新家又多了一份期待。现在安心陪伴，等到见面的那天再点灯。', baby: '小刺猬点亮欢迎灯，数宝在暖暖的灯光里挥挥手：谢谢你一直为我留着家。', use: '安在窝边，出生时点亮', memory: '小刺猬的欢迎灯，终于等到了今天的见面。' },
    { id: 'gift-7', level: 7, phase: 3, title: '蛋壳里的悄悄话', action: '凑近听一听', text: '攒到 375 点成长能量，蛋壳里传出了第一声悄悄话。朋友们凑在一起，做了一只小小的传声筒，让你把耳朵贴上去，听听萌蛋想说什么。', response: '“咚——咚。”萌蛋也轻轻回了你一句。以后每天的悄悄话，都会长一点点。', baby: '数宝拿起传声筒，凑到你耳边：这是我在蛋里偷偷学会的第一句话，谢谢你陪我。', use: '凑近蛋壳，听它的悄悄话' },
    { id: 'rest-1', level: 1, phase: 1, title: '熟悉的窝垫，安心的回应', action: '掖好暖暖的窝垫', text: '又到了休息的时候。还记得小兔送来的窝垫吗？我们把它轻轻整理好，坐在萌蛋旁边。', response: '萌蛋轻轻晃了一下，又安心地靠回窝垫。每天回来，这里都是它熟悉的小窝。' },
    { id: 'basket-2', level: 2, phase: 2, title: '小篮里的旅行收藏', action: '整理今天的小纪念', text: '蛋壳有了新花纹。小松鼠把收纳篮搬来，我们把一路的小纪念分格摆好，给今天也留一个位置。', response: '新花纹旁，整齐的小篮陪在原处。下次回来，还可以继续讲今天的旅行。' },
    { id: 'song-3', level: 3, phase: 4, title: '这首歌，我认识', action: '再唱那首约定的歌', text: '到了认识你声音的时候。小鸟指指窝边的音符挂饰：还记得第一次约定的那首小歌吗？', response: '熟悉的旋律响起，萌蛋跟着轻轻晃了两下。这一次，它像是在认真回应你的声音。' },
    { id: 'trail-4', level: 4, phase: 5, title: '背包里的那片落叶', action: '翻开山路的小纪念', text: '小鹿又来探望了。我们打开旅行背包，拿出第一次走山路时收好的落叶，把那天的见闻再讲一遍。', response: '萌蛋活泼地晃了晃。小鹿笑着说：等你长大，我们还可以一起去看山。' },
    { id: 'sea-5', level: 5, phase: 6, title: '裂纹旁的海边约定', action: '把贝壳放到身旁', text: '蛋壳上出现细小裂纹。小海龟把贝壳挂饰放近一点，和我们一起说起海岛上听潮声的那一天。', response: '萌蛋轻轻动了动。贝壳还在，海边的约定也还在：见面以后，我们再一起去。' },
    { id: 'light-6', level: 6, phase: 7, title: '欢迎灯，终于等到你', action: '一起点亮欢迎灯', text: '长久的学习和陪伴都记下了，数宝终于准备好见面。小刺猬来到小窝，我们取出一直留着的欢迎灯。', response: '灯光暖暖地亮起来。这一路留下的心意，今天都变成了一句：欢迎回家，数宝！' },
    { id: 'grow-1-1', level: 1, phase: 0, grow: 10, title: '窝垫变厚了', action: '拍拍厚厚的窝垫', text: '小兔每次带来的暖草，都被我们一根一根铺进窝垫。铺满十份，窝垫变得又厚又软，萌蛋靠上去，舒服地呼了口气。', response: '窝垫软软地陷下去一点点。小兔说：这是你每天认真练习换来的暖和。' },
    { id: 'grow-1-2', level: 1, phase: 0, grow: 30, title: '窝垫绣上了花边', action: '摸摸绣花的边', text: '三十份暖草铺下来，小兔用剩下的草茎，在窝垫边绣了一圈小花。每一朵，都是你练过的一天。', response: '萌蛋蹭了蹭小花边，像在说：这是我的窝，最好看的窝。' },
    { id: 'grow-1-3', level: 1, phase: 0, grow: 60, title: '窝垫变成了云朵', action: '一起躺上云朵窝垫', text: '六十份暖草之后，窝垫蓬松得像一朵云。萌蛋住在里面，风再大也一点不冷。', response: '云朵窝垫轻轻托着萌蛋。小兔笑着说：你的坚持，把家变得这么暖。' },
    { id: 'grow-2-1', level: 2, phase: 0, grow: 10, title: '小篮盖上了盖子', action: '合上小篮的盖子', text: '小松鼠每次通关都递来一颗松果。攒了十颗，我们给小篮做了个小盖子，旅途中的小纪念再也不会掉出来。', response: '盖子轻轻扣上，咔哒一声。小松鼠说：宝贝都收好啦！' },
    { id: 'grow-2-2', level: 2, phase: 0, grow: 30, title: '小篮分出了小格子', action: '看看一格一格的小篮', text: '三十颗松果，小松鼠帮我们把小篮隔成好几格：一格放彩珠，一格放小手帕，一格放今天的见闻。', response: '每一格都整整齐齐。萌蛋晃了晃，像是在点数今天的新收获。' },
    { id: 'grow-2-3', level: 2, phase: 0, grow: 60, title: '装满宝贝的大篮子', action: '抱一抱沉甸甸的篮子', text: '六十颗松果之后，小篮长成了一只大篮子，里面装的都是你一次次练习换来的小宝贝，沉甸甸的。', response: '大篮子稳稳地放在窝边。小松鼠说：这些，都是你自己攒下的。' },
    { id: 'grow-3-1', level: 3, phase: 0, grow: 10, title: '多挂了一个音符', action: '轻轻碰一碰音符', text: '小鸟每次带来一个小音符。十个音符挂上窝边，歌里多了一句，叮的一声特别清脆。', response: '音符轻轻摆了摆。小鸟唱出新的一句，萌蛋也晃了晃。' },
    { id: 'grow-3-2', level: 3, phase: 0, grow: 30, title: '音符串成了一串', action: '听音符一个接一个响', text: '三十个音符，小鸟把它们串成长长的一串。风一吹，每个音符都轻轻响一下，像在讲悄悄话。', response: '一串音符叮叮咚咚。小鸟说：这是你练出来的曲子。' },
    { id: 'grow-3-3', level: 3, phase: 0, grow: 60, title: '会唱歌的小风铃', action: '一起听风铃唱歌', text: '六十个小音符叮叮当当，变成了一串会唱歌的小风铃。听到你的脚步声，萌蛋就跟着晃。', response: '风铃把整首歌唱完了。小鸟说：这是我们的歌，谢谢你每天来。' },
    { id: 'grow-4-1', level: 4, phase: 0, grow: 10, title: '背包缝上了新口袋', action: '摸摸新缝的口袋', text: '小鹿每次分享一片山路的落叶。收满十片，背包缝上了一个新口袋，专门放落叶。', response: '落叶在口袋里沙沙响。小鹿说：山路上的风景，都替你收好了。' },
    { id: 'grow-4-2', level: 4, phase: 0, grow: 30, title: '背包多了几个口袋', action: '一格一格翻翻口袋', text: '三十片落叶，背包变成了多口袋的。水壶、手帕、落叶，各有各的位置。', response: '口袋一个个打开又合上。小鹿说：准备得这么周到，下一站不怕啦。' },
    { id: 'grow-4-3', level: 4, phase: 0, grow: 60, title: '一只探险大背包', action: '背上探险大背包', text: '六十片落叶，红的黄的绿的。背包成了一只真正的探险背包，小鹿说，下一站我们去更远的山。', response: '背包稳稳贴在背上。萌蛋晃了晃，好像也想去看看更远的山。' },
    { id: 'grow-5-1', level: 5, phase: 0, grow: 10, title: '贝壳多了一个伙伴', action: '把两个贝壳靠在一起', text: '小海龟每次带来一枚小贝壳。十枚贝壳之后，挂饰上又多了一个伙伴，海浪声好像更热闹了。', response: '两枚贝壳轻轻碰了碰。小海龟说：听，它们在说海边的事。' },
    { id: 'grow-5-2', level: 5, phase: 0, grow: 30, title: '贝壳串成了风铃', action: '听贝壳风铃沙沙响', text: '三十枚小贝壳串成了风铃，海风一吹沙沙响，好像把整片海边搬回了小窝。', response: '风铃沙沙，像浪花一层一层拍上来。萌蛋听得一动不动。' },
    { id: 'grow-5-3', level: 5, phase: 0, grow: 60, title: '一只大海螺', action: '把耳朵贴上海螺', text: '六十枚贝壳之后，小海龟送来一只大海螺。把耳朵贴上去，能听见整片大海在说话。', response: '呜——海螺里传来悠长的海浪声。小海龟说：这是给努力的你的礼物。' },
    { id: 'grow-6-1', level: 6, phase: 0, grow: 10, title: '小灯亮了一点', action: '看看更亮的小灯', text: '小刺猬每次提来一小团萤火。十团萤火住进灯里，欢迎灯比原来亮了一点。', response: '小灯暖暖地晃了晃。小刺猬说：你每练一次，家里就亮一点。' },
    { id: 'grow-6-2', level: 6, phase: 0, grow: 30, title: '萤火灯罩', action: '摸摸暖暖的灯罩', text: '三十团萤火，小刺猬给灯做了个小灯罩。光暖暖的，一点不刺眼，小窝更好看了。', response: '灯罩里的光轻轻跳动。萌蛋靠近了一点，像是在取暖。' },
    { id: 'grow-6-3', level: 6, phase: 0, grow: 60, title: '星星灯塔', action: '抬头看小灯塔', text: '六十团萤火，欢迎灯长成了一座小灯塔。等数宝出生的那天，远远就能看见回家的光。', response: '灯塔的光稳稳地亮着。小刺猬说：不管多晚，这里都有人等你。' }
  ];
  const eligibleStory = (s, p) => p.adopted && (s.level === WHISPER || p.gifts.includes(s.level)) && p.phase >= s.phase &&
    (!s.grow || (obj(p.used) && num(p.used[s.level], USED_MAX) >= s.grow)) &&
    (s.id === 'light-6' ? !!p.stage && !p.legacy && Array.isArray(p.birthGifts) && p.birthGifts.includes(6) : (!p.stage || !s.phase ||
      (obj(p.stories) && ['seen', 'pending'].some(k => Array.isArray(p.stories[k]) && p.stories[k].includes(s.id)))));
  const DECORS = [
    { id: 'leaf', name: '嫩叶窝', color: '#DDEDCB', cost: 0 },
    { id: 'peach', name: '蜜桃窝', color: '#F7D7C9', cost: 50, bg: 'linear-gradient(180deg,#FFF1E9,#FBE1D3)' },
    { id: 'sea', name: '海风窝', color: '#CEE8EC', cost: 70, bg: 'linear-gradient(180deg,#EBF8FA,#D7EEF3)' },
    { id: 'mint', name: '薄荷窝', color: '#C9EEDD', cost: 90,
      bg: 'radial-gradient(circle at 16% 20%,rgba(255,255,255,.8) 0 7px,transparent 8px),radial-gradient(circle at 84% 34%,rgba(255,255,255,.65) 0 5px,transparent 6px),linear-gradient(180deg,#EBF9F0,#D8F0E2)' },
    { id: 'lavender', name: '薰衣草窝', color: '#E1D6F5', cost: 110,
      bg: 'radial-gradient(circle at 14% 24%,#fff 0 2px,transparent 3px),radial-gradient(circle at 86% 18%,#fff 0 2px,transparent 3px),radial-gradient(circle at 78% 46%,#fff 0 1.5px,transparent 2.5px),linear-gradient(180deg,#F3ECFC,#E3D8F5)' },
    { id: 'lemon', name: '柠檬窝', color: '#F9EBA0', cost: 110,
      bg: 'radial-gradient(circle at 86% 16%,rgba(255,255,255,.85) 0 11px,transparent 12px),linear-gradient(180deg,#FFF8D2,#FBEBA4)' },
    { id: 'sunset', name: '晚霞窝', color: '#F8CBB0', cost: 150,
      bg: 'linear-gradient(180deg,#FFE8C9,#FBD2C0 58%,#F4C6D6)' },
    { id: 'candy', name: '棉花糖窝', color: '#F6D2E6', cost: 150,
      bg: 'linear-gradient(135deg,#FDE6F2,#E4EDFB)' },
    { id: 'star', name: '星光窝', color: '#F7E8B0', cost: 190,
      bg: 'radial-gradient(circle at 12% 18%,#fff 0 2.5px,transparent 3.5px),radial-gradient(circle at 88% 12%,#fff 0 3px,transparent 4px),radial-gradient(circle at 80% 42%,#fff 0 2px,transparent 3px),radial-gradient(circle at 22% 46%,#fff 0 2px,transparent 3px),linear-gradient(180deg,#FDEFC6,#F6DFA4)' },
    { id: 'cloud', name: '云朵窝', color: '#DCEBFA', cost: 190,
      bg: 'radial-gradient(ellipse 26px 10px at 22% 22%,#fff 0 99%,transparent),radial-gradient(ellipse 20px 8px at 82% 36%,rgba(255,255,255,.9) 0 99%,transparent),linear-gradient(180deg,#D6EBFB,#EBF5FD)' },
    { id: 'flower', name: '花园窝', color: '#F9D3E0', cost: 240,
      bg: 'radial-gradient(circle at 8% 14%,#F6A5C2 0 4px,transparent 5px),radial-gradient(circle at 95% 42%,#F9C46B 0 4px,transparent 5px),radial-gradient(circle at 5% 50%,#F6A5C2 0 3px,transparent 4px),linear-gradient(180deg,#F6FBE9,#E2F3CD)' },
    { id: 'rainbow', name: '彩虹窝', color: '#FFE0DC', cost: 300,
      bg: 'linear-gradient(180deg,#FFE6E4,#FFEFD8 22%,#FFF8D6 44%,#E6F6E0 66%,#DDEFFB 84%,#EADFF8)' }
  ];
  // 摆件：slot L/R 是小窝左右地面（每侧摆一件），H 是顶部挂饰（同时挂一条）。买断永久拥有。
  const ITEMS = [
    { id: 'sunflower', slot: 'L', name: '向日葵盆', cost: 80 },
    { id: 'books', slot: 'L', name: '小书堆', cost: 120 },
    { id: 'pumpkin', slot: 'L', name: '小南瓜', cost: 160 },
    { id: 'fountain', slot: 'L', name: '小喷泉', cost: 240 },
    { id: 'mushroom', slot: 'R', name: '红蘑菇', cost: 90 },
    { id: 'pinwheel', slot: 'R', name: '小风车', cost: 130 },
    { id: 'mailbox', slot: 'R', name: '小信箱', cost: 170 },
    { id: 'tent', slot: 'R', name: '小帐篷', cost: 250 },
    { id: 'wishstar', slot: 'R', name: '许愿星灯', cost: 0, limited: true },
    { id: 'bunting', slot: 'H', name: '彩旗串', cost: 100 },
    { id: 'starlight', slot: 'H', name: '星星灯串', cost: 160 },
    { id: 'lantern', slot: 'H', name: '纸灯笼', cost: 220 },
    { id: 'garland', slot: 'H', name: '花环', cost: 280 }
  ];
  const BACKUP_KEYS = ['mathgamePet', 'mathgameCoins', 'mathgameStars', 'mathgameBest',
    'mathgameWrongLog', 'mathgameMaxCompletedLevel', 'mathgameLevelsVer', 'mathgameSettings',
    'mathgameRankSeen', 'mathgameEndingSeen', 'mathgameSprintBest', 'mathgameDaily',
    'mathgameDailyChest', 'mathgameBadges', 'mathgameTravelEndingSeen'];
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = (v, max) => Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.floor(Number(v)))) : 0;
  const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function ordinal(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
    const a = s.split('-').map(Number), d = new Date(Date.UTC(a[0], a[1] - 1, a[2]));
    return d.getUTCFullYear() === a[0] && d.getUTCMonth() === a[1] - 1 && d.getUTCDate() === a[2] ? d.getTime() / 86400000 : NaN;
  }
  const validDay = s => Number.isFinite(ordinal(s));
  function read(key, fallback) {
    try { const raw = root.localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
    catch (e) { return fallback; }
  }
  function save(p) {
    root.localStorage.setItem(KEY, JSON.stringify(p));
    return p;
  }
  function earnedGifts() {
    const stars = read('mathgameStars', {});
    return obj(stars) ? [1, 2, 3, 4, 5, 6].filter(lv => Number.isFinite(stars[lv]) && stars[lv] >= 1) : [];
  }
  const freshDay = date => ({ date, got: 0, checkin: false, clears: 0, uses: 0 });
  const counts = (v, max) => { const o = {}; for (let lv = 1; lv <= 6; lv++) o[lv] = obj(v) ? num(v[lv], max) : 0; return o; };
  const tierOf = (p, lv) => TIERS.filter(n => num(p.used && p.used[lv], USED_MAX) >= n).length;
  const nextTier = (p, lv) => TIERS.find(n => num(p.used && p.used[lv], USED_MAX) < n) || 0;
  function blank() {
    return { version: 2, adopted: false, exp: 0, stage: 0, adoptedDay: '', lastDay: '',
      days: [], phase: 0, daily: { date: '', correct: 0, rounds: [] }, gifts: [],
      decor: 'leaf', decors: ['leaf'], items: [], put: { L: '', R: '', H: '' }, name: '数宝', hatchDay: '', birthSeen: false, affection: 0,
      stories: { seen: [], pending: [] }, xp: 0, xpDay: freshDay(''), bag: counts(), used: counts() };
  }
  function get(now) {
    const today = dayKey(now || new Date()), raw = read(KEY, null);
    if (!obj(raw) || !raw.adopted) return blank();
    if (raw.version != null && raw.version > 2) throw new Error('这份宠物存档来自更新版本，请先更新游戏。');
    const p = Object.assign({}, raw);
    p.version = 2; p.adopted = true; p.exp = num(p.exp, 160);
    if (raw.version !== 2) {
      p.stage = p.exp >= 160 ? 2 : (p.exp >= 60 ? 1 : 0);
      p.legacy = true; p.adoptedDay = today; p.days = []; p.phase = 0;
      p.hatchDay = p.stage ? today : ''; p.birthSeen = !!p.stage;
    }
    p.stage = num(p.stage, 2);
    p.adoptedDay = validDay(p.adoptedDay) ? p.adoptedDay : today;
    p.lastDay = validDay(p.lastDay) && p.lastDay > today ? p.lastDay : today;
    const first = ordinal(p.adoptedDay), last = ordinal(p.lastDay);
    p.days = Array.isArray(p.days) ? Array.from(new Set(p.days.filter(d => validDay(d) && ordinal(d) >= first && ordinal(d) <= last))).sort().slice(-10000) : [];
    p.daily = obj(p.daily) && validDay(p.daily.date) ? {
      date: p.daily.date, correct: num(p.daily.correct, 5),
      rounds: Array.isArray(p.daily.rounds) ? p.daily.rounds.filter(s => typeof s === 'string').slice(-64) : []
    } : { date: '', correct: 0, rounds: [] };
    // 老存档没有 xp：按「1 个学习日 = 10 点」折算，进度一点不丢；今天已记过学习日的，今天视为已吃饱。
    const fresh = !Number.isFinite(raw.xp), xd = obj(raw.xpDay) ? raw.xpDay : null;
    p.xp = fresh ? Math.min(ENERGY_MAX, p.days.length * XP_DAILY) : num(raw.xp, ENERGY_MAX);
    p.xpDay = xd && validDay(xd.date)
      ? { date: xd.date, got: num(xd.got, XP_DAILY), checkin: !!xd.checkin, clears: num(xd.clears, 99), uses: num(xd.uses, USE_DAILY) }
      : (fresh && p.days.includes(today) ? { date: today, got: XP_DAILY, checkin: true, clears: 0, uses: 0 } : freshDay(''));
    p.bag = counts(raw.bag, BAG_MAX); p.used = counts(raw.used, USED_MAX);
    p.gifts = Array.isArray(p.gifts) ? Array.from(new Set(p.gifts.filter(n => Number.isInteger(n) && n >= 1 && n <= 6))) : [];
    if (!obj(p.stories)) p.gifts = Array.from(new Set(p.gifts.concat(earnedGifts())));
    if (p.stage) p.birthGifts = Array.isArray(p.birthGifts) ? p.gifts.filter(lv => p.birthGifts.includes(lv)) : p.gifts.slice();
    else delete p.birthGifts;
    p.decors = Array.isArray(p.decors) ? DECORS.filter(d => p.decors.includes(d.id) || d.id === 'leaf').map(d => d.id) : ['leaf'];
    p.decor = p.decors.includes(p.decor) ? p.decor : 'leaf';
    p.items = Array.isArray(p.items) ? Array.from(new Set(p.items.filter(id => ITEMS.some(i => i.id === id)))) : [];
    const put = obj(p.put) ? p.put : {};
    p.put = { L: '', R: '', H: '' };
    Object.keys(p.put).forEach(s => { p.put[s] = ITEMS.some(i => i.id === put[s] && i.slot === s) && p.items.includes(put[s]) ? put[s] : ''; });
    p.name = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 12) : '数宝';
    p.hatchDay = p.stage ? (validDay(p.hatchDay) ? p.hatchDay : today) : '';
    p.birthSeen = !!p.birthSeen; p.affection = num(p.affection, 100000);
    let phase = num(p.phase, 7);
    PHASES.forEach((x, i) => { if (p.xp >= x.at) phase = Math.max(phase, i); });
    p.phase = phase;
    const available = STORIES.filter(s => eligibleStory(s, p)).map(s => s.id);
    if (!obj(p.stories)) {
      // 历史礼物与已到达阶段存进手记，不在升级后连续补弹旧故事。
      p.stories = { seen: available, pending: [] };
    } else {
      const seen = Array.isArray(p.stories.seen) ? available.filter(id => p.stories.seen.includes(id)) : [];
      const pending = Array.isArray(p.stories.pending) ? Array.from(new Set(p.stories.pending.filter(id => available.includes(id) && !seen.includes(id)))) : [];
      available.forEach(id => { if (!seen.includes(id) && !pending.includes(id)) pending.push(id); });
      p.stories = { seen, pending };
    }
    // 只在迁移、跨日或抵达阶段时落盘，避免关卡画布每帧重复写存储。
    if (JSON.stringify(raw) !== JSON.stringify(p)) { try { save(p); } catch (e) { /* 存储满或被禁用：仍返回整理后的存档，真正的写操作会自己报错 */ } }
    return p;
  }
  function info(now) {
    const today = dayKey(now || new Date()), p = get(now), xd = p.xpDay.date === today ? p.xpDay : null;
    const age = p.adopted ? Math.max(1, ordinal(p.lastDay) - ordinal(p.adoptedDay) + 1) : 0;
    return { pet: p, age, studyDays: p.days.length, phase: PHASES[p.phase],
      ready: p.adopted && !p.stage && p.xp >= ENERGY_MAX,
      doneToday: p.days.includes(today), todayCorrect: p.daily.date === today ? p.daily.correct : 0,
      todayXp: xd ? xd.got : 0, todayClears: xd ? xd.clears : 0, todayUses: xd ? xd.uses : 0,
      progress: p.stage ? 100 : Math.min(100, Math.floor(p.xp / ENERGY_MAX * 100)) };
  }
  // 成长能量（点）：打卡 +4、通关 +3，每天最多 10 点。阶段和孵化都只看能量。
  // today/dayCap/dayFull = 今天吃了几点 / 每天上限 / 今天吃饱了没。
  function growth(now) { return growthOf(info(now)); }
  // 已经拿到 info() 的调用方直接传进来，避免再读一次存档。
  function growthOf(v) {
    const p = v.pet, energy = Math.min(ENERGY_MAX, p.xp);
    const idx = !p.stage && p.phase < PHASES.length - 1 ? p.phase + 1 : -1, x = idx >= 0 ? PHASES[idx] : null;
    const at = x ? x.at : 0, gap = x ? Math.max(0, at - energy) : 0;
    return { adopted: p.adopted, hatched: !!p.stage, energy, max: ENERGY_MAX, phase: p.phase, age: v.age, ready: v.ready,
      doneToday: v.doneToday, todayCorrect: v.todayCorrect, need: Math.max(0, 5 - v.todayCorrect),
      today: v.todayXp, dayCap: XP_DAILY, dayFull: v.todayXp >= XP_DAILY, clears: v.todayClears,
      usesLeft: Math.max(0, USE_DAILY - v.todayUses), bag: Object.assign({}, p.bag),
      bagTotal: Object.keys(p.bag).reduce((n, k) => n + p.bag[k], 0),
      next: x ? { index: idx, name: x.name, text: x.text, energyAt: at, gap } : null };
  }
  function adopt(now) {
    const old = get(now); if (old.adopted) return old;
    const p = blank(); p.adopted = true; p.adoptedDay = p.lastDay = dayKey(now || new Date());
    p.gifts = earnedGifts();
    p.stories.seen = STORIES.filter(s => eligibleStory(s, p)).map(s => s.id);
    return save(p);
  }
  // 用上一份材料：礼物累计 +1（升档只看 used），萌蛋吃 min(3, 今天还能吃, 离满还差) 点；孵化后只长礼物、不再加能量。
  // 孵化前如果今天已经吃饱（一点也加不进去），材料不浪费：reason='fed'，由调用方收进背包，明天再用。
  // fromBag=false 是「刚通关带回来、当场用上」；每天最多用 USE_DAILY 份，用不了的由调用方收进背包。
  function spend(p, lv, fromBag) {
    if (p.xpDay.uses >= USE_DAILY) return { used: false, reason: 'full' };
    if (fromBag && !p.bag[lv]) return { used: false, reason: 'empty' };
    const gain = p.stage ? 0 : Math.max(0, Math.min(XP_CLEAR, XP_DAILY - p.xpDay.got, ENERGY_MAX - p.xp));
    if (!p.stage && gain <= 0) return { used: false, reason: 'fed' };
    p.xp += gain; p.xpDay.got += gain;
    if (fromBag) p.bag[lv] -= 1;
    p.used[lv] = Math.min(USED_MAX, p.used[lv] + 1); p.xpDay.uses += 1;
    return { used: true, gain, capped: !p.stage && gain < XP_CLEAR };
  }
  // 记一局：当天累计答对满 5 题 = 打卡（+4）；win=通关（+3，每次都算）。每天最多吃 10 点，吃满后只剩星币和宝箱。
  // 传了关卡号 level(1-6) 的通关，+3 走「材料」：当场用上（每天最多 3 份），用不了的收进背包；没传关卡号的通关（速算等）仍直接 +3。
  // gain/checkin/clear=本局实际入账的点数；capped=有一部分因「今天吃饱了 / 总量已满」没算进去。
  function recordRound(correct, id, now, win, level) {
    const d = now || new Date(), today = dayKey(d), p = get(d);
    if (!p.adopted) return null;
    if (today < p.lastDay || today < p.adoptedDay) return { counted: false, done: false, rollback: true };
    if (p.daily.date !== today) p.daily = { date: today, correct: 0, rounds: [] };
    if (p.xpDay.date !== today) p.xpDay = freshDay(today);
    const out = { counted: false, done: p.days.includes(today), days: p.days.length, correct: p.daily.correct, gain: 0, checkin: 0, clear: 0, capped: false,
      material: 0, matUsed: false, banked: false, bagFull: false, tier: 0, tierUp: false };
    if (typeof id !== 'string' || !id || p.daily.rounds.includes(id)) return out;
    p.daily.rounds.push(id); p.daily.rounds = p.daily.rounds.slice(-64);
    p.daily.correct = Math.min(5, p.daily.correct + num(correct, 5));
    const feed = n => {
      if (p.stage) return 0;
      const g = Math.max(0, Math.min(n, XP_DAILY - p.xpDay.got, ENERGY_MAX - p.xp));
      p.xp += g; p.xpDay.got += g; if (g < n) out.capped = true;
      return g;
    };
    if (!p.xpDay.checkin && p.daily.correct >= 5) {
      p.xpDay.checkin = true; out.counted = true;
      if (!p.days.includes(today)) p.days.push(today);
      out.checkin = feed(XP_CHECKIN);
    }
    const lv = win && Number.isInteger(level) && level >= 1 && level <= 6 ? level : 0;
    if (win) p.xpDay.clears += 1;
    if (win && !lv) out.clear = feed(XP_CLEAR);
    else if (lv) {
      const was = tierOf(p, lv), r = spend(p, lv, false);
      out.material = lv;
      if (r.used) {
        out.matUsed = true; out.clear = r.gain; out.capped = out.capped || r.capped;
        out.tier = tierOf(p, lv); out.tierUp = out.tier > was;
      } else {
        out.tier = was; out.bagFull = p.bag[lv] >= BAG_MAX;
        if (!out.bagFull) { p.bag[lv] += 1; out.banked = true; }
      }
      out.usedCount = p.used[lv]; out.nextAt = nextTier(p, lv); out.bagCount = p.bag[lv];
    }
    out.gain = out.checkin + out.clear;
    save(p);
    const v = info(d);
    return Object.assign(out, { done: v.doneToday, days: v.studyDays, phase: v.pet.phase, correct: p.daily.correct });
  }
  function hatch(now) {
    const d = now || new Date(), today = dayKey(d), v = info(d);
    if (!v.ready || today < v.pet.lastDay || today < v.pet.adoptedDay) return false;
    v.pet.stage = 1; v.pet.hatchDay = today; v.pet.birthSeen = false; v.pet.birthGifts = v.pet.gifts.slice(); v.pet.legacy = false;
    const past = v.pet.stories.pending.filter(id => STORIES.some(s => s.id === id && s.phase > 0));
    v.pet.stories.seen = Array.from(new Set(v.pet.stories.seen.concat(past)));
    v.pet.stories.pending = v.pet.stories.pending.filter(id => !past.includes(id));
    save(v.pet); return true;
  }
  function seenBirth() { const p = get(); if (p.stage) { p.birthSeen = true; save(p); } }
  function rename(name) {
    const p = get(); if (!p.stage) return;
    p.name = String(name || '').trim().slice(0, 12) || '数宝'; save(p);
  }
  function care() {
    const p = get(); if (!p.adopted) return p;
    p.affection = Math.min(100000, p.affection + 1); return save(p);
  }
  function claimGift(lv, quiet) {
    if (!Number.isInteger(lv) || lv < 1 || lv > 6) return false;
    const stars = read('mathgameStars', {});
    if (!obj(stars) || !Number.isFinite(stars[lv]) || stars[lv] < 1) return false;
    const p = get(); if (!p.adopted || p.gifts.includes(lv)) return false;
    p.gifts.push(lv);
    STORIES.filter(s => s.level === lv && eligibleStory(s, p)).forEach(s => p.stories[quiet ? 'seen' : 'pending'].push(s.id));
    save(p); return true;
  }
  function syncGifts() {
    let p = get();
    for (let i = 1; i <= 6; i++) if (p.adopted && !p.gifts.includes(i) && claimGift(i)) p = get();
    return p;
  }
  // 菜单里「用上」背包里的一份材料。reason：level/unadopted/rollback/empty（背包空）/full（今天已用满 3 份）。
  function useMaterial(lv, now) {
    if (!Number.isInteger(lv) || lv < 1 || lv > 6) return { ok: false, reason: 'level' };
    const d = now || new Date(), today = dayKey(d), p = get(d);
    if (!p.adopted) return { ok: false, reason: 'unadopted' };
    if (today < p.lastDay || today < p.adoptedDay) return { ok: false, reason: 'rollback' };
    if (p.xpDay.date !== today) p.xpDay = freshDay(today);
    const was = tierOf(p, lv), r = spend(p, lv, true);
    if (!r.used) return { ok: false, reason: r.reason };
    save(p);
    const tier = tierOf(p, lv);
    return { ok: true, level: lv, gain: r.gain, capped: r.capped, tier, tierUp: tier > was, used: p.used[lv], nextAt: nextTier(p, lv), left: p.bag[lv] };
  }
  function story(id, now) { return storyFor(get(now), id); }
  // 已拿着 get() 结果的渲染代码用 storyFor/tierFor/growthOf，不用每查一次就重读、重整一遍存档。
  function storyFor(p, id) {
    const s = STORIES.find(s => s.id === id);
    return s && eligibleStory(s, p) ? s : null;
  }
  function finishStory(id) {
    const p = get(), s = STORIES.find(s => s.id === id);
    if (!s || !eligibleStory(s, p)) return false;
    if (p.stories.seen.includes(id)) return true;
    p.stories.seen.push(id); p.stories.pending = p.stories.pending.filter(s => s !== id);
    save(p); return true;
  }
  function memories(now, birth) {
    const p = get(now), gifts = birth && Array.isArray(p.birthGifts) ? p.birthGifts : p.gifts;
    return STORIES.filter(s => s.phase === 0 && !s.grow && p.adopted && gifts.includes(s.level));
  }
  // 星币钱包：菜单与游戏页共用这一份读写；坏值当 0，写失败静默（别让残档打挂钱包）。
  function getCoins() { const w = read('mathgameCoins', {}); return obj(w) ? num(w.coins, 100000000) : 0; }
  function setCoins(n) {
    const v = num(n, 100000000);
    try { root.localStorage.setItem('mathgameCoins', JSON.stringify({ coins: v })); } catch (e) {}
    return v;
  }
  // 落盘并扣星币；任一写入失败都把两个键回滚后重新抛出，星币不足返回 false（p 是副本，未落盘）。
  function commit(p, cost) {
    const wallet = read('mathgameCoins', {}), coins = obj(wallet) ? num(wallet.coins, 100000000) : 0;
    if (coins < cost) return false;
    const oldPet = root.localStorage.getItem(KEY), oldCoins = root.localStorage.getItem('mathgameCoins');
    try {
      save(p);
      if (cost) root.localStorage.setItem('mathgameCoins', JSON.stringify(Object.assign({}, obj(wallet) ? wallet : {}, { coins: coins - cost })));
      return true;
    } catch (e) {
      try {
        if (oldPet == null) root.localStorage.removeItem(KEY); else root.localStorage.setItem(KEY, oldPet);
        if (oldCoins == null) root.localStorage.removeItem('mathgameCoins'); else root.localStorage.setItem('mathgameCoins', oldCoins);
      } catch (ignored) {}
      throw e;
    }
  }
  function chooseDecor(id) {
    const p = get(), d = DECORS.find(x => x.id === id);
    if (!p.adopted || !d) return false;
    const owned = p.decors.includes(id);
    if (!owned) p.decors.push(id);
    p.decor = id;
    return commit(p, owned ? 0 : d.cost);
  }
  // 没买过：买下并摆出；买过且没摆：摆出（同位置的换下）；正摆着：收起。
  function chooseItem(id) {
    const p = get(), it = ITEMS.find(x => x.id === id);
    if (!p.adopted || !it) return false;
    const owned = p.items.includes(id);
    if (!owned) p.items.push(id);
    p.put[it.slot] = p.put[it.slot] === id ? '' : id;
    return commit(p, owned ? 0 : it.cost);
  }
  // 签到奖品：不扣星币，直接收进「已拥有」，不替孩子摆出来。没领养或已有就返回 false，由调用方改发星币。
  function grantItem(id) {
    const p = get(), it = ITEMS.find(x => x.id === id);
    if (!p.adopted || !it || p.items.includes(id)) return false;
    p.items.push(id);
    return commit(p, 0);
  }
  function backup() {
    const data = {};
    BACKUP_KEYS.forEach(k => { const value = root.localStorage.getItem(k); if (value != null) data[k] = value; });
    return JSON.stringify({ format: 'mathgame-travel', version: 1, savedAt: new Date().toISOString(), data }, null, 2);
  }
  function parseBackup(text) {
    if (typeof text !== 'string' || text.length > 2000000) throw new Error('备份文件过大或格式不正确。');
    let b; try { b = JSON.parse(text); } catch (e) { throw new Error('无法读取这份备份，请选择游戏导出的文件。'); }
    if (!obj(b) || b.format !== 'mathgame-travel' || b.version !== 1 || !obj(b.data)) throw new Error('这不是支持的数学岛备份。');
    for (const k of Object.keys(b.data)) {
      if (!BACKUP_KEYS.includes(k) || typeof b.data[k] !== 'string') throw new Error('备份中包含不支持的数据。');
      let v; try { v = JSON.parse(b.data[k]); } catch (e) { throw new Error('备份中的学习记录损坏。'); }
      if (['mathgameStars', 'mathgameBest', 'mathgameCoins', 'mathgameSettings', 'mathgameSprintBest', 'mathgameDaily', 'mathgameDailyChest', 'mathgameBadges', KEY].includes(k) && !obj(v)) throw new Error('备份中的记录格式不正确。');
      if (k === 'mathgameWrongLog' && !Array.isArray(v)) throw new Error('备份中的错题格式不正确。');
      if (k === KEY) {
        if (v.version != null && v.version !== 1 && v.version !== 2) throw new Error('备份中的宠物版本不支持。');
        if (typeof v.adopted !== 'boolean') throw new Error('备份中的领养记录不正确。');
        if (v.birthGifts != null && (!v.stage || !Array.isArray(v.birthGifts) || !Array.isArray(v.gifts) ||
            new Set(v.birthGifts).size !== v.birthGifts.length || v.birthGifts.some(lv => !Number.isInteger(lv) || lv < 1 || lv > 6 || !v.gifts.includes(lv))))
          throw new Error('备份中的出生纪念记录不正确。');
        if (v.stories != null) {
          const s = v.stories, known = STORIES.map(x => x.id);
          if (!obj(s) || !Array.isArray(s.seen) || !Array.isArray(s.pending) ||
              s.seen.length + s.pending.length > known.length ||
              new Set(s.seen.concat(s.pending)).size !== s.seen.length + s.pending.length ||
              s.seen.concat(s.pending).some(id => !known.includes(id) || !Array.isArray(v.gifts) || !eligibleStory(STORIES.find(x => x.id === id), v)))
            throw new Error('备份中的旅行故事记录不正确。');
        }
        if (v.version === 2) {
          const first = ordinal(v.adoptedDay), last = ordinal(v.lastDay), daily = v.daily;
          if (!Number.isInteger(v.stage) || v.stage < 0 || v.stage > 2 ||
              !Array.isArray(v.days) || v.days.length > 10000 || new Set(v.days).size !== v.days.length ||
              (v.adopted && (!Number.isFinite(first) || !Number.isFinite(last) || last < first)) ||
              v.days.some(d => !validDay(d) || ordinal(d) < first || ordinal(d) > last) ||
              !obj(daily) || (daily.date !== '' && (!validDay(daily.date) || ordinal(daily.date) < first || ordinal(daily.date) > last)) ||
              !Number.isInteger(daily.correct) || daily.correct < 0 || daily.correct > 5 ||
              !Array.isArray(daily.rounds) || daily.rounds.length > 64 || daily.rounds.some(s => typeof s !== 'string') ||
              (v.stage > 0 && (!validDay(v.hatchDay) || ordinal(v.hatchDay) < first || ordinal(v.hatchDay) > last))) {
            throw new Error('备份中的宠物日期或学习记录不正确。');
          }
          const goodCounts = (o, max) => obj(o) && Object.keys(o).every(k => /^[1-6]$/.test(k) && Number.isInteger(o[k]) && o[k] >= 0 && o[k] <= max);
          if ((v.xp != null && !(Number.isInteger(v.xp) && v.xp >= 0 && v.xp <= ENERGY_MAX)) ||
              (v.xpDay != null && (!obj(v.xpDay) || (v.xpDay.date !== '' && !validDay(v.xpDay.date)) ||
                !Number.isInteger(v.xpDay.got) || v.xpDay.got < 0 || v.xpDay.got > XP_DAILY ||
                !Number.isInteger(v.xpDay.clears) || v.xpDay.clears < 0 ||
                (v.xpDay.uses != null && !(Number.isInteger(v.xpDay.uses) && v.xpDay.uses >= 0 && v.xpDay.uses <= USE_DAILY)))))
            throw new Error('备份中的成长能量记录不正确。');
          if ((v.bag != null && !goodCounts(v.bag, BAG_MAX)) || (v.used != null && !goodCounts(v.used, USED_MAX)))
            throw new Error('备份中的材料记录不正确。');
          if ((v.items != null && (!Array.isArray(v.items) || v.items.length > 200 || v.items.some(id => typeof id !== 'string'))) ||
              (v.put != null && (!obj(v.put) || Object.keys(v.put).some(s => typeof v.put[s] !== 'string'))))
            throw new Error('备份中的摆件记录不正确。');
        }
      }
      if (['mathgameMaxCompletedLevel', 'mathgameLevelsVer', 'mathgameRankSeen', 'mathgameEndingSeen', 'mathgameTravelEndingSeen'].includes(k) &&
          (!Number.isInteger(v) || v < 0)) throw new Error('备份中的学习进度不正确。');
    }
    if (!Object.keys(b.data).length) throw new Error('这份备份没有学习或宠物记录。');
    return b;
  }
  function restore(b) {
    b = parseBackup(JSON.stringify(b));
    const old = BACKUP_KEYS.map(k => [k, root.localStorage.getItem(k)]);
    try {
      BACKUP_KEYS.forEach(k => { if (Object.prototype.hasOwnProperty.call(b.data, k)) root.localStorage.setItem(k, b.data[k]); else root.localStorage.removeItem(k); });
      get();
    } catch (e) {
      old.forEach(([k, v]) => { try { if (v == null) root.localStorage.removeItem(k); else root.localStorage.setItem(k, v); } catch (ignored) {} });
      throw new Error('恢复未完成，已尝试保留原存档，请检查设备存储空间。');
    }
  }
  root.MG_PET = { get, info, growth, growthOf, adopt, recordRound, hatch, seenBirth, rename, care, claimGift, syncGifts, useMaterial,
    chooseDecor, chooseItem, grantItem, backup, parseBackup, restore, story, storyFor, finishStory, memories, coins: getCoins, setCoins,
    tier: (lv, now) => tierOf(get(now), lv), tierFor: tierOf, giftName: (lv, tier) => (TIER_NAMES[lv] || [GIFTS[lv]])[tier == null ? 0 : tier] || GIFTS[lv],
    dayKey, phases: PHASES, gifts: GIFTS, giftPhase: GIFT_PHASE, energyMax: ENERGY_MAX, xp: { daily: XP_DAILY, checkin: XP_CHECKIN, clear: XP_CLEAR },
    mats: MATS, tiers: TIERS, tierNames: TIER_NAMES, useDaily: USE_DAILY, bagMax: BAG_MAX, decors: DECORS, items: ITEMS, stories: STORIES };
})(typeof window !== 'undefined' ? window : globalThis);
