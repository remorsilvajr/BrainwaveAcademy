import { AlbumFolderPage } from '@/components/album/album-pages'

export default async function ParentAlbumFolderRoute({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  return <AlbumFolderPage role="parent" date={date} />
}
