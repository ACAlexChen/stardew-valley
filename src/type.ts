/* eslint-disable */
import { Session } from 'koishi'

export interface mods {
  main: mod.mod[]
}

export namespace mod {

  export interface mod {
    name: string // 名称
    version: string // 版本
    id: number // 编号
    description: string // 描述
    main: item[] | events[] // 内容
  }

  export interface item {
    type: 'item'
    name: string // 名称
    id: number // 编号
    description: string // 描述
    main: {
      type: 'crop' | 'building' | 'output' | 'food' // 类型
      main?: crop | building | food // 内容
    }
    price: {
      can: boolean // 是否可购买
      sell?: number // 售价
      buy?: number // 买价
    }
  }

  export interface crop {
    level: number
    growthTime: number
    harvestOutput: {
      max: number
      min: number
      output: {
        id: string
        max: number
        min: number
        probability: number
      }[]
    }
  }

  export interface building {
    type: 'farm'
    level: number
    max: number
  }

  export interface events {
    type: 'event'
    listener: string
    message: string
    option: {
      name: string
      message: string
      action: string
    }[]
  }

  export interface food {
    buff: {
      name: string
      debuff: string
      time: number
    }[]
    hunger
  }

}




declare module 'koishi' {

  interface Tables {
    stardew_valley: Tables.stardew_valley
    stardew_valley_crop: Tables.stardew_valley_crop
    stardew_valley_player: Tables.stardew_valley_player
  }

  interface Events {
    'stardew-valley/listener-购买'(item: eventargs.item, session: Session): void
    'stardew-valley/listener-卖出'(item: eventargs.item, session: Session): void
    'stardew-valley/listener-种植'(item: eventargs.item, session: Session): void
    'stardew-valley/listener-收获'(items: eventargs.item[], session: Session): void
    'stardew-valley/listener-描述'(item: eventargs.item, session: Session): void
    'stardew-valley/listener-查看-拥有物品'(items: eventargs.item[], session: Session): void
    'stardew-valley/listener-查看-可购买物品'(items: eventargs.item[], session: Session): void
    'stardew-valley/listener-查看-种植作物'(items: eventargs.item[], session: Session): void

    'stardew-valley/action-移除物品'(item: eventargs.item, session: Session): void
    'stardew-valley/action-移除作物'(item: eventargs.item, session: Session): void
    'stardew-valley/action-添加物品'(item: eventargs.item, session: Session): void
    'stardew-valley/action-添加作物'(item: eventargs.item, session: Session): void

    'stardew-valley/plugin-loaded'(updateMods: boolean, data?: mods): void
    'stardew-valley/plugin-return-mods'(rmods: mods): void
    'stardew-valley/plugin-reload-mods'(rmods: mods): void
  }

  namespace eventargs {
    interface item {
      id: string
      number: number
    }
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
      lastWateringDate: Date
      date: Date
      location: number
    }

    interface stardew_valley_item {
      itemId?: string
      number?: number
    }

    interface stardew_valley_player {
      id: number
      endurance: {
        nowEndurance: number
        maxEndurance: number
        enduranceSecondGrowth: number
        lastEnduranceDate: Date
      }
      hunger: {
        nowHunger: number
        hungerySecondRemove: number
        lastHungerDate: Date
      }
      tool: {
        arms: string | null
        pickaxe: string | null
        axe: string | null // TODO: 先加上，具体内容什么的之后再写
        hoe: string | null
      }
      armor: {
        head: string | null
        body: string | null
        legs: string | null
        feet: string | null
      }
    }

  }

}

