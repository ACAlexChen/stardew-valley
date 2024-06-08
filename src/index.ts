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

export const Config: Schema<Config> = Schema.object({})

declare module 'koishi' {
  interface Tables {
    stardew_valley: Tables.stardew_valley
    stardew_valley_crop: Tables.stardew_valley_crop
  }
  namespace Tables {
    interface stardew_valley {
      id: number
      item: string[]
      building: string[]
    }
    interface stardew_valley_crop {
      id: number
      owner_id: number
      crop_id: string
      date: Date
    }
  }
}

function ListTOString(List: string[]){
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





export function apply(ctx: Context, cfg: Config) {

  ctx.model.extend('stardew_valley', {
    id: 'unsigned',
    item: 'list',
    building: 'list'
  },{
    primary: ['id'],
    autoInc: false
  })
  ctx.model.extend('stardew_valley_crop',{
    id: 'unsigned',
    owner_id: 'unsigned',
    crop_id: 'string',
    date: 'timestamp'
  },{
    primary: ['id'],
    autoInc: true
  })

  const modpath = path.resolve(__dirname,'../../../data')
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

  ctx.command('stardew-valley.购买 [inputitem] [number]')
  .action(async ({session}, inputitem, number) => {
    let buy_number
    if (number){
      buy_number = parseInt(number)
    } else {
      buy_number = 1
    }
    if (!inputitem){
      return '请输入要购买的物品名称'
    } else {
      let arr_item = []
      mods.main.forEach(async (mod, index) => {
        let item = mod.main.find(item => item.name === inputitem)
        if (item){
          arr_item.push(index)
        }
      })
      if (arr_item.length === 0){
        return '没有找到该物品'
      } else if (arr_item.length === 1){
        let item = mods.main[arr_item[0]].main.find(item => item.name === inputitem)
        if (item.price.can === false){
          return '该物品无法购买'
        } else {
          let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
          try {
            await ctx.monetary.cost(userId, item.price.buy * buy_number)
            let database_userId = await ctx.database.get('stardew_valley',{id: userId},['id'])
            if (database_userId.length === 0){
              if (item.main.type === 'building'){
                let add = []
                for (let i = 0; i < buy_number; i++){
                  add.push(`${mods.main[arr_item[0]].id}:${item.id}`)
                }
                await ctx.database.create('stardew_valley',{id: userId, building: add})
              } else {
                let add = []
                for (let i = 0; i < buy_number; i++){
                  add.push(`${mods.main[arr_item[0]].id}:${item.id}`)
                }
                await ctx.database.create('stardew_valley',{id: userId, item: add})
              }
              return '购买成功'
            } else {
              if (item.main.type === 'building'){
                let data_in_database = (await ctx.database.get('stardew_valley',{id: userId},['building']))[0].building
                for (let i = 0; i < buy_number; i++){
                  data_in_database.push(`${mods.main[arr_item[0]].id}:${item.id}`)
                }
                await ctx.database.set('stardew_valley',{id: userId},{building: data_in_database})
                return '购买成功'
              } else {
                let data_in_database = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
                for (let i = 0; i < buy_number; i++){
                  data_in_database.push(`${mods.main[arr_item[0]].id}:${item.id}`)
                }
                await ctx.database.set('stardew_valley',{id: userId},{item: data_in_database})
                return '购买成功'
              }
            }
          } catch (err) {
            return '余额不足'
          }
        }
      } else {
        return '该物品被多个mod声明，请检查你的mod'
      }
    }
  })

  ctx.command('stardew-valley.卖出 [inputitem] [number]')
  .action(async ({session}, inputitem, number) => {
    let sell_number
    if (number){
      sell_number = parseInt(number)
    } else {
      sell_number = 1
    }
    let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
    if (!inputitem){
      let have = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
      let building_have = (await ctx.database.get('stardew_valley',{id: userId},['building']))[0].building
      if (have.length === 0 && building_have.length === 0){
        return '你没有任何物品可以卖出'
      } else {
        let can_sell = []
        for (let i = 0; i < have.length; i++){
          let mod_id = parseInt(have[i].split(':')[0])
          let item_id = parseInt(have[i].split(':')[1])
          let itemname = (mods.main[mod_id].main.find(item => item.id === item_id)).name
          can_sell.push(itemname)
        }
        for (let i = 0; i < building_have.length; i++){
          let mod_id = parseInt(building_have[i].split(':')[0])
          let item_id = parseInt(building_have[i].split(':')[1])
          let itemname = (mods.main[mod_id].main.find(item => item.id === item_id)).name
          can_sell.push(itemname)
        }
        return '请输入需卖出的物品，你当前有以下物品可卖出：&#10;' + can_sell.join('&#10;')
      }
    } else {
      let have = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
      let arr_item = []
      mods.main.forEach(async (mod, index) => {
        let item = mod.main.find(item => item.name === inputitem)
        if (item){
          arr_item.push(index)
        }
      })
      let building_have = (await ctx.database.get('stardew_valley',{id: userId},['building']))[0].building
      let arr_building = []
      mods.main.forEach(async (mod, index) => {
        let item = mod.main.find(item => item.name === inputitem)
        if (item){
          arr_building.push(index)
        }
      })
      if (arr_item.length === 0 && arr_building.length === 0){
        return '没有找到该物品'
      } else if (arr_item.length === 1 || arr_building.length === 1){
        if (arr_item.length === 1){
          let sell_item = `${mods.main[arr_item[0]].id}:${(mods.main[arr_item[0]].main.find(item => item.name === inputitem)).id}`
          if (have.includes(sell_item)){
            let have_number = 0
            for (let i = 0; i < have.length; i++){
              if (have[i] === sell_item){
                have_number++
              }
            }
            if (have_number < sell_number){
              return '你没有足够的该物品'
            } else {
              let item = mods.main[arr_item[0]].main.find(item => item.name === inputitem)
              try {
                await ctx.monetary.gain(userId, item.price.sell * sell_number)
                let data_in_database = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
                for (let i = 0; i < sell_number; i++){
                  data_in_database.splice(data_in_database.indexOf(sell_item),1)
                }
                await ctx.database.set('stardew_valley',{id: userId},{item: data_in_database})
                return '卖出成功'
              } catch (err) {
                ctx.logger.error(err)
                return '卖出失败'
              }
            }
          } else if (building_have.includes(sell_item)){
            let have_number = 0
            for (let i = 0; i < building_have.length; i++){
              if (building_have[i] === sell_item){
                have_number++
              }
            }
            if (have_number < sell_number){
              return '你没有足够的该物品'
            } else {
              let item = mods.main[arr_item[0]].main.find(item => item.name === inputitem)
              try {
                await ctx.monetary.gain(userId, item.price.sell * sell_number)
                let data_in_database = (await ctx.database.get('stardew_valley',{id: userId},['building']))[0].building
                for (let i = 0; i < sell_number; i++){
                  data_in_database.splice(data_in_database.indexOf(sell_item),1)
                }
                await ctx.database.set('stardew_valley',{id: userId},{building: data_in_database})
                return '卖出成功'
              } catch (err) {
                ctx.logger.error(err)
                return '卖出失败'
              }
            }
          }
        } else {
          return '你没有该物品'
        }
      } else {
        return '该物品被多个mod声明，请检查你的mod'
      }
    }
  })

  ctx.command('stardew-valley.种植 [inputitem] [number]')
  .action(async ({session}, inputitem, number) => {
    let plant_number
    if (number){
      plant_number = parseInt(number)
    } else {
      plant_number = 1
    }
    if (!inputitem){
      let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
      let arr_item = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
      if (arr_item.length === 0){
        return '你没有任何物品可以种植'
      } else {
        let can_plant = []
        for (let i = 0; i < arr_item.length; i++){
          let mod_id = parseInt(arr_item[i].split(':')[0])
          let item_id = parseInt(arr_item[i].split(':')[1])
          let item = mods.main[mod_id].main.find(item => item.id === item_id)
          if (item.main.type === 'crop'){
            can_plant.push(item.name)
          }
        }
        if (can_plant.length === 0){
          return '你没有任何物品可以种植'
        } else {
          return '你有以下物品可以种植：&#10;' + can_plant.join('&#10;')
        }
      }
    } else {
      let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
      let arr_item = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
      if (arr_item.length === 0){
        return '你没有任何物品可以种植'
      } else {
        let can_plant = []
        for (let i = 0; i < arr_item.length; i++){
          let mod_id = parseInt(arr_item[i].split(':')[0])
          let item_id = parseInt(arr_item[i].split(':')[1])
          let item = mods.main[mod_id].main.find(item => item.id === item_id)
          if (item.main.type === 'crop'){
            can_plant.push(arr_item[i])
          }
        }
        if (can_plant.length === 0){
          return '你没有任何物品可以种植'
        } else {
          let arr_crop = []
          mods.main.forEach(async (mod, index) => {
            let item = mod.main.find(item => item.name === inputitem)
            if (item){
              arr_crop.push(index)
            }
          })
          if (arr_crop.length === 0){
            return '没有找到该物品'
          } else if (arr_crop.length === 1){
            let arr_crop_id = `${mods.main[arr_crop[0]].id}:${(mods.main[arr_crop[0]].main.find(item => item.name === inputitem)).id}`
            if (can_plant.includes(arr_crop_id)){
              let plant_item_have = 0
              for (let i = 0; i < arr_item.length; i++){
                if (arr_item[i] === arr_crop_id){
                  plant_item_have++
                }
              }
              if (plant_item_have < plant_number){
                return '你没有足够的该物品'
              } else {
                let max_plant: number = 0
                let building = (await ctx.database.get('stardew_valley',{id: userId},['building']))[0].building
                for (let i = 0; i < building.length; i++){
                  let mod_id = parseInt(building[i].split(':')[0])
                  let item_id = parseInt(building[i].split(':')[1])
                  let item = (mods.main[mod_id].main.find(item => item.id === item_id)).main.main as building
                  if (item.type === 'farm'){
                    if ((mods.main[arr_crop[0]].main.find(item => item.name === inputitem)).main.main.level <= item.level){
                      max_plant = max_plant + item.max
                    }
                  }
                }
                let now_plant = (await ctx.database.get('stardew_valley_crop',{owner_id: userId},['crop_id'])).length
                if (now_plant >= max_plant){
                  return '你已经达到最大种植数量'
                } else {
                  let DateNow = new Date()
                  let timestamp = DateNow.getTime()
                  let growthTime = (mods.main[arr_crop[0]].main.find(item => item.name === inputitem)).main.main as crop
                  let time = new Date(timestamp + growthTime.growthTime)
                  let haveNow = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
                  for (let i = 0; i < plant_number; i++){
                    await ctx.database.create('stardew_valley_crop',{owner_id: userId, crop_id: arr_crop_id, date: time})
                    haveNow.splice(haveNow.indexOf(arr_crop_id),1)
                  }
                  await ctx.database.set('stardew_valley',{id: userId},{item: haveNow})
                  return '种植成功，种植时间至' + time
                }
              }
            } else {
              return '你没有该物品可以种植'
            }
          } else {
            return '该物品被多个mod声明，请检查你的mod'
          }
        }
      }
    }
  })

  ctx.command('stardew-valley.收获')
  .action(async ({session}) => {
    let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
    let arr_crop = await ctx.database.get('stardew_valley_crop',{owner_id: userId})
    if (arr_crop.length === 0){
      return '你没有任何已种植的物品'
    } else {
      let harvest_crop = []
      for (let i = 0; i < arr_crop.length; i++){
        let date = arr_crop[i].date.getDate()
        let dateNow = new Date().getDate()
        if (date <= dateNow){
          harvest_crop.push(arr_crop[i])
        }
      }
      if (harvest_crop.length === 0){
        return '你没有任何已到收获时间的物品'
      } else {
        let harvest = []
        let nowUserHave = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
        for (let i = 0; i < harvest_crop.length; i++){
          await ctx.database.remove('stardew_valley_crop',{id: harvest_crop[i].id})
          let mod_id = parseInt(harvest_crop[i].crop_id.split(':')[0])
          let item_id = parseInt(harvest_crop[i].crop_id.split(':')[1])
          let item = (mods.main[mod_id].main.find(item => item.id === item_id)).main.main as crop
          item.harvestOutput.forEach(async (item) => {
            for (let i = 0; i < item.number; i++){
              nowUserHave.push(item.id)
              let harvest_mod_id = parseInt(item.id.split(':')[0])
              let harvest_item_id = parseInt(item.id.split(':')[1])
              let harvest_name = (mods.main[harvest_mod_id].main.find(item => item.id === harvest_item_id)).name
              harvest.push(harvest_name)
            }
          })
        }
        await ctx.database.set('stardew_valley',{id: userId},{item: nowUserHave})
        return `收获成功，你收获了：${ListTOString(harvest)}`
      }
    }
  })

  ctx.command('stardew-valley.查看在种作物')
  .action(async ({session}) => {
    let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
    let have = (await ctx.database.get('stardew_valley_crop',{owner_id: userId},['crop_id','date']))
    if (have.length === 0){
      return '你没有任何已种植的物品'
    } else {
      let date = Math.max(...have.map(item => item.date.getDate()))
      let arr_crop = []
      for (let i = 0; i < have.length; i++){
        mods.main.forEach(async (mod, index) => {
          let item_mod = mod.main.find(item => item.id === parseInt((have[i].crop_id.split(':'))[0]))
          if (item_mod){
            let item_name = (mods.main[index].main.find(item => item.id === parseInt((have[i].crop_id.split(':'))[1]))).name
            arr_crop.push(item_name)
          }
        })
      }
      return `你在种的作物：${ListTOString(arr_crop)}&#10;最短种植时间：${new Date(date)}`
    }
  })

  ctx.command('stardew-valley.查看.建筑')
  .action(async ({session}) => {
    let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
    let have = (await ctx.database.get('stardew_valley',{id: userId},['building']))[0].building
    if (have.length === 0){
      return '你没有任何建筑'
    } else {
      let arr_building = []
      for (let i = 0; i < have.length; i++){
        mods.main.forEach(async (mod, index) => {
          let item_mod = mod.main.find(item => item.id === parseInt((have[i].split(':'))[0]))
          if (item_mod){
            let item_name = (mods.main[index].main.find(item => item.id === parseInt((have[i].split(':'))[1]))).name
            arr_building.push(item_name)
          }
        })
      }
      return `你有以下建筑：${ListTOString(arr_building)}`
    }
  })

  ctx.command('stardew-valley.查看.物品')
  .action(async ({session}) => {
    let userId = await ctx.idconverter.getUserAid(session.userId, session.platform)
    let have = (await ctx.database.get('stardew_valley',{id: userId},['item']))[0].item
    if (have.length === 0){
      return '你没有任何物品'
    } else {
      let arr_item = []
      for (let i = 0; i < have.length; i++){
        mods.main.forEach(async (mod, index) => {
          let item_mod = mod.main.find(item => item.id === parseInt((have[i].split(':'))[0]))
          if (item_mod){
            let item_name = (mods.main[index].main.find(item => item.id === parseInt((have[i].split(':'))[1]))).name
            arr_item.push(item_name)
          }
        })
      }
      return `你有以下物品：${ListTOString(arr_item)}`
    }
  })

  ctx.command('stardew-valley.描述 [inputitem]')
  .action(async ({session}, inputitem) => {
    if (!inputitem){
      return '请输入物品名称'
    } else {
      let arr_item = []
      mods.main.forEach(async (mod, index) => {
        let item = mod.main.find(item => item.name === inputitem)
        if (item){
          arr_item.push(item)
        }
      })
      if (arr_item.length === 0){
        return '没有找到该物品'
      } else if (arr_item.length === 1){
        let desc = arr_item[0].description
        let canbuy = arr_item[0].price.can
        let sell
        let buy
        if (canbuy === true){
          sell = arr_item[0].price.sell
          buy = arr_item[0].price.buy
        }
        if (canbuy === false){
          return `描述：${desc}&#10;卖价：${sell}`
        } else if (canbuy === true){
          return `描述：${desc}&#10;卖价：${sell}&#10;买价：${buy}`
        } else {
          return '该物品没有描述'
        }
      } else {
        return '该物品被多个mod声明，请检查你的mod'
      }
    }
  })

}
