import { chromium } from '@playwright/test';
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1100,height:760}})).newPage();
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-start').first().click();
  await page.locator('.hud-res').waitFor({timeout:20000});
  await page.waitForTimeout(22000);
  await page.screenshot({path:'test-results/cargo/cargo2.png'});
  await b.close();
};
run();
