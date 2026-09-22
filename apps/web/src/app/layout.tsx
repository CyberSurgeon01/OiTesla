import './globals.css'

export const metadata = {
  title: 'OiTesla Web',
  description: 'OiTesla ride-pooling MVP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
