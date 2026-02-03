export const metadata = {
  title: 'Agent Directory API',
  description: 'Submission API for the Agent Directory - Built by Icarus & Gep9k 🪵🔥',
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
