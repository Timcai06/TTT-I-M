import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { Matrix4, Quaternion, Vector3 } from 'three'

const directory='../../output/pm/NR-03'
type Commit={photoVisibility:Array<{blockedBy:string|null;ndc:number[]}>|null;kind:string;frameId:number;position:{segment:string;progress:number};permit:{requestId:number;layoutVersion:number;resourceGeneration:number};readingRoute:null|{mode:string;phase:string;progress:number;snapshotInert:boolean};camera:{position:number[];view:number[];projection:number[]};world:{photo:{progress:number;owner:string;sourceVisible:boolean;wallVisible:boolean;transferVisible:boolean;paperVisible:boolean;source:number[][];target:number[][];actual:number[][];uv:number[];paper:number[];texture:{sameSource:boolean;proxySameMap:boolean}}}}
async function records(page:Page):Promise<Commit[]> {return page.evaluate(()=>(window as unknown as {__portfolioArchiveExecution:{getSnapshot():Commit[]}}).__portfolioArchiveExecution?.getSnapshot()??[])}
async function latest(page:Page) {return (await records(page)).filter(x=>x.kind==='sample-committed').at(-1)!}
async function boot(page:Page,url='/') {
  mkdirSync(directory,{recursive:true})
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>4})
    Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>4})
    ;(window as unknown as {__portfolioArchiveExecutionEnabled:boolean}).__portfolioArchiveExecutionEnabled=true
  })
  await page.goto(url);await expect(page.locator('.intro')).toHaveCount(0,{timeout:20000})
}
async function seek(page:Page,p:number) {
  await page.locator('[data-archive-track="life-frame"]').evaluate((node,p)=>{const r=node.getBoundingClientRect();window.scrollTo(0,scrollY+r.top-innerHeight+r.height*p)},p)
  await expect.poll(async()=>{const r=await latest(page);return r?.position.segment==='life-frame'?Math.abs(r.position.progress-p):1}).toBeLessThan(.0007)
}
async function navigate(page:Page,id:string) {
  await page.getByRole('button',{name:`Scroll to ${id.toUpperCase()}`,exact:true}).evaluate(node=>(node as HTMLButtonElement).click())
  await expect.poll(async()=>{const r=await latest(page);return r&&!r.readingRoute?r.position.segment:null}).toBe(`${id}-reading`)
  await expect(page.locator('.archive-route-layer--reading')).toHaveCount(0)
}
function save(name:string,data:unknown){writeFileSync(`${directory}/${name}.json`,JSON.stringify(data,null,2))}

test('actual football surface is continuous forward reverse and direct, including endpoint UV and interior points',async({page,browser})=>{
  test.setTimeout(90000)
  await boot(page)
  const evidence:Commit[]=[]
  const positions=[.24,.25,.26,.27,.28,.3,.32,.36,.4,.44,.48,.52,.55,.56,.5601]
  for(const p of [...positions,...positions.toReversed()]) {
    await seek(page,p)
    const r=await latest(page),photo=r.world.photo
    if(r.photoVisibility?.some(point=>point.blockedBy))save('photo-occlusion-failure',r)
    expect(r.photoVisibility).not.toBeNull()
    expect(r.photoVisibility!.map(point=>point.blockedBy)).toEqual(Array(9).fill(null))
    expect(Number(photo.sourceVisible)+Number(photo.wallVisible)+Number(photo.transferVisible)).toBe(1)
    expect(photo.texture).toMatchObject({sameSource:true,proxySameMap:true})
    expect(photo.paperVisible).toBe(photo.transferVisible)
    const q=photo.progress,arc=Math.sin(Math.PI*q)
    const basis=(points:number[][])=>{
      const tl=new Vector3().fromArray(points[0]),right=new Vector3().fromArray(points[1]).sub(tl).normalize(),up=tl.clone().sub(new Vector3().fromArray(points[3])).normalize()
      const normal=right.clone().cross(up).normalize();up.crossVectors(normal,right).normalize()
      return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right,up,normal))
    }
    const from=basis(photo.source),to=basis(photo.target),rotation=from.clone().slerp(to,q)
    const a=new Vector3().fromArray(photo.source[4]),b=new Vector3().fromArray(photo.target[4])
    for(let i=0;i<9;i++) {
      const expected=new Vector3().fromArray(photo.source[i]).sub(a).applyQuaternion(from.clone().invert()).lerp(new Vector3().fromArray(photo.target[i]).sub(b).applyQuaternion(to.clone().invert()),q).applyQuaternion(rotation).add(a.clone().lerp(b,q)).add(new Vector3(0,.26*arc,.28*arc+4.2*q*(1-q)**3))
      expected.x+=(b.x-a.x)*(q*q-q)
      expect(expected.distanceTo(new Vector3().fromArray(photo.actual[i]))).toBeLessThan(1e-5)
      const ndc=new Vector3().fromArray(photo.actual[i]).applyMatrix4(new Matrix4().fromArray(r.camera.view)).applyMatrix4(new Matrix4().fromArray(r.camera.projection))
      expect([ndc.x,ndc.y,ndc.z].every(Number.isFinite)).toBe(true)
      expect(Math.abs(ndc.x)).toBeLessThan(.95)
      expect(Math.abs(ndc.y)).toBeLessThan(.95)
      expect(ndc.z).toBeGreaterThan(-1);expect(ndc.z).toBeLessThan(1)
    }
    evidence.push(r)
    if([.28,.4,.55,.56].includes(p))await page.screenshot({path:`${directory}/football-${p}.png`})
  }
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1})
  try {
    const direct=await context.newPage();await boot(direct);await seek(direct,.4)
    await seek(page,.4)
    const a=await latest(direct),b=await latest(page)
    expect(a.world.photo).toEqual(b.world.photo)
    save('football-direct-history',{direct:a,history:b})
  }finally{await context.close()}
  save('football-path',evidence)
})

