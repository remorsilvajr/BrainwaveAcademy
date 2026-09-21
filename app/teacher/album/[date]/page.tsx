import { AlbumFolderPage } from '@/components/album/album-pages'

export default async function TeacherAlbumFolderRoute({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  return <AlbumFolderPage role="teacher" date={date} />
}
