/**
 *                             _ooOoo_
 *                            o8888888o
 *                            88" . "88
 *                            (| -_- |)
 *                            O\  =  /O
 *                         ____/`---'\____
 *                       .'  \\|     |//  `.
 *                      /  \\|||  :  |||//  \
 *                     /  _||||| -:- |||||-  \
 *                     |   | \\\  -  /// |   |
 *                     | \_|  ''\---/''  |   |
 *                     \  .-\__  `-`  ___/-. /
 *                   ___`. .'  /--.--\  `. . __
 *                ."" '<  `.___\_<|>_/___.'  >'"".
 *               | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *               \  \ `-.   \_ __\ /__ _/   .-` /  /
 *          ======`-.____`-.___\_____/___.-`____.-'======
 *                             `=---='
 *          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                     佛祖保佑        永无BUG
 *            佛曰:
 *                   写字楼里写字间，写字间里程序员；
 *                   程序人员写程序，又拿程序换酒钱。
 *                   酒醒只在网上坐，酒醉还来网下眠；
 *                   酒醉酒醒日复日，网上网下年复年。
 *                   但愿老死电脑间，不愿鞠躬老板前；
 *                   奔驰宝马贵者趣，公交自行程序员。
 *                   别人笑我忒疯癫，我笑自己命太贱；
 *                   不见满街漂亮妹，哪个归得程序员？
*/



import { Context, Schema } from 'koishi'

import { command } from './command'
import { modloader } from './modsloader'
import { mods } from './type'
import {} from 'koishi-plugin-binding-id-converter'
import {} from 'koishi-plugin-monetary'
import { action } from './events'

export const name = 'stardew-valley'

export const inject = {
  required: [
    'database',
    'idconverter',
    'monetary'
  ]
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
  const loadmods = modloader()

  let loadmod
  if (typeof loadmods === 'string'){
    loadmod = {right: false, message: loadmods}
  } else {
    loadmod = {right: true, message: loadmods}
  }

  ctx.on('ready', () => {
    if (loadmod.right === false){
      ctx.logger.error(loadmod.message)
      ctx.stop()
    } else {
      ctx.setTimeout(() => {
        ctx.emit('stardew-valley/plugin-reload-mods', loadmod.message)
      }, 1000)
    }
  })

  let mods = loadmods as mods

  ctx.on('stardew-valley/plugin-loaded', (updateMods, data) => {
    if (updateMods){
      mods.main.push(...data.main)
      ctx.emit('stardew-valley/plugin-reload-mods', mods)
    }
    ctx.setTimeout(() => {
      ctx.emit('stardew-valley/plugin-return-mods', mods)
    }, 1000)
  })

  ctx.on('stardew-valley/plugin-reload-mods', (rmods) => {
    mods = rmods
  })



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
    lastWateringDate: 'timestamp',
    date: 'timestamp',
    location: 'unsigned'
  },{
    primary: ['id'],
    autoInc: true
  })
  ctx.model.extend('stardew_valley_player',{ // 玩家表
    id: 'unsigned',
    endurance: 'json',
    hunger: 'json',
    tool: 'json',
    armor: 'json'
  }, {
    primary: ['id'],
    autoInc: false
  })

  command(ctx, cfg, mods)
  action(ctx)

}
