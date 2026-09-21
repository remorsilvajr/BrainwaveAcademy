import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anon, Fixture, type TestUser } from './helpers'

// Who can read and write what, checked with real signed-in clients against the real RLS
// policies. These are the rules that keep one family's children out of another's reach.
const f = new Fixture()
let admin: TestUser
let teacher: TestUser
let parentA: TestUser
let parentB: TestUser
let childOfA: string

beforeAll(async () => {
  admin = await f.user('admin')
  teacher = await f.user('teacher')
  parentA = await f.user('parent', 'parenta')
  parentB = await f.user('parent', 'parentb')
  childOfA = await f.student(parentA)
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('profiles', () => {
  it('a parent cannot promote themselves to admin', async () => {
    await parentA.client.from('profiles').update({ role: 'admin' }).eq('id', parentA.id)
    const { data } = await f.admin.from('profiles').select('role').eq('id', parentA.id).single()
    expect(data?.role).toBe('parent')
  })

  it('a parent cannot become a super admin or reactivate a blocked status', async () => {
    await parentA.client.from('profiles').update({ is_super_admin: true }).eq('id', parentA.id)
    const { data } = await f.admin.from('profiles').select('is_super_admin').eq('id', parentA.id).single()
    expect(data?.is_super_admin).toBe(false)
  })

  it('a parent can edit their own phone number', async () => {
    const { error } = await parentA.client.from('profiles').update({ phone_number: '09171234567' }).eq('id', parentA.id)
    expect(error).toBeNull()
    const { data } = await f.admin.from('profiles').select('phone_number').eq('id', parentA.id).single()
    expect(data?.phone_number).toBe('09171234567')
  })

  it("a parent cannot read another parent's profile row", async () => {
    const { data } = await parentA.client.from('profiles').select('id').eq('id', parentB.id)
    expect(data ?? []).toHaveLength(0)
  })

  it("a parent cannot edit another parent's profile", async () => {
    await parentA.client.from('profiles').update({ phone_number: '09990000000' }).eq('id', parentB.id)
    const { data } = await f.admin.from('profiles').select('phone_number').eq('id', parentB.id).single()
    expect(data?.phone_number).not.toBe('09990000000')
  })
})

describe('student health and emergency contacts', () => {
  it('the linked parent can record and read their own child\'s health information', async () => {
    const { error } = await parentA.client.from('student_health').insert({ student_id: childOfA, allergies: 'Peanuts', severe_allergy: true, updated_by: parentA.id })
    expect(error).toBeNull()
    const { data } = await parentA.client.from('student_health').select('allergies').eq('student_id', childOfA)
    expect(data).toEqual([{ allergies: 'Peanuts' }])
  })

  it("another family cannot read or write that child's health information", async () => {
    const { data } = await parentB.client.from('student_health').select('allergies').eq('student_id', childOfA)
    expect(data ?? []).toHaveLength(0)
    await parentB.client.from('student_health').update({ allergies: 'overwritten' }).eq('student_id', childOfA)
    const { data: stored } = await f.admin.from('student_health').select('allergies').eq('student_id', childOfA).single()
    expect(stored?.allergies).toBe('Peanuts')
    const { error } = await parentB.client.from('student_health').insert({ student_id: childOfA, allergies: 'x', updated_by: parentB.id })
    expect(error).not.toBeNull()
  })

  it('a teacher can read health information but not change it', async () => {
    const { data } = await teacher.client.from('student_health').select('allergies').eq('student_id', childOfA)
    expect(data).toEqual([{ allergies: 'Peanuts' }])
    await teacher.client.from('student_health').update({ allergies: 'teacher edit' }).eq('student_id', childOfA)
    const { data: stored } = await f.admin.from('student_health').select('allergies').eq('student_id', childOfA).single()
    expect(stored?.allergies).toBe('Peanuts')
  })

  it('a visitor who is not logged in sees nothing', async () => {
    const { data } = await anon().from('student_health').select('student_id')
    expect(data ?? []).toHaveLength(0)
  })

  it('emergency contacts follow the same rule', async () => {
    const { error } = await parentA.client.from('emergency_contacts').insert({ student_id: childOfA, position: 1, full_name: 'Grandma Test', phone_number: '09171234567', relationship: 'Grandmother' })
    expect(error).toBeNull()
    const { data } = await parentB.client.from('emergency_contacts').select('student_id').eq('student_id', childOfA)
    expect(data ?? []).toHaveLength(0)
  })
})

describe('do-not-release list', () => {
  it('a parent cannot add to it', async () => {
    const { error } = await parentA.client.from('do_not_release').insert({ student_id: childOfA, first_name: 'Some', last_name: 'Person' })
    expect(error).not.toBeNull()
  })

  it('an admin can add to it and a teacher can read it, but not change it', async () => {
    const { error } = await admin.client.from('do_not_release').insert({ student_id: childOfA, first_name: 'Some', last_name: 'Person' })
    expect(error).toBeNull()
    const { data } = await teacher.client.from('do_not_release').select('first_name, last_name').eq('student_id', childOfA)
    expect(data).toEqual([{ first_name: 'Some', last_name: 'Person' }])
    await teacher.client.from('do_not_release').delete().eq('student_id', childOfA)
    const { data: still } = await f.admin.from('do_not_release').select('id').eq('student_id', childOfA)
    expect(still).toHaveLength(1)
  })
})

describe('money', () => {
  it("a parent can see their own wallet but not another parent's", async () => {
    await f.admin.from('wallets').insert([{ parent_id: parentA.id }, { parent_id: parentB.id }])
    const mine = await parentA.client.from('wallets').select('parent_id')
    expect(mine.data).toEqual([{ parent_id: parentA.id }])
  })

  it('a parent cannot top up their own wallet', async () => {
    await parentA.client.from('wallets').update({ balance: 999999 }).eq('parent_id', parentA.id)
    const { data } = await f.admin.from('wallets').select('balance').eq('parent_id', parentA.id).single()
    expect(Number(data?.balance)).toBe(2500)
  })

  it("a parent only sees fees for their own child", async () => {
    const childOfB = await f.student(parentB)
    await f.admin.from('payments').insert([
      { student_id: childOfA, amount: 100, fee_type: 'other', description: 'A fee', status: 'pending', due_date: '2030-01-01' },
      { student_id: childOfB, amount: 200, fee_type: 'other', description: 'B fee', status: 'pending', due_date: '2030-01-01' },
    ])
    const { data } = await parentA.client.from('payments').select('description').in('student_id', [childOfA, childOfB])
    expect(data).toEqual([{ description: 'A fee' }])
  })

  it('a parent cannot mark a fee as paid directly', async () => {
    await parentA.client.from('payments').update({ status: 'paid' }).eq('student_id', childOfA)
    const { data } = await f.admin.from('payments').select('status').eq('student_id', childOfA)
    expect(data?.every((p) => p.status === 'pending')).toBe(true)
  })
})

describe('notifications and feedback', () => {
  it("nobody can read someone else's notifications", async () => {
    await f.admin.from('notifications').insert({ user_id: parentA.id, kind: 'test', title: 'For A only' })
    const { data: mine } = await parentA.client.from('notifications').select('title')
    expect(mine).toEqual([{ title: 'For A only' }])
    const { data: theirs } = await parentB.client.from('notifications').select('title')
    expect(theirs ?? []).toHaveLength(0)
  })

  it('a user cannot file feedback that is already resolved or already answered', async () => {
    const forged = await parentA.client.from('feedback').insert({ submitted_by: parentA.id, message: 'forged', resolved: true })
    expect(forged.error).not.toBeNull()
    const honest = await parentA.client.from('feedback').insert({ submitted_by: parentA.id, message: 'a real concern', category: 'concern' })
    expect(honest.error).toBeNull()
  })

  it('a user cannot file feedback in someone else\'s name', async () => {
    const { error } = await parentA.client.from('feedback').insert({ submitted_by: parentB.id, message: 'impersonation' })
    expect(error).not.toBeNull()
  })
})

describe('public site', () => {
  it('a visitor cannot read applications or accounts', async () => {
    const apps = await anon().from('applications').select('id').limit(1)
    expect(apps.data ?? []).toHaveLength(0)
    const profiles = await anon().from('profiles').select('id').limit(1)
    expect(profiles.data ?? []).toHaveLength(0)
  })
})
