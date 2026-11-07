/* Tax Tracker Stage A: pure, read-only, provider-neutral reporting. No filing calculations. */
(function(root){'use strict';
const freeze = x => x; // output is detached; input never mutated
const cents = n => { if(typeof n!=='number'||!Number.isFinite(n)) return null; const v=Math.round(n*100);return Math.abs(v/100-n)<=0.000001?v:null; };
const gbp = n => n===null?'':(n/100).toFixed(2);
const validDate = s => { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const t=new Date(s+'T12:00:00Z');return Number.isFinite(t.getTime())&&t.toISOString().slice(0,10)===s; };
const taxYear = d => Number(d.slice(5,10)>='04-06'?d.slice(0,4):Number(d.slice(0,4))-1);
const yearStart = y => `${y}-04-06`,yearEnd=y=>`${y+1}-04-05`;
const rates={2025:{first:45,excess:25,limit:10000,vehicle:'car-van'},2026:{first:55,excess:25,limit:10000,vehicle:'car-van'}};
function periods(y,basis='standard',config={}){
 if(!Number.isInteger(y)||y<2000||y>2100)throw Error('Invalid tax year');
 if(basis==='standard'){const ends=[`${y}-07-05`,`${y}-10-05`,`${y+1}-01-05`,yearEnd(y)];return ends.map((end,i)=>({quarter:i+1,start:yearStart(y),end,basis,taxYear:y}));}
 if(basis==='calendar'){
  if(!config.approved)throw Error('Calendar reporting configuration requires confirmation; no election assumed');
  const start=config.start,ends=config.ends;
  if(!validDate(start)||!Array.isArray(ends)||ends.length!==4||ends.some(d=>!validDate(d))||ends.some((d,i)=>d<start||(i>0&&d<=ends[i-1])))throw Error('Invalid confirmed calendar reporting dates');
  return ends.map((end,i)=>({quarter:i+1,start,end,basis,taxYear:y}));
 }
 throw Error('Unsupported reporting-period basis');
}
function normalise(db){
 if(!db||![4,5,6].includes(db.version)||!Array.isArray(db.payments)||!Array.isArray(db.expenses)||!Array.isArray(db.sites))throw Error('Unsupported or incomplete backup');
 const warnings=[],income=[],expenses=[],journeys=[],seen=new Set(),siteMap=new Map(db.sites.map(s=>[s.id,s]));
 const warn=(id,msg)=>warnings.push({recordId:String(id||''),message:msg});
 for(const group of ['payments','expenses'])for(const x of db[group]){
  if(!x||typeof x.id!=='string'||!x.id||seen.has(x.id)){warn(x?.id,'Missing or repeated transaction ID; skipped');continue}seen.add(x.id);
  if(!validDate(x.date)){warn(x.id,'Invalid date; skipped');continue}
  if(group==='payments'){
   const net=cents(x.net),cis=cents(x.cis),hasKnown=net!==null&&cis!==null&&net>=0&&cis>=0;
   if(!hasKnown){warn(x.id,'Missing or unsupported net/CIS value: turnover not inferred');continue}
   if(!['normal','additional','bonus','retention'].includes(x.type)){warn(x.id,'Unknown payment type; review classification');}
   if(x.cisRate!==undefined&&![0,20,30].includes(x.cisRate))warn(x.id,'Unsupported explicit CIS rate');
   if(x.cisRate===undefined)warn(x.id,'CIS rate not explicitly stored; recorded CIS amount used');
   if(x.siteId&&!siteMap.has(x.siteId))warn(x.id,'Saved site reference unavailable');
   const turnover=net+cis;
   if(cents(x.gross)!==null&&cents(x.held)!==null&&Math.abs(cents(x.gross)-cents(x.held)-turnover)>2)warn(x.id,'Historical gross/held does not reconcile with net + CIS');
   const entry={id:x.id,date:x.date,taxYear:taxYear(x.date),type:x.type||'unknown',note:x.note||'',siteId:x.siteId||'',siteName:x.siteName||'',payingContractor:x.payingContractor||'',principalContractor:x.principalContractor||'',netPence:net,cisPence:cis,turnoverPence:turnover,cisRate:x.cisRate??null,sourceVersion:db.version};income.push(entry);
   if(x.miles!==undefined){if(typeof x.miles!=='number'||!Number.isFinite(x.miles)||x.miles<0)warn(x.id,'Invalid mileage: excluded from allowance');else journeys.push({id:x.id,date:x.date,taxYear:taxYear(x.date),siteId:x.siteId||'',miles:x.miles,vehicleType:'car-van',eligibility:'assumed-for-test'});}
  }else{
   const amount=cents(x.amount),pct=x.businessUsePercent===undefined?100:x.businessUsePercent;
   if(amount===null||amount<0){warn(x.id,'Invalid amount: expense excluded');continue}
   if(typeof pct!=='number'||!Number.isFinite(pct)||pct<0||pct>100){warn(x.id,'Invalid business-use percentage: expense excluded');continue}
   const business=Math.round(amount*pct/100);
   const category=String(x.category||'').trim()||'Uncategorised';
   expenses.push({id:x.id,date:x.date,taxYear:taxYear(x.date),supplier:x.supplier||'',description:x.description||'',sourceCategory:category,mappedCategory:null,amountPence:amount,businessUsePercent:pct,businessPence:business,sourceVersion:db.version});
   warn(x.id,'Quarterly reporting category and business-use filing treatment not yet verified');
  }
 }
 return {income,expenses,journeys,warnings};
}
function mileage(journeys,y,opts={}){
 const schedule=rates[y];if(!schedule)return {taxYear:y,qualifyingMiles:null,allowancePence:null,warnings:[`Mileage rates for ${y}/${y+1} are not verified`]};
 const eligible=journeys.filter(j=>j.taxYear===y&&j.vehicleType==='car-van'&&j.eligibility==='assumed-for-test');
 const miles=eligible.reduce((s,j)=>s+j.miles,0);
 if(!Number.isFinite(miles)||miles<0)return {taxYear:y,allowancePence:null,warnings:['Invalid mileage']};
 const lower=Math.min(miles,schedule.limit),upper=Math.max(0,miles-schedule.limit);
 return {taxYear:y,qualifyingMiles:miles,firstBandMiles:lower,excessMiles:upper,allowancePence:Math.round(lower*schedule.first+upper*schedule.excess),rateSchedule:`${y}-car-van`,warnings:['Mileage qualification assumed from source; quarterly expense filing treatment unresolved']};
}
function build(db,y,opts={}){
 const basis=opts.basis||'standard',ps=periods(y,basis,opts.calendar||{}),norm=normalise(db);
 const warnings=[...norm.warnings],out=[];
 for(const p of ps){const inc=norm.income.filter(x=>x.date>=p.start&&x.date<=p.end),exp=norm.expenses.filter(x=>x.date>=p.start&&x.date<=p.end);const sum=(xs,key)=>xs.reduce((a,x)=>a+x[key],0);const categories={};for(const e of exp)categories[e.sourceCategory]=(categories[e.sourceCategory]||0)+e.amountPence;
  out.push({...p,incomeCount:inc.length,expenseCount:exp.length,bankPence:sum(inc,'netPence'),turnoverPence:sum(inc,'turnoverPence'),cisPence:sum(inc,'cisPence'),actualExpensePence:sum(exp,'amountPence'),businessExpensePence:sum(exp,'businessPence'),sourceCategoryTotals:categories,categoryMappingStatus:'pending',quarterlyAllowableExpensePence:null});
 }
 const full=norm.income.filter(x=>x.date>=yearStart(y)&&x.date<=yearEnd(y)),ex=norm.expenses.filter(x=>x.date>=yearStart(y)&&x.date<=yearEnd(y)),sum=(xs,k)=>xs.reduce((a,x)=>a+x[k],0);
 const mil=mileage(norm.journeys,y);
 const annual={taxYear:y,bankPence:sum(full,'netPence'),turnoverPence:sum(full,'turnoverPence'),cisPence:sum(full,'cisPence'),actualExpensePence:sum(ex,'amountPence'),businessExpensePence:sum(ex,'businessPence'),mileage:mil};
 if(basis==='standard'){const q4=out[3];for(const k of ['bankPence','turnoverPence','cisPence','actualExpensePence','businessExpensePence'])if(q4[k]!==annual[k])throw Error('Annual and Q4 source totals disagree for '+k);}
 warnings.push({recordId:'REPORT',message:'Quarterly HMRC categories, mixed-use treatment and mileage filing treatment await verified rules. These are generic accounting summaries, NOT submissions.'});
 if(basis==='calendar')warnings.push({recordId:'REPORT',message:'Calendar update ranges are configuration-based; accounting-year reconciliation may differ from tax-year totals.'});
 return {schema:'tax-tracker-stage-a/1',taxYear:y,basis,periods:out,annual,records:norm,warnings};
}
const csvEscape=x=>{let s=String(x??'');if(/^[\s]*[=+@\-\t\r]/.test(s)&&/[=+@]/.test(s.trim().charAt(0)))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
const csv=rows=>rows.map(r=>r.map(csvEscape).join(',')).join('\r\n')+'\r\n';
function exportCSV(report,kind){const y=report.taxYear;let rows;
 if(kind==='income'){rows=[['Record ID','Date','Payment Type','Note','Site','Bank Receipt GBP','CIS Deducted GBP','Recognised Turnover GBP','CIS Rate']];for(const p of report.records.income.filter(x=>x.taxYear===y))rows.push([p.id,p.date,p.type,p.note,p.siteName,gbp(p.netPence),gbp(p.cisPence),gbp(p.turnoverPence),p.cisRate??'']);}
 else if(kind==='expenses'){rows=[['Record ID','Date','Supplier','Description','Original Category','Amount Paid GBP','Business Use Percent','Provisional Business Amount GBP','Quarterly HMRC Category','Filing Treatment']];for(const e of report.records.expenses.filter(x=>x.taxYear===y))rows.push([e.id,e.date,e.supplier,e.description,e.sourceCategory,gbp(e.amountPence),e.businessUsePercent,gbp(e.businessPence),'UNVERIFIED','PENDING']);}
 else if(kind==='quarters'){rows=[['Tax Year','Basis','Quarter','Start','End','Cumulative Turnover GBP','Cumulative Bank GBP','Cumulative CIS GBP','Cumulative Recorded Expenses GBP','Cumulative Provisional Business Expenses GBP','HMRC Category Mapping']];for(const p of report.periods)rows.push([y,p.basis,p.quarter,p.start,p.end,gbp(p.turnoverPence),gbp(p.bankPence),gbp(p.cisPence),gbp(p.actualExpensePence),gbp(p.businessExpensePence),'PENDING']);}
 else if(kind==='cis'){rows=[['Record ID','Date','CIS Deducted GBP','Recognised Turnover GBP']];for(const p of report.records.income.filter(x=>x.taxYear===y))rows.push([p.id,p.date,gbp(p.cisPence),gbp(p.turnoverPence)]);}
 else if(kind==='mileage'){rows=[['Record ID','Date','Recorded Miles','Vehicle Schedule','Qualification']];for(const j of report.records.journeys.filter(x=>x.taxYear===y))rows.push([j.id,j.date,j.miles,'car-van','ASSUMED / REVIEW']);}
 else throw Error('Unknown export');
 return csv(rows);
}
const api=Object.freeze({periods,normalise,mileage,build,exportCSV});if(typeof module!=='undefined'&&module.exports)module.exports=api;root.StageAReporting=api;
})(typeof globalThis!=='undefined'?globalThis:this);
