import { Context } from 'koishi'
import { mods, mod } from './type'
/* export function listener(ctx: Context){
  const listener = {
    'stardew-valley/listener-购买': [],
    'stardew-valley/listener-种植': []
  }
  const action = [
    'stardew-valley/action-移除物品',
    'stardew-valley/action-移除作物',
    'stardew-valley/action-添加物品',
    'stardew-valley/action-添加作物'
  ]
  let mods: mods
  ctx.on('stardew-valley/plugin-reload-mods', (rmods) => {
    mods = rmods as mods
  })
  for (let i = 0; i < mods.main.length; i++){
    for (let j = 0; j < mods.main[i].main.length; j++){
      if ((mods as mods).main[i].main[j].type === 'event'){
        if (listener[((mods as mods).main[i].main[j] as mod.events).listener]){
          listener[((mods as mods).main[i].main[j] as mod.events).listener].push((mods as mods).main[i].main[j] as mod.events)
        }
      }
    }
  }
} */
export function action(ctx: Context) {
  let mods
  ctx.on('stardew-valley/plugin-reload-mods', (rmods) => {
    mods = rmods as mods
  })
  ctx.on('stardew-valley/action-添加作物',async (item, session) => {
    const playerAid = await ctx.idconverter.getUserAid(session.userId, session.platform)
    const allCrop = await ctx.database.get('stardew_valley_crop', {location: 1})
    const maxId = Math.max(...allCrop.map(crop => crop.id))
    for (let i = 0; i < item.number; i++){
      await ctx.database.create('stardew_valley_crop', {
        id: maxId + 1,
        owner_id: playerAid,
        crop_id: item.id,
        date: new Date(
          Date.now() +
          (((mods as mods).main
          .find(mod => mod.id ===
            Number(item.id.split(':')[0])).main as mod.item[])
          .find(mod => mod.id ===
            Number(item.id.split(':')[1])).main.main as mod.crop)
          .growthTime
        ),
        location: 1
      })
    }
  })
  ctx.on('stardew-valley/action-添加物品',async (item, session) => {
    const playerAid = await ctx.idconverter.getUserAid(session.userId, session.platform)
    const playerItem = await ctx.database.get('stardew_valley', {id: playerAid})
    const itemInfo = ((mods as mods).main
      .find(mod => mod.id ===
        Number(item.id.split(':')[0])).main as mod.item[])
      .find(mod => mod.id ===
        Number(item.id.split(':')[1])).main
    if (itemInfo.type === 'building'){
      const building = playerItem[0].building
      const nowHave = building.main.find(mod => mod.itemId === item.id)
      if (!nowHave){
        await ctx.database.set('stardew_valley', {id: playerAid}, {
          building: {
            main: [
              {
                itemId: item.id,
                number: item.number
              }
            ]
          }
        })
      } else {
        building.main.find(mod => mod.itemId === item.id).number += item.number
        await ctx.database.set('stardew_valley', {id: playerAid}, {building: building})
      }
    } else {
      const nowHave = playerItem[0].item.main.find(mod => mod.itemId === item.id)
      if (!nowHave){
        await ctx.database.set('stardew_valley', {id: playerAid}, {
          item: {
            main: [
              {
                itemId: item.id,
                number: item.number
              }
            ]
          }
        })
      } else {
        playerItem[0].item.main.find(mod => mod.itemId === item.id).number += item.number
        await ctx.database.set('stardew_valley', {id: playerAid}, {item: playerItem[0].item})
      }
    }
  })
}

// TODO: 事件系统局限性太大，所以就暂时不考虑如何实现了，什么时候我心情好了再考虑