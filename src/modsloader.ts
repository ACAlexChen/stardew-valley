export interface mods {
  main: mod[]
}

interface mod {
  name: string
  id: number
  description: string
  main: item[]
}

interface item {
  name: string
  id: number
  description: string
  main: {
    type: 'crop' | 'building'
    main: crop | building
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
    id: string
    number: number
  }[]
}

export interface building {
  type: 'farm'
  level: number
  max: number
}



import * as fs from 'fs'
import * as path from 'path'
const main = require('./main.json') as mod




function loadMods(filepath : string, mods: mods): mods{
  if (path.extname(filepath) === '.json'){
    const data = fs.readFileSync(filepath, 'utf-8')
    const mod = JSON.parse(data) as mod
    mods.main.push(mod)
    return mods
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


