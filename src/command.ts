import { Context } from 'koishi'
import { modfunction } from './function'
import { Config } from './index'
import { mods, mod } from './type'

export function command(ctx: Context, cfg: Config, mods: mods){

  const modsfunction = modfunction(ctx, mods)

  ctx.command('stardew-valley.购买 [name] [number]')
  .action(async ({session}, name, number) => {
    await ctx.StardewValleyAPI.checkPlayerHaveItem(session.userId, session.platform, session)
    if (!name){
      return '请输入物品名称'
    } else {
      const itemInfo = modsfunction.inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else if ((itemInfo as mod.item).price.can === false){
        return '该物品无法购买'
      } else {
        try {
          await ctx.monetary.cost(await ctx.idconverter.getUserAid(session.userId, session.platform), (itemInfo as mod.item).price.buy * modsfunction.numberYES(number))
          await modsfunction.addItem(name, session.userId, session.platform, modsfunction.numberYES(number))
          ctx.emit('stardew-valley/listener-购买', {
            id: ctx.StardewValleyAPI.itemNameToUid(name),
            number: ctx.StardewValleyAPI.numberYES(number)
          },session)
          return '购买成功'
        } catch (e) {
          ctx.logger.error(e)
          return '余额不足'
        }
      }
    }
  })

  ctx.command('stardew-valley.卖出 [name] [number]')
  .action(async ({session}, name, number) => {
    await ctx.StardewValleyAPI.checkPlayerHaveItem(session.userId, session.platform, session)
    if (!name){
      return '请输入物品名称'
    } else {
      const itemInfo = modsfunction.inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else {
        const remove = await modsfunction.removeItem(name, session.userId, session.platform, modsfunction.numberYES(number))
        if (remove.includes('Error')){
          return remove
        } else {
          try {
            await ctx.monetary.gain(await ctx.idconverter.getUserAid(session.userId, session.platform), (itemInfo as mod.item).price.sell * modsfunction.numberYES(number))
            ctx.emit('stardew-valley/listener-卖出', {
              id: ctx.StardewValleyAPI.itemNameToUid(name),
              number: ctx.StardewValleyAPI.numberYES(number)
            },session)
            return '成功卖出'
          } catch (e) {
            ctx.logger.error(e)
            return e
          }
        }
      }
    }
  })

  ctx.command('stardew-valley.种植 [name] [number]')
  .action(async ({session}, name, number) => {
    const check = await modsfunction.checkPlayerHaveItem(session.userId, session.platform)
    if (check === '检测到你是第一次玩此游戏，系统已赠与你一个普通农场'){
      session.send(check)
    }
    if (!name){
      return '请输入物品名称'
    } else {
      const itemInfo = modsfunction.inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else {
        const item_Info = (itemInfo as mod.item).main.main as mod.crop
        const nowHave = (await ctx.database.get('stardew_valley',{id: await ctx.idconverter.getUserAid(session.userId, session.platform)}))[0]
        let max = 0
        for (let i = 0; i < nowHave.building.main.length; i++){
          const mod = (modsfunction.inModfind(modsfunction.findName(nowHave.building.main[i].itemId)) as mod.item).main.main as mod.building
          if (mod.level >= item_Info.level){
            max += (mod.max * nowHave.building.main[i].number)
          }
        }
        const Crop_Growing = await ctx.database.get('stardew_valley_crop',{owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform)})
        const put = modsfunction.numberYES(number) + Crop_Growing.length
        if (put > max){
          return '你没有足够的空间'
        } else {
          const add_ids: number[] = []
          const remove = await ctx.StardewValleyAPI.tryCatch(ctx.StardewValleyAPI.removeItem, name, session.userId, session.platform, ctx.StardewValleyAPI.numberYES(number))
          if (remove.error){
            return (remove.result as Error).message
          }
          const growthTime = Date.now() + item_Info.growthTime
          for (let i = 0; i < modsfunction.numberYES(number); i++){
            const all_id = (await ctx.database.get('stardew_valley_crop',{location: 1},['id'])).map(item => item.id)
            let id
            if (all_id.length === 0){
              id = 0
            } else {
              id = Math.max(...all_id) + 1
            }
            add_ids.push(id)
            await ctx.database.create('stardew_valley_crop',{
              id: id,
              owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform),
              crop_id: modsfunction.findId(name),
              date: new Date(growthTime), location: 1
            })
          }
          ctx.emit('stardew-valley/listener-种植', {
            id: ctx.StardewValleyAPI.itemNameToUid(name),
            number: ctx.StardewValleyAPI.numberYES(number)
          }, session)
          return '种植成功，种植时间至' + new Date(growthTime)
        }
      }
    }
  })

  ctx.command('stardew-valley.收获')
  .action(async ({session}) => {
    await ctx.StardewValleyAPI.checkPlayerHaveItem(session.userId, session.platform, session)
    const Crop_Growing = await ctx.database.get('stardew_valley_crop',{owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform)})
    if (Crop_Growing.length === 0){
      return '你没有种植任何作物'
    } else {
      const now = Date.now()
      const outoutput = []
      for (let i = 0; i < Crop_Growing.length; i++){
        const output = []
        const cropInfo = (modsfunction.inModfind(modsfunction.findName(Crop_Growing[i].crop_id)) as mod.item).main.main as mod.crop
        if (now >= Crop_Growing[i].date.getTime()){
          const add_output = async (cropInfo: mod.crop) => {
            for (let i = 0; i < cropInfo.harvestOutput.output.length; i++){
              if (ctx.StardewValleyAPI.probabilityFunction(cropInfo.harvestOutput.output[i].probability) === true){
                const numberOfCycles = ctx.StardewValleyAPI.getRandomValue(cropInfo.harvestOutput.output[i].max, cropInfo.harvestOutput.output[i].min)
                for (let j = 0; j < numberOfCycles; j++){
                  if (output.length >= cropInfo.harvestOutput.max){
                    return output
                  } else if (output.length + numberOfCycles >= cropInfo.harvestOutput.max){
                    for (let k = 0; k < cropInfo.harvestOutput.max - output.length; k++){
                      output.push(cropInfo.harvestOutput.output[i].id)
                      return output
                    }
                  } else {
                    output.push(cropInfo.harvestOutput.output[i].id)
                  }
                }
              }
            }
            if (output.length <= cropInfo.harvestOutput.min){
              await add_output(cropInfo)
            } else {
              return output
            }
          }
          await add_output(cropInfo)
          await ctx.database.remove('stardew_valley_crop', {id: Crop_Growing[i].id})
          for (let j = 0; j < output.length; j++){
            await modsfunction.addItem(modsfunction.findName(output[j]), session.userId, session.platform, 1)
          }
          output.forEach(async (item) => {
            outoutput.push(modsfunction.findName(item))
          })
        }
      }
      if (outoutput.length === 0){
        return '你种植的作物还未成熟'
      } else {
        const countOutput = ctx.StardewValleyAPI.listToCount(outoutput)
        const emit: {id: string, number: number}[] = []
        countOutput.forEach(item => {
          emit.push({
            id: ctx.StardewValleyAPI.itemNameToUid(item.name),
            number: item.number
          })
        })
        ctx.emit('stardew-valley/listener-收获', emit, session)
        return '收获成功，收获物品：' + modsfunction.ListTOString(outoutput)
      }
    }
  })

  ctx.command('stardew-valley.描述 [name]')
  .action(async ({session}, name) => {
    const check = await modsfunction.checkPlayerHaveItem(session.userId, session.platform)
    if (check === '检测到你是第一次玩此游戏，系统已赠与你一个普通农场'){
      session.send(check)
    }
    if (!name){
      return '请输入物品名称'
    } else {
      const itemInfo = modsfunction.inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else {
        const desc = (itemInfo as mod.item).description
        ctx.emit('stardew-valley/listener-描述', {
          id: ctx.StardewValleyAPI.itemNameToUid(name),
          number: 1
        }, session)
        return desc
      }
    }
  })

  ctx.command('stardew-valley.查看.拥有物品')
  .action(async ({session}) => {
    const check = await modsfunction.checkPlayerHaveItem(session.userId, session.platform)
    if (check === '检测到你是第一次玩此游戏，系统已赠与你一个普通农场'){
      session.send(check)
    }
    const nowHave = (await ctx.database.get('stardew_valley',{id: await ctx.idconverter.getUserAid(session.userId, session.platform)},['item','building']))[0]
    if (nowHave.item.main.length === 0 && nowHave.building.main.length === 0){
      return '你没有任何物品'
    }
    const have_name_list = []
    const emit = []
    for (let i = 0; i < nowHave.item.main.length; i++){
      have_name_list.push(modsfunction.findName(nowHave.item.main[i].itemId) + 'x' + nowHave.item.main[i].number)
      emit.push({
        id: nowHave.item.main[i].itemId,
        number: nowHave.item.main[i].number
      })
    }
    for (let i = 0; i < nowHave.building.main.length; i++){
      have_name_list.push(modsfunction.findName(nowHave.building.main[i].itemId) + 'x' + nowHave.building.main[i].number)
      emit.push({
        id: nowHave.building.main[i].itemId,
        number: nowHave.building.main[i].number
      })
    }
    ctx.emit('stardew-valley/listener-查看-拥有物品', emit, session)
    return '你当前拥有以下物品：' + have_name_list.join('、')
  })

  ctx.command('stardew-valley.查看.可购买物品')
  .action(async ({session}) => {
    const check = await modsfunction.checkPlayerHaveItem(session.userId, session.platform)
    if (check === '检测到你是第一次玩此游戏，系统已赠与你一个普通农场'){
      session.send(check)
    }
    const canBuy_item_name_list = []
    const emit = []
    mods.main.forEach(async (mod) => {
      for (let i = 0; i < mod.main.length; i++){
        if ((mod.main[i] as mod.item).price.can === true){
          canBuy_item_name_list.push(`物品名称：${(mod.main[i] as mod.item).name}，买价：${(mod.main[i] as mod.item).price.buy}，卖价：${(mod.main[i] as mod.item).price.sell}`)
          emit.push({
            id: (mod.main[i] as mod.item).id,
            number: 1
          })
        }
      }
    })
    ctx.emit('stardew-valley/listener-查看-可购买物品', emit, session)
    return '你可以购买以下物品：&#10;' + canBuy_item_name_list.join('&#10;')
  })

  ctx.command('stardew-valley.查看.种植作物')
  .action(async ({session}) => {
    const check = await modsfunction.checkPlayerHaveItem(session.userId, session.platform)
    if (check === '检测到你是第一次玩此游戏，系统已赠与你一个普通农场'){
      session.send(check)
    }
    const Crop_Growing = await ctx.database.get('stardew_valley_crop',{owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform)})
    if (Crop_Growing.length === 0){
      return '你没有种植任何作物'
    } else {
      const now = Date.now()
      const nowHaveName = []
      const canHarvestItemName = []
      for (let i = 0; i < Crop_Growing.length; i++){
        const name = modsfunction.findName(Crop_Growing[i].crop_id)
        nowHaveName.push(name)
        if (now >= Crop_Growing[i].date.getTime()){
          canHarvestItemName.push(name)
        }
      }
      const fastest = new Date(Math.min(...Crop_Growing.map(item => item.date.getTime())))
      const emit: {id: string, number: number}[] = []
      const addToEmit = ctx.StardewValleyAPI.listToCount(nowHaveName)
      addToEmit.forEach(item => {
        emit.push({
          id: ctx.StardewValleyAPI.itemNameToUid(item.name),
          number: item.number
        })
      })
      ctx.emit('stardew-valley/listener-查看-种植作物', emit, session)
      return `你当前种植的农作物有：${modsfunction.ListTOString(nowHaveName)}&#10;可收获的农作物有：${modsfunction.ListTOString(canHarvestItemName)}&#10;最快收获时间：${fastest}`
    }
  })

}