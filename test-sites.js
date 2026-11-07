const assert=require('node:assert/strict'), fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0].replace(/\ninit\(\);\s*$/,'');
const backup=JSON.parse(fs.readFileSync('fictional-v5-fixture.json','utf8'));
const local=new Map(),nodes=new Map();
function el(id){if(!nodes.has(id))nodes.set(id,{value:'',checked:false,innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){}});return nodes.get(id)}
const context={localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)},document:{getElementById:el},crypto:{randomUUID:()=>`test-${Math.random()}`},TaxEngine:null,console,Intl,Number,Date,Math,JSON,alert:()=>{},setTimeout:()=>{},window:{}};
vm.createContext(context);vm.runInContext(fs.readFileSync('tax-engine.js','utf8'),context);context.TaxEngine=context.window.TaxEngine;vm.runInContext(source,context);
const run=x=>vm.runInContext(x,context);let n=0;
function test(name,fn){fn();n++;console.log('PASS',name)}
test('V5 backup validates',()=>assert.equal(run('validateDatabase('+JSON.stringify(backup)+')'),true));
run('db='+JSON.stringify({...backup,version:6}));
test('fictional fixture baseline',()=>{const z=run('TaxEngine.summary(db.payments,db.expenses,2026)');assert.equal(z.miles,260);assert.equal(z.turnover,1235)});
el('site-name').value='Leeds';el('site-paying-contractor').value='New Payer Ltd';el('site-principal-contractor').value='Principal Build Ltd';el('site-miles').value='32';el('site-away').checked=false;
run('saveSite()');
test('duplicate site name accepted',()=>assert.equal(run("db.sites.filter(s=>s.name==='Leeds').length"),2));
test('two contractors stored',()=>{const x=run("db.sites.find(s=>s.payingContractor==='New Payer Ltd')");assert.equal(x.principalContractor,'Principal Build Ltd')});
test('ambiguous site name not guessed by CSV',()=>assert.equal(run("siteByName('Leeds')"),undefined));
test('original payments unchanged',()=>{assert.equal(run('db.payments.length'),2);assert.equal(run('db.payments[0].miles'),160);assert.equal(run('db.payments[0].payingContractor'),undefined)});
console.log(`${n} Sites / migration checks passed`);
