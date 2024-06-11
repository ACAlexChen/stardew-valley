import { Context } from 'koishi'
import { Config } from './index'
import { mods, mod } from './type'
import { modfunction } from './function'


export function events(ctx: Context, cfg: Config, mods: mods){
  action(ctx, cfg, mods)

  var modsfunction = modfunction(ctx, mods)

  mods.main.forEach((mod) => {
    mod.main.forEach((item) => {
      if ((item as mod.events).type === 'instantaneousEvents'){
        if ((item as mod.events).main.listener.map(item => item.listenername).includes('stardew-valley/plant')){
          ctx.on('stardew-valley/plant', (crop, session) => {
            if (modsfunction.probabilityFunction(((item as mod.events).main as mod.instantaneousEvents).probability) === true){
              session.send(((item as mod.events).main as mod.instantaneousEvents).message)
              item.main.action.forEach(action => {
                if (action.includes('crop')){
                  ctx.emit(action,{cropid: crop.cropid, number: 1},session)
                }
              })
            }
          })
        }
      }
    })
  })
}

function action(ctx: Context, cfg: Config, mods: mods){
  var modsfunction = modfunction(ctx, mods)

  ctx.on('stardew-valley/plugin-loaded',() => {
    ctx.setTimeout(() => {
      ctx.emit('stardew-valley/plugin-return-mods', mods)
    },1000)
  })
  ctx.on('stardew-valley/action-add-item',(item, session) => {
    modsfunction.checkPlayerHaveItem(session.userId, session.platform)
    modsfunction.addItem(modsfunction.findName(item.itemid), session.userId, session.platform, item.number)
  })

  ctx.on('stardew-valley/action-add-crop',async (crop, session) => {
    modsfunction.checkPlayerHaveItem(session.userId, session.platform)
    let nowPlant = await ctx.database.get('stardew_valley_crop', {owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform)})
    let nowHaveBuilding = await ctx.database.get('stardew_valley',{id: await ctx.idconverter.getUserAid(session.userId, session.platform)},['building.main'])
    let maxPlant: number = 0
    nowHaveBuilding.forEach(building => {
      building.building.main.forEach((item) => {
        if ((item as mod.building).type === 'farm'){
          maxPlant += (item as mod.building).max
        }
      })
    })
    if (nowPlant.length < maxPlant){
      for (let i = 0; i < (maxPlant - nowPlant.length) && i < crop.number; i++){
        await ctx.database.create('stardew_valley_crop',{id: Math.max(...nowPlant.map(item => item.id)) + 1,owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform), crop_id: crop.cropid})
      }
    }
  })
}