export interface mods {
  main: mod[]
}

export interface mod {
  name: string
  version: string
  id: number
  description: string
  main: item[]
}

export interface item {
  name: string
  id: number
  description: string
  main: {
    type: 'crop' | 'building' | 'output'
    main?: crop | building
  }
  price: {
    can: boolean
    sell?: number
    buy?: number
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




import * as fs from 'fs'
import * as path from 'path'
const main = require('./main.json') as mod
const version = require('../package.json').version as string



function loadMods(filepath : string, mods: mods){
  if (path.extname(filepath) === '.json'){
    const data = fs.readFileSync(filepath, 'utf-8')
    const mod = JSON.parse(data) as mod
    if (mod.version === version){
      mods.main.push(mod)
      return
    } else {
      return
    }
  }
}



export function loadModsFolders(folderpath: string): { type: 'error' | 'success', message: mods | Error } {
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


