// Run against an isolated Chrome debugging session; see README.md.
import assert from 'node:assert/strict'
import { birthdayContent } from '../src/config/birthdayContent.js'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir(new URL('../qa.local/', import.meta.url), { recursive: true })
const targets = await (await fetch('http://127.0.0.1:9222/json')).json()
const socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map(), errors = []
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) { const job = pending.get(message.id); pending.delete(message.id); message.error ? job.reject(message.error) : job.resolve(message.result) }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
})
const cdp = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })) })
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function wait(expression, timeout = 8000) {
  const end = Date.now() + timeout
  while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(60) }
  throw Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText'))
}
const exists = selector => wait(`!!document.querySelector(${JSON.stringify(selector)})`)
async function click(selector) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`)
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
}
async function button(text) {
  const source = `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes(${JSON.stringify(text)}) && !b.disabled)`
  await wait(`!!(${source})`)
  await evaluate(`(${source}).click()`)
}
async function screenshot(name) {
  if (!name.includes('lifting')) await sleep(850)
  const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(new URL('../qa.local/' + name + '.png', import.meta.url), Buffer.from(data, 'base64'))
}
async function noWatch() {
  assert.equal(await evaluate(`!!document.querySelector('.gift-photo,.gift-presentation,#gift-reveal-title')`), false)
  assert.equal(await evaluate(`/wristwatch|watch photo|real birthday present/i.test(document.body.innerText)`), false)
}
async function layout() {
  const result = await evaluate(`({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width && !b.disabled).map(b=>({text:b.innerText,top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom,left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right}))})`)
  assert.ok(result.scrollWidth <= result.width, JSON.stringify(result))
  for (const b of result.buttons) assert.ok(b.left >= 0 && b.right <= result.width && b.top >= 0 && b.bottom <= result.height, JSON.stringify(b))
}
const consoleErrors=[], dragEvents=[], findings=[]
socket.addEventListener('message', ({data})=>{
  const e=JSON.parse(data)
  if(e.method==='Runtime.consoleAPICalled' && e.params.type==='error') consoleErrors.push(e.params.args)
  if(e.method==='Log.entryAdded' && e.params.entry.level==='error') consoleErrors.push(e.params.entry)
  if(e.method==='Input.dragIntercepted') dragEvents.push(e.params.data)
})
const currentStage=()=>evaluate(`document.querySelector('.journey-progress [aria-current]')?.textContent`)
async function key(key,code,windowsVirtualKeyCode,text) {
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode,...(text?{text}:{})})
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode})
}
async function point(selector, side='center') {
  return evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:${side==='right'?'r.right-8':side==='left'?'r.left+8':'r.left+r.width/2'},y:r.top+r.height*.55}})()`)
}
async function nativeClick(selector) {
  await wait(`document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`)
  const p=await point(selector)
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1})
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1})
}
async function pointerDrag(selector,dx,dy,side='center',escape=false) {
  const p=await point(selector,side)
  await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',...p})
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1})
  for(let step=1;step<=8;step++) {
    await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+dx*step/8,y:p.y+dy*step/8,button:'left',buttons:1})
    await sleep(20)
  }
  if(escape) await key('Escape','Escape',27)
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+dx,y:p.y+dy,button:'left',buttons:0,clickCount:1})
}
async function refresh(selector) {
  const loaded = new Promise(resolve => {
    const listener = ({data}) => { if(JSON.parse(data).method==='Page.loadEventFired') { socket.removeEventListener('message',listener); resolve() } }
    socket.addEventListener('message',listener)
  })
  await cdp('Page.reload'); await loaded
  await exists(selector)
  assert.equal(await evaluate(`!!document.querySelector('[aria-busy="true"]')`),false)
}
async function stableLayout(name) {
  await sleep(850)
  await layout()
  assert.equal(await evaluate(`document.documentElement.scrollHeight>innerHeight`),false,name+' vertical overflow')
  await screenshot('batch2-regression-'+name)
}
const noFinale=()=>evaluate(`!document.querySelector('.final-celebration')`)
async function solvePuzzle() {
  for(let position=1;position<=9;position++) {
    const label=await evaluate(`[...document.querySelectorAll('.puzzle-tile')].find(b=>b.getAttribute('aria-label').endsWith('position ${position}')).getAttribute('aria-label')`)
    if(label.startsWith('Tile '+position+',')) continue
    await click(`[aria-label="${label}"]`)
    await evaluate(`[...document.querySelectorAll('.puzzle-tile')].find(b=>b.getAttribute('aria-label').startsWith('Tile ${position},')).click()`)
  }
  await click('.puzzle-continue')
}
async function solveQuiz() {
  const {birthdayContent}=await import('../src/config/birthdayContent.js')
  for(const q of birthdayContent.quizQuestions) {
    await exists('.quiz-options')
    await evaluate(`document.querySelector('.quiz-card').focus();document.querySelector('.quiz-option').focus()`)
    await key(String(q.correctIndex+1),'Digit'+(q.correctIndex+1),49+q.correctIndex,String(q.correctIndex+1))
    await click('.quiz-next')
  }
  await button('Continue')
}
async function finishBook() {
  await click('.book-open')
  await wait(`!!document.querySelector('.book-rig[aria-busy="false"]')`)
  for(let i=0;i<5;i++) { await button('Next Page'); await wait(`!!document.querySelector('.book-rig[aria-busy="false"]')`) }
  await click('.book-continue')
}
async function finishLetter() {
  await click('.letter-open');await click('.letter-read');await click('.letter-continue')
}
async function confirmRestart() {
  await click('.finale-restart');await exists('.finale-restart-dialog[open]');await click('.finale-confirm-restart');await exists('.welcome-screen')
  assert.equal(await evaluate(`sessionStorage.getItem('birthday-journey-v1')`),null)
  assert.equal(await evaluate(`sessionStorage.getItem('birthday-gift-machine-v1')`),null)
}

