import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import {json, LoaderFunctionArgs} from '@remix-run/node';
import {AppProvider} from '@shopify/shopify-app-remix/react';
import shopify from '~/shopify.server';

export async function loader({request}: LoaderFunctionArgs) {
  await shopify.authenticate.admin(request);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY,
  });
}

export default function App() {
  // const {apiKey} = useLoaderData<typeof loader>();
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
