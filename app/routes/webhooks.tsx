import { ActionFunction } from '@remix-run/node';
import {type ActionFunctionArgs} from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { GraphqlClient } from '@shopify/shopify-api';
// import { GraphQLClient } from 'graphql-request';
import db from '../db.server'; // Adjust the import path based on your project structure
import { GraphQLClient } from 'node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types';
import { Operation } from '@prisma/client/runtime/library';
import { AdminOperations, AllOperations } from '@shopify/admin-api-client';
// import { AdminApiClient } from '@shopify/admin-api-client';

export const action: ActionFunction = async ({request}: ActionFunctionArgs) => {
  console.log("webhook action called");
  const { shop, topic, session, payload, admin } = await authenticate.webhook(request);
  
  console.log("webhook authenticated. topic: ", topic, " session: ", session, " shop: ", shop, "GraphQL admin: ", admin?.graphql.toString);

  switch (topic) {
    // case 'orders/create':
    case 'orders/fulfilled':
    case 'ORDERS_CREATE':
      try {
        // Parse the request body to get the order data
        console.log('ORDERS_CREATE called');
        
        // console.log("payload created: ", payload);
        // Update product processing times based on the order data and shop
        // const payloadJSON = JSON.stringify(payload);
        const accessToken = session?.accessToken;
        // console.log('payload.line_items:', payload.line_items);

        // console.log(payloadJSON);
        
        if (admin) {
          await updateProductProcessingTimes(payload, shop, admin.graphql);
        } else {
          console.error('Admin client not available');
          throw new Response('Internal Server Error', { status: 500 });
        }

        // await updateProductProcessingTimes(payloadJSON, shop, accessToken);
      } catch (error) {
        console.error(`Error handling ${topic} webhook for shop ${shop}:`, error);
        throw new Response('Internal Server Error', { status: 500 });
      }
      break;

    case 'APP_UNINSTALLED':
      if (session) {
        // Delete the shop's session from your database
        await db.session.deleteMany({ where: { shop } });
      }
      break;

    // Handle other GDPR webhooks if needed
    case 'CUSTOMERS_DATA_REQUEST':
    case 'CUSTOMERS_REDACT':
    case 'SHOP_REDACT':
    default:
      throw new Response('Unhandled webhook topic', { status: 404 });
  }

  // Return a 200 OK response to acknowledge receipt
  return new Response();
};

// Helper functions

// Update processing times for products in an order
async function updateProductProcessingTimes(orderData: any, shop: string, admin: GraphQLClient<AdminOperations>) {
  // Get an authenticated admin client for the shop
  // const client = await getAdminClient(shop, accessToken);
  console.log("authenticated admin client created")
  // Extract line items from the order
  const lineItems = orderData.line_items;

  // Map of product IDs to quantities ordered
  const productQuantities: { [productId: string]: number } = {};

  // Build the productQuantities map
  lineItems.forEach((item: any) => {
    const productId = `gid://shopify/Product/${item.product_id}`;
    const quantity = item.quantity;
    console.log("got product ID: ", productId, " and quantity: ", quantity);

    if (productQuantities[productId]) {
      productQuantities[productId] += quantity;
    } else {
      productQuantities[productId] = quantity;
    }
  });

  console.log("hmmm productQuantities is ", productQuantities);

  // For each product, update the processing time
  for (const productId in productQuantities) {
    await updateProcessingTimeForProduct(admin, productId);
  }
}

interface GetAssemblyTimeMetafieldResponse {
  data: {
    product: {
      metafield: {
        id: string;
        value: string;
      } | null;
    } | null;
  };
  errors?: any;
}

interface GetUnfulfilledOrdersResponse {
  data: {
    orders: {
      edges: {
        node: {
          id: string;
          lineItems: {
            edges: {
              node: {
                product: {
                  id: string;
                } | null;
                quantity: number;
                fulfillableQuantity: number;
              };
            }[];
          };
        };
      }[];
    };
  };
  errors?: any;
}

interface UpsertMetafieldResponse {
  data: {
    metafieldSet: {
      metafield: {
        id: string;
        value: string;
      } | null;
      userErrors: {
        field: string[];
        message: string;
      }[];
    };
  };
  errors?: any;
}



// Handler for order-related webhooks
export async function handleOrderUpdate(topic: string, shop: string, body: string, admin: GraphQLClient<AdminOperations>) {
console.log(`Handling ${topic} webhook for shop ${shop}`);
try {
  // Parse the webhook payload
  const payload = JSON.parse(body);

  // Update product processing times based on the payload and shop
  await updateProductProcessingTimes(payload, shop, admin);
} catch (error) {
  console.error(`Error handling ${topic} webhook for shop ${shop}:`, error);
}
}

