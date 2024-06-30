import { Context, Service, Session } from 'koishi'

import { mod, mods } from './type'


export function modfunction(ctx: Context, mods: mods){ // 通用函数系统


  function ListTOString(list: string[]) { // [a,b,c,d,e] -> "a、b、c、d、e"
    const elementCounts = {}

    for (const element of list) {
      if (element in elementCounts) {
        elementCounts[element]++
      } else {
        elementCounts[element] = 1
      }
    }

    const returnArr = []
    for (const element in elementCounts) {
      if (elementCounts[element] > 1) {
        returnArr.push(`${element}x${elementCounts[element]}`)
      } else {
        returnArr.push(element)
      }
    }

    return returnArr.join('、')
  }



  function universalIdTOmodId(universalId: string){ // "1:2" -> {modId: 1, itemId: 2}
    const modId = parseInt(universalId.split(':')[0])
    const itemId = parseInt(universalId.split(':')[1])
    return {modId: modId, itemId: itemId}
  }

  function modIdTOuniversalId(modId: number, itemId: number){ // {modId: 1, itemId: 2} -> "1:2"
    return `${modId}:${itemId}`
  }

  function numberYES(number: number | string | null | undefined): number{ // 数字推断
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

  function modsfind(itemname: string){ // 查询物品名称所有的mod声明索引
    const arr_item = []
    mods.main.forEach(async (mod, index) => {
      const item_in_mod = mod.main.find(item_in_mod => (item_in_mod as mod.item).name === itemname)
      if (item_in_mod){
        arr_item.push(index)
      }
    })
    return arr_item
  }

  function findId(itemname: string){ // 物品名称 -> modid:物品id
    const arr_item = modsfind(itemname)
    if (arr_item.length === 1){
      return mods.main[arr_item[0]].id + ':' + (mods.main[arr_item[0]].main as mod.item[]).find(item_in_mod => (item_in_mod as mod.item).name === itemname).id
    } else if (arr_item.length === 0){
      ctx.logger.error('没有找到该物品')
      return 'Error: 没有找到该物品'
    } else {
      ctx.logger.error('该物品被多个mod声明，请检查你的mod')
    }
  }

  function findName(itemId: string){ // modid:物品id -> 物品名称
    const modId = parseInt(itemId.split(':')[0])
    const itemId_in_mod = parseInt(itemId.split(':')[1])
    const itemName = (mods.main[modId].main as mod.item[]).find(item_in_mod => (item_in_mod as mod.item).id === itemId_in_mod).name
    return itemName
  }

  function inModfind(itemname: string){ // 物品名称 -> 物品声明
    const arr_item = modsfind(itemname)
    if (arr_item.length === 1){
      return mods.main[arr_item[0]].main.find(item_in_mod => (item_in_mod as mod.item).name === itemname)
    } else {
      ctx.logger.error('该物品被多个mod声明，请检查你的mod')
    }
  }

  async function addItem(itemname: string, userpId: string, platform: string, number: number){ // 添加物品
    const useraId = await ctx.idconverter.getUserAid(userpId, platform)
    const itemId = findId(itemname)
    if (itemId === 'Error: 没有找到该物品'){
      return itemId
    }
    const itemInfo = inModfind(itemname)
    const nowHave = (await ctx.database.get('stardew_valley',{id: useraId},['item','building']))[0]
    if (!nowHave){
      if ((itemInfo as mod.item).main.type === 'building'){
        await ctx.database.create('stardew_valley',{
          id: useraId,
          item: {main:[]},
          building: {main:[{itemId: itemId, number: numberYES(number)}]}
        })
      } else {
        await ctx.database.create('stardew_valley',{
          id: useraId,
          item: {main:[{itemId: itemId, number: numberYES(number)}]},
          building: {main:[]}
        })
      }
    } else {
      if ((itemInfo as mod.item).main.type === 'building'){
        const nowHaveBuilding = nowHave.building
        const indexn = []
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
        const nowHaveItem = nowHave.item
        const indexn = []
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
    const useraId = await ctx.idconverter.getUserAid(userpId, platform)
    const itemId = findId(item)
    if (itemId === 'Error: 没有找到该物品'){
      return itemId
    }
    const itemInfo = inModfind(item)
    const nowHave = (await ctx.database.get('stardew_valley',{id: useraId},['item','building']))[0]
    if (nowHave.item.main.length === 0 && nowHave.building.main.length === 0){
      return 'Error: 你没有任何物品'
    } else if((itemInfo as mod.item).main.type === 'building'){
      const nowHaveBuilding = nowHave.building
      const indexn = []
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
      const nowHaveItem = nowHave.item
      const indexn = []
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

  async function checkPlayerHaveItem(playerPid: string, platform: string): Promise<void | string> { // 检查玩家是否有物品
    const userId = await ctx.idconverter.getUserAid(playerPid, platform)
    const userItem = await ctx.database.get('stardew_valley',{id: userId})
    const add = {item: null,buidling: null}
    if (userItem.length === 0){
      await ctx.database.create('stardew_valley',{id: userId, item: {main: []}, building: {main: [{itemId:'0:0',number:1}]}})
      return '检测到你是第一次玩此游戏，系统已赠与你一个普通农场'
    }
    const userItems = userItem[0]
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






declare module 'koishi' {
  interface Context {
    StardewValleyAPI: StardewValleyAPI
  }
}






export default class StardewValleyAPI extends Service {
  mods: mods
  constructor(ctx: Context) {
    super(ctx, 'StardewValleyAPI')

    ctx.on('stardew-valley/plugin-reload-mods', (rmods) => {
      this.mods = rmods as mods
    })
  }

  async tryCatch<T>(fn: (...args) => Promise<T>, ...args): Promise<{ result: T | Error, error: boolean }> { // OvO
    try {
      return { result: await fn(...args), error: false }
    } catch (e) {
      return { result: e as Error, error: true }
    }
  }

  listToCount(list: string[]): { name: string, number: number }[] { // [a,b,c,d,e] -> [{name:a,number:1},{name:b,number:1},{name:c,number:1},{name:d,number:1},{name:e,number:1}]
    const elementCounts = {}

    for (const element of list) {
      if (element in elementCounts) {
        elementCounts[element]++
      } else {
        elementCounts[element] = 1
      }
    }

    const returnArr = []
    for (const element in elementCounts) {
      returnArr.push({ name: element, number: elementCounts[element] })
    }

    return returnArr
  }

  ListToString(list: string[]): string { // [a,b,c,d,e] -> "a、b、c、d、e"

    const elementCounts = this.listToCount(list)
    const returnArr = []
    for (let i = 0; i < elementCounts.length; i++) {
      if (elementCounts[i].number > 1) {
        returnArr.push(`${elementCounts[i].name}x${elementCounts[i].number}`)
      } else {
        returnArr.push(elementCounts[i].name)
      }
    }

    return returnArr.join('、')
  }



  uidToModIdAndItemId(universalId: string): {modId: number, itemId: number} { // "1:2" -> {modId: 1, itemId: 2}
    const modId = parseInt(universalId.split(':')[0])
    const itemId = parseInt(universalId.split(':')[1])
    return {modId: modId, itemId: itemId}
  }

  modIdAndItemIdToUid(modId: number, itemId: number): string { // {modId: 1, itemId: 2} -> "1:2"
    return `${modId}:${itemId}`
  }

  numberYES(number: number | string | null): number{ // NUMBERYES!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
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

  itemNameToModsIndex(itemname: string): number[] { // 查询物品名称所有的mod声明索引
    const arr_item = []
    this.mods.main.forEach(async (mod, index) => {
      const item_in_mod = mod.main.find(item_in_mod => (item_in_mod as mod.item).name === itemname)
      if (item_in_mod){
        arr_item.push(index)
      }
    })
    return arr_item
  }

  itemNameToUid(itemname: string): string{ // 物品名称 -> modid:物品id
    const arr_item = this.itemNameToModsIndex(itemname)
    if (arr_item.length === 1){
      return this.mods.main[arr_item[0]].id +
      ':' +
      (this.mods.main[arr_item[0]].main as mod.item[]).find(item_in_mod => (item_in_mod as mod.item).name === itemname).id
    } else if (arr_item.length === 0){
      throw new Error('没有找到该物品')
    } else {
      throw new Error('该物品被多个mod声明，请检查你的mod')
    }
  }

  UidToItemName(itemId: string): string{ // modid:物品id -> 物品名称
    const modId = parseInt(itemId.split(':')[0])
    const itemId_in_mod = parseInt(itemId.split(':')[1])
    const itemName = (this.mods.main[modId].main as mod.item[]).find(item_in_mod => (item_in_mod as mod.item).id === itemId_in_mod).name
    return itemName
  }

  itemNameToItemInfo(itemname: string): mod.item | mod.events { // 物品名称 -> 物品声明
    const arr_item = this.itemNameToModsIndex(itemname)
    if (arr_item.length === 1){
      return this.mods.main[arr_item[0]].main.find(item_in_mod => (item_in_mod as mod.item).name === itemname)
    } else {
      throw new Error('该物品被多个mod声明，请检查你的mod')
    }
  }

  async addItem(itemname: string, userpId: string, platform: string, number: number): Promise<void> { // 添加物品
    const useraId = await this.ctx.idconverter.getUserAid(userpId, platform)
    const itemId = this.itemNameToUid(itemname)
    const itemInfo = this.itemNameToItemInfo(itemname)
    const nowHave = (await this.ctx.database.get('stardew_valley',{id: useraId},['item','building']))[0]
    if (!nowHave){
      if ((itemInfo as mod.item).main.type === 'building'){
        await this.ctx.database.create('stardew_valley',{
          id: useraId,
          item: {main:[]},
          building: {main:[{itemId: itemId, number: this.numberYES(number)}]}
        })
      } else {
        await this.ctx.database.create('stardew_valley',{
          id: useraId,
          item: {main:[{itemId: itemId, number: this.numberYES(number)}]},
          building: {main:[]}
        })
      }
    } else {
      if ((itemInfo as mod.item).main.type === 'building'){
        const nowHaveBuilding = nowHave.building
        const indexn = []
        nowHaveBuilding.main.forEach((item, index) => {
          if (item.itemId === itemId){
            indexn.push(index)
          }
        })
        if (indexn.length === 0){
          nowHaveBuilding.main.push({itemId: itemId, number: this.numberYES(number)})
          await this.ctx.database.set('stardew_valley',{id: useraId},{building: nowHaveBuilding})
        } else if (indexn.length === 1){
          nowHaveBuilding.main[indexn[0]].number += this.numberYES(number)
          await this.ctx.database.set('stardew_valley',{id: useraId},{building: nowHaveBuilding})
        } else {
          this.ctx.logger.error('拥有物品id重复')
        }
      } else {
        const nowHaveItem = nowHave.item
        const indexn = []
        nowHaveItem.main.forEach((item, index) => {
          if (item.itemId === itemId){
            indexn.push(index)
          }
        })
        if (indexn.length === 0){
          nowHaveItem.main.push({itemId: itemId, number: this.numberYES(number)})
          await this.ctx.database.set('stardew_valley',{id: useraId},{item: nowHaveItem})
        } else if (indexn.length === 1){
          nowHaveItem.main[indexn[0]].number += this.numberYES(number)
          await this.ctx.database.set('stardew_valley',{id: useraId},{item: nowHaveItem})
        } else {
          this.ctx.logger.error('拥有物品id重复')
        }
      }
    }
  }

  async removeItem(itemname: string, userpId: string, platform: string, number: number): Promise<void> { // 移除物品
    const useraId = await this.ctx.idconverter.getUserAid(userpId, platform)
    const itemId = this.itemNameToUid(itemname)
    const itemInfo = this.itemNameToItemInfo(itemname)
    const nowHave = (await this.ctx.database.get('stardew_valley',{id: useraId},['item','building']))[0]
    if (nowHave.item.main.length === 0 && nowHave.building.main.length === 0){
      throw new Error ('你没有任何物品')
    } else if((itemInfo as mod.item).main.type === 'building'){
      const nowHaveBuilding = nowHave.building
      const indexn = []
      nowHaveBuilding.main.forEach((item, index) => {
        if (item.itemId === itemId){
          indexn.push(index)
        }
      })
      if (indexn.length === 0){
        throw new Error ('你没有该建筑')
      } else if (indexn.length === 1){
        if (nowHaveBuilding.main[indexn[0]].number < this.numberYES(number)){
          throw new Error ('你没有足够的该建筑')
        } else {
          nowHaveBuilding.main[indexn[0]].number -= this.numberYES(number)
          if (nowHaveBuilding.main[indexn[0]].number === 0){
            nowHaveBuilding.main.splice(indexn[0],1)
          }
          await this.ctx.database.set('stardew_valley',{id: useraId},{building: nowHaveBuilding})
        }
      } else {
        this.ctx.logger.error('拥有物品id重复')
      }
    } else {
      const nowHaveItem = nowHave.item
      const indexn = []
      nowHaveItem.main.forEach((item, index) => {
        if (item.itemId === itemId){
          indexn.push(index)
        }
      })
      if (indexn.length === 0){
        throw new Error ('你没有该物品')
      } else if (indexn.length === 1){
        if (nowHaveItem.main[indexn[0]].number < this.numberYES(number)){
          throw new Error ('你没有足够的该物品')
        } else {
          nowHaveItem.main[indexn[0]].number -= this.numberYES(number)
          if (nowHaveItem.main[indexn[0]].number === 0){
            nowHaveItem.main.splice(indexn[0],1)
          }
          await this.ctx.database.set('stardew_valley',{id: useraId},{item: nowHaveItem})
        }
      } else {
        this.ctx.logger.error('拥有物品id重复')
      }
    }
  }

  probabilityFunction(probability: number): boolean{ // 瞬时概率系统
    if (probability === 1) {
      return true
    } else {
      return Math.random() < probability
    }
  }

  getRandomValue(max: number, min: number): number{ // 随机数生成器
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  async checkPlayerHaveItem(playerPid: string, platform: string, session: Session): Promise<void> { // 检查玩家是否有物品，所有对数据库进行操作前都需要执行此函数
    const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
    const userItem = await this.ctx.database.get('stardew_valley',{id: userId})
    const add = {item: null,buidling: null}
    if (userItem.length === 0){
      await this.ctx.database.create('stardew_valley',{id: userId, item: {main: []}, building: {main: [{itemId:'0:0',number:1}]}})
      session.send('检测到你是第一次玩此游戏，系统已赠与你一个普通农场')
      return
    }
    const userItems = userItem[0]
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
    await this.ctx.database.set('stardew_valley',{id: userId},{item: add.item, building:add.buidling})
  }

  async checkPlayerDatabase(playerPid: string, platform: string): Promise<void> { // 检查玩家数据库，所有涉及到stardew_valley_player数据库的操作前都需要执行此函数
    const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
    const userInfo = await this.ctx.database.get('stardew_valley_player',{id: userId})
    if (userInfo.length === 0){
      await this.ctx.database.create('stardew_valley_player',{
        id: userId,
        endurance: {
          nowEndurance: 100,
          maxEndurance: 100,
          enduranceSecondGrowth: 0.1,
          lastEnduranceDate: new Date()
        },
        hunger: {
          nowHunger: 100,
          hungerySecondRemove: 0.005,
          lastHungerDate: new Date()
        },
        tool: {
          arms: null,
          pickaxe: null,
          axe: null,
          hoe: null
        },
        armor: {
          head: null,
          body: null,
          legs: null,
          feet: null
        }
      })
      return
    } else if (userInfo.length > 1){
      throw new Error('同id玩家数大于1')
    }
  }

  async checkPlayerEndurance(playerPid: string, platform: string): Promise<void> { // 检查玩家体力，所有涉及到体力的操作前都需要执行此函数
    await this.checkPlayerDatabase(playerPid, platform)
    const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
    const userInfo = await this.ctx.database.get('stardew_valley_player',{id: userId},['endurance'])
    if (userInfo[0].endurance.nowEndurance >= userInfo[0].endurance.maxEndurance){
      return
    }
    const now = new Date().getTime()
    const lastEnduranceDate = new Date(userInfo[0].endurance.lastEnduranceDate).getTime()
    if (lastEnduranceDate >= now){
      return
    }
    const addEndurance = userInfo[0].endurance.enduranceSecondGrowth * ((now - lastEnduranceDate) / 1000)
    const addedEndurance = userInfo[0].endurance.nowEndurance + addEndurance
    if (addedEndurance > userInfo[0].endurance.maxEndurance){
      await this.ctx.database.set('stardew_valley_player', {id: userId}, {
        endurance: {
          nowEndurance: userInfo[0].endurance.maxEndurance,
          maxEndurance: userInfo[0].endurance.maxEndurance,
          enduranceSecondGrowth: userInfo[0].endurance.enduranceSecondGrowth,
          lastEnduranceDate: new Date()
        }
      })
      return
    }
    await this.ctx.database.set('stardew_valley_player', {id: userId}, {
      endurance: {
        nowEndurance: addedEndurance,
        maxEndurance: userInfo[0].endurance.maxEndurance,
        enduranceSecondGrowth: userInfo[0].endurance.enduranceSecondGrowth,
        lastEnduranceDate: new Date()
      }
    })
  }

  async addPlayerEndurance(playerPid: string, platform: string, number: number): Promise<void> { // 增加玩家体力
    await this.checkPlayerEndurance(playerPid, platform)
    const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
    const userInfo = await this.ctx.database.get('stardew_valley_player',{id: userId},['endurance'])
    const addedEndurance = userInfo[0].endurance.nowEndurance + number
    if (addedEndurance > userInfo[0].endurance.maxEndurance){
      await this.ctx.database.set('stardew_valley_player', {id: userId}, {
        endurance: {
          nowEndurance: userInfo[0].endurance.maxEndurance,
          maxEndurance: userInfo[0].endurance.maxEndurance,
          enduranceSecondGrowth: userInfo[0].endurance.enduranceSecondGrowth,
          lastEnduranceDate: new Date()
        }
      })
      return
    }
    await this.ctx.database.set('stardew_valley_player', {id: userId}, {
      endurance: {
        nowEndurance: addedEndurance,
        maxEndurance: userInfo[0].endurance.maxEndurance,
        enduranceSecondGrowth: userInfo[0].endurance.enduranceSecondGrowth,
        lastEnduranceDate: new Date()
      }
    })
  }

  async removePlayerEndurance(playerPid: string, platform: string, number: number): Promise<void> { // 减少玩家体力
    await this.checkPlayerEndurance(playerPid, platform)
    const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
    const userInfo = await this.ctx.database.get('stardew_valley_player',{id: userId},['endurance'])
    const removedEndurance = userInfo[0].endurance.nowEndurance - number
    if (removedEndurance <= 0){
      throw new Error('体力不足')
    }
    await this.ctx.database.set('stardew_valley_player', {id: userId}, {
      endurance: {
        nowEndurance: removedEndurance,
        maxEndurance: userInfo[0].endurance.maxEndurance,
        enduranceSecondGrowth: userInfo[0].endurance.enduranceSecondGrowth,
        lastEnduranceDate: new Date()
      }
    })
  }

  async checkPlayerHunger(playerPid: string, platform: string): Promise<void> { // 检查玩家饥饿度，所有涉及到饥饿度的操作前都需要执行此函数
    await this.checkPlayerDatabase(playerPid, platform)
    const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
    const userInfo = await this.ctx.database.get('stardew_valley_player',{id: userId},['hunger'])
    if (userInfo[0].hunger.nowHunger >= 100) {
      return
    }
    const now = new Date().getTime()
    const lastHungerDate = new Date(userInfo[0].hunger.lastHungerDate).getTime()
    const removeHunger = userInfo[0].hunger.hungerySecondRemove * ((now - lastHungerDate) / 1000)
    const removedHunger = userInfo[0].hunger.nowHunger - removeHunger
    if (removedHunger <= 0) {
      await this.ctx.database.set('stardew_valley_player', {id: userId}, {
        hunger: {
          nowHunger: 0,
          hungerySecondRemove: userInfo[0].hunger.hungerySecondRemove,
          lastHungerDate: new Date()
        }
      })
      throw new Error('你的饥饿度已耗尽')
    }
    await this.ctx.database.set('stardew_valley_player', {id: userId}, {
      hunger: {
        nowHunger: removedHunger,
        hungerySecondRemove: userInfo[0].hunger.hungerySecondRemove,
        lastHungerDate: new Date()
      }
    })
  }

  async addPlayerHunger(playerPid: string, platform: string, number: number): Promise<void> { // 增加玩家饥饿度
    const add = async (playerPid: string, platform: string, number: number): Promise<void> => {
      const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
      const userInfo = await this.ctx.database.get('stardew_valley_player',{id: userId},['hunger'])
      const addedHunger = userInfo[0].hunger.nowHunger + number
      if (addedHunger >= 100) {
        await this.ctx.database.set('stardew_valley_player', {id: userId}, {
          hunger: {
            nowHunger: 100,
            hungerySecondRemove: userInfo[0].hunger.hungerySecondRemove,
            lastHungerDate: new Date()
          }
        })
        return
      }
      await this.ctx.database.set('stardew_valley_player', {id: userId}, {
        hunger: {
          nowHunger: addedHunger,
          hungerySecondRemove: userInfo[0].hunger.hungerySecondRemove,
          lastHungerDate: new Date()
        }
      })
    }
    try {
      await this.checkPlayerHunger(playerPid, platform)
      await add(playerPid, platform, number)
    } catch (e) {
      if (e.message === '你的饥饿度已耗尽') {
        await add(playerPid, platform, number)
      } else {
        throw new Error(e)
      }
    }
  }

  async removePlayerHunger(playerPid: string, platform: string, number: number): Promise<void> { // 减少玩家饥饿度
    await this.checkPlayerHunger(playerPid, platform)
    const userId = await this.ctx.idconverter.getUserAid(playerPid, platform)
    const userInfo = await this.ctx.database.get('stardew_valley_player',{id: userId},['hunger'])
    const removedHunger = userInfo[0].hunger.nowHunger - number
    if (removedHunger <= 0) {
      throw new Error('你的饥饿度已耗尽')
    }
    await this.ctx.database.set('stardew_valley_player', {id: userId}, {
      hunger: {
        nowHunger: removedHunger,
        hungerySecondRemove: userInfo[0].hunger.hungerySecondRemove,
        lastHungerDate: new Date()
      }
    })
  }

}