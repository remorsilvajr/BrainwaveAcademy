import { AlbumFolderPage } from '@/components/album/album-pages'

export default async function AdminAlbumFolderRoute({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  return <AlbumFolderPage role="admin" date={date} />
}
