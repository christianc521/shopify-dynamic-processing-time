import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  DeliveryMethod
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import prisma from "./db.server";
import { handleOrderUpdate } from './webhookHandlers';
import { GraphqlClient } from '@shopify/shopify-api';


const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July24,
  scopes: ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_metafields', 'write_metafields'],
  appUrl: "https://72f3-2601-249-8d01-e50-aa7-570e-86f6-2059.ngrok-free.app",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,
  future: {
    wip_optionalScopesApi: true,
    unstable_newEmbeddedAuthStrategy: true,
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: '/app/webhooks',
    },
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: '/app/webhooks',
    },
    ORDERS_FULFILLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: '/app/webhooks',
    },
    ORDERS_CANCELLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: '/app/webhooks',
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      // Register webhooks after authentication
      await registerGQLWebhooks(session);
      await registerWebhooks({session});
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

async function registerGQLWebhooks(session: Session) {
  const client = new GraphqlClient({ session });
  console.log("Created new GraphQL client ", client);
  const webhookTopics = [
    'ORDERS_CREATE',
    'ORDERS_FULFILLED',
    'ORDERS_CANCELLED',
    'APP_UNINSTALLED',
  ];

  const webhookAddress = `${process.env.SHOPIFY_APP_URL}/webhooks`;

  for (const topic of webhookTopics) {
    const query = `
      #graphql
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          userErrors {
            field
            message
          }
          webhookSubscription {
            id
          }
        }
      }
    `;

    const variables = {
      topic,
      webhookSubscription: {
        callbackUrl: webhookAddress,
        format: 'JSON',
      },
    };

    const response = await client.query({
      data: {
        query,
        variables,
      },
    });

    const errors = response.body.data.webhookSubscriptionCreate.userErrors;
    if (errors.length > 0) {
      console.error(`Error registering ${topic} webhook:`, errors);
    } else {
      console.log(`Successfully registered ${topic} webhook.`);
    }
  }
}

export default shopify;
export const apiVersion = ApiVersion.July24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
