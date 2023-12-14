import { file } from 'bun'
import { mkdir } from 'fs'

export const store = async <T>(filename: string) => {
  let store = new Map<string, T>()

  const get = (key: string) => {
    return store.get(key)
  }

  const set = (key: string, value: T) => {
    store.set(key, value)
    save()
  }

  const del = (key: string) => {
    store.delete(key)
    save()
  }

  const load = async () => {
    console.time('Store loaded')
    try {
      store = new Map(
        Object.entries(await file(`./data/${filename}.json`).json())
      )
      console.timeEnd('Store loaded')
    } catch (_) {}
  }

  const save = async () => {
    await mkdir(`./data`, { recursive: true }, err => {
      if (err) throw err
    })
    await Bun.write(
      `./data/${filename}.json`,
      JSON.stringify(Object.fromEntries(store), null, 2)
    )
  }

  await load()

  return {
    get,
    set,
    del
  }
}
