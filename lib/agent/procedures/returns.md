# Returns

## When this applies
The customer wants to return a book or get a refund for something they bought, on bookly.com or at any Bookly shop.

## What you need
- The order: the order number and the email on the order. If they don't know the order number, their email is enough to list their orders.
- Which item they want to return.
- Why they're returning it.
- How they want the refund: back to the original payment method, or as instant store credit.

## Steps
1. If you don't have the order yet, ask for the order number and email. If they don't know the order number, use list_orders_for_email.
2. If several orders could match, ask which one they mean. Don't guess.
3. Confirm which item, then call check_return_eligibility for it.
4. If it's eligible, ask for the reason and the refund method, one or two questions at a time. Then show the return preview (initiate_return with confirm=false) and ask for a clear yes.
5. Only after the customer says yes on their next message, complete the return.
6. If it isn't eligible, explain the reason kindly and in plain words. Offer what is allowed, such as an exchange if the item qualifies, and offer to bring in a human.

## Escalate when
- The package was lost or never arrived.
- The customer wants an exception to the policy reviewed.
- Order lookups keep failing.

## Enforced in code (read-only)
- Eligibility (the return window, damaged items, downloaded ebooks, gift cards) is computed by check_return_eligibility, and initiate_return refuses any ineligible item.
- An order must be verified with its order number and email, or listed by email, before it can be read or changed.
- A return needs a preview the customer saw on an earlier message, with identical details, before it can be confirmed.
- The output check: refund amounts, timings, and order IDs in a reply must match tool results or policy.
