// Supabase Edge Function: create-checkout
// Secure Checkout Creator for ChargilyPay (Edahabia & CIB)
// Deploy with: supabase functions deploy create-checkout
// Set secret: supabase secrets set CHARGILY_SECRET_KEY=test_sk_xxx
/// <reference path="../deno.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function cleanUUID(val: any): string | null {
  if (!val || typeof val !== 'string') return null
  const trimmed = val.trim()
  return UUID_REGEX.test(trimmed) ? trimmed : null
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const CHARGILY_SECRET_KEY = Deno.env.get('CHARGILY_SECRET_KEY')
    const CHARGILY_MODE = Deno.env.get('CHARGILY_MODE') || 'test'

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CHARGILY_SECRET_KEY) {
      console.error('[create-checkout] Server configuration error: Missing environment secrets')
      return new Response(JSON.stringify({ error: 'Server payment configuration is incomplete' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Mandatory Endpoint Security: Verify User Authentication Token or Authorized Client
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    let user: any = null

    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && token !== SUPABASE_ANON_KEY && !token.startsWith('sb_publishable_')) {
        try {
          const { data, error: authError } = await adminSupabase.auth.getUser(token)
          if (!authError && data?.user) {
            user = data.user
          }
        } catch {
          // Token verification fallback
        }
      }
    }

    const clientApiKey = req.headers.get('apikey') || ''
    const isAuthorizedClient = clientApiKey === SUPABASE_ANON_KEY || clientApiKey.startsWith('sb_publishable_') || Boolean(authHeader)

    if (!user && !isAuthorizedClient) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Missing Authorization token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1.5 Rate Limiting Check (Option A: DB Query)
    // Prevent abuse by limiting a user to 10 checkout requests per minute
    if (user?.id) {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
      const { count, error: rateError } = await adminSupabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', user.id)
        .gte('created_at', oneMinuteAgo)

      if (!rateError && count !== null && count >= 10) {
        console.warn(`[create-checkout] Rate limit exceeded for user ${user.id}`)
        return new Response(
          JSON.stringify({ error: 'Too many checkout requests. Please try again in a minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 2. Parse & Sanitize Input Body
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { amount, currency = 'dzd', deal_id, creator_id, brand_id, description, success_url, failure_url } = body

    // 3. Validation: Amount & Required fields
    const parsedAmount = Number(amount)
    if (isNaN(parsedAmount) || parsedAmount < 100 || parsedAmount > 5000000) {
      return new Response(
        JSON.stringify({ error: 'Amount must be a valid number between 100 DZD and 5,000,000 DZD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Authorization & Impersonation Prevention
    const ADMIN_EMAILS = ['madjedalirachedi291@gmail.com', 'madjedar@gmail.com']
    const isAdmin = user ? (ADMIN_EMAILS.includes((user.email || '').toLowerCase().trim()) || user.user_metadata?.role === 'admin') : true
    
    if (user && brand_id && brand_id !== user.id && !isAdmin) {
      console.warn(`[create-checkout] Impersonation blocked: User ${user.id} tried to create transaction for brand ${brand_id}`)
      return new Response(
        JSON.stringify({ error: 'Forbidden: You cannot create transactions for another account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validBrandId = user?.id || cleanUUID(brand_id) || null
    const validCreatorId = cleanUUID(creator_id)
    const validDealId = cleanUUID(deal_id)

    const platformFee = Math.round(parsedAmount * 0.05) // 5% platform fee

    const sanitizedDescription = description 
      ? String(description).replace(/[\r\n\x00-\x1F\x7F]+/g, ' ').trim().slice(0, 200) 
      : 'OPPI — صفقة رعاية'

    // 5. Insert pending transaction in Supabase
    let transactionId: string | null = null
    try {
      const { data: transaction, error: txError } = await adminSupabase
        .from('transactions')
        .insert({
          deal_id: validDealId,
          brand_id: validBrandId,
          creator_id: validCreatorId,
          amount_dzd: parsedAmount,
          platform_fee_dzd: platformFee,
          status: 'pending',
          description: sanitizedDescription,
        })
        .select()
        .single()

      if (txError) {
        console.warn('[create-checkout] DB Transaction insert notice (continuing checkout):', txError.message)
      } else if (transaction) {
        transactionId = transaction.id
      }
    } catch (dbErr: any) {
      console.warn('[create-checkout] DB Transaction exception (continuing checkout):', dbErr?.message)
    }

    // 6. Call ChargilyPay API v2 securely from server side
    // Chargily Pay v2 Live is https://pay.chargily.net/api/v2, Test is https://pay.chargily.net/test/api/v2
    const isLive = CHARGILY_MODE === 'live' || CHARGILY_SECRET_KEY.startsWith('live_sk_')
    const CHARGILY_BASE_URL = isLive ? 'https://pay.chargily.net/api/v2' : 'https://pay.chargily.net/test/api/v2'
    const webhookUrl = `${SUPABASE_URL}/functions/v1/chargily-webhook`

    const callerOrigin = req.headers.get('origin') || req.headers.get('referer') || 'https://oppi-dz.netlify.app'
    let cleanOrigin = callerOrigin.replace(/\/$/, '')
    if (!cleanOrigin.startsWith('http://') && !cleanOrigin.startsWith('https://')) {
      cleanOrigin = 'https://' + cleanOrigin
    }

    const finalSuccessUrl = success_url || `${cleanOrigin}?payment=success${transactionId ? `&tx=${transactionId}` : ''}`
    const finalFailureUrl = failure_url || `${cleanOrigin}?payment=failed${transactionId ? `&tx=${transactionId}` : ''}`

    const chargilyPayload: any = {
      amount: parsedAmount,
      currency: (currency || 'dzd').toLowerCase(),
      description: sanitizedDescription,
      success_url: finalSuccessUrl,
      failure_url: finalFailureUrl,
      webhook_endpoint: webhookUrl,
      metadata: {
        transaction_id: transactionId,
        deal_id: validDealId,
        creator_id: validCreatorId,
        brand_id: validBrandId,
      },
    }

    if (body.payment_method && ['edahabia', 'cib'].includes(String(body.payment_method).toLowerCase())) {
      chargilyPayload.payment_method = String(body.payment_method).toLowerCase()
    }

    const chargilyResponse = await fetch(`${CHARGILY_BASE_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHARGILY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargilyPayload),
    })

    if (!chargilyResponse.ok) {
      const errText = await chargilyResponse.text()
      console.error('[create-checkout] Chargily API error response:', errText)
      let parsedError = 'Payment gateway error. Please try again later.'
      try {
        const jsonErr = JSON.parse(errText)
        parsedError = jsonErr.message || parsedError
      } catch {
        // use default
      }
      return new Response(
        JSON.stringify({ error: parsedError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const chargilyData = await chargilyResponse.json()

    // 7. Update transaction with checkout ID if recorded
    if (transactionId && chargilyData.id) {
      try {
        await adminSupabase
          .from('transactions')
          .update({ chargily_checkout_id: chargilyData.id })
          .eq('id', transactionId)
      } catch (e: any) {
        console.warn('[create-checkout] Could not update checkout ID on transaction:', e?.message)
      }
    }

    return new Response(
      JSON.stringify({
        checkout_url: chargilyData.checkout_url,
        checkout_id: chargilyData.id,
        transaction_id: transactionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('[create-checkout] Execution error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to initialize payment checkout. Please try again later.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
