import { Context, Schema } from 'koishi'
import { mods, mod } from './type'
import { events } from './events'
import { command } from './command'
import {} from './type'
import {} from 'koishi-plugin-binding-id-converter'
import {} from 'koishi-plugin-monetary'
import * as fs from 'fs'
import * as path from 'path'
const main = require('./main.json') as mod.mod
const version = require('../package.json').version as string

export const name = 'stardew-valley'

export const inject = {
  required: [
    'database',
    'idconverter',
    'monetary'
  ],
}

export interface Config {
  max_events: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    max_events: Schema.number().description('单次事件所触发的最大事件数量').default(10)
  }).description('基础设置')
]) as Schema<Config>

export function apply(ctx: Context, cfg: Config) {

  function loadMods(filepath : string, mods: mods){
    if (path.extname(filepath) === '.json'){
      const data = fs.readFileSync(filepath, 'utf-8')
      const mod = JSON.parse(data) as mod.mod
      if (mod.version === version){
        mods.main.push(mod)
        return
      } else {
        return
      }
    }
  }



  function loadModsFolders(folderpath: string): { type: 'error' | 'success', message: mods | Error } {
    try {
      const mods: mods = { main: [] }

      const traverseFolders = (currentPath: string) => {
        const files = fs.readdirSync(currentPath)
        files.forEach((file) => {
          const filePath = path.join(currentPath, file)
          const stats = fs.statSync(filePath)
          if (stats.isDirectory()) {
            traverseFolders(filePath)
          } else {
            loadMods(filePath, mods)
          }
        })
      }

      traverseFolders(folderpath)

      mods.main.push(main)

      return {
        type: 'success',
        message: mods
      }
    } catch (error) {
      return {
        type: 'error',
        message: error
      }
    }
  }



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

  command(ctx, cfg, mods)
  events(ctx, cfg, mods)


}