test('About Life and Frame retract the current long reading viewport and reopen its bookmark',async({page})=>{
  test.setTimeout(90000);await boot(page)
  const evidence=[]
  for(const id of ['about','life','frame']) {
    if(id==='life') {
      await page.locator('[data-archive-track="about-life"] .archive-bridge__footer a').evaluate(node=>(node as HTMLAnchorElement).click())
      await expect.poll(async()=>{const r=await latest(page);return r&&!r.readingRoute?r.position.segment:null}).toBe('life-reading')
    } else await navigate(page,id)
    await page.evaluate(()=>window.scrollBy(0,240))
    const bookmark=await page.evaluate(()=>scrollY)
    const beforeText=await page.locator(`#${id}`).textContent()
    await page.screenshot({path:`${directory}/${id}-reading.png`})
    await page.getByRole('button',{name:'RETURN TO OBJECT ↖'}).click()
    await expect(page.locator('html')).toHaveAttribute('data-archive-return-phase',/retract|move/)
    const layer=page.locator('.archive-route-layer--reading')
    await expect(layer).toHaveAttribute('inert','')
    expect(await layer.textContent()).toBe(beforeText)
    await expect(page.locator(`#${id}`)).toHaveAttribute('inert','')
    const phase=await latest(page)
    await page.screenshot({path:`${directory}/${id}-retract.png`})
    await expect(layer).toHaveCount(0)
    if(id==='about')await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot','entry')
    else await expect.poll(async()=>{const r=await latest(page);return !r.readingRoute?Math.abs(r.position.progress-.56):1}).toBeLessThan(.002)
    if(id==='life')await page.locator('[data-archive-track="about-life"] .archive-bridge__footer a').evaluate(node=>(node as HTMLAnchorElement).click())
    else await page.getByRole('button',{name:`Scroll to ${id.toUpperCase()}`,exact:true}).click()
    await expect(page.locator('html')).toHaveAttribute('data-archive-return-phase','expand')
    await expect(page.locator('.archive-route-layer--reading')).toHaveCount(0)
    await expect.poll(()=>page.evaluate(saved=>Math.abs(scrollY-saved),bookmark)).toBeLessThan(2)
    await expect(page.locator(`#${id}`)).not.toHaveAttribute('inert','')
    expect(await page.locator(`#${id}`).textContent()).toBe(beforeText)
    evidence.push({id,bookmark,phase,final:await latest(page)})
  }
  save('reading-return',evidence)
})

