import { createClient } from '@/lib/supabase/server'
import { MyProfileForm } from '@/components/parent/my-profile-form'

export default async function MyProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'first_name, middle_name, last_name, email, phone_number, date_of_birth, relationship_to_student, account_id, is_verified, avatar_url, created_at'
    )
    .eq('id', user?.id ?? '')
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62] dark:text-indigo-300">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and update your personal contact information and profile picture.
        </p>
      </div>

      {profile && <MyProfileForm profile={profile} />}
    </div>
  )
}
