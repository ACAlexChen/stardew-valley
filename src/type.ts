
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
    name: string // 名称
    id: number // 编号
    description: string // 描述
    main: {
      type: 'crop' | 'building' | 'output' // 类型
      main?: crop | building // 内容
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
    type: 'delayEvents' | 'instantaneousEvents'
    id: number
    main: delayEvents | instantaneousEvents
  }

  export interface instantaneousEvents { // 瞬时事件
    listener: listener[]
    action: action[]
    message: string
    probability: number
    optionActionEvent: boolean
    optionAction?: optionAction[]
  }

  export interface optionAction {
    listener: number
    message: string
    action: action[]
  }

  export interface delayEvents { // 延迟事件
    actionEvent: string[]
    maxTime: number // 最大等待时间
    minTime: number // 最小等待时间
    time: number // 生命周期
    listener: listener[]
    finish: string[]
    max: number
    min: number
  }

  export interface listener {
    listenername: 'stardew-valley/plant'
    morething?: listener_plant
  }

  export interface listener_plant {}

  export interface action {
    actionname: 'action-remove-crop' | 'optionAction'
    morething?: any[] | any
  }

}






declare module 'koishi' {

  interface Tables {
    stardew_valley: Tables.stardew_valley
    stardew_valley_crop: Tables.stardew_valley_crop
  }

  interface Events {
    'stardew-valley/buy'(args: object): void
    'stardew-valley/sell'(args: object): void
    'stardew-valley/plant'(crop: eventargs.crop, session: Session): void
    'stardew-valley/harvest'(...crop: eventargs.crop[]): void
    'stardew-valley/describe'(args: object): void
    'stardew-valley/view-owned-items'(args: object): void
    'stardew-valley/view-canbuy-items'(args: object): void
    'stardew-valley/view-crops'(args: object): void

    'stardew-valley/delay-buy'(args: object): void
    'stardew-valley/delay-sell'(args: object): void
    'stardew-valley/delay-plant'(crop: eventargs.crop): void
    'stardew-valley/delay-harvest'(args: object): void
    'stardew-valley/delay-describe'(args: object): void
    'stardew-valley/delay-view-owned-items'(args: object): void
    'stardew-valley/delay-view-canbuy-items'(args: object): void
    'stardew-valley/delay-view-crops'(args: object): void

    'stardew-valley/action-remove-item'(item: eventargs.item, session: Session): void
    'stardew-valley/action-remove-crop'(crop: eventargs.crop, session: Session): void
    'stardew-valley/action-add-item'(item: eventargs.item, session: Session): void
    'stardew-valley/action-add-crop'(crop: eventargs.crop, session: Session): void

    'stardew-valley/plugin-loaded'(): void
    'stardew-valley/plugin-return-mods'(mods: mods): void
  }

  namespace eventargs {
    interface crop {
      cropid: string
      number: number
      ids?: number[]
    }

    interface item {
      itemid: string
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
      date: Date
      location: number
    }

    interface stardew_valley_item {
      itemId?: string
      number?: number
    }  

  }

}