test('Frame pinned subthemes retain their actual visible composition and deep-cluster bookmarks',async({page})=>{
  test.setTimeout(90000);await boot(page,'/#frame-cuisine')
  const evidence=[]
  for(const theme of ['building','cuisine','scenery']) {
    const section=page.locator(`#frame-${theme}`)
    await section.evaluate(node=>{
      const root=node.parentElement!.classList.contains('pin-spacer')?node.parentElement!:node
      const rect=root.getBoundingClientRect();window.scrollTo(0,scrollY+rect.top+Math.max(0,rect.height-innerHeight)*.98)
    })
    await expect.poll(async()=>(await latest(page))?.position.segment).toBe('frame-reading')
    const clusterProgress=await section.locator('.frame-horizontal__rail-subcount').textContent()
    const clusterMatch=clusterProgress?.match(/Cluster\s+(\d+)\s*\/\s*(\d+)/)
    expect(clusterMatch).not.toBeNull()
    expect(clusterMatch![1]).toBe(clusterMatch![2])
    const bookmark=await page.evaluate(()=>scrollY)
    await page.screenshot({path:`${directory}/frame-${theme}-before.png`})
    await page.evaluate(()=>{
      const source=document.getElementById('frame')!
      const selectors='.archive-theme-section__pin, .archive-theme-section__track, img, canvas'
      const originals=[...source.querySelectorAll<HTMLElement>(selectors)].map(node=>({tag:node.tagName,src:node instanceof HTMLImageElement?node.currentSrc:null,rect:node.getBoundingClientRect().toJSON() as Record<string,number>,position:getComputedStyle(node).position}))
      const observer=new MutationObserver(()=>{
        const layer=document.querySelector('.archive-route-layer--reading')
        if(!layer)return
        const clones=[...layer.querySelectorAll<HTMLElement>(selectors)].map(node=>({tag:node.tagName,src:node instanceof HTMLImageElement?node.currentSrc:null,rect:node.getBoundingClientRect().toJSON() as Record<string,number>,position:getComputedStyle(node).position}))
        ;(window as unknown as {__snapshotGeometry:unknown}).__snapshotGeometry={originals,clones}
        observer.disconnect()
      })
      observer.observe(document.body,{childList:true})
    })
    await page.getByRole('button',{name:'RETURN TO OBJECT ↖'}).click()
    await expect(page.locator('.archive-route-layer--reading')).toHaveCount(1)
    const snapshot=await page.locator('.archive-route-layer--reading').evaluate(layer=>({inert:(layer as HTMLElement).inert,images:[...layer.querySelectorAll('img')].filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth}).map(img=>({src:img.currentSrc||img.src,rect:img.getBoundingClientRect().toJSON() as Record<string,number>}))}))
    expect(snapshot.inert).toBe(true)
    expect(snapshot.images.length).toBeGreaterThan(0)
    const geometry=await page.evaluate(()=>(window as unknown as {__snapshotGeometry:{originals:Array<{tag:string;src:string|null;rect:{top:number;left:number;width:number;height:number;bottom:number;right:number};position:string}>;clones:Array<{tag:string;src:string|null;rect:{top:number;left:number;width:number;height:number};position:string}>}}).__snapshotGeometry)
    save(`frame-${theme}-snapshot-geometry`,geometry)
    geometry.originals.forEach((original,i)=>{
      if(original.rect.bottom<=0||original.rect.top>=720||original.rect.right<=0||original.rect.left>=1280)return
      const clone=geometry.clones[i]
      expect(clone.tag).toBe(original.tag)
      if(original.src)expect(clone.src).toBe(original.src)
      for(const key of ['left','top','width','height'] as const)expect(Math.abs(clone.rect[key]-original.rect[key])).toBeLessThan(.5)
    })
    await page.screenshot({path:`${directory}/frame-${theme}-snapshot.png`,style:'.archive-route-layer--reading { transform:none!important; opacity:1!important; }'})
    await expect(page.locator('.archive-route-layer--reading')).toHaveCount(0)
    await navigate(page,'frame')
    await expect.poll(()=>page.evaluate(saved=>Math.abs(scrollY-saved),bookmark)).toBeLessThan(2)
    await expect(section).not.toHaveAttribute('inert','')
    evidence.push({theme,bookmark,clusterProgress,snapshot,final:await latest(page)})
  }
  save('frame-subtheme-return',evidence)
})

test('return cancellation replacement resize and GPU recovery never leave an obsolete snapshot or owner',async({page})=>{
  test.setTimeout(90000);await boot(page)
  const evidence=[]
  for(const interrupt of ['wheel','replacement','resize','gpu']) {
    await navigate(page,'about')
    await page.getByRole('button',{name:'RETURN TO OBJECT ↖'}).click()
    await expect(page.locator('.archive-route-layer--reading')).toHaveCount(1)
    const before=await latest(page)
    if(interrupt==='wheel')await page.evaluate(()=>window.dispatchEvent(new WheelEvent('wheel',{deltaY:120})))
    if(interrupt==='replacement')await page.getByRole('button',{name:'Scroll to FRAME',exact:true}).evaluate(node=>(node as HTMLButtonElement).click())
    if(interrupt==='resize')await page.setViewportSize({width:1370,height:850})
    if(interrupt==='gpu')await page.locator('canvas[data-archive-shared]').evaluate(canvas=>{const ext=(canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!;ext.loseContext();setTimeout(()=>ext.restoreContext(),200)})
    await expect(page.locator('.archive-route-layer--reading')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-archive-routing','true')
    if(interrupt==='gpu')await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-state','ready',{timeout:20000})
    try { await navigate(page,'frame') } catch(error) {
      save('interrupt-failure',{interrupt,before,records:await records(page),dom:await page.evaluate(()=>({scroll:scrollY,dataset:{...document.documentElement.dataset},frame:document.getElementById('frame')?.getBoundingClientRect().toJSON() as Record<string,number>}))})
      throw error
    }
    await expect(page.locator('#frame')).not.toHaveAttribute('inert','')
    await page.waitForTimeout(1100)
    expect((await latest(page)).position.segment).toBe('frame-reading')
    expect((await latest(page)).readingRoute).toBeNull()
    evidence.push({interrupt,before,after:await latest(page)})
  }
  save('reading-interruptions',evidence)
})
