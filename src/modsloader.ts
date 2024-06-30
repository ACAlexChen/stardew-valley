
import { mods, mod } from './type'
import * as fs from 'fs'
import * as path from 'path'

import main$data from './main.json'
const main = main$data as mod.mod
import main$version from '../package.json'
const version = main$version.version as string

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

export function modloader(){
  const modpath = path.resolve(__dirname,'../../../data') // mod加载系统
  if (!fs.existsSync(`${modpath}/mods`)){
    fs.mkdirSync(`${modpath}/mods`)
  }
  if (!fs.existsSync(`${modpath}/mods/stardew-valley`)){
    fs.mkdirSync(`${modpath}/mods/stardew-valley`)
  }
  const loadmods = loadModsFolders(`${modpath}/mods/stardew-valley`)
  if (loadmods.type === 'error'){
    return '加载 mods 失败：' + loadmods.message
  } else if (loadmods.type === 'success') {
    const mods = loadmods.message as mods
    return mods
  }
}





