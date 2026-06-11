import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/blddiag',{recursive:true});
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const errs:string[]=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  // 로드된 건물 텍스처 키 확인 위해 콘솔 평가
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-start.spec').click();
  await page.locator('.hud-res').waitFor({timeout:20000});
  await page.mouse.click(640,400);
  await page.waitForTimeout(120000); // 건물 여러개 지어질 시간
  // 텍스처 존재 확인
  const keys = await page.evaluate(() => {
    const g:any = (window as any).Phaser; void g;
    return 'n/a';
  });
  await page.screenshot({path:'test-results/blddiag/buildings.png'});
  console.log('에러',errs.length,errs.slice(0,5),'keys',keys);
  await b.close();
};
run();