try {
 await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Log.enable');
 for (const [width,height,mode] of [[1440,900,'normal'],[1366,768,'normal'],[1366,768,'reduced'],[1366,768,'paused']]) {
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:mode==='reduced'?'reduce':'no-preference'}]});
  await cdp('Page.navigate',{url:'http://127.0.0.1:5173'});await exists('.birthday-app');
  await evaluate('sessionStorage.clear()');await refresh('.welcome-screen');
  if(mode==='paused') await click('.motion-button');
  const label=width+'-'+mode;
  await stableLayout('welcome-'+label);await button('Open Your Surprise');
  for(const n of birthdayContent.pinChallenge.pin) await key(n,'Digit'+n,48+Number(n),n);
  await exists('.puzzle-board');await solvePuzzle();
  for(const q of birthdayContent.quizQuestions){await exists('.quiz-options');await evaluate(`document.querySelectorAll('.quiz-option')[${q.correctIndex}].click()`);await click('.quiz-next')}
  await click('.scratch-trigger');await exists('.scratch-dialog[open]');await stableLayout('scratch-'+label);
  if(width===1440) {
   const rect=await evaluate("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()");
   await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x+20,y:rect.y+15,button:'left',buttons:1,clickCount:1});
   for(let row=0;row<7;row++) for(let col=0;col<21;col++) await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+20+(row%2?20-col:col)*(rect.w-40)/20,y:rect.y+15+row*(rect.h-30)/6,button:'left',buttons:1});
   await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+20,y:rect.y+15,button:'left',buttons:0,clickCount:1});
  } else {await evaluate("document.querySelector('.scratch-dialog .primary-button').focus()");await key('Enter','Enter',13,'\r');}
  assert.equal(await evaluate("document.querySelector('.scratch-card').classList.contains('is-revealed')"),true);
  await evaluate("for(let i=0;i<20;i++)document.querySelector('.scratch-dialog .primary-button').click()");
  assert.equal(await evaluate("JSON.parse(sessionStorage.getItem('birthday-surprises-v1')).scratchRevealed"),true);
  await click('.scratch-dialog .surprise-close');await click('.scratch-trigger');
  assert.equal(await evaluate("document.querySelector('.scratch-card').classList.contains('scratch-reward')"),false);
  await click('.scratch-continue');await click('.book-open');await wait(`!!document.querySelector('.book-rig[aria-busy="false"]')`);
  assert.equal(await evaluate("[...document.querySelectorAll('.book-secret-note:not(:disabled)')].some(b=>{const a=b.getBoundingClientRect(),c=b.closest('article').querySelector('.book-page-copy').getBoundingClientRect();return a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top})"),false);
  await nativeClick('.book-secret-note:not(:disabled)');await exists('.surprise-dialog[open]');await stableLayout('book-note-'+label);
  assert.equal(await evaluate("document.querySelectorAll('.book-photo-page').length"),12);
  await key('Escape','Escape',27);await wait("!document.querySelector('.surprise-dialog[open]')");
  assert.equal(await evaluate("document.activeElement.classList.contains('book-secret-note')"),true);
  for(let i=0;i<5;i++){await button('Next Page');await wait(`!!document.querySelector('.book-rig[aria-busy="false"]')`)}
  await click('.book-continue');await click('.cassette-flip');await wait("document.querySelector('.tape-label-top').textContent.includes('SIDE B')");
  assert.equal(await evaluate("document.querySelector('audio').paused"),true);
  assert.equal(await evaluate("document.querySelector('.cassette-play').disabled"),true);
  await stableLayout('side-b-'+label);await click('.cassette-inspect');await click('.cassette-flip');await click('.cassette-continue');await finishLetter();
  await exists('.verification-dialog[open]');await stableLayout('verification-'+label);
  assert.equal(await evaluate("document.querySelectorAll('.machine-reel').length"),3);
  await click('.verification-dialog .surprise-close');await refresh('.phase-ready');
  assert.equal(await evaluate("!!document.querySelector('.verification-dialog[open]')"),false);
  for(let i=0;i<3;i++){await click('.machine-spin');if(i===2&&mode==='normal')await screenshot('batch2-third-spin-'+label);await exists(i===2?'.phase-complete':'.phase-ready')}
  await click('.machine-continue');assert.equal(await evaluate("!!document.querySelector('.certificate-trigger')"),false);
  await button('Open Your Gift');await exists('.gift-opened');assert.equal(await evaluate("!!document.querySelector('.certificate-trigger')"),false);
  await button('Claim Your Gift');await click('.certificate-trigger');await exists('.certificate-dialog[open]');await stableLayout('certificate-'+label);await key('Escape','Escape',27);
  await button('Continue');await exists('.finale-settled');
  for(let i=0;i<3;i++){await evaluate(`document.querySelector('.candle-${i}').focus()`);await key('Enter','Enter',13,'\r')}
  await exists('.wish-complete');await stableLayout('wish-'+label);
  if(mode==='paused'||mode==='reduced') assert.equal(await evaluate("getComputedStyle(document.querySelector('.candle-smoke')).animationName"),'none');
  assert.equal(await evaluate("[...document.querySelectorAll('.candle-control')].every((b,i,a)=>!i||b.getBoundingClientRect().left>=a[i-1].getBoundingClientRect().right-.1)"),true);
  await evaluate("for(let i=0;i<20;i++)document.querySelector('.candle-2').click()");assert.equal(await evaluate("document.querySelectorAll('.finale-flame.is-out').length"),3);
  await click('.finale-replay');await exists('.finale-settled');assert.equal(await evaluate("document.querySelectorAll('.finale-flame.is-out').length"),0);
  await click('.finale-back');await click('.certificate-trigger');await key('Escape','Escape',27);await button('Continue');await exists('.finale-settled');
  await click('.finale-restart');await click('.finale-cancel-restart');assert.equal(await evaluate("!!sessionStorage.getItem('birthday-journey-v1')"),true);
  await confirmRestart();assert.equal(await evaluate("sessionStorage.getItem('birthday-surprises-v1')"),null);
  console.log('PASS Batch 2 full journey and all optional discoveries: '+label);
 }
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
 console.log('PASS: no runtime or console errors');
} finally {socket.close()}
