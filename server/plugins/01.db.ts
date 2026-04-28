import { db } from '../utils/db'

export default defineNitroPlugin(async (nitroApp) => {
  await db.init()

  nitroApp.db = db.pg

  nitroApp.hooks.hook('close', async () => {
    return db.close()
  })
})
