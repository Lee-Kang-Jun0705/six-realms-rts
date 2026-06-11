import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/hp',{recursive:true});
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-start.spec').click(); // 관전=전투 빨리
  await page.locator('.hud-res').waitFor({timeout:20000});
  await page.mouse.click(640,400);
  // 전투 날 때까지 진행하며 다친 유닛 HP바 포착
  await page.waitForTimeout(70000);
  for(let i=0;i<5;i++){await page.screenshot({path:`test-results/hp/hp-${i}.png`});await page.waitForTimeout(900);}
  console.log('hp 스샷 완료');
  await b.close();
};
run();
