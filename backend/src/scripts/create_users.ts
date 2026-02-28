import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db'
import { HospitalUser } from '../modules/hospital/models/User'
import { AestheticUser } from '../modules/aesthetic/models/User'
import { LabUser } from '../modules/lab/models/User'
import { PharmacyUser } from '../modules/pharmacy/models/User'
import { DiagnosticUser } from '../modules/diagnostic/models/User'
import { ReceptionUser } from '../modules/reception/models/User'
import { FinanceUser } from '../modules/hospital/models/finance_User'

interface ModuleUserConfig {
  name: string
  username: string
  model: any
  role: string
}

const modules: ModuleUserConfig[] = [
  { name: 'Hospital', username: 'hospital_admin', model: HospitalUser, role: 'admin' },
  { name: 'Aesthetic', username: 'aesthetic_admin', model: AestheticUser, role: 'admin' },
  { name: 'Lab', username: 'lab_admin', model: LabUser, role: 'admin' },
  { name: 'Pharmacy', username: 'pharmacy_admin', model: PharmacyUser, role: 'admin' },
  { name: 'Diagnostic', username: 'diagnostic_admin', model: DiagnosticUser, role: 'admin' },
  { name: 'Reception', username: 'reception_admin', model: ReceptionUser, role: 'admin' },
  { name: 'Finance', username: 'finance_admin', model: FinanceUser, role: 'admin' },
]

const DEFAULT_PASSWORD = '321'

async function createModuleAdminUser(config: ModuleUserConfig): Promise<void> {
  const existing = await config.model.findOne({ username: config.username }).lean()
  
  if (existing) {
    console.log(`[SKIP] ${config.name} admin user already exists (${config.username})`)
    return
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  
  await config.model.create({
    username: config.username,
    role: config.role,
    passwordHash,
  })
  
  console.log(`[CREATED] ${config.name} admin user (${config.username} / ${DEFAULT_PASSWORD})`)
}

async function main() {
  console.log('Connecting to database...')
  await connectDB()
  console.log('Database connected.\n')

  console.log('Creating module admin users...\n')
  
  for (const moduleConfig of modules) {
    await createModuleAdminUser(moduleConfig)
  }

  console.log('\nAll module admin users processed successfully.')
  console.log('\n--- Summary ---')
  console.log('Username format: <module>_admin')
  console.log('Password for all users: 321')
  console.log('\nModules with admin users:')
  modules.forEach(m => console.log(`  - ${m.name}: ${m.username}`))
}

main()
  .catch(err => {
    console.error('Script failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    try { 
      await mongoose.disconnect() 
      console.log('\nDatabase disconnected.')
    } catch {}
  })
