# Exchanges

## When this applies
The customer wants to swap a book they bought for a different title or format.

## What you need
- The order: the order number and the email on the order, or their email to list orders.
- Which item they want to send back.
- The new title and format they want instead.

## Steps
1. Find and verify the order, the same way as for a return. If several orders could match, ask which one.
2. Confirm which item, then call check_return_eligibility for it.
3. If it's exchangeable, ask what they'd like instead. Use search_catalog to find the new title, and confirm the format.
4. Show the exchange preview (initiate_exchange with confirm=false), including any price difference, and ask for a clear yes.
5. Only after the customer says yes on their next message, complete the exchange.
6. If it isn't exchangeable, explain the reason kindly and offer to bring in a human.

## Escalate when
- The new book is sold out in every format they'd accept.
- The customer wants an exception to the policy reviewed.

## Enforced in code (read-only)
- Exchange eligibility (the exchange window, ebooks, gift cards) is computed by check_return_eligibility, and initiate_exchange refuses ineligible items.
- The new book must be in the catalog and in stock in the chosen format.
- An exchange needs a preview the customer saw on an earlier message, with identical details, before it can be confirmed.
- The output check: prices, price differences, and IDs in a reply must match tool results.
