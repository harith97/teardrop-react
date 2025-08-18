import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-07-30.basil",
})

export async function POST(request: NextRequest) {
  try {
    const { plan, duration, tier } = await request.json()

    console.log("Creating checkout session for:", { plan, duration, tier })

    // Check if required environment variables are set
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key is not configured")
    }

    // Create checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan === "ad-free" ? "Ad-Free Forever" : "Premium Membership",
              description: plan === "ad-free" 
                ? "One-time payment to remove all ads permanently"
                : `Premium membership - ${duration} - ${tier} tier`,
            },
            unit_amount: plan === "ad-free" ? 299 : 799, // $2.99 or $7.99 in cents
            recurring: plan === "ad-free" ? undefined : {
              interval: duration === "monthly" ? "month" : 
                       duration === "3months" ? "month" : 
                       duration === "6months" ? "month" : "year",
              interval_count: duration === "monthly" ? 1 : 
                            duration === "3months" ? 3 : 
                            duration === "6months" ? 6 : 12,
            },
          },
          quantity: 1,
        },
      ],
      mode: plan === "ad-free" ? "payment" : "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?plan=${plan}&duration=${duration}&tier=${tier}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      metadata: {
        plan,
        duration,
        tier,
      },
    })

    console.log("Checkout session created:", session.id)
    return NextResponse.json({ id: session.id })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
