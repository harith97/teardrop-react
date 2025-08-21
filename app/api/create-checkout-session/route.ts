import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-07-30.basil",
})

// Map durations to Stripe price IDs
const priceMap: Record<string, string> = {
  monthly: `${process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID}`,   // replace with your real Stripe Price ID
  "3months": `${process.env.STRIPE_PREMIUM_3MONTHS_PRICE_ID}`,
  "6months": `${process.env.STRIPE_PREMIUM_6MONTHS_PRICE_ID}`,
  yearly: `${process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID}`,
}

export async function POST(request: NextRequest) {
  try {
    const { duration } = await request.json()

    if (!duration || !priceMap[duration]) {
      throw new Error("Invalid subscription duration")
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceMap[duration],
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?plan=premium&duration=${duration}&tier=default`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      metadata: {
        plan: "premium",
        duration,
        tier: "default",
      },
    })

    return NextResponse.json({ id: session.id })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
