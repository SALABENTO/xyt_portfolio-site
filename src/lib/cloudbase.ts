import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'test-d2gxosyerbfae7e13'

let app: ReturnType<typeof cloudbase.init> | null = null
let ready = false

export function getCloudbaseApp() {
  if (!app) {
    app = cloudbase.init({ env: ENV_ID, timeout: 600000 }) // 10 min for Coze workflow
  }
  return app
}

export async function ensureLogin(): Promise<void> {
  if (ready) return
  const app = getCloudbaseApp()
  const auth = app.auth({ persistence: 'local' })
  const loginState = await auth.getLoginState()
  if (!loginState) {
    await auth.signInAnonymously()
  }
  ready = true
}

// Call a cloud function — handles auth automatically
export async function callCloudFunction(name: string, data: Record<string, unknown>): Promise<unknown> {
  await ensureLogin()
  const app = getCloudbaseApp()
  const result = await app.callFunction({ name, data })
  return result.result
}
