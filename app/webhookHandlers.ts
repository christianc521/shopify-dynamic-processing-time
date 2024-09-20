import { shopifyApi } from '@shopify/shopify-api';
import prisma from "./db.server";
import shopify from 'app/shopify.server';
import { Session, GraphqlClient } from '@shopify/shopify-api';

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
export async function handleOrderUpdate(topic: string, shop: string, body: string) {
  try {
    // Parse the webhook payload
    const payload = JSON.parse(body);

    // Update product processing times based on the payload and shop
    await updateProductProcessingTimes(payload, shop);
  } catch (error) {
    console.error(`Error handling ${topic} webhook for shop ${shop}:`, error);
  }
}

// Handler for app uninstalled webhook
export async function handleAppUninstalled(topic: string, shop: string, body: string) {
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

// Helper function to update processing times for products in an order
async function updateProductProcessingTimes(orderData: any, shop: string) {
  // Get an authenticated admin client for the shop
  const client = await getAdminClient(shop);

  // Extract line items from the order
  const lineItems = orderData.line_items;

  // Map of product IDs to quantities ordered
  const productQuantities: { [productId: string]: number } = {};

  // Build the productQuantities map
  lineItems.forEach((item: any) => {
    const productId = `gid://shopify/Product/${item.product_id}`;
    const quantity = item.quantity;

    if (productQuantities[productId]) {
      productQuantities[productId] += quantity;
    } else {
      productQuantities[productId] = quantity;
    }
  });

  // For each product, update the processing time
  for (const productId in productQuantities) {
    await updateProcessingTimeForProduct(productId, shop);
  }
}

// Helper function to get an authenticated admin GraphQL client
async function getAdminClient(shopDomain: string): Promise<GraphqlClient> {
  // Fetch the session for the shop from your session storage
  const sessionData = await prisma.session.findFirst({
    where: {
      shop: shopDomain,
    },
  });

  if (!sessionData || !sessionData.accessToken) {
    throw new Error(`No valid session found for shop ${shopDomain}`);
  }

  // Create a new Session object
  const session = new Session({
    id: sessionData.id,
    shop: shopDomain,
    state: sessionData.state,
    isOnline: sessionData.isOnline,
    accessToken: sessionData.accessToken,
    scope: sessionData.scope ? sessionData.scope : undefined,
    expires: sessionData.expires ? new Date(sessionData.expires) : undefined,
  });

  // Create a new admin GraphQL client
  const client = new GraphqlClient({ session });

  return client;
}

// Helper function to update processing time for a single product
async function updateProcessingTimeForProduct(productId: string, shop: string) {
  const client = await getAdminClient(shop);

  // Fetch the product's assembly time metafield
  const assemblyTimeMetafield = await getAssemblyTimeMetafield(client, productId);
  const assemblyTime = parseInt(assemblyTimeMetafield?.value || '0', 10);

  // Fetch the total unfulfilled quantity of the product
  const totalUnfulfilledQuantity = await getTotalUnfulfilledQuantity(client, productId);

  // Calculate new processing time
  const newProcessingTime = assemblyTime * totalUnfulfilledQuantity;

  // Update the product's processing_time metafield
  await upsertProcessingTimeMetafield(client, productId, newProcessingTime);
}

// Helper function to get the assembly time metafield of a product
async function getAssemblyTimeMetafield(client: GraphqlClient, productId: string) {
  const query = `
    query GetAssemblyTimeMetafield($productId: ID!) {
      product(id: $productId) {
        metafield(namespace: "assembly_info", key: "assembly_time") {
          id
          value
        }
      }
    }
  `;
  const variables = { productId };
  const response = await client.query<GetAssemblyTimeMetafieldResponse>({
    data: {
      query,
      variables,
    },
  });

  if (!response.body.data.product?.metafield) {
    throw new Error('Metafield not found.');
  }


  return response.body.data.product.metafield;
}

// Helper function to get the total unfulfilled quantity of a product
async function getTotalUnfulfilledQuantity(client: GraphqlClient, productId: string) {
  // Extract numeric product ID from global ID
  const numericProductId = extractNumericId(productId);

  // Build query string
  const queryString = `line_items.product_id:${numericProductId} AND financial_status:paid AND fulfillment_status:unfulfilled`;

  const query = `
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
                  fulfillableQuantity
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { query: queryString };
  const response = await client.query<GetUnfulfilledOrdersResponse>({
    data: {
      query,
      variables,
    },
  });

  const orders = response.body.data.orders.edges;

  let totalUnfulfilledQuantity = 0;

  for (const orderEdge of orders) {
    const order = orderEdge.node;
    const lineItems = order.lineItems.edges;
    for (const lineItemEdge of lineItems) {
      const lineItem = lineItemEdge.node;
      if (lineItem.product && lineItem.product.id === productId) {
        totalUnfulfilledQuantity += lineItem.fulfillableQuantity;
      }
    }
  }

  return totalUnfulfilledQuantity;
}

// Helper function to upsert the processing_time metafield for a product
async function upsertProcessingTimeMetafield(client: GraphqlClient, productId: string, processingTime: number) {
  const mutation = `
    mutation UpsertProcessingTimeMetafield($input: MetafieldInput!) {
      metafieldsSet(input: $input) {
        metafield {
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
  const variables = {
    input: {
      namespace: 'processing_info',
      key: 'processing_time',
      value: processingTime.toString(),
      type: 'number_integer',
      ownerId: productId,
    },
  };
  const response = await client.query<UpsertMetafieldResponse>({
    data: {
      query: mutation,
      variables,
    },
  });

  // Handle errors if any
  if (response.body.errors || response.body.data.metafieldSet.userErrors.length > 0) {
    const errorMessage = response.body.errors
      ? response.body.errors[0].message
      : response.body.data.metafieldSet.userErrors[0].message;
    throw new Error(`Error updating metafield: ${errorMessage}`);
  }
}

// Helper function to extract numeric ID from a global ID
function extractNumericId(globalId: string): string {
  const parts = globalId.split('/');
  return parts[parts.length - 1];
}
