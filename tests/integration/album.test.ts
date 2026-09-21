import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { todayIso } from '@/lib/format'
import { Fixture, type TestUser } from './helpers'

// Photo album visibility and permissions, enforced by RLS (there is no app-level
// filter behind them). Photos are rows only here: the files themselves live in a
// storage bucket that these tests don't touch.
const f = new Fixture()
let admin: TestUser
let teacher: TestUser
let otherTeacher: TestUser
let parentInClass: TestUser
let parentElsewhere: TestUser
let parentWithdrawn: TestUser
let classA: string
let classB: string

const photo = (uploadedBy: TestUser, classroomId: string | null, extra: Record<string, unknown> = {}) => ({
  storage_path: `${uploadedBy.id}/${randomUUID()}.jpg`,
  uploaded_by: uploadedBy.id,
  classroom_id: classroomId,
  ...extra,
})

const seed = async (uploadedBy: TestUser, classroomId: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await f.admin.from('album_photos').insert(photo(uploadedBy, classroomId, extra)).select('id').single()
  if (error || !data) throw new Error(error?.message)
  return data.id as string
}
const exists = async (id: string) => {
  const { data } = await f.admin.from('album_photos').select('id').eq('id', id)
  return (data ?? []).length === 1
}

beforeAll(async () => {
  const { data: classrooms } = await f.admin.from('classrooms').select('id, slug').in('slug', ['little-explorers', 'advanced-toddler'])
  classA = classrooms!.find((c) => c.slug === 'little-explorers')!.id
  classB = classrooms!.find((c) => c.slug === 'advanced-toddler')!.id

  admin = await f.user('admin')
  teacher = await f.user('teacher', 'assistant')
  otherTeacher = await f.user('teacher', 'other')
  parentInClass = await f.user('parent', 'inclass')
  parentElsewhere = await f.user('parent', 'elsewhere')
  parentWithdrawn = await f.user('parent', 'withdrawn')
  await f.student(parentInClass, { classroom_id: classA, enrollment_status: 'active' })
  await f.student(parentElsewhere, { classroom_id: classB, enrollment_status: 'active' })
  await f.student(parentWithdrawn, { classroom_id: classA, enrollment_status: 'withdrawn' })
  // Assistants (not leads) so no real classroom's lead is touched; removed again by cleanup.
  await f.admin.from('classroom_assistants').insert({ classroom_id: classA, teacher_id: teacher.id })
  await f.admin.from('classroom_assistants').insert({ classroom_id: classB, teacher_id: otherTeacher.id })
}, 120_000)

afterAll(async () => {
  await f.cleanup()
})

describe('who can upload', () => {
  it("a teacher can add a photo to a class they assist, dated today in Manila", async () => {
    const { data, error } = await teacher.client.from('album_photos').insert(photo(teacher, classA)).select('id, album_date').single()
    expect(error).toBeNull()
    expect(data?.album_date).toBe(todayIso())
  })

  it("a teacher cannot add a photo to a class they don't lead or assist", async () => {
    const { error } = await teacher.client.from('album_photos').insert(photo(teacher, classB))
    expect(error).not.toBeNull()
  })

  it('every photo needs a class', async () => {
    const { error } = await teacher.client.from('album_photos').insert(photo(teacher, null))
    expect(error).not.toBeNull()
  })

  it('a photo cannot be backdated', async () => {
    const { error } = await teacher.client.from('album_photos').insert(photo(teacher, classA, { album_date: '2020-01-01' }))
    expect(error).not.toBeNull()
  })

  it("a teacher cannot upload in another teacher's name", async () => {
    const { error } = await teacher.client.from('album_photos').insert(photo(otherTeacher, classA))
    expect(error).not.toBeNull()
  })

  it('a parent cannot upload', async () => {
    const { error } = await parentInClass.client.from('album_photos').insert(photo(teacher, classA))
    expect(error).not.toBeNull()
  })
})

describe('who can see a photo', () => {
  let id: string
  beforeAll(async () => {
    id = await seed(teacher, classA)
  })

  it('a parent with an enrolled child in that class can', async () => {
    const { data } = await parentInClass.client.from('album_photos').select('id').eq('id', id)
    expect(data).toHaveLength(1)
  })

  it('a parent whose child is in a different class cannot', async () => {
    const { data } = await parentElsewhere.client.from('album_photos').select('id').eq('id', id)
    expect(data ?? []).toHaveLength(0)
  })

  it('a parent whose child has withdrawn cannot', async () => {
    const { data } = await parentWithdrawn.client.from('album_photos').select('id').eq('id', id)
    expect(data ?? []).toHaveLength(0)
  })

  it('a photo with no class is invisible to every parent', async () => {
    const { data: row } = await f.admin.from('album_photos').insert(photo(teacher, null)).select('id').single()
    const { data } = await parentInClass.client.from('album_photos').select('id').eq('id', row!.id)
    expect(data ?? []).toHaveLength(0)
  })

  it('teachers and admin see every photo', async () => {
    const asTeacher = await otherTeacher.client.from('album_photos').select('id').eq('id', id)
    expect(asTeacher.data).toHaveLength(1)
    const asAdmin = await admin.client.from('album_photos').select('id').eq('id', id)
    expect(asAdmin.data).toHaveLength(1)
  })
})

describe('who can delete', () => {
  it('a teacher can delete their own photo', async () => {
    const id = await seed(teacher, classA)
    await teacher.client.from('album_photos').delete().eq('id', id)
    expect(await exists(id)).toBe(false)
  })

  it("a teacher cannot delete another teacher's photo", async () => {
    const id = await seed(otherTeacher, classB)
    await teacher.client.from('album_photos').delete().eq('id', id)
    expect(await exists(id)).toBe(true)
  })

  it('a parent cannot delete a photo', async () => {
    const id = await seed(teacher, classA)
    await parentInClass.client.from('album_photos').delete().eq('id', id)
    expect(await exists(id)).toBe(true)
  })

  it('an admin can delete any photo', async () => {
    const id = await seed(teacher, classA)
    await admin.client.from('album_photos').delete().eq('id', id)
    expect(await exists(id)).toBe(false)
  })
})
