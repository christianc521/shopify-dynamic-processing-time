import { useLoaderData, Form, useActionData } from '@remix-run/react';
import { LoaderFunction, ActionFunction, json, redirect } from "@remix-run/node";
import { useState } from 'react';
import { TextField, Button, Select, FormLayout, Frame, Toast } from '@shopify/polaris';
import shopify, { authenticate } from "app/shopify.server";
// Define the Product interface
interface Product {
  id: string;
  title: string;
}

// Define the GraphQL Response interface
interface ShopifyGraphQLResponse {
  data: {
    products: {
      nodes: Product[];
    };
  };
}

export const loader: LoaderFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Make the GraphQL request
  const response = await admin.graphql(
    `#graphql
    query products($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
        }
      }
    }
    `,
    { variables: { first: 5 } } // Fetch 5 products as an example
  );

  const data = await response.json();

  const products: Product[] = data.data.products.nodes;

  
  // Log for debugging purposes
  console.log('products: ', products);

  // Return the products as JSON for the frontend
  return json({ products });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const productId = formData.get('productId') as string;
  const assemblyTime = formData.get('assemblyTime') as string;

  if (!productId || !assemblyTime) {
    return json({ error: 'Product and assembly time are required.' }, { status: 400 });
  }

  const { admin, session} = await authenticate.admin(request);

  // Use the Shopify Admin API to update the metafield
  const mutation = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
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
    metafields: [
      {
        namespace: 'assembly_info',
        key: 'assembly_time',
        value: assemblyTime,
        type: 'number_integer',
        ownerId: productId,
      },
    ],
  };

  const mutationResponse = await admin.graphql(mutation, { variables });
  const mutationData = await mutationResponse.json();

  // Check for errors in the response
  if (mutationData.errors || mutationData.data.metafieldsSet.userErrors.length > 0) {
    const errorMessage = mutationData.errors
      ? mutationData.errors[0].message
      : mutationData.data.metafieldsSet.userErrors[0].message;
    return json({ error: errorMessage }, { status: 500 });
  }

// const order = new admin.rest.resources.Order({session: session});

// order.line_items = [
//   {
//     "title": "Lamp",
//     "price": 200.00,
//     "grams": "1300",
//     "quantity": 3,
//     "tax_lines": [
//       {
//         "price": 13.5,
//         "rate": 0.06,
//         "title": "State tax"
//       }
//     ]
//   }
// ];
// order.transactions = [
//   {
//     "kind": "sale",
//     "status": "success",
//     "amount": 238.47
//   }
// ];
// order.total_tax = 13.5;
// order.currency = "EUR";
// await order.save({
//   update: true,
// });
  return redirect('/app/products?success=true');
};

export default function AssemblyTimeForm() {
  const { products } = useLoaderData<{ products: Product[] }>();
  const actionData = useActionData();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [assemblyTime, setAssemblyTime] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Handle success toast
  const urlParams = new URLSearchParams(window.location.search);
  const successParam = urlParams.get('success');

  if (successParam && !showToast) {
    setShowToast(true);
  }

  // Map products to options for the Select component
  const productOptions = products.map((product) => ({
    label: product.title,
    value: product.id,
  }));

  return (
    <Frame>
      <h1>Set Assembly Time for Products</h1>
      <Form method="post">
        <FormLayout>
          <Select
            label="Select Product"
            options={productOptions}
            value={selectedProductId}
            onChange={(value) => setSelectedProductId(value)}
            placeholder="Choose a product"
            name="productId"
          />
          <TextField
            label="Assembly Time (in hours)"
            value={assemblyTime}
            onChange={(value) => setAssemblyTime(value)}
            type="number"
            min={1}
            name="assemblyTime"
          />
          <Button submit primary>
            Save Assembly Time
          </Button>
        </FormLayout>
      </Form>
      {actionData?.error && <p style={{ color: 'red' }}>{actionData.error}</p>}
      {showToast && (
        <Toast
          content="Assembly time updated successfully!"
          onDismiss={() => setShowToast(false)}
        />
      )}
    </Frame>
  );
}