// Handler for app uninstalled webhook
export async function handleAppUninstalled(topic: string, shop: string, body: string) {
console.log(`Handling ${topic} webhook for shop ${shop}`);
try {
  // Perform any cleanup tasks needed when the app is uninstalled
  console.log(`App uninstalled for shop ${shop}`);

  // Example: Delete the shop's session from your database
  await prisma.session.deleteMany({
    where: {
      shop,
    },
  });
} catch (error) {
  console.error(`Error handling app/uninstalled webhook for shop ${shop}:`, error);
}
}

// Update processing time for a single product
export async function updateProcessingTimeForProduct(admin: GraphQLClient<AdminOperations>, productId: string) {
  // Fetch the product's assembly time metafield
  console.log("about to call getAssemblyTimeMetafield from updateProcessingTimeForProduct on product :", productId);
  const assemblyTimeMetafield = await getAssemblyTimeMetafield(admin, productId);
  
  const assemblyTime = assemblyTimeMetafield;
  console.log(" ok this is assembly time: ", assemblyTime);
  // Fetch the total unfulfilled quantity of the product
  const totalUnfulfilledQuantity = await getTotalUnfulfilledQuantity(admin, productId);

  // Calculate new processing time
  const newProcessingTime = assemblyTime * totalUnfulfilledQuantity;

  // Update the product's processing_time metafield
  await upsertProcessingTimeMetafield(admin, productId, newProcessingTime);
}

// Helper function to get the assembly time metafield of a product
async function getAssemblyTimeMetafield(admin: GraphQLClient<AdminOperations>, productId: string) {
const query = `
  #graphql
  query GetAssemblyTimeMetafield($productId: ID!) {
    product(id: $productId) {
      metafield(namespace: "assembly_info", key: "assembly_time") {
        id
        value
      }
    }
  }
`;

console.log("called getAssemblyTimeMetafield on product :", productId);

const response = await admin(
  query,
  {
    variables: {
      productId: productId
    }
  }
);

const data = await response.json();


if (!data.data.product?.metafield.value) {
  throw new Error('Metafield not found.');
}

console.log(data.data.product.metafield.value);
return data.data.product.metafield.value;
}

// Helper function to get the total unfulfilled quantity of a product
async function getTotalUnfulfilledQuantity(admin: GraphQLClient<AdminOperations>, productId: string) {
// Extract numeric product ID from global ID
const numericProductId = extractNumericId(productId);

// Build query string
const queryString = `product_id:${numericProductId} AND financial_status:paid AND fulfillment_status:unfulfilled`;

const query = `
  #graphql
  query GetUnfulfilledOrders($query: String!) {
    orders(query: $query, first: 100) {
      edges {
        node {
          id
          lineItems(first: 100) {
            edges {
              node {
                product {
                  id
                }
                quantity
                unfulfilledQuantity
              }
            }
          }
        }
      }
    }
  }
`;

const response = await admin(
  query,
  {
    variables: {
      query: queryString
    }
  }
);

const data = await response.json();
const orders = data.data?.orders.edges;
console.log(orders);
// const orders = response.body.data.orders.edges;

let totalUnfulfilledQuantity = 0;

for (const orderEdge of orders) {
  const order = orderEdge.node;
  const lineItems = order.lineItems.edges;
  for (const lineItemEdge of lineItems) {
    const lineItem = lineItemEdge.node;
    if (lineItem.product && lineItem.product.id === productId) {
      totalUnfulfilledQuantity += lineItem.unfulfilledQuantity;
    }
  }
}
console.log("Total unfilled orders quantity: ", totalUnfulfilledQuantity);
return totalUnfulfilledQuantity;
}

// Helper function to upsert the processing_time metafield for a product
async function upsertProcessingTimeMetafield(admin: GraphQLClient<AdminOperations>, productId: string, processingTime: number) {
console.log("updated processing time: ", processingTime);
const mutation = `
  #graphql
  mutation MetafieldsSetProcessing($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;
const metafields = {
  input: {
    namespace: 'processing_info',
    key: 'processing_time',
    value: processingTime.toString(),
    type: 'number_integer',
    ownerId: productId,
  },
};

const variables = {
  metafields: [
    {
      namespace: 'processing_info',
      key: 'processing_time',
      value: processingTime.toString(),
      type: 'number_integer',
      ownerId: productId,
    },
  ],
};

const response = await admin(mutation, {variables});
const mutationData = await response.json();
console.log("mutationData: ", mutationData);

// Check for errors in the response
// if (mutationData.data? || mutationData.data?.metafieldsSet.userErrors.length > 0) {
//   const errorMessage = mutationData.data?.errors
//     ? mutationData.errors[0].message
//     : mutationData.data.metafieldsSet.userErrors[0].message;
//   return json({ error: errorMessage }, { status: 500 });
// }
}

// Helper function to extract numeric ID from a global ID
function extractNumericId(globalId: string): string {
const parts = globalId.split('/');
return parts[parts.length - 1];
}