// scripts/get-senders.ts
import { BrevoClient } from '@getbrevo/brevo'
import * as dotenv from 'dotenv'
dotenv.config()

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY ?? '' })

async function main() {
  const result = await brevo.senders.getSenders()
  console.log(JSON.stringify(result, null, 2))
}

main()