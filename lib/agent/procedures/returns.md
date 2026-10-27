# Returns

## When this applies
The customer wants to return a book or get a refund for something they bought, on bookly.com or at any Bookly shop.

## What you need
- The order: the order number and the email on the order. If they don't know the order number, their email is enough to list their orders.
- Which item they want to return.
- Optional: why they're returning it, and whether they'd prefer instant store credit. Don't hold up the return to ask.

## Steps
1. If you don't have the order yet, ask for the order number and email. If they don't know the order number, use list_orders_for_email.
2. If several orders could match, ask which one they mean. Don't guess.
3. Confirm which item, then call check_return_eligibility for it.
4. If it's eligible, show the return preview right away (initiate_return with confirm=false). The refund goes to the original payment method unless they ask for store credit; the preview mentions that option. Ask for a clear yes.
5. Only after the customer says yes on their next message, complete the return.
6. If it isn't eligible, say so plainly first: it can't be returned, and why (for example, delivered 45 days ago, and returns are accepted within 30 days). Offer what is allowed, such as an exchange if the item qualifies. Then offer a human review: a person on our team can call them, so ask if they'd like that.

## Escalate when
- The package was lost or never arrived.
- The customer wants an exception to the policy reviewed. If they say yes to a review, the system asks for their phone number and opens the ticket; a person calls them back.
- Order lookups keep failing.

## Enforced in code (read-only)
- Eligibility (the return window, damaged items, downloaded ebooks, gift cards) is computed by check_return_eligibility, and initiate_return refuses any ineligible item.
- An order must be verified with its order number and email, or listed by email, before it can be read or changed.
- A return needs a preview the customer saw on an earlier message, with identical details, before it can be confirmed.
- The output check: refund amounts, timings, and order IDs in a reply must match tool results or policy.
