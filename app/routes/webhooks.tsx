import { ActionFunction } from '@remix-run/node';
import shopify from 'app/shopify.server';

export const action: ActionFunction = async () => {
    // The Shopify app library handles the webhook processing automatically.
    // You can return a 200 OK response directly.
    return new Response('OK', { status: 200 });
  };
