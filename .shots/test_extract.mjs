// 验证听算数字解析：旧「穷举查表」 vs 新「算法解析」，覆盖 0–99 + 口语/Vosk 变体。
// 旧版是 index.html 现状（cnMap 降序 includes），新版是拟替换实现。

function oldExtract(texts){
  const cnMap = {'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,
    '十':10,'十一':11,'十二':12,'十三':13,'十四':14,'十五':15,'十六':16,'十七':17,'十八':18,'十九':19,
    '二十':20,'二十一':21,'二十二':22,'二十三':23,'二十四':24,'二十五':25,'二十六':26,'二十七':27,'二十八':28,'二十九':29,
    '三十':30,'三十一':31,'三十二':32,'三十三':33,'三十四':34,'三十五':35,'三十六':36,
    '四十':40,'四十二':42,'四十五':45,'四十八':48,'四十九':49,
    '五十':50,'五十四':54,'五十六':56,
    '六十':60,'六十三':63,'六十四':64,
    '七十':70,'七十二':72,
    '八十':80,'八十一':81};
  const keys=Object.keys(cnMap).sort((a,b)=>b.length-a.length);
  for(const t of texts){
    const mMulti=t.match(/\b\d{2,}\b/g);
    if(mMulti){for(const d of mMulti){const n=parseInt(d);if(!isNaN(n))return n;}}
    for(const k of keys){if(t.includes(k))return cnMap[k];}
    const mSingle=t.match(/\d/g);
    if(mSingle){for(const d of mSingle){const n=parseInt(d);if(!isNaN(n))return n;}}
  }
  return null;
}

function newExtract(texts){
  const D={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
  const cn=(s)=>{
    const i=s.indexOf('十');
    if(i>=0){
      let tens=1,ones=0;
      for(const ch of s.slice(0,i)) if(ch in D) tens=D[ch];        // 「十」前最靠近的数字→十位（无则1，如「十五」）
      for(const ch of s.slice(i+1)){ if(ch in D){ones=D[ch];break;} } // 「十」后第一个数字→个位
      return tens*10+ones;
    }
    for(const ch of s) if(ch in D) return D[ch];
    return null;
  };
  for(const t of texts){
    const s=(t||'').replace(/\s+/g,'');
    const mMulti=s.match(/\d{2,}/);
    if(mMulti){const n=parseInt(mMulti[0],10);if(!isNaN(n))return n;}
    if(/[零一二两三四五六七八九十]/.test(s)){const n=cn(s);if(n!==null)return n;}
    const mSingle=s.match(/\d/);
    if(mSingle){const n=parseInt(mSingle[0],10);if(!isNaN(n))return n;}
  }
  return null;
}

function toCn(n){
  const d=['零','一','二','三','四','五','六','七','八','九'];
  if(n<10) return d[n];
  if(n<20) return '十'+(n%10?d[n%10]:'');
  const t=Math.floor(n/10),o=n%10;
  return d[t]+'十'+(o?d[o]:'');
}

let oldBad=[],newBad=[];
for(let n=0;n<=99;n++){
  const cn=toCn(n);
  const o=oldExtract([cn]); if(o!==n) oldBad.push(`${n}(${cn})→${o}`);
  const w=newExtract([cn]); if(w!==n) newBad.push(`${n}(${cn})→${w}`);
}
console.log('=== 0–99 标准中文读法 解析正确率 ===');
console.log('旧版错误:', oldBad.length, '/100  →', oldBad.join('  '));
console.log('新版错误:', newBad.length, '/100  →', newBad.length?newBad.join('  '):'(无)');

const variants=[['两',2],['十',10],['二 十 四',24],['三 十 七',37],['九十六',96],['五十三',53],['七十八',78],['二十',20],['十五',15],['零',0],['24',24],['8',8]];
console.log('\n=== 口语 / Vosk空格 / 阿拉伯 变体 ===');
for(const [inp,exp] of variants){
  const o=oldExtract([inp]),w=newExtract([inp]);
  console.log(`"${inp}" 期望${exp} | 旧=${o}${o===exp?'':' ✗'}  新=${w}${w===exp?'':' ✗'}`);
}
