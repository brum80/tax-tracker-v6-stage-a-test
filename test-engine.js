const assert=require('node:assert/strict');require('./tax-engine.js');const t=globalThis.TaxEngine;let count=0;function check(x,fn){fn();count++;console.log('PASS',x)}
check('normal payment',()=>assert.deepEqual(t.payment(760,'normal'),{gross:950,held:0,cis:190,turnover:950,retentionRate:0,cisRate:20}));
check('additional payment',()=>assert.equal(t.payment(760,'additional').turnover,950));
check('30% CIS rate',()=>assert.deepEqual([t.payment(700,'additional',{cisRate:30}).turnover,t.payment(700,'additional',{cisRate:30}).cis],[1000,300]));
check('bonus payment',()=>assert.equal(t.payment(760,'bonus').turnover,950));
check('retention release',()=>assert.equal(t.payment(40,'retention').turnover,50));
check('mileage 2026 boundary',()=>{assert.equal(t.mileage(9440,2026),5192);assert.equal(t.mileage(10001,2026),5500.25);assert.equal(t.mileage(10000,2026),5500)});
check('historic mileage',()=>assert.equal(t.mileage(10001,2025),4500.25));
check('tax boundary',()=>{assert.equal(t.tax(12570,2026).totalTax,0);assert.equal(t.tax(19793.74,2026).incomeTax,1444.75);assert.equal(t.tax(19793.74,2026).class4,433.42)});
check('higher and additional bands',()=>{assert.equal(t.tax(60000,2026).incomeTax,11432);assert.ok(t.tax(150000,2026).incomeTax>45000)});
check('130000 profit verified benchmark',()=>{const z=t.tax(130000,2026);assert.equal(z.incomeTax,44703);assert.equal(z.class4,3856.60);assert.equal(z.totalTax,48559.60)});
check('allowance taper',()=>{assert.equal(t.tax(100000,2026).allowance,12570);assert.equal(t.tax(110000,2026).allowance,7570);assert.equal(t.tax(125140,2026).allowance,0)});
check('year boundaries',()=>{assert.ok(t.inYear('2026-04-06',2026));assert.ok(t.inYear('2027-04-05',2026));assert.ok(!t.inYear('2026-04-05',2026));assert.ok(!t.inYear('2027-04-06',2026))});
check('benchmark totals',()=>{const p=[{date:'2026-10-01',net:20136.96,cis:5034.24,miles:9440}],e=[{date:'2026-10-01',amount:185.46}];const s=t.summary(p,e,2026);assert.equal(s.turnover,25171.2);assert.equal(s.profit,19793.74);assert.equal(s.balance,-3156.07)});
check('credits and payments on account',()=>{const s=t.summary([{date:'2026-05-01',net:800,cis:200}],[],2026,{otherCredits:10,paymentsOnAccount:20,adjustments:5});assert.equal(s.balance,-225)});
check('forecast explicit inputs',()=>{const b=t.summary([],[],2026);const f=t.forecast(b,2026,{weeks:10,weeklyNet:760,weeklyCis:190,extraMiles:10000});assert.equal(f.turnover,9500);assert.equal(f.cis,1900);assert.equal(f.mileageCost,5500)});
check('unsupported year blocked',()=>assert.throws(()=>t.tax(20000,2027)));
console.log(`${count} calculation checks passed`)
