const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0].replace(/\ninit\(\);\s*$/,'');
const backup=JSON.parse(fs.readFileSync('fictional-v5-fixture.json','utf8'));
const store=new Map(),nodes=new Map();
function el(id){if(!nodes.has(id))nodes.set(id,{value:'',checked:false,innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){}});return nodes.get(id)}
const context={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>({})},crypto:{randomUUID:()=>`test-${Math.random()}`},console,Intl,Number,Date,Math,JSON,alert:()=>{},setTimeout:()=>{},window:{}};
vm.createContext(context);vm.runInContext(fs.readFileSync('tax-engine.js','utf8'),context);context.TaxEngine=context.window.TaxEngine;vm.runInContext(source,context);const run=x=>vm.runInContext(x,context);let n=0;
function check(t,fn){fn();console.log('PASS',t);n++}
run('db='+JSON.stringify({...backup,version:6}));el('pay-cis-rate').value='20';el('pay-date').value='2026-12-11';el('pay-net').value='800';el('pay-note').value='December retention release';
run("kind='additional'");
check('additional payment note and type',()=>{const p=run('paymentData()');assert.equal(p.type,'additional');assert.equal(p.note,'December retention release');assert.equal(p.net,800);assert.equal(p.cis,200);assert.equal(p.held,0);assert.equal(p.gross,1000)});
check('original V5 rows unmodified',()=>assert.equal(run('db.payments[0].gross'),800));
run("db.payments[0].note='Original site note';editPay=db.payments[0].id;kind='normal'");el('pay-date').value='2026-04-10';el('pay-net').value='608';el('pay-note').value='Site notes';el('pay-site').value=backup.payments[0].siteId;el('pay-days').value=4;el('pay-nights').value=0;el('pay-adjust').value=0;
check('hidden normal note preserves existing note and legacy values',()=>{const p=run('paymentData()');assert.equal(p.gross,800);assert.equal(p.held,40);assert.equal(p.cis,152);assert.equal(p.note,'Original site note')});
run("db.payments.push({id:'legacy-retention',date:'2026-12-20',type:'retention',net:40,gross:50,held:0,cis:10,miles:0})");run("editPay='legacy-retention';kind='additional'");el('pay-net').value='40';el('pay-note').value='Retention released';
check('old retention remains legacy type when edited',()=>{const p=run('paymentData()');assert.equal(p.type,'retention');assert.equal(p.gross,50);assert.equal(p.cis,10)});
run("editPay=null;kind='additional'");el('pay-net').value='700';el('pay-cis-rate').value='30';
check('30% CIS snapshots and calculations',()=>{const p=run('paymentData()');assert.equal(p.cis,300);assert.equal(p.gross,1000);assert.equal(p.cisRate,30)});
el('pay-cis-rate').value='0';check('0% CIS is recorded correctly',()=>{const p=run('paymentData()');assert.equal(p.cis,0);assert.equal(p.gross,700);assert.equal(p.cisRate,0)});
run('editPay=db.payments[0].id;kind="normal"');el('pay-net').value='608';el('pay-cis-rate').value='20';
check('legacy V5 amount retained while attaching a standard rate',()=>{const p=run('paymentData()');assert.equal(p.gross,800);assert.equal(p.held,40);assert.equal(p.cis,152);assert.equal(p.cisRate,20)});
el('pay-cis-rate').value='30';check('explicit rate change recalculates rather than retaining stale CIS',()=>{const p=run('paymentData()');assert.equal(p.cis,260.57);assert.equal(p.cisRate,30)});
console.log(`${n} Friday compatibility checks passed`);
