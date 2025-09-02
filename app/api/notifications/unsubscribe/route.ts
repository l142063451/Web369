import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // TODO: Remove subscription from database
    // For now, we'll just log it
    console.log('Push subscription removal requested')

    // In production, remove from database:
    // const session = await getServerSession(authOptions)
    // if (session?.user?.id) {
    //   await prisma.pushSubscription.deleteMany({
    //     where: {
    //       userId: session.user.id
    //     }
    //   })
    // }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}