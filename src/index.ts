import { Context, Schema } from 'koishi'
import {loadModsFolders, mods, crop, building} from './modsloader'
import {} from 'koishi-plugin-binding-id-converter'
import * as fs from 'fs'
import * as path from 'path'
import {} from 'koishi-plugin-cron'
import {} from 'koishi-plugin-monetary'


export const name = 'stardew-valley'

export const inject = {
  required: [
    'cron',
    'database',
    'idconverter',
    'monetary'
  ],
}

export interface Config {}

export const Config: Schema<Config> = Schema.intersect([]) as Schema<Config>

declare module 'koishi' {
  interface Tables {
    stardew_valley: Tables.stardew_valley
    stardew_valley_crop: Tables.stardew_valley_crop
  }
  namespace Tables {
    interface stardew_valley {
      id: number
      item: {
        main: stardew_valley_item[]
      }
      building: {
        main: stardew_valley_item[]
      }
    }
    interface stardew_valley_crop {
      id: number
      owner_id: number
      crop_id: string
      date: Date
      location: number
    }
  }
}

interface stardew_valley_item {
  itemId?: string
  number?: number
}





export function apply(ctx: Context, cfg: Config) {

  ctx.model.extend('stardew_valley', { // 物品表
    id: 'unsigned',
    item: 'json',
    building: 'json'
  },{
    primary: ['id'],
    autoInc: false
  })
  ctx.model.extend('stardew_valley_crop',{ // 作物表
    id: 'unsigned',
    owner_id: 'unsigned',
    crop_id: 'string',
    date: 'timestamp',
    location: 'unsigned'
  },{
    primary: ['id'],
    autoInc: true
  })

  const modpath = path.resolve(__dirname,'../../../data') // mod加载系统
  if (!fs.existsSync(`${modpath}/mods`)){
    fs.mkdirSync(`${modpath}/mods`)
  }
  if (!fs.existsSync(`${modpath}/mods/stardew-valley`)){
    fs.mkdirSync(`${modpath}/mods/stardew-valley`)
  }
  const loadmods = loadModsFolders(`${modpath}/mods/stardew-valley`)
  if (loadmods.type === 'error'){
    ctx.logger.error('加载 mods 失败：' + loadmods.message)
  } else if (loadmods.type === 'success') {
    var mods = loadmods.message as mods
  }

  function ListTOString(List: string[]){ // [a,b,c,d,e] -> "a、b、c、d、e"
    let returnARR = []
    let currentCount = 1
    for (let i = 0; i < List.length; i++){
      if (List[i] === List[i+1]){
        currentCount++
      } else {
        if (currentCount > 1){
          returnARR.push(List[i] + 'x' + currentCount)
        } else {
          returnARR.push(List[i])
        }
        currentCount = 1
      }
    }
    return returnARR.join('、')
  }
  
  function universalIdTOmodId(universalId: string){ // "1:2" -> {modId: 1, itemId: 2}
    let modId = parseInt(universalId.split(':')[0])
    let itemId = parseInt(universalId.split(':')[1])
    return {modId: modId, itemId: itemId}
  }
  
  function modIdTOuniversalId(modId: number, itemId: number){ // {modId: 1, itemId: 2} -> "1:2"
    return `${modId}:${itemId}`
  }
  
  function numberYES(number: number | string | null): number{ // 数字推断
    if (number){
      if (typeof number === 'number'){
        return number
      } else if (typeof number ==='string'){
        return parseInt(number)
      }
    } else {
      return 1
    }
  }

  function modsfind(item: string){ // 查询物品名称所有的mod声明索引
    let arr_item = []
    mods.main.forEach(async (mod, index) => {
      let item_in_mod = mod.main.find(item_in_mod => item_in_mod.name === item)
      if (item_in_mod){
        arr_item.push(index)
      }
    })
    return arr_item
  }

  function findId(item: string){ // 物品名称 -> modid:物品id
    let arr_item = modsfind(item)
    if (arr_item.length === 1){
      return mods.main[arr_item[0]].id + ':' + mods.main[arr_item[0]].main.find(item_in_mod => item_in_mod.name === item).id
    } else if (arr_item.length === 0){
      ctx.logger.error('没有找到该物品')
      return 'Error: 没有找到该物品'
    } else {
      ctx.logger.error('该物品被多个mod声明，请检查你的mod')
    }
  }

  function findName(itemId: string){ // modid:物品id -> 物品名称
    let modId = parseInt(itemId.split(':')[0])
    let itemId_in_mod = parseInt(itemId.split(':')[1])
    let itemName = mods.main[modId].main.find(item_in_mod => item_in_mod.id === itemId_in_mod).name
    return itemName
  }

  function inModfind(item: string){ // 物品名称 -> 物品声明
    let arr_item = modsfind(item)
    if (arr_item.length === 1){
      return mods.main[arr_item[0]].main.find(item_in_mod => item_in_mod.name === item)
    } else {
      ctx.logger.error('该物品被多个mod声明，请检查你的mod')
    }
  }

  async function addItem(item: string, userpId: string, platform: string, number: number){ // 添加物品
    let useraId = await ctx.idconverter.getUserAid(userpId, platform)
    let itemId = findId(item)
    if (itemId === 'Error: 没有找到该物品'){
      return itemId
    }
    let itemInfo = inModfind(item)
    let nowHave = (await ctx.database.get('stardew_valley',{id: useraId},['item','building']))[0]
    if (!nowHave){
      if (itemInfo.main.type === 'building'){
        await ctx.database.create('stardew_valley',{id: useraId,item: {main:[]} , building: {main:[{itemId: itemId, number: numberYES(number)}]}})
      } else {
        await ctx.database.create('stardew_valley',{id: useraId, item: {main:[{itemId: itemId, number: numberYES(number)}]}, building: {main:[]}})
      }
    } else {
      if (itemInfo.main.type === 'building'){
        let nowHaveBuilding = nowHave.building
        let indexn = []
        nowHaveBuilding.main.forEach((item, index) => {
          if (item.itemId === itemId){
            indexn.push(index)
          }
        })
        if (indexn.length === 0){
          nowHaveBuilding.main.push({itemId: itemId, number: numberYES(number)})
          await ctx.database.set('stardew_valley',{id: useraId},{building: nowHaveBuilding})
        } else if (indexn.length === 1){
          nowHaveBuilding.main[indexn[0]].number += numberYES(number)
          await ctx.database.set('stardew_valley',{id: useraId},{building: nowHaveBuilding})
        } else {
          ctx.logger.error('拥有物品id重复')
        }
      } else {
        let nowHaveItem = nowHave.item
        let indexn = []
        nowHaveItem.main.forEach((item, index) => {
          if (item.itemId === itemId){
            indexn.push(index)
          }
        })
        if (indexn.length === 0){
          nowHaveItem.main.push({itemId: itemId, number: numberYES(number)})
          await ctx.database.set('stardew_valley',{id: useraId},{item: nowHaveItem})
        } else if (indexn.length === 1){
          nowHaveItem.main[indexn[0]].number += numberYES(number)
          await ctx.database.set('stardew_valley',{id: useraId},{item: nowHaveItem})
        } else {
          ctx.logger.error('拥有物品id重复')
        }
      }
    }
  }

  async function removeItem(item: string, userpId: string, platform: string, number: number){ // 移除物品
    let useraId = await ctx.idconverter.getUserAid(userpId, platform)
    let itemId = findId(item)
    if (itemId === 'Error: 没有找到该物品'){
      return itemId
    }
    let itemInfo = inModfind(item)
    let nowHave = (await ctx.database.get('stardew_valley',{id: useraId},['item','building']))[0]
    if (nowHave.item.main.length === 0 && nowHave.building.main.length === 0){
      return 'Error: 你没有任何物品'
    } else if(itemInfo.main.type === 'building'){
      let nowHaveBuilding = nowHave.building
      let indexn = []
      nowHaveBuilding.main.forEach((item, index) => {
        if (item.itemId === itemId){
          indexn.push(index)
        }
      })
      if (indexn.length === 0){
        return 'Error: 你没有该建筑'
      } else if (indexn.length === 1){
        if (nowHaveBuilding.main[indexn[0]].number < numberYES(number)){
          return 'Error: 你没有足够的该建筑'
        } else {
          nowHaveBuilding.main[indexn[0]].number -= numberYES(number)
          if (nowHaveBuilding.main[indexn[0]].number === 0){
            nowHaveBuilding.main.splice(indexn[0],1)
          }
          await ctx.database.set('stardew_valley',{id: useraId},{building: nowHaveBuilding})
        }
      } else {
        ctx.logger.error('拥有物品id重复')
      }
    } else {
      let nowHaveItem = nowHave.item
      let indexn = []
      nowHaveItem.main.forEach((item, index) => {
        if (item.itemId === itemId){
          indexn.push(index)
        }
      })
      if (indexn.length === 0){
        return 'Error: 你没有该物品'
      } else if (indexn.length === 1){
        if (nowHaveItem.main[indexn[0]].number < numberYES(number)){
          return 'Error: 你没有足够的该物品'
        } else {
          nowHaveItem.main[indexn[0]].number -= numberYES(number)
          if (nowHaveItem.main[indexn[0]].number === 0){
            nowHaveItem.main.splice(indexn[0],1)
          }
          await ctx.database.set('stardew_valley',{id: useraId},{item: nowHaveItem})
        }
      } else {
        ctx.logger.error('拥有物品id重复')
      }
    }
  }

  function probabilityFunction(probability: number): boolean{ // 瞬时概率系统
    if (probability === 1) {
      return true
    } else {
      return Math.random() < probability
    }
  }

  function getRandomValue(max: number, min: number): number{ // 随机数生成器
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  async function checkPlayerHaveItem(playerPid: string, platform: string): Promise<void> { // 检查玩家是否有物品
    let userId = await ctx.idconverter.getUserAid(playerPid, platform)
    let userItem = await ctx.database.get('stardew_valley',{id: userId})
    let add = {item: null,buidling: null}
    if (userItem.length === 0){
      await ctx.database.create('stardew_valley',{id: userId, item: {main: []}, building: {main: []}})
      return
    }
    let userItems = userItem[0]
    if (!userItems.item){
      add.item = {main: []}
    } else {
      add.item = userItems.item
    }
    if (!userItems.building){
      add.buidling = {main: []}
    } else {
      add.buidling = userItems.building
    }
    await ctx.database.set('stardew_valley',{id: userId},{item: add.item, building:add.buidling})
  }

  ctx.command('stardew-valley.购买 [name] [number]')
  .action(async ({session}, name, number) => {
    await checkPlayerHaveItem(session.userId, session.platform)
    if (!name){
      return '请输入物品名称'
    } else {
      let itemInfo = inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else if (itemInfo.price.can === false){
        return '该物品无法购买'
      } else {
        try {
          await ctx.monetary.cost(await ctx.idconverter.getUserAid(session.userId, session.platform), itemInfo.price.buy * numberYES(number))
          await addItem(name, session.userId, session.platform, numberYES(number))
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
    await checkPlayerHaveItem(session.userId, session.platform)
    if (!name){
      return '请输入物品名称'
    } else {
      let itemInfo = inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else {
        let remove = await removeItem(name, session.userId, session.platform, numberYES(number))
        if (remove === ('Error: 你没有足够的该物品' || 'Error: 你没有该物品' || 'Error: 你没有足够的该建筑' || 'Error: 你没有该建筑' || 'Error: 你没有任何物品' || 'Error: 没有找到该物品')){
          return remove
        } else {
          try {
            await ctx.monetary.gain(await ctx.idconverter.getUserAid(session.userId, session.platform), itemInfo.price.sell * numberYES(number))
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
    await checkPlayerHaveItem(session.userId, session.platform)
    if (!name){
      return '请输入物品名称'
    } else {
      let itemInfo = inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else {
        let item_Info = itemInfo.main.main as crop
        let nowHave = (await ctx.database.get('stardew_valley',{id: await ctx.idconverter.getUserAid(session.userId, session.platform)}))[0]
        let max = 0
        for (let i = 0; i < nowHave.building.main.length; i++){
          let mod = inModfind(findName(nowHave.building.main[i].itemId)).main.main as building
          max += mod.max
        }
        let Crop_Growing = await ctx.database.get('stardew_valley_crop',{owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform)})
        let put = numberYES(number) + Crop_Growing.length
        if (put > max){
          return '你没有足够的空间'
        } else {
          let remove = await removeItem(name, session.userId, session.platform, numberYES(number))
          if (remove === ('Error: 你没有足够的该物品' || 'Error: 你没有该物品' || 'Error: 你没有足够的该建筑' || 'Error: 你没有该建筑' || 'Error: 你没有任何物品' || 'Error: 没有找到该物品')){
            return remove
          }
          let growthTime = Date.now() + item_Info.growthTime
          for (let i = 0; i < numberYES(number); i++){
            let all_id = (await ctx.database.get('stardew_valley_crop',{location: 1},['id'])).map(item => item.id)
            let id
            if (all_id.length === 0){
              id = 0
            } else {
              id = Math.max(...all_id) + 1
            }
            await ctx.database.create('stardew_valley_crop',{id: id, owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform), crop_id: findId(name), date: new Date(growthTime), location: 1})
          }
          return '种植成功，种植时间至' + new Date(growthTime)
        }
      }
    }
  })

  ctx.command('stardew-valley.收获')
  .action(async ({session}) => {
    await checkPlayerHaveItem(session.userId, session.platform)
    let Crop_Growing = await ctx.database.get('stardew_valley_crop',{owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform)})
    if (Crop_Growing.length === 0){
      return '你没有种植任何作物'
    } else {
      let now = Date.now()
      let outoutput = []
      for (let i = 0; i < Crop_Growing.length; i++){
        let output = []
        let cropInfo = inModfind(findName(Crop_Growing[i].crop_id)).main.main as crop
        if (now >= Crop_Growing[i].date.getTime()){
          const add_output = async (cropInfo: crop) => {
            for (let i = 0; i < cropInfo.harvestOutput.output.length; i++){
              if (probabilityFunction(cropInfo.harvestOutput.output[i].probability) === true){
                let numberOfCycles = getRandomValue(cropInfo.harvestOutput.output[i].max, cropInfo.harvestOutput.output[i].min)
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
            await addItem(findName(output[j]), session.userId, session.platform, 1)
          }
          output.forEach(async (item) => {
            outoutput.push(findName(item))
          })
        }
      }
      if (outoutput.length === 0){
        return '你没有种植任何作物'
      } else {
        return '收获成功，收获物品：' + ListTOString(outoutput)
      }
    }
  })

  ctx.command('stardew-valley.描述 [name]')
  .action(async ({session}, name) => {
    await checkPlayerHaveItem(session.userId, session.platform)
    if (!name){
      return '请输入物品名称'
    } else {
      let itemInfo = inModfind(name)
      if (!itemInfo){
        return '没有找到该物品'
      } else {
        let desc = itemInfo.description
        return desc
      }
    }
  })

  ctx.command('stardew-valley.查看.拥有物品')
  .action(async ({session}) => {
    await checkPlayerHaveItem(session.userId, session.platform)
    let nowHave = (await ctx.database.get('stardew_valley',{id: await ctx.idconverter.getUserAid(session.userId, session.platform)},['item','building']))[0]
    if (nowHave.item.main.length === 0 && nowHave.building.main.length === 0){
      return '你没有任何物品'
    }
    let have_name_list = []
    for (let i = 0; i < nowHave.item.main.length; i++){
      have_name_list.push(findName(nowHave.item.main[i].itemId) + 'x' + nowHave.item.main[i].number)
    }
    for (let i = 0; i < nowHave.building.main.length; i++){
      have_name_list.push(findName(nowHave.building.main[i].itemId) + 'x' + nowHave.building.main[i].number)
    }
    return '你当前拥有以下物品：' + have_name_list.join('、')
  })

  ctx.command('stardew-valley.查看.可购买物品')
  .action(async ({session}) => {
    await checkPlayerHaveItem(session.userId, session.platform)
    let canBuy_item_name_list = []
    mods.main.forEach(async (mod) => {
      for (let i = 0; i < mod.main.length; i++){
        if (mod.main[i].price.can === true){
          canBuy_item_name_list.push(`物品名称：${mod.main[i].name}，买价：${mod.main[i].price.buy}，卖价：${mod.main[i].price.sell}`)
        }
      }
    })
    return '你可以购买以下物品：&#10;' + canBuy_item_name_list.join('&#10;')
  })

  ctx.command('stardew-valley.查看.种植作物')
  .action(async ({session}) => {
    await checkPlayerHaveItem(session.userId, session.platform)
    let Crop_Growing = await ctx.database.get('stardew_valley_crop',{owner_id: await ctx.idconverter.getUserAid(session.userId, session.platform)})
    if (Crop_Growing.length === 0){
      return '你没有种植任何作物'
    } else {
      let now = Date.now()
      let nowHaveName = []
      let canHarvestItemName = []
      for (let i = 0; i < Crop_Growing.length; i++){
        let name = findName(Crop_Growing[i].crop_id)
        nowHaveName.push(name)
        if (now >= Crop_Growing[i].date.getTime()){
          canHarvestItemName.push(name)
        }
      }
      let fastest = new Date(Math.min(...Crop_Growing.map(item => item.date.getTime())))
      return `你当前种植的农作物有：${ListTOString(nowHaveName)}&#10;可收获的农作物有：${ListTOString(canHarvestItemName)}&#10;最快收获时间：${fastest}`
    }
  })
}
