import { Context } from 'koishi'
import { Config } from './index'
import { mod, mods } from './type'


export function modfunction(ctx: Context, mods: mods){ // 通用函数系统

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
      let item_in_mod = mod.main.find(item_in_mod => (item_in_mod as mod.item).name === item)
      if (item_in_mod){
        arr_item.push(index)
      }
    })
    return arr_item
  }

  function findId(item: string){ // 物品名称 -> modid:物品id
    let arr_item = modsfind(item)
    if (arr_item.length === 1){
      return mods.main[arr_item[0]].id + ':' + (mods.main[arr_item[0]].main as mod.item[]).find(item_in_mod => (item_in_mod as mod.item).name === item).id
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
    let itemName = (mods.main[modId].main as mod.item[]).find(item_in_mod => (item_in_mod as mod.item).id === itemId_in_mod).name
    return itemName
  }

  function inModfind(item: string){ // 物品名称 -> 物品声明
    let arr_item = modsfind(item)
    if (arr_item.length === 1){
      return mods.main[arr_item[0]].main.find(item_in_mod => (item_in_mod as mod.item).name === item)
    } else {
      ctx.logger.error('该物品被多个mod声明，请检查你的mod')
    }
  }

  async function addItem(itemname: string, userpId: string, platform: string, number: number){ // 添加物品
    let useraId = await ctx.idconverter.getUserAid(userpId, platform)
    let itemId = findId(itemname)
    if (itemId === 'Error: 没有找到该物品'){
      return itemId
    }
    let itemInfo = inModfind(itemname)
    let nowHave = (await ctx.database.get('stardew_valley',{id: useraId},['item','building']))[0]
    if (!nowHave){
      if ((itemInfo as mod.item).main.type === 'building'){
        await ctx.database.create('stardew_valley',{id: useraId,item: {main:[]} , building: {main:[{itemId: itemId, number: numberYES(number)}]}})
      } else {
        await ctx.database.create('stardew_valley',{id: useraId, item: {main:[{itemId: itemId, number: numberYES(number)}]}, building: {main:[]}})
      }
    } else {
      if ((itemInfo as mod.item).main.type === 'building'){
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
    } else if((itemInfo as mod.item).main.type === 'building'){
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



  return {
    ListTOString,
    universalIdTOmodId,
    modIdTOuniversalId,
    numberYES,
    modsfind,
    findId,
    findName,
    inModfind,
    addItem,
    removeItem,
    probabilityFunction,
    getRandomValue,
    checkPlayerHaveItem
  }
}