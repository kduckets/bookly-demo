# Reader requests

## When this applies
The customer asks for a book the shop doesn't stock.

## What you need
- The title and author of the book they want.

## Steps
1. Check the catalog with search_catalog first.
2. If we don't carry it, use search_open_library to confirm the book and its author.
3. Tell them plainly that we don't stock it yet. Never quote a price or availability for it.
4. Offer to add it to the reader requests list, which the buying team reviews. If something we do carry is close, you can mention it.
5. Call add_to_reader_requests only when the customer asks or agrees.

## Escalate when
- The customer wants a special order, or needs the book by a certain date.

## Enforced in code (read-only)
- Books we already stock are refused, and each conversation can add at most 5 requests.
- Open Library results are reference data. Only books matched to the catalog can be sold.
- The output check: a price or "we have it" for a book we don't stock is caught before it reaches the customer.
