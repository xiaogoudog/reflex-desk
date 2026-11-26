export const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const paths={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
 layers:'<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/>',
 sliders:'<path d="M4 6h5m4 0h7M4 12h11m4 0h1M4 18h2m4 0h10"/><circle cx="11" cy="6" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
 journal:'<path d="M6 3h13a1 1 0 0 1 1 1v16H7a3 3 0 0 1-3-3V6a3 3 0 0 1 2-3Z"/><path d="M4 17c0-1 1-2 3-2h13M9 7h6m-6 3h4"/>',
 brain:'<path d="M12 5a3 3 0 0 0-5.7-1A3.5 3.5 0 0 0 3.8 9c-2.5 2-2.2 5.2.4 6.7A4.1 4.1 0 0 0 12 18V5Zm0 0a3 3 0 0 1 5.7-1A3.5 3.5 0 0 1 20.2 9c2.5 2 2.2 5.2-.4 6.7A4.1 4.1 0 0 1 12 18M7 8c0 2 1 3 3 3m-6 5c1-2 2-3 4-3m9-5c0 2-1 3-3 3m6 5c-1-2-2-3-4-3"/>',
 market:'<path d="M3 18v-5m5 5v-8m5 8v-5m5 5V7M2 9l6-5 5 3 8-5"/>',
 check:'<path d="m5 12 4 4L19 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',chev:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 10h18M7 14h4"/>',
 user:'<circle cx="12" cy="8" r="3"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7"/>',
 settings:'<path d="m9 3 1-1h4l1 2 2 1 2-.4 2 3.4-1.4 1.7v2.6L21 14l-2 3.5-2-.4-2 1-1 2h-4l-1-2-2-1-2 .4L3 14l1.4-1.7V9.7L3 8l2-3.4 2 .4 2-1Z"/><circle cx="12" cy="11" r="3"/>',
 folder:'<path d="M3 7V5h6l2 3h10v11H3V7Z"/>',bank:'<path d="m3 8 9-5 9 5H3Zm1 12h16M6 10v7m6-7v7m6-7v7"/>',
 bonds:'<path d="M3 19h18M4 15l5-5 4 3 6-8M15 5h4v4"/>',
 curve:'<path d="M3 4v15h18M6 15c4-1 5-6 8-6s4-2 6-4"/>',
 book:'<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1V5Zm9 1v13"/>',
 pencil:'<path d="m4 16 12-12 4 4L8 20l-5 1 1-5Zm10-10 4 4"/>',
 source:'<path d="M13 4h7v7m0-7L10 14M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
 search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
 chart:'<path d="M3 3v17h18M6 16l4-6 4 3 6-8"/>',arrowup:'<path d="M5 16 16 5M7 5h9v9"/>',
 save:'<path d="M4 4h13l3 3v13H4V4Zm3 0v6h9V4m-9 16v-6h10v6"/>',
 target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
 data:'<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v12c0 4 16 4 16 0v-12M4 11c0 4 16 4 16 0"/>',
 next:'<path d="m18 9 3 3-3 3M3 12h4c2 0 2-5 5-5h5m-9 8c1 2 2 3 4 3h5M3 7h3m9 5h6"/>',
 pie:'<path d="M12 3v9h9A9 9 0 1 1 12 3Z"/><path d="M15 3.5a7.5 7.5 0 0 1 5.5 5.5H15Z"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3 5.3-2.1Z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 refresh:'<path d="M19 7a8 8 0 1 0 1 9M19 3v5h-5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.5"/>',
 history:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-4v6l4 2"/>',
 files:'<rect x="6" y="6" width="13" height="15" rx="2"/><path d="M3 16V3h12M9 11h7m-7 4h4"/>'
};
export function icon(name,size=18){return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||""}</svg>`;}
export function spark(values,color,stepped=false){
 const w=92,h=35,p=3,min=Math.min(...values),max=Math.max(...values),span=max-min||1;
 const points=values.map((v,i)=>[p+i*(w-2*p)/Math.max(1,values.length-1),max===min?h/2:h-6-(v-min)/span*(h-13)]);
 const line=points.reduce((s,[x,y],i)=>i===0?`M${x},${y}`:s+(stepped?` H${x} V${y}`:` L${x},${y}`),"");
 const [x,y]=points.at(-1);
 return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${line} L${x},${h} H${p} Z" fill="${color}" opacity=".07"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2.4" fill="${color}"/></svg>`;
}
export function chartSVG(rows,selected,width,metric){
 const w=Math.max(230,width),h=148,left=35,right=11,top=9,bottom=25;
 const keys=["sales","profit"], vals=rows.flatMap(r=>keys.map(k=>r[k]));
 const raw=(Math.max(...vals)-Math.min(0,...vals))/4 || 1;
 const power=10**Math.floor(Math.log10(raw));
 const step=([1,2,2.5,5,10].find(n=>n>=raw/power)||10)*power;
 const lower=Math.floor(Math.min(0,...vals)/step)*step,upper=Math.max(step,Math.ceil(Math.max(...vals)/step)*step);
 const y=v=>top+(upper-v)/(upper-lower)*(h-top-bottom),x=i=>left+i*(w-left-right)/Math.max(1,rows.length-1);
 let grid="",labels="";
 for(let v=lower;v<=upper+.000001;v+=step){grid+=`<path d="M${left} ${y(v)}H${w-right}" class="chart-grid"/><text x="${left-8}" y="${y(v)+3}" text-anchor="end">${Number(v.toFixed(2))}</text>`;}
 rows.forEach((r,i)=>{if(w>=410||rows.length<6||i%2===0||i===rows.length-1){const compact=w<410;const label=r.date.slice(2).replace("-"," ");if(!(compact&&i===rows.length-2&&rows.length>5))labels+=`<text x="${x(i)}" y="${h-4}" text-anchor="${i===rows.length-1?"end":i===0?"start":"middle"}">${label}</text>`;}});
 const points=k=>rows.map((r,i)=>`${i?"L":"M"}${x(i).toFixed(2)},${y(r[k]).toFixed(2)}`).join(" ");
 const picked=rows[selected],sx=x(selected),sy=y(picked[metric]);
 const alternate=metric==="sales"?"profit":"sales";
 return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#b6ec88" stop-opacity=".24"/><stop offset="1" stop-color="#b6ec88" stop-opacity=".015"/></linearGradient></defs>${grid}${labels}<path d="${points(metric)} L${x(rows.length-1)},${y(0)} H${left}Z" fill="url(#chart-fill)"/><path d="${points(alternate)}" class="chart-second"/><path d="${points(metric)}" class="chart-main"/><path d="M${sx} ${top}V${h-bottom}" class="chart-focus"/><circle cx="${sx}" cy="${sy}" r="7" fill="#c2ed96" opacity=".15"/><circle cx="${sx}" cy="${sy}" r="3.9" fill="#cdf6a2" stroke="#203e32" stroke-width="1.5"/></svg>`;
}
export function orbit(person){
 const left=person==="soros"?"市场预期":"今日定价",right=person==="soros"?"企业经营":"未来经营";
 let contours="";
 for(let i=0;i<10;i++){
   const reach=32+i*2.15, rise=6+i*1.55;
   contours+=`<path d="M125 35 C${125-reach} ${35-rise} ${75-reach} ${34-rise*1.22} 67 35 S${125-reach*.5} ${35+rise*1.65} 125 35 S${174+reach} ${35-rise*1.5} 184 35 S${125+reach} ${35+rise*1.7} 125 35" stroke="${i%3===0?"#5d8d70":"#88ad8a"}" opacity="${.4+i*.048}" />`;
 }
 return `<svg viewBox="0 0 250 68" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${left}和${right}之间的联系"><g fill="none" stroke-width=".9">${contours}</g><g fill="#254b37" stroke="#e5f1df" stroke-width="1.2"><circle cx="67" cy="35" r="3.3"/><circle cx="184" cy="35" r="3.3"/></g><g fill="#355640" font-size="11" font-family="sans-serif"><text x="67" y="65" text-anchor="middle">${left}</text><text x="184" y="65" text-anchor="middle">${right}</text></g></svg>`;
}
export function ticker(symbol){
 const names={AMZN:["a","amazon"],GOOGL:["G","google"],QQQ:["Q","nasdaq"],SPY:["S","nasdaq"],MSFT:["M","nasdaq"]};
 const [mark,style]=names[symbol]||[symbol.slice(0,2),"other"];
 return `<span class="ticker-logo ${style}" aria-hidden="true">${esc(mark)}</span>`;
}
export const fmt=(v,d=2)=>new Intl.NumberFormat("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
export const sign=(v,d=1)=>(v>0?"+":v<0?"−":"")+fmt(Math.abs(v),d);
export const usd=v=>(v<0?"−$":"$")+fmt(Math.abs(v),Math.abs(v)%1>.001?2:0);
export const pnl=v=>(v>0?"+":"")+usd(v);
export function dateText(v){const s=String(v||"");if(!s.includes("T"))return s.slice(0,10).replaceAll("-",".");const d=new Date(s);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join(".");}
export const external=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="source-link">${esc(label)} ${icon("source",13)}</a>`;

