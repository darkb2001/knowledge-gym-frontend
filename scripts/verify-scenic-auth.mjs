/* UI fixtures only: does not prove live auth, Safari rendering or a physical iPhone keyboard. */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.KG_UI_URL || 'http://127.0.0.1:3217';
const output = '.impeccable/review/scenic-auth'; fs.mkdirSync(output,{recursive:true});
const user = { id:'11111111-1111-4111-8111-111111111111', displayName:'Fixture learner',email:'fixture@example.test',role:'USER',authProvider:'LOCAL',emailVerified:true };
const token = ['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'synthetic'].join('.');
const topic = {id:'topic',slug:'java',name:'Java fundamentals',track:'java',displayOrder:1,moduleCount:3};
const modules = Array.from({length:3},(_,i)=>({id:`module-${i}`,name:`Java module ${i+1}`,slug:`java-${i+1}`,topicId:topic.id,topicSlug:'java',questionCount:12,displayOrder:i,description:'Review concepts, then choose your practice mode.'}));
const report = {checks:[],errors:[],unmatched:[],accessibility:[],screenshots:[],issues:[]};
const browser = await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
try {
  for (const [device,width,height] of [['desktop',1440,900],['laptop',1280,800],['iphone13',390,844],['iphone13-landscape',844,390],['narrow',320,740]]) {
    const context = await browser.newContext({viewport:{width,height},reducedMotion:'reduce',...(width===390||width===844?{isMobile:true,hasTouch:true}:{})});
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror',e=>report.errors.push({device,message:e.message}));
    let signedIn=false,success=false,failureReason='Invalid credentials';
    await page.route('**/api/v1/**',async route=>{
      const path=new URL(route.request().url()).pathname.replace('/api/v1','');
      const headers={'access-control-allow-origin':base,'access-control-allow-credentials':'true','access-control-allow-headers':'Authorization,Content-Type','access-control-allow-methods':'GET,POST,OPTIONS'};
      if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
      if(path==='/auth/login') {
        const payload=route.request().postDataJSON();
        assert.equal(payload.email,'fixture@example.test'); assert.equal(typeof payload.password,'string');
        if(!success) return route.fulfill({status:401,headers,json:{detail:failureReason}});
        signedIn=true; return route.fulfill({headers,json:{accessToken:token,expiresIn:3600,user}});
      }
      if(path==='/auth/refresh') return route.fulfill({status:signedIn?200:401,headers,json:signedIn?{accessToken:token,expiresIn:3600,user}:{detail:'Unauthenticated fixture'}});
      const responses={'/users/me':user,'/topics':[topic],'/tracks':[{slug:'java',name:'Java',displayOrder:1}],'/modules':modules};
      if(path in responses) return route.fulfill({headers,json:responses[path]});
      report.unmatched.push({device,path}); return route.fulfill({status:404,headers,json:{detail:'Unhandled fixture'}});
    });
    const check=(name,actual,expected)=>{assert.equal(actual,expected,`${device}: ${name}`);report.checks.push({device,name});};
    const visit=async path=>{await page.goto(base+path);await page.waitForLoadState('networkidle');};
    const capture=async name=>{
      check(`${name}: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
      const path=`${output}/${device}-${name}.png`;await page.screenshot({path,fullPage:true});report.screenshots.push(path);
      const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      report.accessibility.push({device,name,violations:a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});
    };
    await visit('/login?next=/learn');
    for(const theme of ['light','dark']) {
      if(theme==='dark')await page.getByRole('button',{name:'Chuyển sang giao diện tối',exact:true}).click();
      check(`${theme}: theme applies`,await page.locator('html').getAttribute('data-theme'),theme);
      check(`${theme}: email type/autocomplete`,await page.getByLabel('Email',{exact:true}).getAttribute('autocomplete'),'email');
      check(`${theme}: password type`,await page.getByLabel('Mật khẩu',{exact:true}).getAttribute('type'),'password');
      check(`${theme}: original login fields`,await page.locator('main form input').count(),2);
      check(`${theme}: google action preserved`,await page.getByRole('button',{name:'Tiếp tục với Google',exact:true}).count(),1);
      for(const label of ['Quên mật khẩu?','Đăng ký'])check(`${theme}: ${label} link`,await page.getByRole('link',{name:label,exact:true}).count(),1);
      const targetHeights=await page.locator('.auth-form input,.auth-form button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
      if(!targetHeights.every(h=>h>=48))report.issues.push({device,theme,name:'48px touch targets',targetHeights});report.checks.push({device,name:`${theme}: 48px touch targets`});
      if(width===390) {const bounds=await page.locator('.auth-card').boundingBox();if(bounds.y+bounds.height>height-12)report.issues.push({device,theme,name:'portrait viewport fit',bounds});report.checks.push({device,name:`${theme}: portrait form fits`});}
      await capture(`login-${theme}`);
      await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('synthetic-wrong-password');
      await page.getByRole('button',{name:'Vào phòng tập',exact:true}).click();await page.locator('main [role="alert"]').waitFor();
      check(`${theme}: credentials retained after failure`,await page.getByLabel('Email',{exact:true}).inputValue(),'fixture@example.test');
      check(`${theme}: submit recovers after failure`,await page.getByRole('button',{name:'Vào phòng tập',exact:true}).isEnabled(),true);
      await capture(`login-${theme}-error`);
      for(const route of ['/register','/forgot-password','/verify-email']) {await visit(route);check(`${theme}: preference persists at ${route}`,await page.locator('html').getAttribute('data-theme'),theme);await capture(`${theme}-${route.slice(1)}`);}
      await visit('/login?next=/learn');
    }
    failureReason='Email verification required';await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('synthetic-unverified-password');await page.getByRole('button',{name:'Vào phòng tập',exact:true}).click();await page.getByRole('link',{name:'Xác minh email',exact:true}).waitFor();check('verification error exposes recovery',await page.getByRole('link',{name:'Xác minh email',exact:true}).getAttribute('href'),'/verify-email');await capture('login-verification-error');failureReason='Invalid credentials';await visit('/login?next=/learn');
    if(width===390) { await page.setViewportSize({width,height:500}); await page.getByLabel('Mật khẩu',{exact:true}).focus(); await page.getByRole('button',{name:'Vào phòng tập',exact:true}).scrollIntoViewIfNeeded(); const b=await page.getByRole('button',{name:'Vào phòng tập',exact:true}).boundingBox(); check('short viewport can scroll submit into view',b.y>=0&&b.y+b.height<=500,true); check('short viewport has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false); await page.setViewportSize({width,height}); }
    check('reduced motion stops landscape',await page.locator('.scene-ridge--far').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    check('reduced motion stops bird flight',await page.locator('.scene-flock').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    check('reduced motion hides meteors',await page.locator('.scene-meteors').first().evaluate(el=>getComputedStyle(el).display),'none');
    await page.getByRole('button',{name:'English',exact:true}).click();check('English title',await page.getByRole('heading',{name:'Sign in',exact:true}).count(),1);await capture('login-dark-en');
    await page.getByRole('button',{name:'Tiếng Việt',exact:true}).click();
    success=true;await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('synthetic-valid-password');
    await page.getByRole('button',{name:'Vào phòng tập',exact:true}).click();await page.waitForURL('**/learn');await page.locator('[data-module-card]').first().waitFor();
    check('successful login preserves next redirect',new URL(page.url()).pathname,'/learn');
    check('shared background present in app',await page.locator('.mountain-scene--global').count(),1);
    await capture('learn-dark');await page.getByRole('button',{name:'Chuyển sang giao diện sáng',exact:true}).click();await capture('learn-light');
    await context.close();
  }
  for(const [device,width,height] of [['desktop',1440,900],['iphone13',390,844]]) {
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});const page=await context.newPage();await page.goto(base+'/login');await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.scene-ridge--far').first().evaluate(el=>getComputedStyle(el).animationName),'mountain-drift');report.checks.push({device,name:'normal-motion landscape enabled'});
    assert.equal(await page.locator('.scene-flock').first().evaluate(el=>getComputedStyle(el).animationName),'flock-pass');report.checks.push({device,name:'daytime flock animation enabled'});
    assert.equal(await page.locator('.scene-bird-wing').count(),12);report.checks.push({device,name:'six birds per scene'});
    assert.equal(await page.locator('.scene-meteor').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');report.checks.push({device,name:'daytime meteors paused'});
    await page.screenshot({path:`${output}/${device}-daytime-birds.png`,fullPage:true});
    await page.getByRole('button',{name:'Chuyển sang giao diện tối',exact:true}).click();
    assert.equal(await page.locator('.scene-flock').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');report.checks.push({device,name:'nighttime flock paused'});
    const visible=await page.locator('.scene-meteor--0:visible').evaluateAll(async elements=>{for(const transition of document.getAnimations())if(transition instanceof CSSTransition)transition.finish();for(const el of elements){const a=el.getAnimations().find(a=>a.animationName==='meteor-pass');if(!a)return false;a.pause();a.currentTime=3000;}await new Promise(resolve=>requestAnimationFrame(resolve));return elements.length>0&&elements.every(el=>Number(getComputedStyle(el).opacity)>0);});
    assert.equal(visible,true);report.checks.push({device,name:'night meteor renders during its flight phase'});
    assert.equal(await page.locator('.scene-meteor--1').first().evaluate(el=>getComputedStyle(el).animationDuration),'27s');report.checks.push({device,name:'secondary meteor remains sparse'});
    await page.screenshot({path:`${output}/${device}-nighttime-meteor.png`,fullPage:true});
    await context.close();
  }
  assert.equal(report.errors.length,0,'page errors');assert.equal(report.unmatched.length,0,'unmatched fixtures');
  assert.equal(report.accessibility.flatMap(a=>a.violations).length,0,'Axe violations');
  assert.equal(report.issues.length,0,JSON.stringify(report.issues));
} finally {await browser.close();fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify({checks:report.checks.length,captures:report.accessibility.length,errors:report.errors,unmatched:report.unmatched,axeViolations:report.accessibility.flatMap(a=>a.violations).length},null,2));
